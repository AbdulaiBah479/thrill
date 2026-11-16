// Unit-tests the real door rules (web/src/lib/gate.ts) by compiling it with the project's TypeScript.
const ts = require("typescript");
const fs = require("fs");
const src = fs.readFileSync(require("path").join(__dirname, "..", "src", "lib", "gate.ts"), "utf8");
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: "ES2020" } }).outputText;
const m = { exports: {} };
const stub = { stateOf: (t) => (t.status === "CLAIMED" ? "IN" : t.status ?? "PAID") };
new Function("module", "exports", "require", js)(m, m.exports, (n) => (n === "./store" ? stub : {}));
const { parseScan, decide, SLOT_MS, MIN_DWELL_MS, REENTRY_COOLDOWN_MS, MAX_ENTRIES, doorReport } = m.exports;

let fail = 0;
const eq = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fail++; console.log((ok ? "PASS " : "FAIL ") + name + (ok ? "" : ` :: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`)); };

const now = 1_800_000_000_000;
const slot = Math.floor(now / SLOT_MS);
const entry = { id: "e", evId: "*", name: "E", pin: "1", gate: "entry" };
const exit_ = { id: "x", evId: "*", name: "X", pin: "2", gate: "exit" };
const ev = { id: "SUM", reentry: true };
const noRe = { id: "SUM", reentry: false };
const T = (o) => ({ code: "SUM-AAAA-BBBB", evId: "SUM", tier: "R", price: 1, method: "x", at: 0, ...o });

// parsing
eq("camera live token fresh", parseScan(`THRILL:SUM-AAAA-BBBB:${slot}`, "camera", now), { code: "SUM-AAAA-BBBB", how: "live", stale: false });
eq("camera live token 1 slot old still ok", parseScan(`THRILL:SUM-AAAA-BBBB:${slot - 1}`, "camera", now).stale, false);
eq("screenshot 5 min old is stale", parseScan(`THRILL:SUM-AAAA-BBBB:${slot - 10}`, "camera", now).stale, true);
eq("token from the future is stale", parseScan(`THRILL:SUM-AAAA-BBBB:${slot + 5}`, "camera", now).stale, true);
eq("printed QR is static", parseScan("THRILL:SUM-AAAA-BBBB", "camera", now).how, "static");
eq("typed is always typed, even if it looks like a live token", parseScan(`THRILL:SUM-AAAA-BBBB:${slot}`, "typed", now).how, "typed");
eq("typed lowercase normalised", parseScan(" sum-aaaa-bbbb ", "typed", now).code, "SUM-AAAA-BBBB");

const live = { code: "SUM-AAAA-BBBB", how: "live", stale: false };
const stat = { ...live, how: "static" };
const typed = { ...live, how: "typed" };
const stale = { ...live, stale: true };

// entry gate
eq("entry: paid ticket admitted", decide("entry", T({}), ev, entry, live, now).kind, "admit");
eq("entry: stale code refused", decide("entry", T({}), ev, entry, stale, now).kind, "stale");
eq("entry: already inside", decide("entry", T({ status: "IN", log: [{ at: now - 1, act: "IN" }] }), ev, entry, live, now).kind, "inside");
const out = (ago, extra = {}) => T({ status: "OUT", entries: 1, log: [{ at: now - ago - 1000, act: "IN" }, { at: now - ago, act: "OUT" }], ...extra });
eq("entry: re-entry straight after leaving = too soon", decide("entry", out(30_000), ev, entry, live, now).kind, "toosoon");
eq("entry: re-entry after cooldown with live code ok", decide("entry", out(REENTRY_COOLDOWN_MS + 1000), ev, entry, live, now).kind, "readmit");
eq("entry: re-entry by TYPED code needs manager", decide("entry", out(REENTRY_COOLDOWN_MS + 1000), ev, entry, typed, now).kind, "manager");
eq("entry: no re-entry event", decide("entry", out(REENTRY_COOLDOWN_MS + 1000), noRe, entry, live, now).kind, "noreentry");
eq("entry: 4th entry used up", decide("entry", out(REENTRY_COOLDOWN_MS + 1000, { entries: MAX_ENTRIES }), ev, entry, live, now).kind, "maxentries");
eq("entry: ticket for another event refused", decide("entry", T({ evId: "OTH" }), ev, { ...entry, evId: "SUM" }, live, now).kind, "wrongevent");
eq("entry: staff of event A refused on event B ticket", decide("entry", T({ evId: "B" }), ev, { ...entry, evId: "A" }, live, now).kind, "wrongevent");

