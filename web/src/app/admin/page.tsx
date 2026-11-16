"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Lock, Printer, Flag, CheckCircle2, XCircle, Ban, Undo2, LayoutDashboard, ScrollText } from "lucide-react";
import { ADMIN_PIN, makeCode, useAdmin, useAppState, type AppState, type PrintOrder } from "@/lib/store";

type Tab = "overview" | "organizers" | "events" | "orders" | "claims" | "reports" | "audit";

const NEXT: Partial<Record<PrintOrder["status"], { to: PrintOrder["status"]; label: string }>> = {
  requested: { to: "approved", label: "Approve" },
  approved: { to: "printing", label: "Start printing (create wristband codes)" },
  printing: { to: "ready", label: "Mark ready" },
  ready: { to: "delivered", label: "Mark delivered" },
};

const LOCK_KEY = "thrill:admin-lock";
const MAX_TRIES = 5;
const LOCK_MS = 5 * 60_000;

function readLock(): { n: number; until: number } {
  try {
    return JSON.parse(localStorage.getItem(LOCK_KEY) ?? "") as { n: number; until: number };
  } catch {
    return { n: 0, until: 0 };
  }
}
function writeLock(v: { n: number; until: number }) {
  try {
    localStorage.setItem(LOCK_KEY, JSON.stringify(v));
  } catch {
    /* storage blocked */
  }
}

