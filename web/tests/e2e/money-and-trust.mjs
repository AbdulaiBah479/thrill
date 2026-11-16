// Night Fund + round-up, fee transparency, THRILL Guarantee claims, cancel and refund all, streak and badges, squad tracker.
import { chromium } from "playwright-core";
import fs from "node:fs";

const base = process.argv[2] || "http://localhost:3003";
const browser = await chromium.launch({ channel: "msedge" });
const ctx = await browser.newContext({ viewport: { width: 390, height: 800 } });
await ctx.addInitScript(() => { if (!localStorage.getItem("thrill:v1")) localStorage.setItem("thrill:v1", JSON.stringify({ role: "buyer" })); });
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
const DAY = 86_400_000;
const mk = (id, title, price, startAt, extra = {}) => ({ id, title, area: "Test Hall", city: "Freetown", when: "Sat · 8:00 PM", category: "Party", tiers: [{ name: "Entry", price, perk: "Entry" }], going: 0, capacity: 50, friends: [], verified: true, organizer: "Test Org", blurb: "b", colors: ["#ff2e88", "#ff7a1a", "#2a0a3a"], pattern: "diamonds", startAt, durationH: 4, custom: true, ...extra });
const ORG = { name: "Test Org", phone: "12345678", idType: "National ID", idLast4: "1234", about: "x".repeat(20), status: "verified", appliedAt: Date.now() };
const search = async (q) => {
  await page.getByRole("button", { name: "Search events" }).first().click();
  await page.getByPlaceholder("Search events, places, organizers").fill(q);
};
const adminIn = async () => {
  await go("/admin");
  if (await page.getByLabel("Admin PIN").count()) { await page.getByLabel("Admin PIN").fill("2468"); await page.getByRole("button", { name: "Enter" }).click(); }
};

await go("/");
await page.waitForTimeout(800);

