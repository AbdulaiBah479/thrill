"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Store, Plus, Trash2, Download, Info, BadgeCheck, Clock, XCircle, Package, ShoppingBag, KeyRound, TriangleAlert, UserPlus, CircleCheck, Circle, LifeBuoy, Megaphone } from "lucide-react";
import { nameCode, ratingOf, stateOf, useAppState, type PrintOrder, type Staff } from "@/lib/store";
import { doorReport } from "@/lib/gate";
import { CITIES, CREATE_CATEGORIES, EVENTS, PRESET_COLORS, patternFor, type Ev, type Tier } from "@/lib/events";

const CITY_OPTIONS = CITIES.filter((c) => c !== "All");
const field = "w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm outline-none placeholder:text-white/30";

const ORDER_LABEL: Record<PrintOrder["status"], string> = {
  requested: "Requested",
  approved: "Approved by THRILL",
  printing: "Being printed",
  ready: "Ready for pickup",
  delivered: "Delivered",
  declined: "Declined",
};

function csvCell(v: string | number) {
  let s = String(v);
  // A cell starting with = + - @ can run as a formula in Excel. A leading quote makes it plain text.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function Organizer() {
  const [app, update] = useAppState();

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md bg-night px-4 pb-12 pt-5 text-ink">
      <div className="flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-white/60"><ArrowLeft size={16} /> Back</Link>
        <Link href="/" onClick={() => update((s) => ({ ...s, role: "buyer" }))} className="inline-flex items-center gap-1 text-xs text-white/50">
          <ShoppingBag size={13} /> Switch to buyer view
        </Link>
      </div>
      <h1 className="font-display mt-3 flex items-center gap-2 text-2xl font-extrabold"><Store /> Organizer area</h1>

      {!app.org && <Apply />}
      {app.org?.status === "pending" && (
        <div className="glass mt-5 rounded-3xl p-5 text-center">
          <Clock className="mx-auto text-gold" size={40} />
          <h2 className="font-display mt-2 text-xl font-extrabold">Application under review</h2>
          <p className="mt-2 text-sm text-white/70">Thanks, {app.org.name}. THRILL checks every organizer before any event or ticket goes public. This protects buyers and honest organizers.</p>
          <p className="mt-3 text-xs text-white/40">Demo: the THRILL team approves you in the <Link href="/admin" className="underline">admin area</Link>.</p>
        </div>
      )}
      {app.org?.status === "rejected" && (
        <div className="glass mt-5 rounded-3xl border border-hot/40 p-5 text-center">
          <XCircle className="mx-auto text-hot" size={40} />
          <h2 className="font-display mt-2 text-xl font-extrabold">Not approved yet</h2>
          <p className="mt-2 text-sm text-white/70">{app.org.note || "THRILL could not verify the details you gave."}</p>
          <button onClick={() => update((s) => ({ ...s, org: null }))} className="mt-4 rounded-2xl bg-white px-5 py-2.5 text-sm font-bold text-night">Apply again</button>
        </div>
      )}
      {app.org?.status === "verified" && <Dashboard />}
    </main>
  );
}