export default function Admin() {
  const [isAdmin, setAdmin] = useAdmin();
  const [pin, setPin] = useState("");
  const [msg, setMsg] = useState("");
  const [app, update] = useAppState();
  const [tab, setTab] = useState<Tab>("overview");
  const [note, setNote] = useState("");

  /** Runs a change and writes it to the audit log in the same step. */
  const act = (action: string, fn: (s: AppState) => AppState) =>
    update((s) => ({ ...fn(s), audit: [...s.audit, { at: Date.now(), action }].slice(-500) }));

  function tryPin() {
    const lock = readLock();
    if (lock.until > Date.now()) return setMsg(`Too many wrong tries. Wait ${Math.ceil((lock.until - Date.now()) / 60000)} min.`);
    if (pin === ADMIN_PIN) {
      writeLock({ n: 0, until: 0 });
      setMsg("");
      setPin("");
      act("Admin signed in", (s) => s);
      return setAdmin(true);
    }
    const n = lock.n + 1;
    if (n >= MAX_TRIES) {
      writeLock({ n: 0, until: Date.now() + LOCK_MS });
      return setMsg("Too many wrong tries. Locked for 5 minutes.");
    }
    writeLock({ n, until: 0 });
    setMsg(`Wrong PIN. ${MAX_TRIES - n} tr${MAX_TRIES - n === 1 ? "y" : "ies"} left.`);
  }

  if (!isAdmin) {
    return (
      <main className="mx-auto min-h-dvh w-full max-w-md bg-night px-4 pt-5 text-ink">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-white/60"><ArrowLeft size={16} /> Back</Link>
        <div className="mt-10 text-center">
          <Lock className="mx-auto" size={40} />
          <h1 className="font-display mt-3 text-2xl font-extrabold">THRILL staff only</h1>
          <p className="mt-1 text-sm text-white/60">Sign in to verify organizers, approve print orders and review reports.</p>
          <input
            aria-label="Admin PIN"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={pin}
            onChange={(e) => { setPin(e.target.value); setMsg(""); }}
            onKeyDown={(e) => e.key === "Enter" && tryPin()}
            placeholder="PIN"
            className="glass mx-auto mt-5 block w-40 rounded-2xl px-4 py-3 text-center outline-none"
          />
          {msg && <p role="alert" className="mt-2 text-sm text-hot">{msg}</p>}
          <button onClick={tryPin} className="mt-4 rounded-2xl bg-white px-6 py-3 font-bold text-night">Enter</button>
          <p className="mt-6 text-[11px] text-white/35">Demo sign-in only. It is not real security. The real app uses a proper account login checked on the server.</p>
        </div>
      </main>
    );
  }

  const org = app.org;
  const pending = org?.status === "pending" ? 1 : 0;
  const openOrders = app.orders.filter((o) => o.status === "requested").length;
  const openClaims = app.claims.filter((c) => c.status === "open").length;
  const tabBtn = (id: Tab, label: string, n?: number) => (
    <button key={id} onClick={() => setTab(id)} aria-pressed={tab === id} className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold ${tab === id ? "bg-white text-night" : "text-white/70"}`}>
      {label}{n ? ` (${n})` : ""}
    </button>
  );

  function advance(o: PrintOrder) {
    const step = NEXT[o.status];
    if (!step) return;
    act(`Print order ${o.id}: ${o.status} → ${step.to}`, (s) => {
      let wristbands = s.wristbands;
      // Printing creates the serial codes. Every code starts as STOCK, which is NOT valid for entry.
      if (step.to === "printing" && !wristbands.some((w) => w.orderId === o.id)) {
        const codes = new Set([...s.tickets.map((t) => t.code), ...s.wristbands.map((w) => w.code)]);
        const made = Array.from({ length: o.qty }, () => {
          let code = makeCode(o.evId);
          while (codes.has(code)) code = makeCode(o.evId);
          codes.add(code);
          return { code, evId: o.evId, orderId: o.id, state: "STOCK" as const };
        });
        wristbands = [...wristbands, ...made];
      }
      return { ...s, wristbands, orders: s.orders.map((x) => (x.id === o.id ? { ...x, status: step.to } : x)) };
    });
  }

  // Money overview. The 2% fee is already inside what buyers paid.
  const sales = app.tickets.filter((t) => t.status !== "REFUNDED");
  const gross = sales.reduce((n, t) => n + t.price - (t.balance ?? 0), 0);
  const fees = sales.reduce((n, t) => n + (t.price > 0 ? Math.round(t.price - t.price / 1.02) : 0), 0);
  const stat = (label: string, value: string | number, hint?: string) => (
    <div className="glass rounded-2xl p-3">
      <b className="font-display text-2xl">{value}</b>
      <p className="text-xs text-white/60">{label}</p>
      {hint && <p className="text-[10px] text-white/35">{hint}</p>}
    </div>
  );

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md bg-night px-4 pb-12 pt-5 text-ink">
      <div className="flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-white/60"><ArrowLeft size={16} /> Back</Link>
        <button onClick={() => { act("Admin signed out", (s) => s); setAdmin(false); }} className="text-xs text-white/50">Lock</button>
      </div>
      <h1 className="font-display mt-3 flex items-center gap-2 text-2xl font-extrabold"><ShieldCheck className="text-sl-green" /> THRILL admin</h1>
      <div role="group" aria-label="Admin sections" className="no-scrollbar mt-4 flex gap-1 overflow-x-auto rounded-2xl bg-white/10 p-1">
        {tabBtn("overview", "Overview")}
        {tabBtn("organizers", "Organizers", pending)}
        {tabBtn("events", "Events")}
        {tabBtn("orders", "Print", openOrders)}
        {tabBtn("claims", "Claims", openClaims)}
        {tabBtn("reports", "Reports", app.reports.length)}
        {tabBtn("audit", "Audit log")}
      </div>

      {tab === "overview" && (
        <div className="mt-4">
          <p className="flex items-center gap-2 text-sm text-white/60"><LayoutDashboard size={15} /> Today at a glance</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {stat("Organizers waiting", pending, pending ? "Open the Organizers tab" : "All clear")}
            {stat("Print orders waiting", openOrders)}
            {stat("Open reports", app.reports.length)}
            {stat("Open claims", openClaims, openClaims ? "Open the Claims tab" : "All clear")}
            {stat("Live organizer events", org?.status === "verified" ? app.customEvents.filter((e) => !e.suspended).length : 0)}
            {stat("Tickets sold", sales.length)}
            {stat("Sales (NLe)", gross.toLocaleString())}
            {stat("THRILL earnings (NLe)", fees.toLocaleString(), "2% fee inside sales")}
            {stat("Wristbands in stock", app.wristbands.filter((w) => w.state === "STOCK").length)}
          </div>
          <p className="mt-4 rounded-xl bg-white/5 p-3 text-[11px] text-white/50">Your routine: 1) verify new organizers, 2) approve print orders, 3) clear reports, 4) on event night watch the check-in page. The full guide is in docs/OWNER-GUIDE.md.</p>
        </div>
      )}

      {tab === "organizers" && (
        <div className="mt-4">
          {!org ? (
            <p className="text-sm text-white/50">No applications yet.</p>
          ) : (
            <div className="glass rounded-2xl p-4">
              <div className="flex items-start justify-between">
                <div>
                  <b className="font-display text-lg">{org.name}</b>
                  <p className="text-xs text-white/60">{org.phone}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${org.status === "verified" ? "bg-sl-green/25 text-sl-green" : org.status === "rejected" ? "bg-hot/25 text-hot" : "bg-gold/20 text-gold"}`}>{org.status}</span>
              </div>
              <p className="mt-2 text-xs text-white/70">{org.idType}: •••• {org.idLast4}</p>
              <p className="mt-2 text-sm text-white/80">{org.about}</p>
              <p className="mt-2 text-[11px] text-white/40">Applied {new Date(org.appliedAt).toLocaleString()}</p>
              <p className="mt-3 rounded-xl bg-white/5 p-2 text-[11px] text-white/50">Checklist before approving: call or WhatsApp the number, match the ID to the person, ask for a past event or a venue booking, and check their social page.</p>
              <input aria-label="Note to organizer" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="Optional note (shown if you reject)" className="mt-3 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-white/30" />
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button disabled={org.status === "verified"} onClick={() => act(`Verified organizer ${org.name}`, (s) => ({ ...s, org: s.org && { ...s.org, status: "verified", note: undefined } }))} className="flex items-center justify-center gap-2 rounded-xl bg-sl-green py-2.5 text-sm font-bold text-night disabled:opacity-40"><CheckCircle2 size={16} /> Verify</button>
                <button onClick={() => act(`Rejected organizer ${org.name}`, (s) => ({ ...s, org: s.org && { ...s.org, status: "rejected", note: note.trim() || undefined } }))} className="flex items-center justify-center gap-2 rounded-xl bg-hot py-2.5 text-sm font-bold"><XCircle size={16} /> Reject</button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "events" && (
        <ul className="mt-4 space-y-3">
          {app.customEvents.length === 0 && <p className="text-sm text-white/50">No organizer events yet.</p>}
          {app.customEvents.map((ev) => (
            <li key={ev.id} className="glass flex items-center justify-between gap-2 rounded-2xl p-4">
              <div>
                <b className="font-display">{ev.title}</b>
                <p className="text-xs text-white/60">{ev.organizer} · {ev.when}</p>
                <p className="text-[11px] text-white/40">{ev.cancelled ? "Cancelled. All tickets refunded." : org?.status === "verified" ? (ev.suspended ? "Hidden from feed" : "Live in feed") : "Not public: organizer not verified"}</p>
              </div>
              <button onClick={() => act(`${ev.suspended ? "Restored" : "Suspended"} event ${ev.id}`, (s) => ({ ...s, customEvents: s.customEvents.map((e) => (e.id === ev.id ? { ...e, suspended: !e.suspended } : e)) }))} className="flex items-center gap-1 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold">
                {ev.suspended ? <><Undo2 size={14} /> Restore</> : <><Ban size={14} /> Suspend</>}
              </button>
              {!ev.cancelled && (
                <button
                  onClick={() => {
                    const n = app.tickets.filter((t) => t.evId === ev.id && t.status !== "REFUNDED").length;
                    if (window.confirm(`Cancel "${ev.title}" and refund all ${n} ticket${n === 1 ? "" : "s"}? This cannot be undone.`)) {
                      act(`Cancelled event ${ev.id} and refunded ${n} ticket${n === 1 ? "" : "s"}`, (st) => ({
                        ...st,
                        customEvents: st.customEvents.map((e) => (e.id === ev.id ? { ...e, cancelled: true } : e)),
                        tickets: st.tickets.map((t) => (t.evId === ev.id && t.status !== "REFUNDED" ? { ...t, status: "REFUNDED" as const, balance: undefined, payBy: undefined } : t)),
                      }));
                    }
                  }}
                  className="ml-1 flex items-center gap-1 rounded-xl bg-hot/30 px-3 py-2 text-xs font-semibold"
                >
                  Cancel + refund all
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {tab === "orders" && (
        <ul className="mt-4 space-y-3">
          {app.orders.length === 0 && <p className="text-sm text-white/50">No print orders yet.</p>}
          {app.orders.map((o) => {
            const ev = app.customEvents.find((e) => e.id === o.evId);
            const step = NEXT[o.status];
            return (
              <li key={o.id} className="glass rounded-2xl p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <b className="font-mono text-sm">{o.id}</b>
                    <p className="text-sm">{ev?.title ?? o.evId}</p>
                    <p className="text-xs text-white/60">{o.qty} × {o.style === "wristband" ? "wristbands" : "ticket cards"}</p>
                  </div>
                  <span className="rounded-full bg-gold/20 px-2 py-0.5 text-xs font-bold text-gold">{o.status}</span>
                </div>
                <div className="mt-3 grid gap-2">
                  {step && <button onClick={() => advance(o)} className="rounded-xl bg-white py-2.5 text-sm font-bold text-night">{step.label}</button>}
                  {(o.status === "printing" || o.status === "ready" || o.status === "delivered") && (
                    <Link href={`/print?order=${o.id}`} className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-hot to-sunset py-2.5 text-sm font-bold"><Printer size={16} /> Open print batch</Link>
                  )}
                  {o.status === "requested" && (
                    <button onClick={() => act(`Declined print order ${o.id}`, (s) => ({ ...s, orders: s.orders.map((x) => (x.id === o.id ? { ...x, status: "declined" } : x)) }))} className="rounded-xl border border-white/20 py-2 text-sm">Decline</button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {tab === "reports" && (
        <ul className="mt-4 space-y-3">
          {app.reports.length === 0 && <p className="text-sm text-white/50">No reports. Good.</p>}
          {app.reports.map((r, i) => (
            <li key={i} className="glass rounded-2xl p-4">
              <p className="flex items-center gap-2 text-sm font-semibold"><Flag size={14} className="text-hot" /> {r.reason}</p>
              <p className="text-xs text-white/60">Event {r.evId} · {new Date(r.at).toLocaleString()}</p>
              {app.customEvents.some((e) => e.id === r.evId) && (
                <button onClick={() => act(`Suspended event ${r.evId} after report "${r.reason}"`, (s) => ({ ...s, customEvents: s.customEvents.map((e) => (e.id === r.evId ? { ...e, suspended: true } : e)) }))} className="mt-2 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-semibold">Suspend this event</button>
              )}
              <button onClick={() => act(`Dismissed report on ${r.evId}`, (s) => ({ ...s, reports: s.reports.filter((_, j) => j !== i) }))} className="ml-2 mt-2 rounded-xl border border-white/20 px-3 py-1.5 text-xs">Dismiss</button>
            </li>
          ))}
        </ul>
      )}

      {tab === "claims" && (
        <ul className="mt-4 space-y-3">
          {app.claims.length === 0 && <p className="text-sm text-white/50">No claims. Good.</p>}
          {[...app.claims].reverse().map((c) => {
            const ev = [...app.customEvents].find((e) => e.id === c.evId);
            return (
              <li key={c.id} className="glass rounded-2xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{c.reason}</p>
                    <p className="text-xs text-white/60">{ev?.title ?? c.evId} · <span className="font-mono">{c.code}</span></p>
                    <p className="text-[11px] text-white/40">{new Date(c.at).toLocaleString()}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${c.status === "open" ? "bg-gold/20 text-gold" : c.status === "refunded" ? "bg-sl-green/25 text-sl-green" : "bg-hot/25 text-hot"}`}>{c.status}</span>
                </div>
                {c.status === "open" && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => act(`Refunded claim ${c.id} (${c.reason})`, (st) => ({
                        ...st,
                        claims: st.claims.map((x) => (x.id === c.id ? { ...x, status: "refunded" as const, note: "THRILL refunded this ticket." } : x)),
                        tickets: st.tickets.map((t) => (t.code === c.code ? { ...t, status: "REFUNDED" as const, balance: undefined, payBy: undefined } : t)),
                      }))}
                      className="rounded-xl bg-sl-green py-2.5 text-sm font-bold text-night"
                    >
                      Refund ticket
                    </button>
                    <button
                      onClick={() => act(`Rejected claim ${c.id}`, (st) => ({ ...st, claims: st.claims.map((x) => (x.id === c.id ? { ...x, status: "rejected" as const, note: note.trim() || "THRILL could not confirm the problem." } : x)) }))}
                      className="rounded-xl bg-hot py-2.5 text-sm font-bold"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </li>
            );
          })}
          {app.claims.some((c) => c.status === "open") && (
            <input aria-label="Reason shown to the buyer when you reject" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="Reason shown to the buyer if you reject" className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-white/30" />
          )}
        </ul>
      )}

      {tab === "audit" && (
        <div className="mt-4">
          <p className="flex items-center gap-2 text-sm text-white/60"><ScrollText size={15} /> Every admin decision, newest first</p>
          <ul className="mt-3 space-y-2">
            {app.audit.length === 0 && <p className="text-sm text-white/50">Nothing yet.</p>}
            {[...app.audit].reverse().slice(0, 100).map((a, i) => (
              <li key={i} className="glass rounded-xl px-3 py-2 text-xs">
                <span className="text-white/50">{new Date(a.at).toLocaleString()}</span>
                <p>{a.action}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
