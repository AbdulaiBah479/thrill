// Pay in parts, For you + follow, Great value, live crowd, Wrapped, trusted contact + SOS, sales-team codes.
import { chromium } from "playwright-core";

const base = process.argv[2] || "http://localhost:3003";
const browser = await chromium.launch({ channel: "msedge" });
const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, acceptDownloads: true, permissions: ["geolocation"], geolocation: { latitude: 8.48, longitude: -13.23 } });
await ctx.addInitScript(() => {
  if (!localStorage.getItem("thrill:v1")) localStorage.setItem("thrill:v1", JSON.stringify({ role: "buyer" }));
  Object.defineProperty(navigator, "canShare", { value: undefined });
});
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error" && !/tile\.openstreetmap|ERR_|Failed to load resource/.test(m.text())) errors.push("console: " + m.text()); });
page.on("dialog", (d) => d.accept());
const results = [];
async function step(name, fn) {
  try { await fn(); results.push("PASS " + name); } catch (e) { results.push("FAIL " + name + " :: " + e.message.split("\n")[0]); }
}
const go = (p) => page.goto(base + p, { waitUntil: "networkidle" });
const read = () => page.evaluate(() => JSON.parse(localStorage.getItem("thrill:v1") || "{}"));
const write = (patch) => page.evaluate((patch) => { const s = JSON.parse(localStorage.getItem("thrill:v1") || "{}"); localStorage.setItem("thrill:v1", JSON.stringify({ ...s, ...patch })); }, patch);

const mk = (id, title, cat, price, startAt, extra = {}) => ({
  id, title, area: "Test Hall", city: "Freetown", when: "Sat · 8:00 PM", category: cat,
  tiers: [{ name: "Entry", price, perk: "Entry" }], going: 0, capacity: 10, friends: [], verified: true,
  organizer: "Test Org", blurb: "b", colors: ["#ff2e88", "#ff7a1a", "#2a0a3a"], pattern: "diamonds",
  startAt, durationH: 4, custom: true, ...extra,
});
const ORG = { name: "Test Org", phone: "12345678", idType: "National ID", idLast4: "1234", about: "x".repeat(20), status: "verified", appliedAt: Date.now() };
const DAY = 86_400_000;

await go("/");
await page.waitForTimeout(800);

