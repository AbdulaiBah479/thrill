// New in the hardening pass: door-staff mode, organizer checklist and alerts, corrupted data, restore safety,
// Escape/focus behaviour, closing a payment sheet mid-payment, error pages.
import { chromium } from "playwright-core";
import fs from "node:fs";

const base = process.argv[2] || "http://localhost:3003";
const browser = await chromium.launch({ channel: "msedge" });
const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, acceptDownloads: true });
await ctx.addInitScript(() => { if (!localStorage.getItem("thrill:v1") && !window.name.includes("noseed")) localStorage.setItem("thrill:v1", JSON.stringify({ role: "buyer" })); });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error" && !/tile\.openstreetmap|ERR_|Failed to load resource|status of 404/.test(m.text())) errors.push("console: " + m.text()); });
page.on("dialog", (d) => d.accept());
const results = [];
async function step(name, fn) {
  try { await fn(); results.push("PASS " + name); } catch (e) { results.push("FAIL " + name + " :: " + e.message.split("\n")[0]); }
}
const go = (p) => page.goto(base + p, { waitUntil: "networkidle" });
const setState = (patch) => page.evaluate((patch) => { const s = JSON.parse(localStorage.getItem("thrill:v1") || "{}"); localStorage.setItem("thrill:v1", JSON.stringify({ ...s, ...patch })); }, patch);

await go("/");
await page.waitForTimeout(800);

await step("corrupted saved data does not crash the app", async () => {
  await page.evaluate(() => localStorage.setItem("thrill:v1", JSON.stringify({ role: "buyer", tickets: "oops", saved: 5, customEvents: { a: 1 }, managerPins: [], city: 7, staff: null })));
  await go("/");
  await page.getByRole("button", { name: "Discover", exact: true }).waitFor({ timeout: 4000 });
  await page.getByRole("button", { name: "Tickets", exact: true }).click();
  await page.getByText(/No tickets yet/).waitFor({ timeout: 3000 });
  await go("/organizer");
  await page.getByRole("heading", { name: /Organizer area/ }).waitFor({ timeout: 3000 });
});
await step("totally invalid JSON in storage does not crash", async () => {
  await page.evaluate(() => localStorage.setItem("thrill:v1", "{not json"));
  await go("/");
  await page.getByRole("dialog", { name: "Choose how to use THRILL" }).waitFor({ timeout: 4000 });
  await page.evaluate(() => localStorage.setItem("thrill:v1", JSON.stringify({ role: "buyer" })));
});
await step("Escape closes a pop-up sheet", async () => {
  await go("/");
  await page.getByRole("button", { name: "Event details" }).first().click();
  await page.getByRole("dialog").waitFor({ timeout: 3000 });
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "detached", timeout: 3000 });
});
await step("typing in a sheet keeps keyboard focus (promo box)", async () => {
  await page.getByRole("button", { name: /Get pass/ }).first().click();
  const promo = page.getByLabel("Promo code");
  await promo.click();
  await page.keyboard.type("THRILL1", { delay: 40 });
  const focused = await page.evaluate(() => document.activeElement?.getAttribute("aria-label"));
  if (focused !== "Promo code") throw new Error("focus moved to " + focused);
  if ((await promo.inputValue()) !== "THRILL1") throw new Error("lost characters: " + (await promo.inputValue()));
});
await step("closing the sheet mid-payment creates NO ticket", async () => {
  await page.getByRole("button", { name: /^Pay NLe/ }).click();
  await page.keyboard.press("Escape");
  await page.waitForTimeout(2600);
  const n = await page.evaluate(() => (JSON.parse(localStorage.getItem("thrill:v1")).tickets || []).length);
  if (n !== 0) throw new Error("ticket created after closing: " + n);
});
await step("prototype-style promo codes are rejected", async () => {
  await page.getByRole("button", { name: /Get pass/ }).first().click();
  for (const bad of ["constructor", "__proto__", "toString", "hasOwnProperty"]) {
    await page.getByLabel("Promo code").fill(bad);
    await page.getByRole("button", { name: "Apply" }).click();
    await page.getByText("That code isn't valid.").waitFor({ timeout: 2000 });
  }
  await page.keyboard.press("Escape");
});

// restore safety
await step("restore keeps only valid, trimmed, deduplicated tickets", async () => {
  await go("/");
  await page.getByRole("button", { name: "You", exact: true }).click();
  const evil = {
    app: "THRILL",
    tickets: [
      { code: "sum-aaaa-bbbb", evId: "SUM", price: 10, tier: "x".repeat(500), status: "PAID", rating: 99, entries: 999, log: [{ at: 1, act: "IN", by: "y".repeat(100), how: "hax" }, { at: "no", act: "IN" }, { at: 2, act: "BOOM" }] },
      { code: "SUM-AAAA-BBBB", evId: "SUM", price: 10 },
      { code: "bad code", evId: "SUM", price: 1 },
      { code: "SUM-CCCC-DDDD", evId: "SUM", price: -5 },
      { code: "SUM-EEEE-FFFF", evId: "SUM", price: 5, status: "VERIFIED_ADMIN" },
      null, 7, "x",
    ],
    org: { status: "verified" }, role: "admin", audit: [{ at: 1, action: "forged" }], staff: [{ id: "h", evId: "*", name: "Hacker", pin: "0", gate: "entry" }], wristbands: [{ code: "SUM-ZZZZ-ZZZZ", evId: "SUM", orderId: "o", state: "STOCK" }],
  };
  fs.writeFileSync("evil2.json", JSON.stringify(evil));
  await page.getByLabel("Restore backup file").setInputFiles("evil2.json");
  await page.getByText(/Restored 2 tickets/).waitFor({ timeout: 3000 });
  const s = await page.evaluate(() => JSON.parse(localStorage.getItem("thrill:v1")));
  const t = s.tickets.find((x) => x.code === "SUM-AAAA-BBBB");
  if (!t) throw new Error("valid ticket missing");
  if (t.tier.length > 30) throw new Error("tier not trimmed");
  if (t.rating !== 5) throw new Error("rating not clamped: " + t.rating);
  if (t.entries !== 10) throw new Error("entries not clamped: " + t.entries);
  if (t.log.length !== 1 || t.log[0].how !== undefined || t.log[0].by.length > 30) throw new Error("log not sanitised: " + JSON.stringify(t.log));
  const t2 = s.tickets.find((x) => x.code === "SUM-EEEE-FFFF");
  if (t2.status !== undefined) throw new Error("bad status kept: " + t2.status);
  if (s.role === "admin" || s.org || s.staff?.length || s.wristbands?.length || s.audit?.length) throw new Error("staff/admin data restored from file");
  const big = "a".repeat(2_100_000);
  fs.writeFileSync("big.json", JSON.stringify({ app: "THRILL", tickets: [], pad: big }));
  await page.getByLabel("Restore backup file").setInputFiles("big.json");
  await page.getByText(/not a THRILL backup/).waitFor({ timeout: 3000 });
});

