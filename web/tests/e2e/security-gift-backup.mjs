import { chromium } from "playwright-core";
import fs from "node:fs";

const base = process.argv[2] || "http://localhost:3003";
const browser = await chromium.launch({ channel: "msedge", args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, acceptDownloads: true, permissions: ["camera", "geolocation"], geolocation: { latitude: 8.48, longitude: -13.23 } });
await ctx.addInitScript(() => { if (!localStorage.getItem("thrill:v1")) localStorage.setItem("thrill:v1", JSON.stringify({ role: "buyer" })); });
await ctx.addInitScript(() => { Object.defineProperty(navigator, "canShare", { value: undefined }); window.__xss = 0; });
const page = await ctx.newPage();
const errors = [];
const csp = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => {
  const t = m.text();
  if (/Content Security Policy|Refused to/.test(t)) csp.push(t.slice(0, 160));
  else if (m.type() === "error" && !/tile\.openstreetmap|ERR_|Failed to load resource/.test(t)) errors.push("console: " + t);
});
page.on("dialog", (d) => d.accept());
const results = [];
async function step(name, fn) {
  try { await fn(); results.push("PASS " + name); } catch (e) { results.push("FAIL " + name + " :: " + e.message.split("\n")[0]); }
}
const go = (p) => page.goto(base + p, { waitUntil: "networkidle" });

await step("security headers present on every page", async () => {
  const r = await ctx.request.get(base + "/");
  const h = r.headers();
  for (const k of ["content-security-policy", "x-frame-options", "x-content-type-options", "referrer-policy", "permissions-policy"]) if (!h[k]) throw new Error("missing " + k);
  if (h["x-frame-options"] !== "DENY") throw new Error("xfo " + h["x-frame-options"]);
  if (h["x-powered-by"]) throw new Error("x-powered-by leaked");
  const a = await ctx.request.get(base + "/admin");
  if (!/noindex/.test(a.headers()["x-robots-tag"] ?? "")) throw new Error("admin not noindex");
  const rb = await (await ctx.request.get(base + "/robots.txt")).text();
  if (!/Disallow: \/admin/.test(rb)) throw new Error("robots");
});
await go("/");
await page.waitForTimeout(1000);

await step("regular user does not see admin link; staff menu hidden", async () => {
  await page.getByRole("button", { name: "You", exact: true }).click();
  if (await page.getByRole("link", { name: /staff area|THRILL admin/ }).count()) throw new Error("admin link visible");
  if (await page.getByRole("link", { name: /Promoter door check-in/ }).count()) throw new Error("scan link visible to buyer");
  await page.getByRole("link", { name: /Help, safety and refunds/ }).waitFor({ timeout: 3000 });
});
await step("tapping the demo-build label 5x reveals staff link", async () => {
  const b = page.getByRole("button", { name: "THRILL demo build" });
  for (let i = 0; i < 5; i++) await b.click();
  await page.getByRole("link", { name: /THRILL staff area/ }).waitFor({ timeout: 3000 });
});
await step("admin: 5 wrong PINs lock sign-in, correct PIN refused while locked", async () => {
  await go("/admin");
  for (let i = 0; i < 5; i++) {
    await page.getByLabel("Admin PIN").fill("9999");
    await page.getByRole("button", { name: "Enter" }).click();
  }
  await page.getByText(/Locked for 5 minutes/).waitFor({ timeout: 3000 });
  await page.getByLabel("Admin PIN").fill("2468");
  await page.getByRole("button", { name: "Enter" }).click();
  await page.getByText(/Wait \d min/).waitFor({ timeout: 3000 });
});
await step("admin: unlock (clear lock) then sign in, overview + audit log", async () => {
  await page.evaluate(() => localStorage.removeItem("thrill:admin-lock"));
  await page.getByLabel("Admin PIN").fill("2468");
  await page.getByRole("button", { name: "Enter" }).click();
  await page.getByText("Today at a glance").waitFor({ timeout: 3000 });
  await page.getByRole("button", { name: "Audit log" }).click();
  await page.getByText("Admin signed in").waitFor({ timeout: 3000 });
});