// ---------- pay in parts ----------
await step("pay in parts: options shown, reserve with part payment, pass is locked", async () => {
  await write({ org: ORG, customEvents: [mk("TEN", "Ten Day Party", "Party", 100, Date.now() + 10 * DAY)] });
  await go("/");
  await page.getByRole("button", { name: "Search events" }).first().click();
  await page.getByPlaceholder("Search events, places, organizers").fill("ten day");
  await page.getByRole("button", { name: /Get pass/ }).first().click();
  await page.getByRole("group", { name: "Payment plan" }).waitFor({ timeout: 3000 });
  await page.getByRole("button", { name: "3 parts" }).click();
  await page.getByText(/Pay NLe 34 now to reserve/).waitFor({ timeout: 3000 });
  await page.getByRole("button", { name: /^Pay NLe 34$/ }).click();
  await page.getByText(/Spot reserved! Pay the balance by/).waitFor({ timeout: 6000 });
  await page.getByText("Pass locked").waitFor({ timeout: 3000 });
  if (await page.getByRole("img", { name: "Entry QR code" }).count()) throw new Error("QR visible while a balance is owed");
  const t = (await read()).tickets[0];
  if (t.balance !== 68 || !t.payBy) throw new Error("ticket " + JSON.stringify(t));
});
await step("reserved ticket shows balance in My Tickets", async () => {
  await page.getByRole("button", { name: "View my tickets" }).click();
  await page.getByText(/Reserved · NLe 68 still to pay/).waitFor({ timeout: 3000 });
  await page.getByRole("button", { name: /Pay balance/ }).first().click();
  await page.getByRole("button", { name: /^Pay balance NLe 68/ }).waitFor({ timeout: 3000 });
});
await step("door refuses a reserved ticket: NOT FULLY PAID with the amount owed", async () => {
  const code = (await read()).tickets[0].code;
  await go("/scan");
  const opts = await page.getByLabel("Staff name").locator("option").allTextContents();
  await page.getByLabel("Staff name").selectOption({ label: opts.find((o) => o.includes("Demo Entry")) });
  await page.getByLabel("Staff PIN").fill("1111");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByLabel("Pass code").fill(code);
  await page.getByRole("button", { name: "Check", exact: true }).click();
  await page.getByText("NOT FULLY PAID").waitFor({ timeout: 3000 });
  await page.getByText("Balance owed: NLe 68").waitFor({ timeout: 3000 });
  if (await page.getByRole("button", { name: /Admit/ }).count()) throw new Error("admit offered for unpaid ticket");
});
await step("paying the balance unlocks the pass; door then admits", async () => {
  await go("/");
  await page.getByRole("button", { name: "Tickets", exact: true }).click();
  await page.getByRole("button", { name: /Pay balance/ }).first().click();
  await page.getByRole("button", { name: /^Pay balance NLe 68/ }).click();
  await page.getByText("Paid in full. Your pass is unlocked!").waitFor({ timeout: 5000 });
  await page.getByRole("img", { name: "Entry QR code" }).waitFor({ timeout: 4000 });
  const t = (await read()).tickets[0];
  if (t.balance) throw new Error("balance still " + t.balance);
  await go("/scan");
  const opts = await page.getByLabel("Staff name").locator("option").allTextContents();
  await page.getByLabel("Staff name").selectOption({ label: opts.find((o) => o.includes("Demo Entry")) });
  await page.getByLabel("Staff PIN").fill("1111");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByLabel("Pass code").fill(t.code);
  await page.getByRole("button", { name: "Check", exact: true }).click();
  await page.getByText("PAID & VALID").waitFor({ timeout: 3000 });
});
await step("pay in parts is NOT offered when the event is within a day", async () => {
  await write({ tickets: [], customEvents: [mk("SOON", "Tonight Bash", "Party", 100, Date.now() + 5 * 3600_000)] });
  await go("/");
  await page.getByRole("button", { name: "Search events" }).first().click();
  await page.getByPlaceholder("Search events, places, organizers").fill("tonight bash");
  await page.getByRole("button", { name: /Get pass/ }).first().click();
  await page.getByRole("button", { name: /^Pay NLe/ }).waitFor({ timeout: 3000 });
  if (await page.getByRole("group", { name: "Payment plan" }).count()) throw new Error("plan offered too close to the event");
});

// ---------- For you, follow, great value ----------
await step("great value tag on a clearly cheaper event", async () => {
  await write({ tickets: [], saved: [], follows: [], customEvents: [
    mk("CHP", "Cheap Party", "Party", 20, Date.now() + 5 * DAY),
    mk("MID", "Mid Party", "Party", 150, Date.now() + 6 * DAY),
    mk("PRC", "Pricey Party", "Party", 200, Date.now() + 7 * DAY),
  ] });
  await go("/");
  await page.getByRole("button", { name: "Party", exact: true }).click();
  await page.getByText("Great value").first().waitFor({ timeout: 3000 });
});
await step("follow an organizer, then For you shows them first with a reason", async () => {
  await page.getByRole("button", { name: "All", exact: true }).click();
  await page.getByRole("button", { name: "Search events" }).first().click();
  await page.getByPlaceholder("Search events, places, organizers").fill("cheap party");
  await page.getByRole("button", { name: "Event details" }).first().click();
  await page.getByRole("button", { name: /Follow Test Org/ }).click();
  await page.getByRole("button", { name: /Following Test Org/ }).waitFor({ timeout: 3000 });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Search events" }).first().click();
  await page.getByRole("button", { name: "For you", exact: true }).click();
  await page.getByText("★ You follow Test Org").first().waitFor({ timeout: 3000 });
  const first = await page.locator("section h2").first().textContent();
  if (!/Party/.test(first)) throw new Error("first card is " + first);
});
await step("saving an event of a category makes that vibe rank higher", async () => {
  await write({ follows: [], saved: ["GOS"] }); // Praise Night Live is a Concert
  await go("/");
  await page.getByRole("button", { name: "For you", exact: true }).click();
  await page.getByText("★ Because you like Concert").first().waitFor({ timeout: 3000 });
});