// door-staff mode + alerts + checklist
await step("door mode: sign in, big result card, sound toggle, help alert", async () => {
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("thrill:v1"));
    s.org = { name: "Org", phone: "12345678", idType: "National ID", idLast4: "1234", about: "x".repeat(20), status: "verified", appliedAt: Date.now() };
    s.role = "organizer";
    s.customEvents = [{ id: "ZZZ", title: "Z Event", area: "A", city: "Freetown", when: "Sat", category: "Party", tiers: [{ name: "R", price: 10, perk: "Entry" }], going: 0, capacity: 10, friends: [], verified: true, organizer: "Org", blurb: "b", colors: ["#ff2e88", "#ff7a1a", "#2a0a3a"], pattern: "diamonds", startAt: Date.now() + 1e7, durationH: 4, custom: true }];
    s.staff = [{ id: "z1", evId: "ZZZ", name: "Zed Gate", pin: "4321", gate: "entry" }];
    localStorage.setItem("thrill:v1", JSON.stringify(s));
  });
  await go("/scan");
  const opts = await page.getByLabel("Staff name").locator("option").allTextContents();
  await page.getByLabel("Staff name").selectOption({ label: opts.find((o) => o.includes("Zed Gate")) });
  await page.getByLabel("Staff PIN").fill("4321");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByLabel("Pass code").fill("ZZZ-NOPE-0000");
  await page.getByRole("button", { name: "Check", exact: true }).click();
  const box = await page.getByText("NOT FOUND").boundingBox();
  const size = await page.getByText("NOT FOUND").evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  if (size < 28) throw new Error("result text too small: " + size);
  void box;
  await page.getByRole("button", { name: /Sound/ }).click();
  await page.getByText("Sound off").waitFor({ timeout: 2000 });
  await page.getByRole("button", { name: /Need help/ }).click();
  await page.getByText("The organizer has been alerted.").waitFor({ timeout: 2000 });
});
await step("organizer sees the help alert and can clear it", async () => {
  await go("/organizer");
  await page.getByText("Door staff need help").waitFor({ timeout: 4000 });
  await page.getByText(/Zed Gate: Needs help at the entry gate/).waitFor({ timeout: 3000 });
  await page.getByRole("button", { name: "done" }).click();
  await page.getByText("Door staff need help").waitFor({ state: "detached", timeout: 3000 });
});
await step("organizer readiness checklist reflects what is missing, then completes", async () => {
  await page.getByText("Event readiness").waitFor({ timeout: 3000 });
  await page.getByText(/^[0-9] of 6$/).first().waitFor({ timeout: 3000 });
  const before = await page.getByText(/^[0-9] of 6$/).first().textContent();
  if (before.trim() !== "3 of 6") throw new Error("expected 3 of 6 got " + before);
  await page.getByLabel(/Promoter name for Z Event/).fill("Exit Eddy");
  await page.getByLabel(/Promoter PIN for Z Event/).fill("1357");
  await page.getByLabel(/Gate for Z Event/).selectOption("exit");
  await page.getByRole("button", { name: /Add promoter for/ }).click();
  await page.getByLabel(/Manager PIN for Z Event/).fill("246810");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByLabel(/Quantity for Z Event/).fill("10");
  await page.getByRole("button", { name: "Order from THRILL" }).click();
  await page.getByText(/^6 of 6$/).first().waitFor({ timeout: 3000 });
});
await step("organizer role shows a Dashboard shortcut in the bottom bar", async () => {
  await go("/");
  await page.getByRole("link", { name: "Organizer dashboard" }).waitFor({ timeout: 3000 });
});
await step("a ticket whose event was removed says so (no wrong event shown)", async () => {
  await setState({ tickets: [{ code: "GON-AAAA-BBBB", evId: "GON", tier: "R", price: 10, method: "x", at: Date.now() }] });
  await go("/");
  await page.getByRole("button", { name: "Tickets", exact: true }).click();
  await page.getByText("Event no longer available").first().waitFor({ timeout: 3000 });
});
await step("unknown page shows the friendly not-found screen", async () => {
  const r = await page.goto(base + "/definitely-not-a-page", { waitUntil: "networkidle" });
  await page.getByText("Page not found").waitFor({ timeout: 3000 });
  if (r.status() !== 404) throw new Error("status " + r.status());
});

console.log(results.join("\n"));
console.log("JS errors:", errors.length ? errors.slice(0, 5) : "none");
await browser.close();