// exit gate: the fraud cases
const inside = (ago) => T({ status: "IN", entries: 1, log: [{ at: now - ago, act: "IN" }] });
eq("exit: guest inside 10 min with live code released", decide("exit", inside(10 * 60_000), ev, exit_, live, now).kind, "letout");
eq("exit: static (wristband camera scan) released", decide("exit", inside(10 * 60_000), ev, exit_, stat, now).kind, "letout");
eq("exit: TYPED code needs manager (promoter alone cannot mark someone out)", decide("exit", inside(10 * 60_000), ev, exit_, typed, now).kind, "manager");
eq("exit: inside only 30s needs manager", decide("exit", inside(30_000), ev, exit_, live, now).kind, "manager");
eq("exit: just under the 2-minute line needs manager", decide("exit", inside(MIN_DWELL_MS - 1), ev, exit_, live, now).kind, "manager");
eq("exit: exactly 2 minutes is fine", decide("exit", inside(MIN_DWELL_MS), ev, exit_, live, now).kind, "letout");
eq("exit: stale screenshot refused", decide("exit", inside(10 * 60_000), ev, exit_, stale, now).kind, "stale");
eq("exit: ticket not inside", decide("exit", T({}), ev, exit_, live, now).kind, "notinside");
eq("exit: already outside", decide("exit", out(10 * 60_000), ev, exit_, live, now).kind, "notinside");

// pay in parts: money still owed means the ticket is not valid at either gate
const owing = (o = {}) => T({ balance: 68, payBy: now + 86_400_000, ...o });
eq("unpaid: entry refused with the amount owed", decide("entry", owing(), ev, entry, live, now), { kind: "unpaid", owe: 68, overdue: false });
eq("unpaid: overdue is flagged", decide("entry", owing({ payBy: now - 1000 }), ev, entry, live, now).overdue, true);
eq("unpaid: exit gate refuses too", decide("exit", owing({ status: "IN", log: [{ at: now - 600000, act: "IN" }] }), ev, exit_, live, now).kind, "unpaid");
eq("unpaid: balance 0 is valid", decide("entry", T({ balance: 0 }), ev, entry, live, now).kind, "admit");
eq("unpaid: stale code is still reported as stale first", decide("entry", owing(), ev, entry, stale, now).kind, "stale");

// refunded tickets are void at both gates
const refunded = T({ status: "REFUNDED" });
eq("refunded: entry refused", decide("entry", refunded, ev, entry, live, now).kind, "void");
eq("refunded: exit refused", decide("exit", refunded, ev, exit_, live, now).kind, "void");
eq("refunded: a stale code is still reported as stale first", decide("entry", refunded, ev, entry, stale, now).kind, "stale");

// reporting
const crook = (i) => T({ code: `SUM-Q${i}-W`, status: "OUT", log: [{ at: now - 60_000, act: "IN", by: "Crook", how: "static" }, { at: now - 30_000, act: "OUT", by: "Crook", how: "override" }] });
const r = doorReport([crook(1), crook(2), T({ status: "IN", log: [{ at: now - 1, act: "IN", by: "Ann", how: "live" }] })], "SUM");
eq("report: inside count", r.inside, 1);
eq("report: quick exits counted", r.quickExits, 2);
eq("report: override flag raised for the person", r.flags.some((f) => /Crook used manager override 2 times/.test(f)), true);

console.log(fail ? `\n${fail} FAILED` : "\nALL DOOR RULES PASS");
process.exit(fail ? 1 : 0);