// ---------- live crowd ----------
await step("live crowd meter appears once an event has started and has door scans", async () => {
  const now = Date.now();
  const tickets = Array.from({ length: 5 }, (_, i) => ({ code: `LIV-AAA${i}-BBB${i}`, evId: "LIV", tier: "Entry", price: 10, method: "x", at: now, status: "IN", entries: 1, log: [{ at: now - 60_000, act: "IN", by: "t", how: "live" }] }));
  await write({ saved: [], tickets, customEvents: [mk("LIV", "Live Night", "Festival", 10, now - 3600_000, { capacity: 10 })] });
  await go("/");
  await page.getByRole("button", { name: "Search events" }).first().click();
  await page.getByPlaceholder("Search events, places, organizers").fill("live night");
  await page.getByText("● Filling up").waitFor({ timeout: 4000 });
});

// ---------- Wrapped ----------
await step("Wrapped: empty state, then stats, title and a shareable PNG", async () => {
  await write({ tickets: [], customEvents: [] });
  await go("/wrapped");
  await page.getByText("Your Wrapped starts with your first night out").waitFor({ timeout: 3000 });
  const now = Date.now();
  const mkT = (i, evId, price, used) => ({ code: `SUM-WRP${i}-ZZZ${i}`, evId, tier: "R", price, method: "x", at: now, status: used ? "OUT" : "PAID", entries: used ? 1 : 0, log: used ? [{ at: now, act: "IN" }] : [] });
  await write({ name: "Aminata", tickets: [mkT(1, "SUM", 150, true), mkT(2, "SUM", 150, true), mkT(3, "SUM", 150, true), mkT(4, "SUM", 150, true), mkT(5, "SUM", 150, true), mkT(6, "CUL", 30, false)] });
  await go("/wrapped");
  await page.getByTestId("wrapped-title").waitFor({ timeout: 3000 });
  const title = await page.getByTestId("wrapped-title").textContent();
  if (title !== "Night Owl") throw new Error("title " + title);
  await page.getByText("NLe 780").waitFor({ timeout: 3000 });
  await page.getByText("Aminata's THRILL Wrapped").waitFor({ timeout: 3000 });
  const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 8000 }), page.getByRole("button", { name: /Share my Wrapped/ }).click()]);
  if (dl.suggestedFilename() !== "thrill-wrapped.png") throw new Error(dl.suggestedFilename());
  await dl.saveAs("wrapped.png");
});