// ---------- Night Fund ----------
await step("Night Fund: top up, set a goal, see progress", async () => {
  await page.getByRole("button", { name: "You", exact: true }).click();
  await page.getByRole("button", { name: "+ NLe 50" }).click();
  await page.getByText("NLe 50 added to your Night Fund.").waitFor({ timeout: 4000 });
  if ((await page.getByTestId("fund-balance").textContent()).trim() !== "NLe 50") throw new Error("balance");
  await page.getByLabel("Savings goal").fill("200");
  await page.getByLabel("Savings goal").blur();
  await page.getByText(/NLe 150 to go for your goal of NLe 200/).waitFor({ timeout: 3000 });
});
await step("checkout: fee transparency line, Night Fund option and paying from it", async () => {
  await write({ org: ORG, customEvents: [mk("FND", "Fund Night", 40, Date.now() + 10 * DAY)] });
  await go("/");
  await search("fund night");
  await page.getByRole("button", { name: /Get pass/ }).first().click();
  await page.getByText("Where your money goes: NLe 40 to the organizer, NLe 1 THRILL fee. No other charges.").waitFor({ timeout: 3000 });
  await page.getByRole("button", { name: /Night Fund \(NLe 50\)/ }).click();
  await page.getByRole("button", { name: /^Pay NLe 41$/ }).click();
  await page.getByText(/You're in/).waitFor({ timeout: 6000 });
  const s = await read();
  if (s.fund.balance !== 9) throw new Error("fund balance " + s.fund.balance);
  if (s.tickets[0].method !== "Night Fund") throw new Error("method " + s.tickets[0].method);
});
await step("Night Fund option is hidden when the balance is too low", async () => {
  await go("/");
  await search("fund night");
  await page.getByRole("button", { name: /Get pass/ }).first().click();
  await page.getByRole("button", { name: /^Pay NLe/ }).waitFor({ timeout: 3000 });
  if (await page.getByRole("button", { name: /Night Fund \(NLe/ }).count()) throw new Error("fund offered with NLe 9");
});
await step("round-up: change goes into the Night Fund", async () => {
  await write({ tickets: [], fund: { balance: 9, goal: 200, roundUp: true, history: [] } });
  await go("/");
  await search("fund night");
  await page.getByRole("button", { name: /Get pass/ }).first().click();
  await page.getByText("Round-up to your Night Fund").waitFor({ timeout: 3000 });
  await page.getByRole("button", { name: /^Pay NLe 50$/ }).click();
  await page.getByText(/You're in/).waitFor({ timeout: 6000 });
  const s = await read();
  if (s.fund.balance !== 18) throw new Error("fund balance " + s.fund.balance);
});

// ---------- THRILL Guarantee ----------
let code = "";
await step("Guarantee: buyer sends a claim and sees it under review", async () => {
  await write({ tickets: [], fund: { balance: 0, goal: 0, roundUp: false, history: [] } });
  await go("/");
  await search("fund night");
  await page.getByRole("button", { name: /Get pass/ }).first().click();
  await page.getByRole("button", { name: /^Pay NLe/ }).click();
  await page.getByText(/You're in/).waitFor({ timeout: 6000 });
  code = (await read()).tickets[0].code;
  await page.getByRole("button", { name: "View my tickets" }).click();
  await page.getByRole("button", { name: /Open/ }).first().click();
  await page.getByRole("button", { name: "Send to THRILL" }).click();
  await page.getByText("Choose what went wrong.").waitFor({ timeout: 3000 });
  await page.getByLabel("What went wrong").selectOption("Event was cancelled");
  await page.getByRole("button", { name: "Send to THRILL" }).click();
  await page.getByText(/being reviewed/).waitFor({ timeout: 3000 });
});
await step("Guarantee: admin refunds the claim, buyer sees REFUNDED, door refuses it", async () => {
  await adminIn();
  await page.getByRole("button", { name: /^Claims/ }).click();
  await page.getByText("Event was cancelled").waitFor({ timeout: 3000 });
  await page.getByRole("button", { name: "Refund ticket" }).click();
  await page.getByText("refunded", { exact: true }).waitFor({ timeout: 3000 });
  const t = (await read()).tickets[0];
  if (t.status !== "REFUNDED") throw new Error("status " + t.status);
  await go("/");
  await page.getByRole("button", { name: "Tickets", exact: true }).click();
  await page.getByText("Refunded", { exact: true }).waitFor({ timeout: 3000 });
  await page.getByRole("button", { name: /Refunded/ }).first().click();
  await page.getByText("REFUNDED", { exact: true }).first().waitFor({ timeout: 3000 });
  if (await page.getByRole("img", { name: "Entry QR code" }).count()) throw new Error("QR shown for a refunded ticket");
  await go("/scan");
  const opts = await page.getByLabel("Staff name").locator("option").allTextContents();
  await page.getByLabel("Staff name").selectOption({ label: opts.find((o) => o.includes("Demo Entry")) });
  await page.getByLabel("Staff PIN").fill("1111");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByLabel("Pass code").fill(code);
  await page.getByRole("button", { name: "Check", exact: true }).click();
  await page.getByText("REFUNDED / VOID").waitFor({ timeout: 3000 });
});
await step("Guarantee: a rejected claim shows the reason to the buyer", async () => {
  const s = await read();
  await write({ tickets: [{ ...s.tickets[0], status: undefined }], claims: [{ id: "CL-" + code, code, evId: "FND", reason: "Charged the wrong amount", at: Date.now(), status: "open" }] });
  await adminIn();
  await page.getByRole("button", { name: /^Claims/ }).click();
  await page.getByLabel("Reason shown to the buyer when you reject").fill("Amount was correct.");
  await page.getByRole("button", { name: "Reject", exact: true }).click();
  await go("/");
  await page.getByRole("button", { name: "Tickets", exact: true }).click();
  await page.getByRole("button", { name: /Open/ }).first().click();
  await page.getByText(/rejected/).first().waitFor({ timeout: 3000 });
  await page.getByText(/Amount was correct\./).waitFor({ timeout: 3000 });
});

// ---------- cancel + refund all ----------
await step("admin cancels an event: all tickets refunded, event leaves the feed, organizer sees it", async () => {
  const now = Date.now();
  const tk = (i) => ({ code: `CAN-AAA${i}-BBB${i}`, evId: "CAN", tier: "Entry", price: 50, method: "x", at: now });
  await write({ role: "organizer", org: ORG, claims: [], tickets: [tk(1), tk(2), tk(3)], customEvents: [mk("CAN", "Cancel Me Night", 50, now + 8 * DAY)] });
  await go("/");
  await search("cancel me");
  await page.getByText("Cancel Me Night").first().waitFor({ timeout: 3000 });
  await adminIn();
  await page.getByRole("button", { name: "Events" }).click();
  await page.getByRole("button", { name: "Cancel + refund all" }).click();
  await page.getByText("Cancelled. All tickets refunded.").waitFor({ timeout: 3000 });
  const s = await read();
  if (!s.tickets.every((t) => t.status === "REFUNDED")) throw new Error("not all refunded");
  await page.getByRole("button", { name: "Audit log" }).click();
  await page.getByText(/Cancelled event CAN and refunded 3 tickets/).waitFor({ timeout: 3000 });
  await go("/");
  await search("cancel me");
  await page.getByText("No events match.").waitFor({ timeout: 4000 });
  await go("/organizer");
  await page.getByText(/CANCELLED, all tickets refunded/).waitFor({ timeout: 3000 });
  await page.getByText("0/50").waitFor({ timeout: 3000 });
});

// ---------- streak + badges ----------
await step("night streak counts weeks in a row and forgives one quiet week", async () => {
  const now = Date.now();
  const used = (i, ago) => ({ code: `SUM-ST${i}A-ZZ${i}Z`, evId: "SUM", tier: "R", price: 10, method: "x", at: now - ago, status: "OUT", entries: 1, log: [{ at: now - ago, act: "IN" }] });
  await write({ role: "buyer", customEvents: [], org: null, tickets: [used(1, 0), used(2, 7 * DAY), used(3, 14 * DAY)] });
  await go("/");
  await page.getByRole("button", { name: "You", exact: true }).click();
  await page.getByTestId("streak").waitFor({ timeout: 3000 });
  if ((await page.getByTestId("streak").textContent()).trim() !== "3 weeks") throw new Error("streak " + (await page.getByTestId("streak").textContent()));
  await write({ tickets: [used(2, 7 * DAY), used(3, 14 * DAY)] });
  await go("/");
  await page.getByRole("button", { name: "You", exact: true }).click();
  if ((await page.getByTestId("streak").textContent()).trim() !== "2 weeks") throw new Error("last week should still count");
  await page.getByText(/One quiet week is forgiven/).waitFor({ timeout: 3000 });
  await write({ tickets: [used(3, 21 * DAY)] });
  await go("/");
  await page.getByRole("button", { name: "You", exact: true }).click();
  if ((await page.getByTestId("streak").textContent()).trim() !== "0 weeks") throw new Error("old streak should reset");
});
await step("badges: earned and locked, refunded tickets earn nothing", async () => {
  const now = Date.now();
  const mkT = (i, evId, status) => ({ code: `SUM-BG${i}A-ZZ${i}Z`, evId, tier: "R", price: 10, method: "x", at: now - 9 * DAY, status, entries: 1, log: [{ at: now, act: "IN" }] });
  await write({ tickets: [mkT(1, "SUM", "OUT"), mkT(2, "BOR", "OUT"), mkT(3, "CUL", "REFUNDED")] });
  await go("/");
  await page.getByRole("button", { name: "You", exact: true }).click();
  const badges = page.getByRole("list", { name: "Badges" });
  await badges.getByText("First Night").waitFor({ timeout: 3000 });
  const txt = await badges.innerText();
  if (!/First Night\s+Earned/.test(txt)) throw new Error("First Night not earned: " + txt);
  if (!/Explorer\s+Earned/.test(txt)) throw new Error("Explorer (2 cities) not earned: " + txt);
  if (!/Early Bird\s+Earned/.test(txt)) throw new Error("Early Bird not earned: " + txt);
  if (/Night Owl\s+Earned/.test(txt)) throw new Error("Night Owl should be locked");
  if (/Scene Supporter\s+Earned/.test(txt)) throw new Error("Supporter should be locked (refunded ticket must not count)");
});

// ---------- squad tracker ----------
await step("squad tracker: add friends, tick who paid, progress and book button", async () => {
  await write({ tickets: [], squads: {} });
  await go("/");
  await page.getByRole("button", { name: /Squad/ }).first().click();
  await page.getByLabel("Friend name").fill("Musa");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByLabel("Friend name").fill("Kadi");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByText(/0 of 2 paid · NLe 0 of NLe 306 collected/).waitFor({ timeout: 3000 });
  await page.getByLabel("Musa has paid").check();
  await page.getByText(/1 of 2 paid · NLe 153 of NLe 306 collected/).waitFor({ timeout: 3000 });
  if (await page.getByRole("button", { name: /Everyone has paid/ }).count()) throw new Error("book offered too early");
  await page.getByLabel("Kadi has paid").check();
  await page.getByRole("button", { name: /Everyone has paid. Book the tickets/ }).click();
  await page.getByRole("dialog", { name: /Summer Night Afrobeats/ }).waitFor({ timeout: 3000 });
  const s = await read();
  if (s.squads.SUM.length !== 2) throw new Error("squad not saved");
});

// ---------- restore keeps refunds ----------
await step("restore keeps a REFUNDED ticket refunded", async () => {
  fs.writeFileSync("rf.json", JSON.stringify({ app: "THRILL", tickets: [{ code: "SUM-AAAA-BBBB", evId: "SUM", price: 100, status: "REFUNDED" }] }));
  await go("/");
  await page.getByRole("button", { name: "You", exact: true }).click();
  await page.getByLabel("Restore backup file").setInputFiles("rf.json");
  await page.getByText(/Restored 1 ticket/).waitFor({ timeout: 3000 });
  if ((await read()).tickets[0].status !== "REFUNDED") throw new Error("refund lost in restore");
});

console.log(results.join("\n"));
console.log("JS errors:", errors.length ? errors.slice(0, 5) : "none");
await browser.close();
