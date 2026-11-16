import { chromium } from "playwright-core";

const base = process.argv[2] || "http://localhost:3003";
const browser = await chromium.launch({ channel: "msedge" });
const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, acceptDownloads: true });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => m.type() === "error" && errors.push("console: " + m.text()));
page.on("dialog", (d) => d.accept());
const results = [];
async function step(name, fn) {
  try { await fn(); results.push("PASS " + name); } catch (e) { results.push("FAIL " + name + " :: " + e.message.split("\n")[0]); }
}
async function adminLogin() {
  if (await page.getByLabel("Admin PIN").count()) {
    await page.getByLabel("Admin PIN").fill("2468");
    await page.getByRole("button", { name: "Enter" }).click();
  }
}
const go = (p) => page.goto(base + p, { waitUntil: "networkidle" });
let batchCodes = [];

await step("first run shows role chooser", async () => {
  await go("/");
  await page.getByRole("dialog", { name: "Choose how to use THRILL" }).waitFor({ timeout: 4000 });
});
await step("choose organizer -> organizer application form", async () => {
  await page.getByRole("button", { name: /I organize events/ }).click();
  await page.waitForURL("**/organizer");
  await page.getByRole("button", { name: "Submit application" }).waitFor({ timeout: 4000 });
});
await step("application validates", async () => {
  await page.getByRole("button", { name: "Submit application" }).click();
  await page.getByText(/Enter your full name/).waitFor({ timeout: 3000 });
});
await step("submit application -> pending", async () => {
  await page.getByLabel("Full name or company").fill("Lumley Nights Ltd");
  await page.getByLabel("Phone number").fill("+23276123456");
  await page.getByLabel("ID number").fill("SL1234567");
  await page.getByLabel("About your events").fill("We run monthly beach parties at Lumley since 2023.");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Submit application" }).click();
  await page.getByText("Application under review").waitFor({ timeout: 3000 });
});
await step("pending organizer cannot create events", async () => {
  const n = await page.getByRole("button", { name: "Publish event" }).count();
  if (n) throw new Error("publish visible while pending");
});
await step("admin PIN gate rejects wrong PIN", async () => {
  await go("/admin");
  await page.getByLabel("Admin PIN").fill("0000");
  await page.getByRole("button", { name: "Enter" }).click();
  await page.getByText("Wrong PIN.").waitFor({ timeout: 3000 });
});
await step("print page locked for non-admin", async () => {
  await go("/print?order=PO-X-001");
  await page.getByText("Printing is done by THRILL").waitFor({ timeout: 3000 });
});
await step("admin verifies organizer", async () => {
  await go("/admin");
  await page.getByLabel("Admin PIN").fill("2468");
  await page.getByRole("button", { name: "Enter" }).click();
  await page.getByRole("button", { name: /^Organizers/ }).click();
  await page.getByText("Lumley Nights Ltd").waitFor({ timeout: 3000 });
  await page.getByText("•••• 4567").waitFor({ timeout: 3000 });
  await page.getByRole("button", { name: /Verify/ }).click();
  await page.getByText("verified", { exact: true }).waitFor({ timeout: 3000 });
});
await step("verified organizer sees dashboard + creates event", async () => {
  await go("/organizer");
  await page.getByText(/Verified by THRILL: Lumley Nights Ltd/).waitFor({ timeout: 4000 });
  await page.getByLabel("Event name").fill("Aberdeen Sunset Jam");
  await page.getByLabel("Venue").fill("Aberdeen Beach");
  await page.getByLabel("Date and time").fill("2030-05-10T19:00");
  await page.getByLabel("Capacity").fill("50");
  await page.getByLabel("Ticket 1 name").fill("Entry");
  await page.getByLabel("Ticket 1 price").fill("80");
  await page.getByRole("button", { name: "Publish event" }).click();
  await page.getByText(/is live in the feed with code ABE/).waitFor({ timeout: 3000 });
});
await step("order 5 wristbands from THRILL", async () => {
  await page.getByLabel(/Quantity for Aberdeen/).fill("5");
  await page.getByRole("button", { name: "Order from THRILL" }).click();
  await page.getByText(/PO-ABE-001 · 5 wristbands/).waitFor({ timeout: 3000 });
  await page.getByText("Requested", { exact: true }).waitFor({ timeout: 3000 });
});
await step("admin approves -> printing creates 5 codes -> print batch", async () => {
  await go("/admin");
  await adminLogin();
  await page.getByRole("button", { name: /^Print/ }).first().click();
  await page.getByRole("button", { name: "Approve" }).click();
  await page.getByRole("button", { name: /Start printing/ }).click();
  await page.getByRole("link", { name: /Open print batch/ }).click();
  await page.waitForURL("**/print?order=PO-ABE-001");
  await page.getByText("5 items").waitFor({ timeout: 4000 });
  await page.locator('img[alt^="QR"]').nth(4).waitFor({ timeout: 6000 });
  batchCodes = await page.locator("p.font-mono").allTextContents();
  batchCodes = batchCodes.map((t) => t.trim()).filter((t) => /^ABE-/.test(t));
  if (new Set(batchCodes).size < 5) throw new Error("codes not unique: " + batchCodes.length);
});
await step("print media shows only wristbands", async () => {
  await page.emulateMedia({ media: "print" });
  if (await page.getByRole("button", { name: "Print / save PDF" }).isVisible()) throw new Error("controls visible");
  await page.emulateMedia({ media: "screen" });
});
const code = () => batchCodes[0];
async function staff(label) {
  await go("/scan");
  if (await page.getByRole("button", { name: "Sign out" }).count()) await page.getByRole("button", { name: "Sign out" }).click();
  const opts = await page.getByLabel("Staff name").locator("option").allTextContents();
  await page.getByLabel("Staff name").selectOption({ label: opts.find((o) => o.includes(label)) });
  await page.getByLabel("Staff PIN").fill(label === "Demo Entry" ? "1111" : "2222");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}
