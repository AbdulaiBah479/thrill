import type { Ev } from "./events";
import { useCallback, useMemo, useSyncExternalStore } from "react";

export type Ticket = {
  code: string;
  evId: string;
  tier: string;
  price: number;
  method: string;
  at: number;
  promo?: string;
  rating?: number; // 1-5 stars given after the event
  giftCode?: string; // while set, the ticket is waiting to be claimed by a friend
  balance?: number; // NLe still to pay when the ticket was bought in parts. The pass is locked until it is 0
  payBy?: number; // deadline for the balance
  promoter?: string; // sales-team code that brought this buyer
  status?: "PAID" | "IN" | "OUT" | "CLAIMED" | "REFUNDED"; // CLAIMED is the old name for IN
  claimedAt?: number;
  entries?: number; // how many times this ticket was admitted (first entry + re-entries)
  log?: { at: number; act: "IN" | "OUT"; by?: string; how?: "live" | "static" | "typed" | "override" }[]; // who did what, and how
};

/** PAID = not used yet, IN = inside now, OUT = stepped out (may be allowed back). */
export function stateOf(t: Ticket): "PAID" | "IN" | "OUT" | "REFUNDED" {
  return t.status === "CLAIMED" ? "IN" : (t.status ?? "PAID");
}

/** Tickets that still count: a refunded ticket is not a sale, not a night out, and not valid. */
export const counted = (tickets: Ticket[]) => tickets.filter((t) => t.status !== "REFUNDED");

export type Role = "" | "buyer" | "organizer";

export type OrgProfile = {
  name: string;
  phone: string;
  idType: string;
  idLast4: string; // demo keeps only the last 4 digits; the real app stores an encrypted ID photo for admins only
  about: string;
  status: "pending" | "verified" | "rejected";
  note?: string;
  appliedAt: number;
};

export type PrintOrder = {
  id: string;
  evId: string;
  qty: number;
  style: "wristband" | "ticket";
  notes: string;
  status: "requested" | "approved" | "printing" | "ready" | "delivered" | "declined";
  at: number;
};

/** Pre-printed THRILL wristband. Worthless (STOCK) until a promoter activates it at the door. */
export type Wristband = { code: string; evId: string; orderId: string; state: "STOCK" | "ACTIVE" };

/** Door staff. A promoter is locked to ONE gate, so an entry promoter can never record an exit. */
export type Staff = { id: string; evId: string; name: string; pin: string; gate: "entry" | "exit" };

/** A door promoter asking the organizer for help. */
export type DoorAlert = { at: number; by: string; evId: string; msg: string };

/** A street-team seller. Sales made with their code earn them a commission. */
export type Promoter = { id: string; evId: string; name: string; code: string; pct: number };

/** The Night Fund: money set aside for nights out. In this demo it is a tracker only. Holding real money needs a licensed partner. */
export type Fund = { balance: number; goal: number; roundUp: boolean; history: { at: number; amt: number; note: string }[] };

/** THRILL Guarantee: a buyer's problem with a ticket, reviewed by THRILL. */
export type Claim = { id: string; code: string; evId: string; reason: string; at: number; status: "open" | "refunded" | "rejected"; note?: string };

export type Report = { evId: string; reason: string; at: number };

/** Every admin decision is written here so staff actions can be reviewed later. */
export type AuditEntry = { at: number; action: string };

export type AppState = {
  role: Role;
  org: OrgProfile | null;
  orders: PrintOrder[];
  wristbands: Wristband[];
  reports: Report[];
  audit: AuditEntry[];
  staff: Staff[];
  alerts: DoorAlert[];
  promoters: Promoter[];
  fund: Fund;
  claims: Claim[];
  squads: Record<string, { name: string; paid: boolean }[]>; // event id -> friends and who has paid their share
  follows: string[]; // organizer names the buyer follows
  trusted: { name: string; phone: string } | null; // who gets the safe-night and SOS messages
  managerPins: Record<string, string>; // event id -> manager override PIN
  saved: string[];
  tickets: Ticket[];
  city: string;
  name: string;
  waitlist: string[];
  customEvents: Ev[];
};

