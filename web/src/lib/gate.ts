import { stateOf, type Staff, type Ticket } from "./store";
import type { Ev } from "./events";

/**
 * Door rules. One place, so the app and the database (supabase/schema.sql) follow the same logic.
 *
 * The fraud being stopped: a dishonest promoter marks a guest as OUT while they are still inside, then the
 * same ticket (or a copy) lets a second person in. Each rule below closes one way of doing that.
 */
export const SLOT_MS = 30_000; // the phone QR changes every 30 seconds
export const MIN_DWELL_MS = 2 * 60_000; // someone must be inside this long before an exit can be recorded
export const REENTRY_COOLDOWN_MS = 2 * 60_000; // wait this long after leaving before coming back
export const MAX_ENTRIES = 4; // first entry + 3 re-entries
export const DEMO_MANAGER_PIN = "9999"; // for the sample events; organizers set their own

/** Sample staff so the demo events can be tried. Real events use staff the organizer adds. */
export const DEMO_STAFF: Staff[] = [
  { id: "demo-in", evId: "*", name: "Demo Entry", pin: "1111", gate: "entry" },
  { id: "demo-out", evId: "*", name: "Demo Exit", pin: "2222", gate: "exit" },
];

export type How = "live" | "static" | "typed";
export type Parsed = { code: string; how: How; stale: boolean };

/**
 * live   = the refreshing phone QR (THRILL:CODE:slot), must be fresh, so screenshots fail
 * static = a printed ticket or wristband QR scanned by the camera
 * typed  = a code typed by hand. Allowed to let someone in when their phone is dead, never to let someone out.
 */
export function parseScan(raw: string, source: "typed" | "camera", now: number): Parsed {
  const t = raw.trim().toUpperCase();
  const m = /^THRILL:([A-Z0-9-]+)(?::(\d+))?$/.exec(t);
  const code = m ? m[1] : t.split(":")[0];
  if (source === "typed") return { code, how: "typed", stale: false };
  const slot = m?.[2] ? Number(m[2]) : null;
  if (slot === null) return { code, how: "static", stale: false };
  return { code, how: "live", stale: Math.abs(Math.floor(now / SLOT_MS) - slot) > 1 };
}

export type Decision =
  | { kind: "admit" }
  | { kind: "readmit" }
  | { kind: "letout" }
  | { kind: "inside"; at?: number }
  | { kind: "noreentry"; at?: number }
  | { kind: "notinside" }
  | { kind: "stale" }
  | { kind: "wrongevent" }
  | { kind: "unpaid"; owe: number; overdue: boolean }
  | { kind: "void" }
  | { kind: "maxentries" }
  | { kind: "toosoon"; waitMs: number }
  | { kind: "manager"; why: string; then: "readmit" | "letout" };

export const lastOf = (t: Ticket, act: "IN" | "OUT") => [...(t.log ?? [])].reverse().find((l) => l.act === act)?.at ?? (act === "IN" ? t.claimedAt : undefined);

export function decide(mode: "entry" | "exit", t: Ticket, ev: Ev | undefined, staff: Staff, p: Parsed, now: number): Decision {
  if (staff.evId !== "*" && staff.evId !== t.evId) return { kind: "wrongevent" };
  if (p.stale) return { kind: "stale" };
  if (t.status === "REFUNDED") return { kind: "void" };
  // Bought in parts and not fully paid: not valid yet, at either gate.
  if ((t.balance ?? 0) > 0) return { kind: "unpaid", owe: t.balance as number, overdue: !!t.payBy && now > t.payBy };
  const st = stateOf(t);

  if (mode === "entry") {
    if (st === "PAID") return { kind: "admit" };
    if (st === "IN") return { kind: "inside", at: lastOf(t, "IN") };
    // st === "OUT": coming back in
    if (ev?.reentry === false) return { kind: "noreentry", at: lastOf(t, "OUT") };
    if ((t.entries ?? 1) >= MAX_ENTRIES) return { kind: "maxentries" };
    const out = lastOf(t, "OUT") ?? 0;
    if (now - out < REENTRY_COOLDOWN_MS) return { kind: "toosoon", waitMs: REENTRY_COOLDOWN_MS - (now - out) };
    if (p.how === "typed") return { kind: "manager", why: "Re-entry by typed code", then: "readmit" };
    return { kind: "readmit" };
  }

  // exit gate
  if (st !== "IN") return { kind: "notinside" };
  if (p.how === "typed") return { kind: "manager", why: "A typed code cannot let someone out", then: "letout" };
  const inAt = lastOf(t, "IN") ?? 0;
  if (now - inAt < MIN_DWELL_MS) return { kind: "manager", why: "Inside for under 2 minutes", then: "letout" };
  return { kind: "letout" };
}

/** Door statistics and warning flags for the organizer. */
export function doorReport(tickets: Ticket[], evId: string) {
  const mine = tickets.filter((t) => t.evId === evId);
  const by: Record<string, { admits: number; exits: number; overrides: number }> = {};
  let quickExits = 0;
  for (const t of mine) {
    let lastIn = 0;
    for (const l of t.log ?? []) {
      const who = (by[l.by ?? "unknown"] ??= { admits: 0, exits: 0, overrides: 0 });
      if (l.act === "IN") {
        who.admits++;
        lastIn = l.at;
      } else {
        who.exits++;
        if (l.at - lastIn < MIN_DWELL_MS) quickExits++;
      }
      if (l.how === "override") who.overrides++;
    }
  }
  const inside = mine.filter((t) => stateOf(t) === "IN").length;
  const flags: string[] = [];
  Object.entries(by).forEach(([name, s]) => {
    if (s.overrides >= 2) flags.push(`${name} used manager override ${s.overrides} times. Review.`);
  });
  if (quickExits > 0) flags.push(`${quickExits} guest${quickExits === 1 ? "" : "s"} were let out within 2 minutes of entering.`);
  return { inside, by, quickExits, flags };
}