const scanCode = async (c) => {
  await page.getByLabel("Pass code").fill(c);
  await page.getByRole("button", { name: "Check", exact: true }).click();
};
await step("blank wristband is NOT valid for entry (needs activation)", async () => {
  await staff("Demo Entry");
  await scanCode(code());
  await page.getByText("NOT ACTIVATED").waitFor({ timeout: 3000 });
});
await step("exit gate: blank wristband is NOT INSIDE", async () => {
  await staff("Demo Exit");
  await scanCode(code());
  await page.getByText("NOT INSIDE").waitFor({ timeout: 3000 });
});
await step("door sale: activate & admit", async () => {
  await staff("Demo Entry");
  await scanCode(code());
  await page.getByRole("button", { name: /activate & admit/ }).click();
  await page.getByText(/Door sale NLe 80 recorded/).waitFor({ timeout: 3000 });
});
await step("same wristband again = ALREADY INSIDE", async () => {
  await scanCode("THRILL:" + code());
  await page.getByText("ALREADY INSIDE").waitFor({ timeout: 3000 });
});
await step("organizer dashboard shows door sale + stock", async () => {
  await go("/organizer");
  await page.getByText("1/50").waitFor({ timeout: 3000 });
  await page.getByText(/Stock: 4 unsold · 1 activated/).waitFor({ timeout: 3000 });
});
await step("buyer: new event visible in feed", async () => {
  await go("/");
  await page.getByRole("button", { name: "Search events" }).first().click();
  await page.getByPlaceholder("Search events, places, organizers").fill("aberdeen");
  await page.getByText("Aberdeen Sunset Jam").first().waitFor({ timeout: 4000 });
});
await step("buyer reports event", async () => {
  await page.getByRole("button", { name: "Event details" }).first().click();
  await page.getByText("Verified by THRILL").waitFor({ timeout: 3000 });
  await page.getByRole("button", { name: /Report this event/ }).click();
  await page.getByRole("button", { name: "Looks like a scam" }).click();
});
await step("admin sees report and suspends -> hidden from feed", async () => {
  await go("/admin");
  await adminLogin();
  await page.getByRole("button", { name: /^Reports/ }).click();
  await page.getByText("Looks like a scam").waitFor({ timeout: 3000 });
  await page.getByRole("button", { name: "Suspend this event" }).click();
  await go("/");
  await page.getByRole("button", { name: "Search events" }).first().click();
  await page.getByPlaceholder("Search events, places, organizers").fill("aberdeen");
  await page.getByText("No events match.").waitFor({ timeout: 4000 });
});
await step("You tab: role switch + reset", async () => {
  await page.getByRole("button", { name: "Search events" }).first().click().catch(() => {});
  await page.getByRole("button", { name: "You", exact: true }).click();
  await page.getByText(/Using THRILL as/).waitFor({ timeout: 3000 });
});

console.log(results.join("\n"));
console.log("JS errors:", errors.length ? errors.slice(0, 5) : "none");
await browser.close();