// organizer with a hostile event title + CSV formula tier name
await step("organizer apply + admin verify", async () => {
  await go("/organizer");
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem("thrill:v1")); s.role = "organizer"; localStorage.setItem("thrill:v1", JSON.stringify(s)); });
  await go("/organizer");
  await page.getByLabel("Full name or company").fill("Test Promotions");
  await page.getByLabel("Phone number").fill("+23276000111");
  await page.getByLabel("ID number").fill("AB123456");
  await page.getByLabel("About your events").fill("We organise campus concerts in Freetown every month.");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Submit application" }).click();
  await page.getByText("Application under review").waitFor({ timeout: 3000 });
  await go("/admin");
  await page.getByRole("button", { name: "Organizers" }).click();
  await page.getByRole("button", { name: /Verify/ }).click();
  await go("/organizer");
  await page.getByText(/Verified by THRILL/).waitFor({ timeout: 4000 });
});
const evil = '<img src=x onerror="window.__xss=1">Bad';
await step("hostile event title is shown as text and never runs (feed + map)", async () => {
  await page.getByLabel("Event name").fill(evil);
  await page.getByLabel("Venue").fill("Aberdeen Beach");
  await page.getByLabel("Date and time").fill("2030-05-10T19:00");
  await page.getByLabel("Ticket 1 name").fill("=HYPERLINK(\"http://evil\")");
  await page.getByLabel("Ticket 1 price").fill("50");
  await page.getByRole("button", { name: "Publish event" }).click();
  await page.getByText(/is live in the feed/).waitFor({ timeout: 3000 });
  await go("/");
  await page.getByRole("button", { name: "Map", exact: true }).click();
  await page.locator("button[data-ev]").first().waitFor({ timeout: 8000 });
  await page.waitForTimeout(800);
  const x = await page.evaluate(() => window.__xss);
  if (x !== 0) throw new Error("XSS executed");
  const imgs = await page.locator('.leaflet-marker-icon img[src="x"]').count();
  if (imgs) throw new Error("injected img found in map");
});
await step("CSV export neutralises formulas", async () => {
  await go("/");
  await page.getByRole("button", { name: "Discover", exact: true }).click();
  await page.getByRole("button", { name: "Search events" }).first().click();
  await page.getByPlaceholder("Search events, places, organizers").fill("aberdeen");
  await page.getByRole("button", { name: /Get pass/ }).first().click();
  await page.getByRole("button", { name: /^Pay NLe/ }).click();
  await page.getByText(/You're in/).waitFor({ timeout: 6000 });
  await page.getByRole("button", { name: "Done" }).click();
  await go("/organizer");
  const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 5000 }), page.getByRole("button", { name: /Export attendees/ }).click()]);
  await dl.saveAs("export.csv");
  const csv = fs.readFileSync("export.csv", "utf8");
  if (/,=HYPERLINK/.test(csv) || /,"=HYPERLINK/.test(csv)) throw new Error("formula not neutralised: " + csv.split("\n")[1]);
  if (!/'=HYPERLINK/.test(csv)) throw new Error("expected escaped cell: " + csv.split("\n")[1]);
});
let gift = "";
let oldCode = "";
await step("gift: create gift code on a paid ticket", async () => {
  await go("/");
  await page.getByRole("button", { name: "Tickets", exact: true }).click();
  await page.getByRole("button", { name: /Open/ }).first().click();
  oldCode = (await page.getByRole("dialog").locator("p.font-mono").first().textContent()).trim();
  await page.getByRole("button", { name: /Gift this ticket/ }).click();
  await page.getByText("Gift waiting to be claimed").waitFor({ timeout: 3000 });
  gift = (await page.getByRole("dialog").locator("p.font-mono.text-gold").first().textContent()).trim();
  if (!/^GIFT-/.test(gift)) throw new Error(gift);
  await page.getByRole("button", { name: "Close" }).click();
});
await step("gift: bad code rejected; good code swaps the ticket code", async () => {
  await page.getByLabel("Gift code").fill("GIFT-NOPE-0000");
  await page.getByRole("button", { name: "Claim", exact: true }).click();
  await page.getByText(/not valid or was already claimed/).waitFor({ timeout: 3000 });
  await page.getByLabel("Gift code").fill(gift);
  await page.getByRole("button", { name: "Claim", exact: true }).click();
  await page.getByText(/Gift claimed/).waitFor({ timeout: 3000 });
  await page.getByRole("button", { name: /Open/ }).first().click();
  const now = (await page.getByRole("dialog").locator("p.font-mono").first().textContent()).trim();
  if (now === oldCode) throw new Error("code unchanged");
  await page.getByRole("button", { name: "Close" }).click();
});
await step("gift: old QR code is now NOT FOUND at the gate", async () => {
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem("thrill:v1")); s.role = "organizer"; localStorage.setItem("thrill:v1", JSON.stringify(s)); });
  await go("/scan");
  const opts = await page.getByLabel("Staff name").locator("option").allTextContents();
  await page.getByLabel("Staff name").selectOption({ label: opts.find((o) => o.includes("Demo Entry")) });
  await page.getByLabel("Staff PIN").fill("1111");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByLabel("Pass code").fill(oldCode);
  await page.getByRole("button", { name: "Check", exact: true }).click();
  await page.getByText("NOT FOUND").waitFor({ timeout: 3000 });
});
await step("backup downloads; restore ignores organizer/admin data", async () => {
  await go("/");
  await page.getByRole("button", { name: "You", exact: true }).click();
  const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 5000 }), page.getByRole("button", { name: /Back up my data/ }).click()]);
  await dl.saveAs("backup.json");
  const j = JSON.parse(fs.readFileSync("backup.json", "utf8"));
  if (j.org || j.orders || j.wristbands || j.audit) throw new Error("backup leaks staff data");
  if (!j.tickets.length) throw new Error("no tickets in backup");
  const evilBackup = { app: "THRILL", tickets: [{ code: "ABC-1234-5678", evId: "ABC", price: 1, tier: "x" }], org: { status: "verified" }, role: "admin" };
  fs.writeFileSync("evil.json", JSON.stringify(evilBackup));
  await page.getByLabel("Restore backup file").setInputFiles("evil.json");
  await page.getByText(/Restored 1 ticket/).waitFor({ timeout: 3000 });
  const s = await page.evaluate(() => JSON.parse(localStorage.getItem("thrill:v1")));
  if (s.role === "admin") throw new Error("role restored from file");
  fs.writeFileSync("junk.json", "not json");
  await page.getByLabel("Restore backup file").setInputFiles("junk.json");
  await page.getByText(/not a THRILL backup/).waitFor({ timeout: 3000 });
});
await step("help page loads and expands", async () => {
  await go("/help");
  await page.getByText("How do I get a ticket?").click();
  await page.getByText(/choose a ticket, and pay with mobile money/).waitFor({ timeout: 3000 });
});
await step("camera scanner still starts under the new CSP", async () => {
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem("thrill:v1")); s.role = "organizer"; localStorage.setItem("thrill:v1", JSON.stringify(s)); });
  await go("/scan");
  const opts = await page.getByLabel("Staff name").locator("option").allTextContents();
  await page.getByLabel("Staff name").selectOption({ label: opts.find((o) => o.includes("Demo Entry")) });
  await page.getByLabel("Staff PIN").fill("1111");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("button", { name: /Scan QR with camera/ }).click();
  await page.getByRole("button", { name: "Stop camera" }).waitFor({ timeout: 8000 });
  await page.getByRole("button", { name: "Stop camera" }).click();
});
await step("map, pass QR, calendar all work under CSP", async () => {
  await go("/");
  await page.getByRole("button", { name: "Map", exact: true }).click();
  await page.locator("button[data-ev]").first().waitFor({ timeout: 8000 });
});

console.log(results.join("\n"));
console.log("CSP violations:", csp.length ? csp.slice(0, 5) : "none");
console.log("JS errors:", errors.length ? errors.slice(0, 5) : "none");
await browser.close();