function Apply() {
  const [, update] = useAppState();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [idType, setIdType] = useState("National ID");
  const [idNumber, setIdNumber] = useState("");
  const [about, setAbout] = useState("");
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState("");

  function submit() {
    if (name.trim().length < 3) return setError("Enter your full name or your company name.");
    if (phone.replace(/\D/g, "").length < 8) return setError("Enter a phone number buyers and THRILL can reach (WhatsApp is best).");
    if (idNumber.replace(/\s/g, "").length < 4) return setError("Enter your ID number.");
    if (about.trim().length < 15) return setError("Tell us a little about the events you run (at least a sentence).");
    if (!agree) return setError("Please confirm the information is true.");
    setError("");
    update((s) => ({
      ...s,
      org: { name: name.trim(), phone: phone.trim(), idType, idLast4: idNumber.replace(/\s/g, "").slice(-4), about: about.trim(), status: "pending", appliedAt: Date.now() },
    }));
  }

  return (
    <div className="mt-3">
      <p className="text-sm text-white/70">Apply once. THRILL checks your identity before your events go public. Verified organizers get a ✓ badge that buyers trust.</p>
      <p className="mt-2 flex gap-2 text-xs text-white/45"><Info size={14} className="mt-0.5 shrink-0" /> Demo: only the last 4 digits of your ID are kept, on this phone. The real app takes an ID photo, encrypted, visible only to THRILL admins.</p>
      <div className="mt-4 space-y-3">
        <input aria-label="Full name or company" className={field} placeholder="Full name or company name" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
        <input aria-label="Phone number" className={field} inputMode="tel" placeholder="Phone / WhatsApp number" maxLength={20} value={phone} onChange={(e) => setPhone(e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <select aria-label="ID type" className={field} value={idType} onChange={(e) => setIdType(e.target.value)}>
            {["National ID", "Passport", "Driver licence", "Company registration"].map((t) => <option key={t} value={t} className="text-black">{t}</option>)}
          </select>
          <input aria-label="ID number" className={field} placeholder="ID number" maxLength={30} value={idNumber} onChange={(e) => setIdNumber(e.target.value)} />
        </div>
        <textarea aria-label="About your events" className={field} rows={3} maxLength={500} placeholder="What events do you run? Past events, links, who you work with." value={about} onChange={(e) => setAbout(e.target.value)} />
        <label className="flex items-start gap-2 text-xs text-white/70">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 size-4 accent-[#ff2e88]" />
          I confirm this is true. I understand THRILL may reject or remove me, and may pay me out only after my events finish.
        </label>
        {error && <p role="alert" className="text-sm text-hot">{error}</p>}
        <button onClick={submit} className="w-full rounded-2xl bg-gradient-to-r from-hot to-sunset py-3.5 font-bold">Submit application</button>
      </div>
    </div>
  );
}

function Dashboard() {
  const [app, update] = useAppState();
  const [title, setTitle] = useState("");
  const [area, setArea] = useState("");
  const [city, setCity] = useState<string>("Freetown");
  const [category, setCategory] = useState<string>("Party");
  const [when, setWhen] = useState("");
  const [hours, setHours] = useState(4);
  const [capacity, setCapacity] = useState(200);
  const [blurb, setBlurb] = useState("");
  const [reentry, setReentry] = useState(true);
  const [tiers, setTiers] = useState<{ name: string; price: string }[]>([{ name: "Regular", price: "100" }]);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [staffForm, setStaffForm] = useState<Record<string, { name: string; pin: string; gate: "entry" | "exit" }>>({});
  const [staffMsg, setStaffMsg] = useState<Record<string, string>>({});
  const [teamForm, setTeamForm] = useState<Record<string, { name: string; pct: string }>>({});
  const [teamMsg, setTeamMsg] = useState<Record<string, string>>({});
  const [mgrIn, setMgrIn] = useState<Record<string, string>>({});
  const [orderQty, setOrderQty] = useState<Record<string, number>>({});
  const [orderStyle, setOrderStyle] = useState<Record<string, "wristband" | "ticket">>({});
  const org = app.org!;

  function makeId() {
    const letters = title.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3).padEnd(3, "X");
    const taken = new Set([...EVENTS, ...app.customEvents].map((e) => e.id));
    let id = letters;
    for (let n = 2; taken.has(id); n++) id = `${letters}${n}`;
    return id;
  }

  function create() {
    setDone("");
    const startAt = Date.parse(`${when}Z`); // Sierra Leone is on GMT
    const cleanTiers: Tier[] = tiers
      .filter((t) => t.name.trim())
      .map((t) => ({ name: t.name.trim(), price: Math.max(0, Math.round(Number(t.price) || 0)), perk: Number(t.price) > 0 ? "Entry" : "Free pass" }));
    if (!title.trim()) return setError("Add an event name.");
    if (!area.trim()) return setError("Add the venue or place.");
    if (!when || Number.isNaN(startAt)) return setError("Pick the date and time.");
    if (cleanTiers.length === 0) return setError("Add at least one ticket type.");
    if (!(capacity >= 1)) return setError("Capacity must be at least 1.");
    setError("");
    const day = new Date(startAt).toUTCString().slice(0, 3);
    const hh = new Date(startAt).getUTCHours();
    const ev: Ev = {
      id: makeId(),
      title: title.trim(),
      area: area.trim(),
      city,
      when: `${day} · ${hh % 12 || 12}:${String(new Date(startAt).getUTCMinutes()).padStart(2, "0")} ${hh >= 12 ? "PM" : "AM"}`,
      category,
      tiers: cleanTiers,
      going: 0,
      capacity,
      friends: [],
      verified: true,
      organizer: org.name,
      blurb: blurb.trim() || "Come and enjoy the night.",
      colors: PRESET_COLORS[category] ?? PRESET_COLORS.Other,
      pattern: patternFor(category),
      startAt,
      durationH: hours,
      custom: true,
      reentry,
    };
    update((s) => ({ ...s, customEvents: [...s.customEvents, ev] }));
    setDone(`"${ev.title}" is live in the feed with code ${ev.id}.`);
    setTitle("");
    setArea("");
    setBlurb("");
  }

  function order(ev: Ev) {
    const qty = Math.max(1, Math.min(5000, Math.round(orderQty[ev.id] ?? ev.capacity)));
    const o: PrintOrder = {
      id: `PO-${ev.id}-${String(app.orders.length + 1).padStart(3, "0")}`,
      evId: ev.id,
      qty,
      style: orderStyle[ev.id] ?? "wristband",
      notes: "",
      status: "requested",
      at: Date.now(),
    };
    update((s) => ({ ...s, orders: [...s.orders, o] }));
  }

  function addStaff(ev: Ev) {
    const f = staffForm[ev.id] ?? { name: "", pin: "", gate: "entry" as const };
    if (f.name.trim().length < 2) return setStaffMsg({ ...staffMsg, [ev.id]: "Enter the promoter's name." });
    if (!/^\d{4}$/.test(f.pin)) return setStaffMsg({ ...staffMsg, [ev.id]: "PIN must be exactly 4 digits." });
    if (app.staff.some((s) => s.evId === ev.id && s.pin === f.pin)) return setStaffMsg({ ...staffMsg, [ev.id]: "Another promoter already uses that PIN. Pick a different one." });
    const s: Staff = { id: `${ev.id}-${Date.now()}`, evId: ev.id, name: f.name.trim(), pin: f.pin, gate: f.gate };
    update((st) => ({ ...st, staff: [...st.staff, s] }));
    setStaffForm({ ...staffForm, [ev.id]: { name: "", pin: "", gate: f.gate } });
    setStaffMsg({ ...staffMsg, [ev.id]: `${s.name} added to the ${s.gate} gate.` });
  }

  function addSeller(ev: Ev) {
    const f = teamForm[ev.id] ?? { name: "", pct: "10" };
    const pct = Math.round(Number(f.pct));
    if (f.name.trim().length < 2) return setTeamMsg({ ...teamMsg, [ev.id]: "Enter the seller's name." });
    if (!(pct >= 1 && pct <= 50)) return setTeamMsg({ ...teamMsg, [ev.id]: "Commission must be between 1% and 50%." });
    let code = nameCode(f.name);
    while (app.promoters.some((p) => p.code === code)) code = nameCode(f.name);
    update((s) => ({ ...s, promoters: [...s.promoters, { id: `${ev.id}-${code}`, evId: ev.id, name: f.name.trim().slice(0, 30), code, pct }] }));
    setTeamForm({ ...teamForm, [ev.id]: { name: "", pct: f.pct } });
    setTeamMsg({ ...teamMsg, [ev.id]: `Code ${code} created for ${f.name.trim()}.` });
  }

  function saveManagerPin(ev: Ev) {
    const v = mgrIn[ev.id] ?? "";
    if (!/^\d{6}$/.test(v)) return setStaffMsg({ ...staffMsg, [ev.id]: "Manager PIN must be exactly 6 digits." });
    update((st) => ({ ...st, managerPins: { ...st.managerPins, [ev.id]: v } }));
    setMgrIn({ ...mgrIn, [ev.id]: "" });
    setStaffMsg({ ...staffMsg, [ev.id]: "Manager PIN saved. Only you should know it." });
  }

  function exportCsv(ev: Ev) {
    const rows = app.tickets.filter((t) => t.evId === ev.id);
    const head = ["code", "ticket", "paid_nle", "payment", "promo", "status", "bought_at"];
    const body = rows.map((t) => [t.code, t.tier, t.price, t.method, t.promo ?? "", stateOf(t), new Date(t.at).toISOString()]);
    const csv = [head, ...body].map((r) => r.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${ev.id}-attendees.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function remove(ev: Ev) {
    if (window.confirm(`Delete "${ev.title}"? Its tickets stay on this phone but the event disappears.`)) {
      update((s) => ({ ...s, customEvents: s.customEvents.filter((e) => e.id !== ev.id) }));
    }
  }

  return (
    <div>
      <p className="mt-2 flex items-center gap-2 text-sm text-sl-green"><BadgeCheck size={16} /> Verified by THRILL: {org.name}</p>
      <p className="mt-1 flex gap-2 text-xs text-white/50"><Info size={14} className="mt-0.5 shrink-0" /> Demo: data is saved on this phone only. Payouts are released after your event ends and THRILL has reviewed it.</p>

      {app.alerts.filter((a) => app.customEvents.some((e) => e.id === a.evId) || a.evId === "*").length > 0 && (
        <div role="alert" className="mt-4 rounded-2xl border border-hot/50 bg-hot/15 p-3">
          <p className="flex items-center gap-2 text-sm font-bold text-hot"><LifeBuoy size={15} /> Door staff need help</p>
          {app.alerts.filter((a) => app.customEvents.some((e) => e.id === a.evId) || a.evId === "*").map((a) => (
            <p key={a.at} className="mt-1 flex items-center justify-between text-xs">
              <span>{a.by}: {a.msg} ({new Date(a.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})</span>
              <button onClick={() => update((s) => ({ ...s, alerts: s.alerts.filter((x) => x.at !== a.at) }))} className="underline">done</button>
            </p>
          ))}
        </div>
      )}

      <h2 className="font-display mt-6 font-bold">Your events</h2>
      {app.customEvents.length === 0 ? (
        <p className="mt-2 text-sm text-white/50">You have not created an event yet.</p>
      ) : (
        <ul className="mt-2 space-y-3">
          {app.customEvents.map((ev) => {
            const sold = app.tickets.filter((t) => t.evId === ev.id && t.status !== "REFUNDED");
            const revenue = sold.reduce((n, t) => n + t.price - (t.balance ?? 0), 0);
            const inside = sold.filter((t) => stateOf(t) === "IN").length;
            const used = sold.filter((t) => stateOf(t) !== "PAID").length;
            const orders = app.orders.filter((o) => o.evId === ev.id);
            const stock = app.wristbands.filter((w) => w.evId === ev.id);
            const rate = ratingOf(app.tickets, ev.id);
            const door = doorReport(app.tickets, ev.id);
            const crew = app.staff.filter((s) => s.evId === ev.id);
            const f = staffForm[ev.id] ?? { name: "", pin: "", gate: "entry" as const };
            return (
              <li key={ev.id} className="glass rounded-2xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <b className="font-display">{ev.title}</b>
                    <p className="text-xs text-white/60">{ev.when} · {ev.area}, {ev.city}</p>
                    <p className="font-mono text-[11px] text-gold">Code prefix: {ev.id}{ev.suspended ? " · SUSPENDED by THRILL" : ""}{ev.cancelled ? " · CANCELLED, all tickets refunded" : ""}</p>
                  </div>
                  <button onClick={() => remove(ev)} aria-label={`Delete ${ev.title}`} className="rounded-full bg-white/10 p-2"><Trash2 size={14} /></button>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-xl bg-white/5 p-2"><b className="block text-lg">{sold.length}/{ev.capacity}</b>sold</div>
                  <div className="rounded-xl bg-white/5 p-2"><b className="block text-lg">{revenue}</b>NLe paid</div>
                  <div className="rounded-xl bg-white/5 p-2"><b className="block text-lg">{used}</b>entered ({inside} inside)</div>
                </div>

                {(() => {
                  const steps = [
                    { label: "Event details", done: true },
                    { label: "Ticket types", done: ev.tiers.length > 0 },
                    { label: "Entry and exit staff added", done: crew.some((s) => s.gate === "entry") && crew.some((s) => s.gate === "exit") },
                    { label: "Manager PIN set", done: !!app.managerPins[ev.id] },
                    { label: "Official wristbands ordered", done: orders.some((o) => o.status !== "declined") },
                    { label: "Live in the feed", done: !ev.suspended },
                  ];
                  const n = steps.filter((x) => x.done).length;
                  return (
                    <div className="mt-3 rounded-xl bg-white/5 p-3">
                      <p className="flex items-center justify-between text-sm font-semibold"><span>Event readiness</span><span className={n === steps.length ? "text-sl-green" : "text-gold"}>{n} of {steps.length}</span></p>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-gradient-to-r from-gold to-sl-green" style={{ width: `${(n / steps.length) * 100}%` }} /></div>
                      <ul className="mt-2 space-y-1 text-xs">
                        {steps.map((x) => (
                          <li key={x.label} className={`flex items-center gap-2 ${x.done ? "text-white/60" : "text-white"}`}>
                            {x.done ? <CircleCheck size={13} className="text-sl-green" /> : <Circle size={13} className="text-gold" />} {x.label}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })()}
                <p className="mt-2 text-xs text-white/60">{rate.count ? `Rating: ${rate.avg.toFixed(1)} / 5 from ${rate.count} ticket holder${rate.count === 1 ? "" : "s"}` : "No ratings yet. Guests can rate after the event."}</p>
                <div className="mt-3 rounded-xl bg-white/5 p-3">
                  <p className="flex items-center gap-2 text-sm font-semibold"><Package size={15} /> Official THRILL wristbands</p>
                  <p className="mt-1 text-[11px] text-white/50">THRILL prints every wristband and ticket in one uniform, numbered design. Blank wristbands only work after your promoter activates them at the door.</p>
                  <div className="mt-2 flex gap-2">
                    <input aria-label={`Quantity for ${ev.title}`} type="number" min={1} className={`${field} w-24`} value={orderQty[ev.id] ?? ev.capacity} onChange={(e) => setOrderQty({ ...orderQty, [ev.id]: +e.target.value })} />
                    <select aria-label={`Print style for ${ev.title}`} className={field} value={orderStyle[ev.id] ?? "wristband"} onChange={(e) => setOrderStyle({ ...orderStyle, [ev.id]: e.target.value as "wristband" | "ticket" })}>
                      <option value="wristband" className="text-black">Wristbands</option>
                      <option value="ticket" className="text-black">Ticket cards</option>
                    </select>
                  </div>
                  <button onClick={() => order(ev)} className="mt-2 w-full rounded-xl bg-white py-2 text-sm font-bold text-night">Order from THRILL</button>
                  {orders.map((o) => (
                    <p key={o.id} className="mt-2 flex items-center justify-between text-xs">
                      <span className="font-mono">{o.id} · {o.qty} {o.style === "wristband" ? "wristbands" : "tickets"}</span>
                      <span className={`rounded-full px-2 py-0.5 font-semibold ${o.status === "declined" ? "bg-hot/30 text-hot" : o.status === "delivered" || o.status === "ready" ? "bg-sl-green/25 text-sl-green" : "bg-gold/20 text-gold"}`}>{ORDER_LABEL[o.status]}</span>
                    </p>
                  ))}
                  {stock.length > 0 && (
                    <p className="mt-2 text-[11px] text-white/60">Stock: {stock.filter((w) => w.state === "STOCK").length} unsold · {stock.filter((w) => w.state === "ACTIVE").length} activated at the door</p>
                  )}
                </div>

                <div className="mt-3 rounded-xl bg-white/5 p-3">
                  <p className="flex items-center gap-2 text-sm font-semibold"><Megaphone size={15} /> Sales team and commissions</p>
                  <p className="mt-1 text-[11px] text-white/50">Give each street seller a code. Buyers type it at checkout. You see exactly who sold what, and the commission owed. No paper lists, no arguments.</p>
                  {app.promoters.filter((p) => p.evId === ev.id).map((p) => {
                    const mine = app.tickets.filter((t) => t.evId === ev.id && t.promoter === p.code && t.status !== "REFUNDED");
                    const sales = mine.reduce((n, t) => n + t.price - (t.balance ?? 0), 0);
                    return (
                      <p key={p.id} className="mt-2 flex items-center justify-between gap-2 text-xs">
                        <span><b>{p.name}</b> <span className="font-mono text-gold">{p.code}</span> · {p.pct}%</span>
                        <span>{mine.length} sold · NLe {sales} · owed <b>NLe {Math.round((sales * p.pct) / 100)}</b></span>
                      </p>
                    );
                  })}
                  <div className="mt-2 grid grid-cols-[1fr_4.5rem_auto] gap-2">
                    <input aria-label={`Seller name for ${ev.title}`} maxLength={30} className={field} placeholder="Seller name" value={(teamForm[ev.id] ?? { name: "", pct: "10" }).name} onChange={(e) => setTeamForm({ ...teamForm, [ev.id]: { ...(teamForm[ev.id] ?? { name: "", pct: "10" }), name: e.target.value } })} />
                    <input aria-label={`Commission percent for ${ev.title}`} inputMode="numeric" maxLength={2} className={field} placeholder="%" value={(teamForm[ev.id] ?? { name: "", pct: "10" }).pct} onChange={(e) => setTeamForm({ ...teamForm, [ev.id]: { ...(teamForm[ev.id] ?? { name: "", pct: "10" }), pct: e.target.value.replace(/\D/g, "") } })} />
                    <button onClick={() => addSeller(ev)} aria-label={`Add seller for ${ev.title}`} className="rounded-xl bg-white px-3 text-sm font-bold text-night">Add</button>
                  </div>
                  {teamMsg[ev.id] && <p role="status" className="mt-1 text-xs text-sl-green">{teamMsg[ev.id]}</p>}
                </div>

                <div className="mt-3 rounded-xl bg-white/5 p-3">
                  <p className="flex items-center gap-2 text-sm font-semibold"><KeyRound size={15} /> Door staff and security</p>
                  <p className="mt-1 text-[11px] text-white/50">Each promoter signs in with their own PIN and is locked to one gate. An entry promoter can never record an exit. Every scan carries their name.</p>
                  {crew.map((s) => (
                    <p key={s.id} className="mt-2 flex items-center justify-between text-xs">
                      <span>{s.name} · {s.gate === "entry" ? "Entry gate" : "Exit gate"}</span>
                      <button onClick={() => update((st) => ({ ...st, staff: st.staff.filter((x) => x.id !== s.id) }))} aria-label={`Remove ${s.name}`} className="text-white/50 underline">remove</button>
                    </p>
                  ))}
                  <div className="mt-2 grid grid-cols-[1fr_5.5rem] gap-2">
                    <input aria-label={`Promoter name for ${ev.title}`} maxLength={30} className={field} placeholder="Promoter name" value={f.name} onChange={(e) => setStaffForm({ ...staffForm, [ev.id]: { ...f, name: e.target.value } })} />
                    <input aria-label={`Promoter PIN for ${ev.title}`} inputMode="numeric" maxLength={4} className={field} placeholder="4-digit PIN" value={f.pin} onChange={(e) => setStaffForm({ ...staffForm, [ev.id]: { ...f, pin: e.target.value.replace(/\D/g, "") } })} />
                  </div>
                  <div className="mt-2 flex gap-2">
                    <select aria-label={`Gate for ${ev.title}`} className={field} value={f.gate} onChange={(e) => setStaffForm({ ...staffForm, [ev.id]: { ...f, gate: e.target.value as "entry" | "exit" } })}>
                      <option value="entry" className="text-black">Entry gate</option>
                      <option value="exit" className="text-black">Exit gate</option>
                    </select>
                    <button onClick={() => addStaff(ev)} aria-label={`Add promoter for ${ev.title}`} className="flex shrink-0 items-center gap-1 rounded-xl bg-white px-3 text-sm font-bold text-night"><UserPlus size={14} /> Add</button>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <input aria-label={`Manager PIN for ${ev.title}`} inputMode="numeric" maxLength={6} className={field} placeholder={app.managerPins[ev.id] ? "Manager PIN is set (change: 6 digits)" : "Set manager PIN (6 digits)"} value={mgrIn[ev.id] ?? ""} onChange={(e) => setMgrIn({ ...mgrIn, [ev.id]: e.target.value.replace(/\D/g, "") })} />
                    <button onClick={() => saveManagerPin(ev)} className="shrink-0 rounded-xl bg-white/10 px-3 text-sm font-semibold">Save</button>
                  </div>
                  <p className="mt-1 text-[11px] text-white/45">The manager PIN approves risky scans: typed codes at the exit, leaving within 2 minutes of entering, re-entry by typed code.</p>
                  {staffMsg[ev.id] && <p role="status" className="mt-1 text-xs text-sl-green">{staffMsg[ev.id]}</p>}
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-lg bg-white/5 p-2"><b className="block text-base">{door.inside}</b>inside now</div>
                    <div className="rounded-lg bg-white/5 p-2"><b className="block text-base">{Object.values(door.by).reduce((n, s) => n + s.exits, 0)}</b>exits</div>
                    <div className="rounded-lg bg-white/5 p-2"><b className="block text-base">{Object.values(door.by).reduce((n, s) => n + s.overrides, 0)}</b>overrides</div>
                  </div>
                  {door.inside > ev.capacity && <p className="mt-2 flex items-center gap-1 text-xs text-hot"><TriangleAlert size={13} /> More people inside than the capacity of {ev.capacity}.</p>}
                  {door.flags.map((x) => <p key={x} className="mt-2 flex items-start gap-1 text-xs text-gold"><TriangleAlert size={13} className="mt-0.5 shrink-0" /> {x}</p>)}
                </div>

                <button onClick={() => exportCsv(ev)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 py-2 text-sm font-semibold">
                  <Download size={15} /> Export attendees (CSV)
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <h2 className="font-display mt-8 flex items-center gap-2 font-bold"><Plus size={18} /> Create an event</h2>
      <div className="mt-3 space-y-3">
        <input aria-label="Event name" className={field} placeholder="Event name" maxLength={60} value={title} onChange={(e) => setTitle(e.target.value)} />
        <input aria-label="Venue" className={field} placeholder="Venue / place (e.g. Aberdeen Beach)" maxLength={80} value={area} onChange={(e) => setArea(e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <select aria-label="City" className={field} value={city} onChange={(e) => setCity(e.target.value)}>
            {CITY_OPTIONS.map((c) => <option key={c} value={c} className="text-black">{c}</option>)}
          </select>
          <select aria-label="Category" className={field} value={category} onChange={(e) => setCategory(e.target.value)}>
            {CREATE_CATEGORIES.map((c) => <option key={c} value={c} className="text-black">{c}</option>)}
          </select>
        </div>
        <label className="block text-xs text-white/50">Date and time (Sierra Leone time)
          <input aria-label="Date and time" type="datetime-local" className={`${field} mt-1`} value={when} onChange={(e) => setWhen(e.target.value)} />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-white/50">Length (hours)
            <input aria-label="Length in hours" type="number" min={1} max={24} className={`${field} mt-1`} value={hours} onChange={(e) => setHours(+e.target.value)} />
          </label>
          <label className="text-xs text-white/50">Capacity
            <input aria-label="Capacity" type="number" min={1} className={`${field} mt-1`} value={capacity} onChange={(e) => setCapacity(+e.target.value)} />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={reentry} onChange={(e) => setReentry(e.target.checked)} className="size-4 accent-[#ff2e88]" />
          Allow re-entry (guests can step out and come back)
        </label>
        <textarea aria-label="Description" className={field} rows={2} maxLength={300} placeholder="Short description" value={blurb} onChange={(e) => setBlurb(e.target.value)} />

        <p className="text-xs uppercase tracking-widest text-white/50">Ticket types (price 0 = free)</p>
        {tiers.map((t, i) => (
          <div key={i} className="flex gap-2">
            <input aria-label={`Ticket ${i + 1} name`} className={field} placeholder="Name" maxLength={30} value={t.name} onChange={(e) => setTiers(tiers.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
            <input aria-label={`Ticket ${i + 1} price`} className={`${field} w-28`} inputMode="numeric" placeholder="NLe" value={t.price} onChange={(e) => setTiers(tiers.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} />
            {tiers.length > 1 && <button onClick={() => setTiers(tiers.filter((_, j) => j !== i))} aria-label="Remove ticket type" className="rounded-xl bg-white/10 px-3">×</button>}
          </div>
        ))}
        {tiers.length < 4 && (
          <button onClick={() => setTiers([...tiers, { name: "", price: "" }])} className="text-sm font-semibold text-gold">+ Add ticket type</button>
        )}

        {error && <p role="alert" className="text-sm text-hot">{error}</p>}
        {done && <p role="status" className="text-sm text-sl-green">{done} <Link href="/" className="underline">See it in the feed</Link></p>}
        <button onClick={create} className="w-full rounded-2xl bg-gradient-to-r from-hot to-sunset py-3.5 font-bold">Publish event</button>
      </div>
    </div>
  );
}