// ---------- trusted contact + SOS ----------
await step("trusted contact: validation, local number format, SOS goes to that number", async () => {
  await go("/");
  await page.getByRole("button", { name: "You", exact: true }).click();
  await page.getByRole("button", { name: /Save trusted contact/ }).click();
  await page.getByText(/Enter your trusted contact's name/).waitFor({ timeout: 3000 });
  await page.getByLabel("Trusted contact name").fill("Mama");
  await page.getByLabel("Trusted contact phone").fill("12");
  await page.getByRole("button", { name: /Save trusted contact/ }).click();
  await page.getByText(/country code/).waitFor({ timeout: 3000 });
  await page.getByLabel("Trusted contact phone").fill("076123456");
  await page.getByRole("button", { name: /Save trusted contact/ }).click();
  await page.getByText("Mama is now your trusted contact.").waitFor({ timeout: 3000 });
  if ((await read()).trusted.phone !== "23276123456") throw new Error("phone " + (await read()).trusted.phone);
  await page.getByRole("button", { name: /SOS: I need help now/ }).click();
  const href = await page.getByRole("link", { name: /Send my location on WhatsApp/ }).getAttribute("href", { timeout: 6000 });
  if (!/wa\.me\/23276123456\?text=SOS/.test(href) || !href.includes("8.48")) throw new Error(href);
  await page.getByRole("button", { name: "Close" }).click();
});

// ---------- sales team ----------
await step("sales team: organizer creates a seller code, buyer uses it, commission is tracked", async () => {
  await write({ role: "organizer", org: ORG, tickets: [], promoters: [], customEvents: [mk("SAL", "Sales Night", "Party", 100, Date.now() + 10 * DAY)] });
  await go("/organizer");
  await page.getByLabel(/Seller name for Sales Night/).fill("Bintu");
  await page.getByLabel(/Commission percent for Sales Night/).fill("0");
  await page.getByRole("button", { name: /Add seller for/ }).click();
  await page.getByText(/between 1% and 50%/).waitFor({ timeout: 3000 });
  await page.getByLabel(/Commission percent for Sales Night/).fill("10");
  await page.getByRole("button", { name: /Add seller for/ }).click();
  await page.getByText(/Code BIN[A-Z0-9]{3} created for Bintu/).waitFor({ timeout: 3000 });
  const code = (await read()).promoters[0].code;
  await write({ role: "buyer" });
  await go("/");
  await page.getByRole("button", { name: "Search events" }).first().click();
  await page.getByPlaceholder("Search events, places, organizers").fill("sales night");
  await page.getByRole("button", { name: /Get pass/ }).first().click();
  await page.getByLabel("Promo code").fill("NOTACODE");
  await page.getByRole("button", { name: "Apply" }).click();
  await page.getByText("That code isn't valid.").waitFor({ timeout: 3000 });
  await page.getByLabel("Promo code").fill(code.toLowerCase());
  await page.getByRole("button", { name: "Apply" }).click();
  await page.getByText("Code accepted. This supports Bintu.").waitFor({ timeout: 3000 });
  await page.getByRole("button", { name: /^Pay NLe/ }).click();
  await page.getByText(/You're in/).waitFor({ timeout: 6000 });
  if ((await read()).tickets[0].promoter !== code) throw new Error("promoter not recorded");
  await write({ role: "organizer" });
  await go("/organizer");
  await page.getByText(/1 sold · NLe 102 · owed NLe 10/).waitFor({ timeout: 4000 });
});
await step("a seller code from another event is not accepted", async () => {
  await write({ role: "buyer", tickets: [], customEvents: [mk("SAL", "Sales Night", "Party", 100, Date.now() + 10 * DAY), mk("OTH", "Other Night", "Party", 100, Date.now() + 11 * DAY)] });
  const code = (await read()).promoters[0].code;
  await go("/");
  await page.getByRole("button", { name: "Search events" }).first().click();
  await page.getByPlaceholder("Search events, places, organizers").fill("other night");
  await page.getByRole("button", { name: /Get pass/ }).first().click();
  await page.getByLabel("Promo code").fill(code);
  await page.getByRole("button", { name: "Apply" }).click();
  await page.getByText("That code isn't valid.").waitFor({ timeout: 3000 });
});

// ---------- restore keeps new fields safe ----------
await step("restore clamps balance and deadline fields", async () => {
  const fs = await import("node:fs");
  fs.writeFileSync("rb.json", JSON.stringify({ app: "THRILL", tickets: [{ code: "SUM-AAAA-BBBB", evId: "SUM", price: 100, balance: -9, payBy: 99e99, promoter: "p".repeat(99) }] }));
  await go("/");
  await page.getByRole("button", { name: "You", exact: true }).click();
  await page.getByLabel("Restore backup file").setInputFiles("rb.json");
  await page.getByText(/Restored 1 ticket/).waitFor({ timeout: 3000 });
  const t = (await read()).tickets[0];
  if (t.balance !== 0 || t.payBy !== 4e12 || t.promoter.length > 20) throw new Error(JSON.stringify(t));
});

console.log(results.join("\n"));
console.log("JS errors:", errors.length ? errors.slice(0, 5) : "none");
await browser.close();