const KEY = "thrill:v1";
export const EMPTY: AppState = { role: "", org: null, orders: [], wristbands: [], reports: [], audit: [], staff: [], alerts: [], promoters: [], fund: { balance: 0, goal: 0, roundUp: false, history: [] }, claims: [], squads: {}, follows: [], trusted: null, managerPins: {}, saved: [], tickets: [], city: "All", name: "", waitlist: [], customEvents: [] };

// Kept in memory too, so the app still works if the browser blocks storage.
let memory: string | null = null;
const listeners = new Set<() => void>();

function read(): string {
  if (memory !== null) return memory;
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

const LISTS = ["claims", "promoters", "follows", "orders", "wristbands", "reports", "audit", "staff", "alerts", "saved", "tickets", "waitlist", "customEvents"] as const;

function parse(raw: string): AppState {
  try {
    const data = JSON.parse(raw);
    if (!raw || typeof data !== "object" || data === null || Array.isArray(data)) return EMPTY;
    const out = { ...EMPTY, ...data } as AppState;
    // A wrong type here (from old or edited data) would crash the screens, so fall back to empty.
    for (const k of LISTS) if (!Array.isArray(out[k])) (out as unknown as Record<string, unknown>)[k] = [];
    if (typeof out.managerPins !== "object" || out.managerPins === null || Array.isArray(out.managerPins)) out.managerPins = {};
    if (out.role !== "" && out.role !== "buyer" && out.role !== "organizer") out.role = "";
    if (typeof out.city !== "string") out.city = "All";
    if (typeof out.name !== "string") out.name = "";
    const f = out.fund as unknown as Record<string, unknown> | null;
    if (!f || typeof f.balance !== "number" || !Array.isArray(f.history)) out.fund = EMPTY.fund;
    if (typeof out.squads !== "object" || out.squads === null || Array.isArray(out.squads)) out.squads = {};
    const tr = out.trusted as unknown as { name?: unknown; phone?: unknown } | null;
    if (!tr || typeof tr.name !== "string" || typeof tr.phone !== "string") out.trusted = null;
    return out;
  } catch {
    return EMPTY;
  }
}

export function useAppState() {
  const raw = useSyncExternalStore(subscribe, read, () => "");
  const state = useMemo(() => parse(raw), [raw]);

  const update = useCallback((fn: (s: AppState) => AppState) => {
    const next = JSON.stringify(fn(parse(read())));
    memory = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* storage blocked: memory copy is enough for this session */
    }
    listeners.forEach((l) => l());
  }, []);

  return [state, update] as const;
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function makeCode(prefix: string) {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const c = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
  return `${prefix}-${c.slice(0, 4)}-${c.slice(4)}`;
}

const noopSub = () => () => {};
/** False during server render, true once the app is running in the browser. */
export function useHydrated() {
  return useSyncExternalStore(noopSub, () => true, () => false);
}

// Demo admin session. The real app uses a proper admin login; this PIN is visible in the code and is NOT secure.
// Set NEXT_PUBLIC_ADMIN_PIN in web/.env.local. Anything NEXT_PUBLIC_ is visible to every visitor, so this is a speed bump, not security.
export const ADMIN_PIN = process.env.NEXT_PUBLIC_ADMIN_PIN || "2468";
const adminSubs = new Set<() => void>();
export function useAdmin() {
  const on = useSyncExternalStore(
    (cb) => { adminSubs.add(cb); return () => { adminSubs.delete(cb); }; },
    () => { try { return sessionStorage.getItem("thrill:admin") === "1"; } catch { return false; } },
    () => false,
  );
  const set = (v: boolean) => {
    try {
      if (v) sessionStorage.setItem("thrill:admin", "1");
      else sessionStorage.removeItem("thrill:admin");
    } catch {
      /* session storage blocked */
    }
    adminSubs.forEach((f) => f());
  };
  return [on, set] as const;
}

/** Average stars and count for one event, from ratings given by ticket holders. */
export function ratingOf(tickets: Ticket[], evId: string) {
  const r = tickets.filter((t) => t.evId === evId && t.rating).map((t) => t.rating as number);
  return { count: r.length, avg: r.length ? r.reduce((a, b) => a + b, 0) / r.length : 0 };
}

/** A short code like BIN7K2 made from a name. Letters and numbers only, no look-alike characters. */
export function nameCode(name: string) {
  const letters = name.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3).padEnd(3, "X");
  const bytes = crypto.getRandomValues(new Uint8Array(3));
  return letters + Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}
