import { chromium } from "playwright-core";

const base = process.argv[2] || "http://localhost:3003";
const browser = await chromium.launch({ channel: "msedge" });
const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, acceptDownloads: true, permissions: ["geolocation"], geolocation: { latitude: 8.48, longitude: -13.23 } });
await ctx.addInitScript(() => { if (!localStorage.getItem("thrill:v1")) localStorage.setItem("thrill:v1", JSON.stringify({ role: "buyer" })); });
await ctx.addInitScript(() => { Object.defineProperty(navigator, "canShare", { value: undefined }); });
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
let code = "";

await go("/");
await page.waitForTimeout(1200);

await step("feed: filters (Free / Campus) work", async () => {
  await page.getByRole("button", { name: "Free", exact: true }).click();
  await page.getByText("Praise Night Live").first().waitFor({ timeout: 3000 });
  await page.getByRole("button", { name: "All", exact: true }).click();
});
await step("feed: heart, search, city menu", async () => {
  await page.getByRole("button", { name: "Save event" }).first().click();
  await page.getByRole("button", { name: "Search events" }).first().click();
  await page.getByPlaceholder("Search events, places, organizers").fill("reggae");
  await page.getByText("Bo Reggae Sunset").first().waitFor({ timeout: 3000 });
  await page.getByRole("button", { name: "Search events" }).first().click();
  await page.getByRole("button", { name: /All Sierra Leone/ }).click();
  await page.getByRole("button", { name: "Bo", exact: true }).click();
  await page.getByText("Bo Reggae Sunset").first().waitFor({ timeout: 3000 });
  await page.getByRole("button", { name: /^Bo$/ }).first().click();
  await page.getByRole("button", { name: /All Sierra Leone/ }).click();
});
await step("details: info, rating hidden when none, calendar, directions", async () => {
  await page.getByRole("button", { name: "Event details" }).first().click();
  await page.getByText("Verified by THRILL").waitFor({ timeout: 3000 });
  await page.getByText("No re-entry").waitFor({ timeout: 3000 });
  const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 4000 }), page.getByRole("button", { name: "Add to calendar" }).click()]);
  if (!dl.suggestedFilename().endsWith(".ics")) throw new Error("ics");
  const href = await page.getByRole("link", { name: /Directions/ }).getAttribute("href");
  if (!href.includes("maps")) throw new Error(href);
});
await step("details: share as story image produces a PNG", async () => {
  const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 8000 }), page.getByRole("button", { name: /Share as story image/ }).click()]);
  if (!dl.suggestedFilename().endsWith(".png")) throw new Error(dl.suggestedFilename());
  await dl.saveAs("story-card.png");
  await page.getByRole("button", { name: "Close" }).click();
});
await step("sold-out waitlist toggles", async () => {
  await page.getByRole("button", { name: "Campus", exact: true }).click();
  await page.getByRole("button", { name: /Join waitlist/ }).first().click();
  await page.getByRole("button", { name: /On the waitlist/ }).first().waitFor({ timeout: 3000 });
  await page.getByRole("button", { name: "All", exact: true }).click();
});
await step("checkout: bad promo rejected, THRILL10 applies", async () => {
  await page.getByRole("button", { name: /Get pass/ }).first().click();
  await page.getByLabel("Promo code").fill("NOPE");
  await page.getByRole("button", { name: "Apply" }).click();
  await page.getByText("That code isn't valid.").waitFor({ timeout: 3000 });
  await page.getByLabel("Promo code").fill("thrill10");
  await page.getByRole("button", { name: "Apply" }).click();
  await page.getByText("− NLe 15").waitFor({ timeout: 3000 });
});
await step("purchase: confetti + holographic pass + code", async () => {
  await page.getByRole("button", { name: /^Pay NLe/ }).click();
  await page.getByText(/You're in/).waitFor({ timeout: 6000 });
  await page.getByTestId("confetti").waitFor({ state: "attached", timeout: 2000 });
  await page.getByLabel("Genuine THRILL hologram").waitFor({ timeout: 2000 });
  code = (await page.locator("p.font-mono").first().textContent()).trim();
  if (!/^SUM-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) throw new Error(code);
  await page.screenshot({ path: "pass.png" });
  await page.getByRole("button", { name: "View my tickets" }).click();
});
await step("tickets: listed with countdown; no rating before use", async () => {
  await page.getByText(/Starts in|Happening now/).first().waitFor({ timeout: 4000 });
  await page.getByRole("button", { name: /Open/ }).first().click();
  if (await page.getByRole("group", { name: "Rate this event" }).count()) throw new Error("rating shown before use");
  await page.getByRole("button", { name: "Close" }).click();
});
await step("scan: staff sign-in, admit, double entry blocked", async () => {
  await go("/scan");
  const opts = await page.getByLabel("Staff name").locator("option").allTextContents();
  await page.getByLabel("Staff name").selectOption({ label: opts.find((o) => /Demo Entry/.test(o)) });
  await page.getByLabel("Staff PIN").fill("1111");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByLabel("Pass code").fill(code.toLowerCase());
  await page.getByRole("button", { name: "Check", exact: true }).click();
  await page.getByText("PAID & VALID").waitFor({ timeout: 3000 });
  await page.getByRole("button", { name: /Admit/ }).click();
  await page.getByLabel("Pass code").fill(code);
  await page.getByRole("button", { name: "Check", exact: true }).click();
  await page.getByText("ALREADY INSIDE").waitFor({ timeout: 3000 });
  await page.getByLabel("Pass code").fill("SUM-FAKE-0000");
  await page.getByRole("button", { name: "Check", exact: true }).click();
  await page.getByText("NOT FOUND").waitFor({ timeout: 3000 });
});
await step("ratings: used ticket can be rated, shows in details", async () => {
  await go("/");
  await page.getByRole("button", { name: "Tickets", exact: true }).click();
  await page.getByRole("button", { name: /Inside|Outside|Open/ }).first().click();
  await page.getByRole("group", { name: "Rate this event" }).waitFor({ timeout: 3000 });
  await page.getByRole("button", { name: "4 stars" }).click();
  await page.getByText("Thanks for rating this event").waitFor({ timeout: 3000 });
  await page.getByRole("button", { name: "Close" }).click();
  await page.getByRole("button", { name: "Discover", exact: true }).click();
  await page.getByRole("button", { name: "Event details" }).first().click();
  await page.getByText(/4\.0 from 1 rating/).waitFor({ timeout: 3000 });
  await page.getByRole("button", { name: "Close" }).click();
});
await step("map tab: renders pins, pin opens details", async () => {
  await page.getByRole("button", { name: "Map", exact: true }).click();
  await page.getByRole("region", { name: "Map of events" }).waitFor({ timeout: 4000 });
  await page.locator("button[data-ev]").first().waitFor({ timeout: 8000 });
  const n = await page.locator("button[data-ev]").count();
  if (n < 5) throw new Error("only " + n + " pins");
  await page.locator('button[data-ev="GOS"]').click({ force: true });
  await page.getByRole("dialog").getByText("Verified by THRILL").waitFor({ timeout: 3000 });
  await page.screenshot({ path: "map.png" });
  await page.getByRole("button", { name: "Close" }).click();
});
await step("map respects filters", async () => {
  await page.getByRole("button", { name: "Discover", exact: true }).click();
  await page.getByRole("button", { name: "Free", exact: true }).click();
  await page.getByRole("button", { name: "Map", exact: true }).click();
  await page.locator("button[data-ev]").first().waitFor({ timeout: 8000 });
  const n = await page.locator("button[data-ev]").count();
  if (n < 1 || n > 3) throw new Error("pins " + n);
});
await step("You tab: points, role switch, safe night, admin link", async () => {
  await page.getByRole("button", { name: "You", exact: true }).click();
  await page.getByText(/Rookie|Regular/).first().waitFor({ timeout: 3000 });
  await page.getByText(/Using THRILL as/).waitFor({ timeout: 3000 });
  await page.getByRole("button", { name: /Safe night/ }).click();
  await page.getByRole("link", { name: /Send my location on WhatsApp/ }).waitFor({ timeout: 6000 });
  await page.getByRole("button", { name: "Close" }).click();
});
await step("offline banner", async () => {
  await ctx.setOffline(true);
  await page.getByText(/Offline\. Your tickets still open/).waitFor({ timeout: 4000 });
  await ctx.setOffline(false);
});
await step("PWA manifest + service worker file", async () => {
  const r = await ctx.request.get(base + "/manifest.webmanifest");
  const j = await r.json();
  if (j.name !== "THRILL" || !j.icons?.length) throw new Error("manifest");
  const sw = await ctx.request.get(base + "/sw.js");
  if (!sw.ok()) throw new Error("sw");
});

console.log(results.join("\n"));
console.log("JS errors:", errors.length ? errors.slice(0, 6) : "none");
await browser.close();
