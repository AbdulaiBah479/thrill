"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Compass, Ticket, User, Zap, ZapOff, MapPin, Search, X, Trash2, Heart, Check, ScanLine, Sparkles, ShieldAlert, Download, WifiOff, Trophy, Store, ShoppingBag, ShieldCheck, Repeat, Map as MapIcon, Star, Gift, CircleHelp, HardDriveDownload, HardDriveUpload, PiggyBank, Flame, Lock, LifeBuoy } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { EventCard } from "@/components/EventCard";
import { BuySheet } from "@/components/BuySheet";
import { SquadSheet } from "@/components/SquadSheet";
import { PassView } from "@/components/PassView";
import { DetailSheet } from "@/components/DetailSheet";
import { Sheet } from "@/components/Sheet";
import { CATEGORIES, CITIES, EVENTS, minPrice, posterStyle, type Ev } from "@/lib/events";
import { useRouter } from "next/navigation";
import { EMPTY, counted, makeCode, ratingOf, stateOf, useAppState, useHydrated, type Ticket as TicketT } from "@/lib/store";
import { MapView } from "@/components/MapView";
import { copyText, shareLink } from "@/lib/share";
import { badgesFor, nightStreak } from "@/lib/badges";
import { countdown, levelFor, useMinute, useOnline } from "@/lib/hooks";

type Tab = "discover" | "map" | "tickets" | "me";

export default function Home() {
  const [app, update] = useAppState();
  const router = useRouter();
  const hydrated = useHydrated();
  const [tab, setTab] = useState<Tab>("discover");
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>("All");
  const [lite, setLite] = useState(false);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [cityMenu, setCityMenu] = useState(false);
  const [buy, setBuy] = useState<Ev | null>(null);
  const [squad, setSquad] = useState<Ev | null>(null);
  const [openTicket, setOpenTicket] = useState<TicketT | null>(null);
  const [msg, setMsg] = useState("");
  const [details, setDetails] = useState<Ev | null>(null);
  const [safeUrl, setSafeUrl] = useState("");
  const [taps, setTaps] = useState(0);
  const [giftIn, setGiftIn] = useState("");
  const [claimReason, setClaimReason] = useState("");
  const [tcName, setTcName] = useState("");
  const [tcPhone, setTcPhone] = useState("");
  const [installEvt, setInstallEvt] = useState<{ prompt: () => Promise<void> } | null>(null);
  const minute = useMinute();
  const online = useOnline();

  function toast(m: string) {
    setMsg(m);
    setTimeout(() => setMsg((cur) => (cur === m ? "" : cur)), 2200);
  }

  // Opening a shared link like /?event=SUM shows that event's ticket sheet.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("event");
    const found = EVENTS.find((e) => e.id === id);
    if (found) setTimeout(() => setBuy(found), 0);
  }, []);

  // Seeded events plus the ones you create in the organizer page. "going" follows real local sales.
  const events = useMemo(
    () =>
      [
        ...EVENTS,
        // Organizer events go public only after THRILL verifies the organizer, and unless THRILL suspends them.
        ...(app.org?.status === "verified" ? app.customEvents.filter((e) => !e.suspended && !e.cancelled) : []).map((e) => ({
          ...e,
          verified: true,
          going: app.tickets.filter((t) => t.evId === e.id).length,
        })),
      ].sort((a, b) => a.startAt - b.startAt),
    [app.customEvents, app.tickets, app.org],
  );

  useEffect(() => {
    const h = (e: Event) => { e.preventDefault(); setInstallEvt(e as unknown as { prompt: () => Promise<void> }); };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);

  const q = query.trim().toLowerCase();
  const now = minute * 60_000;
  const soon = (e: Ev) => now > 0 && e.startAt > now - e.durationH * 3600_000 && e.startAt < now + 24 * 3600_000;
  const weekend = (e: Ev) => {
    const d = new Date(e.startAt).getUTCDay();
    return now > 0 && e.startAt < now + 7 * 86_400_000 && (d === 5 || d === 6 || d === 0);
  };
  // "For you": events like the ones you bought or saved, and from organizers you follow.
  const liked = new Set<string>([
    ...app.tickets.map((t) => events.find((e) => e.id === t.evId)?.category ?? ""),
    ...app.saved.map((id) => events.find((e) => e.id === id)?.category ?? ""),
  ].filter(Boolean));
  const score = (e: Ev) => (liked.has(e.category) ? 3 : 0) + (app.follows.includes(e.organizer) ? 2 : 0) + (app.city !== "All" && e.city === app.city ? 1 : 0);
  const reasonOf = (e: Ev) => (app.follows.includes(e.organizer) ? `You follow ${e.organizer}` : liked.has(e.category) ? `Because you like ${e.category}` : null);
  const valueOf = (e: Ev) => {
    const p = minPrice(e);
    if (p === 0) return false;
    const peers = events.filter((x) => x.category === e.category && minPrice(x) > 0).map(minPrice).sort((a, b) => a - b);
    return peers.length >= 2 && p <= peers[Math.floor(peers.length / 2)] * 0.8;
  };
  // Live crowd level, from check-in numbers. Shown only once the event has started and has door scans.
  const crowdOf = (e: Ev) => {
    if (!(now > 0 && now >= e.startAt && now < e.startAt + e.durationH * 3600_000)) return null;
    if (!app.tickets.some((t) => t.evId === e.id && t.log?.length)) return null;
    const pct = app.tickets.filter((t) => t.evId === e.id && stateOf(t) === "IN").length / e.capacity;
    return pct < 0.25 ? "Quiet now" : pct < 0.6 ? "Filling up" : pct < 0.9 ? "Busy now" : "Packed";
  };
  const list = events.filter(
    (e) =>
      (cat === "All" || cat === "For you" ||
        (cat === "Free" ? minPrice(e) === 0 : cat === "Tonight" ? soon(e) : cat === "Weekend" ? weekend(e) : e.category === cat)) &&
      (app.city === "All" || e.city === app.city) &&
      (!q || `${e.title} ${e.area} ${e.organizer} ${e.category}`.toLowerCase().includes(q)),
  );
  if (cat === "For you") list.sort((a, b) => score(b) - score(a) || a.startAt - b.startAt);

  const toggleFollow = (name: string) => {
    const on = app.follows.includes(name);
    update((s) => ({ ...s, follows: on ? s.follows.filter((x) => x !== name) : [...s.follows, name] }));
    toast(on ? `Unfollowed ${name}` : `Following ${name}. Their events rise in For you.`);
  };

  const toggleSave = (id: string) =>
    update((s) => ({ ...s, saved: s.saved.includes(id) ? s.saved.filter((x) => x !== id) : [...s.saved, id] }));

  async function share(e: Ev) {
    const url = `${window.location.origin}/?event=${e.id}`;
    const r = await shareLink(e.title, `${e.title} · ${e.when} · ${e.area}`, url);
    toast(r === "copied" ? "Link copied" : r === "failed" ? "Could not share" : "Shared");
  }

  function toggleWaitlist(e: Ev) {
    const on = app.waitlist.includes(e.id);
    update((s) => ({ ...s, waitlist: on ? s.waitlist.filter((x) => x !== e.id) : [...s.waitlist, e.id] }));
    toast(on ? "Left the waitlist" : "You're on the waitlist. We'll alert you if tickets free up.");
  }

  // Gifting: the giver makes a gift code; whoever claims it gets a brand-new ticket code and the old QR stops working.
  function startGift(t: TicketT) {
    const giftCode = makeCode("GIFT");
    update((s) => ({ ...s, tickets: s.tickets.map((x) => (x.code === t.code ? { ...x, giftCode } : x)) }));
    setOpenTicket({ ...t, giftCode });
  }
  function cancelGift(t: TicketT) {
    update((s) => ({ ...s, tickets: s.tickets.map((x) => (x.code === t.code ? { ...x, giftCode: undefined } : x)) }));
    setOpenTicket({ ...t, giftCode: undefined });
    toast("Gift cancelled. The ticket is yours again.");
  }
  function claimGift() {
    const c = giftIn.trim().toUpperCase();
    const hit = app.tickets.find((t) => t.giftCode === c);
    if (!c || !hit) return toast("That gift code is not valid or was already claimed.");
    update((s) => ({
      ...s,
      tickets: s.tickets.map((t) => (t.code === hit.code ? { ...t, code: makeCode(t.evId), giftCode: undefined } : t)),
    }));
    setGiftIn("");
    toast("Gift claimed! You have a new pass code. The old QR no longer works.");
  }

  function backup() {
    const data = { app: "THRILL", version: 1, at: Date.now(), tickets: app.tickets, saved: app.saved, waitlist: app.waitlist, name: app.name, city: app.city };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `thrill-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("Backup saved. Keep the file somewhere safe.");
  }
  async function restore(file: File | undefined) {
    if (!file) return;
    try {
      if (file.size > 2_000_000) throw new Error("big");
      const d = JSON.parse(await file.text());
      if (d?.app !== "THRILL" || !Array.isArray(d.tickets)) throw new Error("shape");
      // Only your own things come back. Organizer approval and admin data can never be restored from a file.
      // Never trust a file: every field is checked, trimmed and limited before it is kept.
      const num = (v: unknown, lo: number, hi: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : undefined);
      const str = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : undefined);
      const CODE = /^[A-Z0-9]{3,6}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
      const seen = new Set<string>();
      const tickets: TicketT[] = [];
      for (const t of (d.tickets as Record<string, unknown>[]).slice(0, 500)) {
        const code = str(t?.code, 20)?.toUpperCase() ?? "";
        const evId = str(t?.evId, 8) ?? "";
        // A price outside the allowed range means the file was edited. Skip the ticket instead of "fixing" it.
        const price = typeof t?.price === "number" && t.price >= 0 && t.price <= 10_000_000 ? t.price : undefined;
        if (!CODE.test(code) || !evId || price === undefined || seen.has(code)) continue;
        seen.add(code);
        const logRaw = Array.isArray(t.log) ? (t.log as Record<string, unknown>[]).slice(0, 20) : [];
        tickets.push({
          code,
          evId,
          tier: str(t.tier, 30) ?? "",
          price,
          method: str(t.method, 30) ?? "",
          at: num(t.at, 0, 4e12) ?? Date.now(),
          status: t.status === "PAID" || t.status === "IN" || t.status === "OUT" || t.status === "REFUNDED" ? t.status : undefined,
          claimedAt: num(t.claimedAt, 0, 4e12),
          entries: num(t.entries, 0, 10),
          rating: num(t.rating, 1, 5),
          promo: str(t.promo, 20),
          giftCode: str(t.giftCode, 20),
          balance: num(t.balance, 0, 10_000_000),
          payBy: num(t.payBy, 0, 4e12),
          promoter: str(t.promoter, 20),
          log: logRaw
            .filter((l) => l && (l.act === "IN" || l.act === "OUT") && typeof l.at === "number")
            .map((l) => ({
              at: l.at as number,
              act: l.act as "IN" | "OUT",
              by: str(l.by, 30),
              how: l.how === "live" || l.how === "static" || l.how === "typed" || l.how === "override" ? l.how : undefined,
            })),
        });
      }
      update((s) => ({
        ...s,
        tickets,
        saved: Array.isArray(d.saved) ? d.saved.filter((x: unknown) => typeof x === "string") : s.saved,
        waitlist: Array.isArray(d.waitlist) ? d.waitlist.filter((x: unknown) => typeof x === "string") : s.waitlist,
        name: typeof d.name === "string" ? d.name.slice(0, 60) : s.name,
        city: typeof d.city === "string" ? d.city : s.city,
      }));
      toast(`Restored ${tickets.length} ticket${tickets.length === 1 ? "" : "s"}.`);
    } catch {
      toast("That file is not a THRILL backup.");
    }
  }

  // ---- Night Fund (demo tracker) ----
  function fundChange(delta: number, note: string) {
    update((st) => ({ ...st, fund: { ...st.fund, balance: Math.max(0, Math.min(10_000_000, st.fund.balance + delta)), history: [...st.fund.history, { at: Date.now(), amt: delta, note }].slice(-30) } }));
  }
  function topUp(amt: number) {
    toast("Waiting for mobile money approval…");
    setTimeout(() => { fundChange(amt, "Top-up with mobile money"); toast(`NLe ${amt} added to your Night Fund.`); }, 1200);
  }
  function setGoal(v: string) {
    const g = Math.max(0, Math.min(10_000_000, Math.round(Number(v) || 0)));
    update((st) => ({ ...st, fund: { ...st.fund, goal: g } }));
  }

  // ---- THRILL Guarantee ----
  function sendClaim(t: TicketT) {
    if (!claimReason) return toast("Choose what went wrong.");
    update((st) => ({ ...st, claims: [...st.claims.filter((c) => c.code !== t.code), { id: `CL-${t.code}`, code: t.code, evId: t.evId, reason: claimReason, at: Date.now(), status: "open" }] }));
    setClaimReason("");
    toast("Claim sent to THRILL. We will review it.");
  }

  function payBalance(t: TicketT) {
    toast("Waiting for mobile money approval…");
    setTimeout(() => {
      update((st) => ({ ...st, tickets: st.tickets.map((x) => (x.code === t.code ? { ...x, balance: undefined, payBy: undefined } : x)) }));
      setOpenTicket({ ...t, balance: undefined, payBy: undefined });
      toast("Paid in full. Your pass is unlocked!");
    }, 1500);
  }

  function saveTrusted() {
    let d = tcPhone.replace(/\D/g, "");
    if (d.startsWith("0") && d.length === 9) d = "232" + d.slice(1); // Sierra Leone number written the local way
    if (tcName.trim().length < 2) return toast("Enter your trusted contact's name.");
    if (d.length < 8 || d.length > 15) return toast("Enter a phone number with the country code, like 23276123456.");
    update((s) => ({ ...s, trusted: { name: tcName.trim().slice(0, 40), phone: d } }));
    setTcName("");
    setTcPhone("");
    toast(`${tcName.trim()} is now your trusted contact.`);
  }

  // Sends your location to your trusted contact (or lets you pick someone in WhatsApp).
  function sendLocation(kind: "safe" | "sos") {
    if (!navigator.geolocation) return toast("Location is not available on this device");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const link = `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`;
        const who = app.name || "I";
        const text = kind === "sos"
          ? `SOS. ${who} ${app.name ? "needs" : "need"} help right now. My live location: ${link}`
          : `${who} ${app.name ? "is" : "am"} out tonight via THRILL. My live spot: ${link}`;
        // Shown as a tap target: phones block pop-ups opened after a location prompt.
        setSafeUrl(`https://wa.me/${app.trusted?.phone ?? ""}?text=${encodeURIComponent(text)}`);
      },
      () => toast("Location blocked. Allow location in your browser settings."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function install() {
    if (installEvt) { await installEvt.prompt(); setInstallEvt(null); }
    else toast("On iPhone: Share → Add to Home Screen. On Android: browser menu → Install app.");
  }

  const spent = counted(app.tickets).reduce((n, t) => n + t.price - (t.balance ?? 0), 0);
  const lvl = levelFor(counted(app.tickets).length, spent);

  // A ticket whose event was removed must not silently show a different event.
  const evOf = (id: string): Ev => events.find((e) => e.id === id) ?? { ...EVENTS[0], id, title: "Event no longer available", organizer: "", photo: undefined, credit: undefined };
  const savedEvents = app.saved.map((id) => events.find((e) => e.id === id)).filter(Boolean) as Ev[];

  return (
    <main className="relative mx-auto h-dvh w-full max-w-md overflow-hidden bg-night text-ink">
      {!online && (
        <div role="status" className="absolute inset-x-0 top-0 z-50 flex items-center justify-center gap-2 bg-gold px-3 py-1.5 text-xs font-bold text-night">
          <WifiOff size={14} /> Offline. Your tickets still open.
        </div>
      )}
      {tab === "discover" && (
        <>
          <header className="absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-night/90 via-night/50 to-transparent px-4 pb-6 pt-3">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-2xl font-extrabold tracking-[0.18em]">THRILL</h1>
                <div className="mt-1 flex h-[3px] w-14 overflow-hidden rounded-full">
                  <i className="flex-1 bg-sl-green" /><i className="flex-1 bg-white" /><i className="flex-1 bg-sl-blue" />
                </div>
              </div>
              <div className="relative flex items-center gap-2">
                <button
                  onClick={() => { setSearching(!searching); if (searching) setQuery(""); }}
                  aria-label="Search events"
                  className={`grid size-8 place-items-center rounded-full ${searching ? "bg-white text-night" : "glass"}`}
                >
                  {searching ? <X size={15} /> : <Search size={15} />}
                </button>
                <button onClick={() => setCityMenu(!cityMenu)} aria-expanded={cityMenu} className="glass flex items-center gap-1 rounded-full px-3 py-1.5 text-xs">
                  <MapPin size={13} /> {app.city === "All" ? "All Sierra Leone" : app.city}
                </button>
                <button
                  onClick={() => { setLite(!lite); toast(lite ? "Lite mode off" : "Lite mode on: less data"); }}
                  aria-pressed={lite}
                  aria-label="Toggle lite mode, uses less data"
                  className={`grid size-8 place-items-center rounded-full ${lite ? "bg-gold text-night" : "glass"}`}
                >
                  {lite ? <ZapOff size={15} /> : <Zap size={15} />}
                </button>
                {cityMenu && (
                  <div className="glass absolute right-0 top-11 z-30 w-44 overflow-hidden rounded-2xl py-1">
                    {CITIES.map((c) => (
                      <button
                        key={c}
                        onClick={() => { update((s) => ({ ...s, city: c })); setCityMenu(false); }}
                        className="flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-white/10"
                      >
                        {c === "All" ? "All Sierra Leone" : c}
                        {app.city === c && <Check size={14} className="text-sl-green" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {searching && (
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search events, places, organizers"
                aria-label="Search events"
                className="glass mt-3 w-full rounded-full px-4 py-2 text-sm outline-none placeholder:text-white/40"
              />
            )}
            <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${cat === c ? "bg-white text-night" : "glass"}`}
                >
                  {c}
                </button>
              ))}
            </div>
            {lite && <p className="mt-2 text-[11px] text-gold">Lite mode on: less data, simpler look.</p>}
          </header>

          <div className="no-scrollbar h-full snap-y snap-mandatory overflow-y-scroll">
            {list.length === 0 && (
              <div className="grid h-dvh place-items-center px-8 text-center text-white/60">
                <div>
                  <p>No events match.</p>
                  <button onClick={() => { setCat("All"); setQuery(""); update((s) => ({ ...s, city: "All" })); }} className="mt-3 rounded-full bg-white px-4 py-2 text-sm font-bold text-night">Clear filters</button>
                </div>
              </div>
            )}
            {list.map((e) => (
              <EventCard
                key={e.id}
                ev={e}
                lite={lite}
                saved={app.saved.includes(e.id)}
                onSave={() => { toggleSave(e.id); toast(app.saved.includes(e.id) ? "Removed from saved" : "Saved"); }}
                onShare={() => share(e)}
                onBuy={() => setBuy(e)}
                onSquad={() => setSquad(e)}
                onDetails={() => setDetails(e)}
                onWaitlist={() => toggleWaitlist(e)}
                waitlisted={app.waitlist.includes(e.id)}
                reason={reasonOf(e)}
                value={valueOf(e)}
                crowd={crowdOf(e)}
              />
            ))}
          </div>
        </>
      )}

      {tab === "map" && (
        <>
          <div className="absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-night/90 to-transparent px-4 pb-6 pt-3">
            <h2 className="font-display text-xl font-extrabold">Events near you</h2>
            <p className="text-xs text-white/60">{list.length} on the map. Tap a pin for details.</p>
          </div>
          <MapView events={list} onOpen={(e) => setDetails(e)} />
        </>
      )}

      {tab === "tickets" && (
        <div className="no-scrollbar h-full overflow-y-auto px-4 pb-28 pt-6">
          <h2 className="font-display text-2xl font-extrabold">My Tickets</h2>
          <div className="mt-3 flex gap-2">
            <input aria-label="Gift code" value={giftIn} onChange={(e) => setGiftIn(e.target.value)} placeholder="Got a gift code? GIFT-XXXX-XXXX" className="glass min-w-0 flex-1 rounded-2xl px-4 py-2.5 font-mono text-xs uppercase outline-none placeholder:normal-case placeholder:text-white/35" />
            <button onClick={claimGift} className="rounded-2xl bg-white px-4 text-sm font-bold text-night">Claim</button>
          </div>
          {app.tickets.length === 0 ? (
            <Empty icon={<Ticket size={34} />} text="No tickets yet. Get a pass from Discover and it will show up here." action="Find events" onAction={() => setTab("discover")} />
          ) : (
            <ul className="mt-4 space-y-3">
              {[...app.tickets].reverse().map((t) => {
                const ev = evOf(t.evId);
                return (
                  <li key={t.code}>
                    <button onClick={() => setOpenTicket(t)} className="relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border border-white/10 p-3 text-left" style={posterStyle(ev)}>
                      <div className="absolute inset-0 bg-night/55" />
                      <div className="relative flex-1">
                        <p className="font-display font-bold leading-tight">{ev.title}</p>
                        <p className="text-xs text-white/70">{ev.when} · {t.tier}</p>
                        <p className="text-[11px] text-gold">{countdown(ev.startAt, ev.durationH, minute)}</p>
                        {(t.balance ?? 0) > 0 && <p className="text-[11px] font-semibold text-white">Reserved · NLe {t.balance} still to pay{t.payBy ? ` by ${new Date(t.payBy).toLocaleDateString([], { day: "numeric", month: "short" })}` : ""}</p>}
                        <p className="mt-1 font-mono text-xs text-gold">{t.code}</p>
                      </div>
                      <span className={`relative rounded-full px-3 py-1 text-xs font-bold ${stateOf(t) === "REFUNDED" ? "bg-white/20 text-white" : (t.balance ?? 0) > 0 ? "bg-hot text-white" : stateOf(t) === "PAID" ? "bg-white text-night" : stateOf(t) === "IN" ? "bg-sl-green text-night" : "bg-gold text-night"}`}>{stateOf(t) === "REFUNDED" ? "Refunded" : (t.balance ?? 0) > 0 ? "Pay balance" : stateOf(t) === "PAID" ? "Open" : stateOf(t) === "IN" ? "Inside" : "Outside"}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {tab === "me" && (
        <div className="no-scrollbar h-full overflow-y-auto px-4 pb-28 pt-6">
          <h2 className="font-display text-2xl font-extrabold">You</h2>
          <button
            onClick={() => update((s) => ({ ...s, role: s.role === "organizer" ? "buyer" : "organizer" }))}
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs"
          >
            <Repeat size={13} /> Using THRILL as: <b>{app.role === "organizer" ? "Organizer" : "Buyer"}</b> (tap to switch)
          </button>
          <label htmlFor="name" className="mt-4 block text-xs uppercase tracking-widest text-white/50">Your name</label>
          <input
            id="name"
            value={app.name}
            onChange={(e) => update((s) => ({ ...s, name: e.target.value }))}
            placeholder="e.g. Aminata"
            className="glass mt-2 w-full rounded-2xl px-4 py-3 text-sm outline-none placeholder:text-white/40"
          />
          <div className="mt-4 grid grid-cols-2 gap-3 text-center">
            <div className="glass rounded-2xl p-3"><b className="font-display text-2xl">{counted(app.tickets).length}</b><p className="text-xs text-white/60">Tickets</p></div>
            <div className="glass rounded-2xl p-3"><b className="font-display text-2xl">{app.saved.length}</b><p className="text-xs text-white/60">Saved</p></div>
          </div>

          <div className="glass mt-4 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 font-display font-bold"><Trophy size={16} className="text-gold" /> {lvl.name}</span>
              <b>{lvl.points} pts</b>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-gradient-to-r from-gold to-hot" style={{ width: `${lvl.pct}%` }} /></div>
            <p className="mt-1 text-[11px] text-white/50">{lvl.next ? `${lvl.toNext} pts to ${lvl.next}. Earn 5 pts per ticket + 1 per NLe 10.` : "Top level reached."}</p>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2">
            <button
              onClick={() => { update((s) => ({ ...s, role: "organizer" })); router.push("/organizer"); }}
              className="glass flex items-center gap-3 rounded-2xl p-3 text-left text-sm font-semibold"
            >
              <Store size={18} className="text-gold" /> {app.org ? "Open organizer dashboard" : "I am an organizer: apply to list events"}
            </button>
            {taps >= 5 && <Link href="/admin" className="glass flex items-center gap-3 rounded-2xl p-3 text-sm font-semibold"><ShieldCheck size={18} className="text-sl-green" /> THRILL staff area</Link>}
            {app.role === "organizer" && <Link href="/scan" className="glass flex items-center gap-3 rounded-2xl p-3 text-sm font-semibold"><ScanLine size={18} /> Promoter door check-in</Link>}
            <Link href="/help" className="glass flex items-center gap-3 rounded-2xl p-3 text-sm font-semibold"><CircleHelp size={18} /> Help, safety and refunds</Link>
            <button onClick={() => sendLocation("safe")} className="glass flex items-center gap-3 rounded-2xl p-3 text-left text-sm font-semibold"><ShieldAlert size={18} className="text-sl-green" /> Safe night: share my location on WhatsApp</button>
            <button onClick={() => sendLocation("sos")} className="flex items-center gap-3 rounded-2xl border border-hot/60 bg-hot/20 p-3 text-left text-sm font-bold"><ShieldAlert size={18} className="text-hot" /> SOS: I need help now</button>
            <Link href="/wrapped" className="glass flex items-center gap-3 rounded-2xl p-3 text-sm font-semibold"><Sparkles size={18} className="text-gold" /> My THRILL Wrapped</Link>
            <button onClick={install} className="glass flex items-center gap-3 rounded-2xl p-3 text-left text-sm font-semibold"><Download size={18} /> Install THRILL on this phone</button>
          </div>

          <div className="glass mt-4 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 font-display font-bold"><PiggyBank size={16} className="text-gold" /> Night Fund</span>
              <b data-testid="fund-balance">NLe {app.fund.balance}</b>
            </div>
            {app.fund.goal > 0 && (
              <>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-gradient-to-r from-gold to-sl-green" style={{ width: `${Math.min(100, (app.fund.balance / app.fund.goal) * 100)}%` }} /></div>
                <p className="mt-1 text-[11px] text-white/55">{app.fund.balance >= app.fund.goal ? "Goal reached! Time to book a night." : `NLe ${app.fund.goal - app.fund.balance} to go for your goal of NLe ${app.fund.goal}`}</p>
              </>
            )}
            <div className="mt-2 grid grid-cols-3 gap-2">
              {[10, 20, 50].map((n) => <button key={n} onClick={() => topUp(n)} className="rounded-xl bg-white/10 py-2 text-xs font-semibold">+ NLe {n}</button>)}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input aria-label="Savings goal" inputMode="numeric" maxLength={7} defaultValue={app.fund.goal || ""} onBlur={(e) => setGoal(e.target.value)} placeholder="Goal in NLe (optional)" className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-white/30" />
            </div>
            <label className="mt-2 flex items-center gap-2 text-xs text-white/80">
              <input type="checkbox" checked={app.fund.roundUp} onChange={(e) => update((st) => ({ ...st, fund: { ...st.fund, roundUp: e.target.checked } }))} className="size-4 accent-[#ffc83d]" />
              Round up every ticket to the next NLe 10 and save the change
            </label>
            <p className="mt-2 text-[10px] text-white/40">Demo tracker. In the real app the money sits with a licensed mobile money partner, never with THRILL.</p>
          </div>

          {(() => {
            const evs = [...EVENTS, ...app.customEvents];
            const st = nightStreak(app.tickets, now);
            const badges = badgesFor(app.tickets, evs, app.fund);
            return (
              <div className="glass mt-3 rounded-2xl p-4">
                <p className="flex items-center gap-2 text-sm font-semibold"><Flame size={16} className="text-hot" /> Night streak: <b data-testid="streak">{st.weeks} week{st.weeks === 1 ? "" : "s"}</b></p>
                <p className="text-[11px] text-white/55">{st.weeks === 0 ? "Go out this week to start a streak." : st.thisWeek ? "You went out this week. Keep it going!" : "Go out this week to keep your streak. One quiet week is forgiven."}</p>
                <ul className="mt-3 grid grid-cols-3 gap-2" aria-label="Badges">
                  {badges.map((b) => (
                    <li key={b.id} title={b.desc} className={`rounded-xl p-2 text-center text-[11px] ${b.earned ? "bg-gold/20 text-gold" : "bg-white/5 text-white/35"}`}>
                      {b.earned ? "★" : <Lock size={11} className="mx-auto" />}
                      <p className="font-semibold">{b.label}</p>
                      <p className="text-[9px] opacity-80">{b.earned ? "Earned" : b.desc}</p>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })()}

          <div className="glass mt-4 rounded-2xl p-4">
            <p className="text-sm font-semibold">Trusted contact</p>
            <p className="text-[11px] text-white/55">{app.trusted ? `${app.trusted.name} (+${app.trusted.phone}) gets your Safe night and SOS messages.` : "Pick one person who gets your Safe night and SOS location messages straight in WhatsApp."}</p>
            <div className="mt-2 grid grid-cols-[1fr_1fr] gap-2">
              <input aria-label="Trusted contact name" maxLength={40} value={tcName} onChange={(e) => setTcName(e.target.value)} placeholder="Name" className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-white/30" />
              <input aria-label="Trusted contact phone" inputMode="tel" maxLength={16} value={tcPhone} onChange={(e) => setTcPhone(e.target.value)} placeholder="23276123456" className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-white/30" />
            </div>
            <button onClick={saveTrusted} className="mt-2 w-full rounded-xl bg-white/10 py-2 text-sm font-semibold">{app.trusted ? "Change trusted contact" : "Save trusted contact"}</button>
          </div>

          <h3 className="mt-6 flex items-center gap-2 font-display font-bold"><Heart size={16} className="text-hot" /> Saved events</h3>
          {savedEvents.length === 0 ? (
            <p className="mt-2 text-sm text-white/50">Tap the heart on an event to save it.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {savedEvents.map((e) => (
                <li key={e.id} className="glass flex items-center justify-between rounded-2xl p-3">
                  <button onClick={() => setBuy(e)} className="flex-1 text-left">
                    <b className="block text-sm">{e.title}</b>
                    <span className="text-xs text-white/60">{e.when}</span>
                  </button>
                  <button onClick={() => toggleSave(e.id)} aria-label={`Remove ${e.title}`} className="rounded-full bg-white/10 p-2"><X size={14} /></button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6 grid grid-cols-2 gap-2">
            <button onClick={backup} className="glass flex items-center justify-center gap-2 rounded-2xl py-3 text-xs font-semibold"><HardDriveDownload size={15} /> Back up my data</button>
            <label className="glass flex cursor-pointer items-center justify-center gap-2 rounded-2xl py-3 text-xs font-semibold">
              <HardDriveUpload size={15} /> Restore backup
              <input type="file" accept="application/json,.json" className="sr-only" aria-label="Restore backup file" onChange={(e) => { restore(e.target.files?.[0]); e.target.value = ""; }} />
            </label>
          </div>
          <button
            onClick={() => { if (window.confirm("Delete all demo tickets, saved events and your name?")) { update(() => EMPTY); toast("Demo data cleared"); } }}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 py-3 text-sm text-white/70"
          >
            <Trash2 size={16} /> Reset demo data
          </button>
          <p className="mt-3 text-center text-[10px] text-white/40">Everything is stored on this phone only. Login and sync arrive with the backend. Back up often.</p>
          <button
            onClick={() => { const n = taps + 1; setTaps(n); if (n === 5) toast("Staff menu unlocked"); }}
            className="mx-auto mt-4 block text-[10px] text-white/25"
          >
            THRILL demo build
          </button>
        </div>
      )}

      <nav className="glass absolute inset-x-3 bottom-3 z-30 flex justify-around rounded-3xl py-2">
        {([
          ["discover", Compass, "Discover"],
          ["map", MapIcon, "Map"],
          ["tickets", Ticket, "Tickets"],
          ["me", User, "You"],
        ] as const).map(([id, Icon, label]) => (
          <button key={id} onClick={() => setTab(id)} aria-label={label} className={`relative flex flex-col items-center gap-0.5 px-5 py-1 text-[10px] ${tab === id ? "text-white" : "text-white/45"}`}>
            <Icon size={21} className={tab === id ? "text-hot" : ""} />
            {label}
            {id === "tickets" && counted(app.tickets).length > 0 && (
              <span className="absolute right-3 top-0 grid size-4 place-items-center rounded-full bg-hot text-[9px] font-bold text-white">{counted(app.tickets).length}</span>
            )}
          </button>
        ))}
        {app.role === "organizer" && (
          <Link href="/organizer" aria-label="Organizer dashboard" className="relative flex flex-col items-center gap-0.5 px-4 py-1 text-[10px] text-gold">
            <Store size={21} />
            Dashboard
          </Link>
        )}
      </nav>

      {hydrated && !app.role && (
        <div role="dialog" aria-label="Choose how to use THRILL" className="absolute inset-0 z-[60] flex flex-col justify-end bg-night/95 p-5 pb-10">
          <h2 className="font-display text-3xl font-extrabold tracking-tight">Welcome to THRILL</h2>
          <p className="mt-2 text-sm text-white/70">How will you use the app? You can switch any time in the You tab.</p>
          <button onClick={() => update((s) => ({ ...s, role: "buyer" }))} className="mt-6 flex items-center gap-4 rounded-3xl bg-gradient-to-r from-hot to-sunset p-5 text-left">
            <ShoppingBag size={30} />
            <span><b className="font-display block text-lg">I am here for events</b><span className="text-sm text-white/85">Find events, buy passes, go with friends.</span></span>
          </button>
          <button onClick={() => { update((s) => ({ ...s, role: "organizer" })); router.push("/organizer"); }} className="glass mt-3 flex items-center gap-4 rounded-3xl p-5 text-left">
            <Store size={30} className="text-gold" />
            <span><b className="font-display block text-lg">I organize events</b><span className="text-sm text-white/70">Apply once. THRILL verifies you, then you can sell tickets and order official wristbands.</span></span>
          </button>
        </div>
      )}

      <BuySheet
        ev={buy}
        onClose={() => setBuy(null)}
        onBought={(ts) => update((s) => ({ ...s, tickets: [...s.tickets, ...ts] }))}
        onGoTickets={() => setTab("tickets")}
        promoters={app.promoters}
        fund={app.fund}
        onFund={fundChange}
      />
      <SquadSheet
        ev={squad}
        onClose={() => setSquad(null)}
        toast={toast}
        people={squad ? (app.squads[squad.id] ?? []) : []}
        onPeople={(p) => squad && update((st) => ({ ...st, squads: { ...st.squads, [squad.id]: p } }))}
        onBook={(e) => { setSquad(null); setBuy(e); }}
      />
      <Sheet open={!!safeUrl} onClose={() => setSafeUrl("")} title="Safe night">
        <p className="mt-3 text-sm text-white/70">Your location is ready. Pick a trusted friend in WhatsApp and send it so they know where you are.</p>
        <a href={safeUrl} target="_blank" rel="noopener noreferrer" onClick={() => setSafeUrl("")} className="mt-4 block rounded-2xl bg-sl-green py-3.5 text-center font-bold text-night">Send my location on WhatsApp</a>
      </Sheet>
      <DetailSheet
        ev={details}
        onClose={() => setDetails(null)}
        onBuy={(e) => setBuy(e)}
        onWaitlist={toggleWaitlist}
        onWaitlisted={!!details && app.waitlist.includes(details.id)}
        rating={details ? ratingOf(app.tickets, details.id) : { count: 0, avg: 0 }}
        following={!!details && app.follows.includes(details.organizer)}
        onFollow={toggleFollow}
        onReport={(e, reason) => update((s) => ({ ...s, reports: [...s.reports, { evId: e.id, reason, at: Date.now() }] }))}
        toast={toast}
      />

      <Sheet open={!!openTicket} onClose={() => setOpenTicket(null)} title={openTicket ? evOf(openTicket.evId).title : ""}>
        {openTicket && (
          <>
            <PassView ev={evOf(openTicket.evId)} tier={openTicket.tier} code={openTicket.code} owe={openTicket.balance ?? 0} voided={stateOf(openTicket) === "REFUNDED"} />
            {(openTicket.balance ?? 0) > 0 && (
              <button onClick={() => payBalance(openTicket)} className="mt-3 w-full rounded-2xl bg-gradient-to-r from-hot to-sunset py-3.5 font-bold">
                Pay balance NLe {openTicket.balance}{openTicket.payBy && now > 0 && openTicket.payBy < now ? " (overdue)" : ""}
              </button>
            )}
            <p className="mt-3 text-center text-xs text-white/50">
              Status: <b className={stateOf(openTicket) === "PAID" ? "text-sl-green" : "text-gold"}>{{ PAID: "PAID (not used)", IN: "INSIDE", OUT: "OUTSIDE", REFUNDED: "REFUNDED" }[stateOf(openTicket)]}</b> · Paid with {openTicket.method} · NLe {openTicket.price}
            </p>
            <p className="mt-2 text-center text-[11px] text-white/40">Show this pass at the gate. THRILL staff hand you your official wristband.</p>
            {stateOf(openTicket) === "PAID" && (openTicket.balance ?? 0) === 0 && (
              <div className="mt-4 rounded-2xl bg-white/5 p-3 text-center">
                {openTicket.giftCode ? (
                  <>
                    <p className="text-sm font-semibold">Gift waiting to be claimed</p>
                    <p className="mt-1 font-mono text-lg font-bold tracking-wider text-gold">{openTicket.giftCode}</p>
                    <p className="mt-1 text-[11px] text-white/50">Send this code to your friend. Once they claim it, this QR stops working and they get a new one.</p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button onClick={async () => toast((await copyText(openTicket.giftCode!)) ? "Gift code copied" : "Could not copy")} className="rounded-xl bg-white/10 py-2 text-xs font-semibold">Copy code</button>
                      <a href={`https://wa.me/?text=${encodeURIComponent(`I got you a ticket to ${evOf(openTicket.evId).title}! Open THRILL, go to My Tickets and claim it with this code: ${openTicket.giftCode}`)}`} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-sl-green py-2 text-xs font-semibold text-night">Send on WhatsApp</a>
                    </div>
                    <button onClick={() => cancelGift(openTicket)} className="mt-2 text-[11px] text-white/50 underline">Cancel gift</button>
                  </>
                ) : (
                  <button onClick={() => startGift(openTicket)} className="flex w-full items-center justify-center gap-2 text-sm font-semibold"><Gift size={16} className="text-hot" /> Gift this ticket to a friend</button>
                )}
              </div>
            )}
            {(() => {
              const claim = app.claims.find((c) => c.code === openTicket.code);
              if (stateOf(openTicket) === "REFUNDED") return <p className="mt-3 rounded-2xl bg-white/5 p-3 text-center text-xs text-white/70">This ticket was refunded.{claim?.note ? ` ${claim.note}` : ""}</p>;
              return (
                <div className="mt-4 rounded-2xl bg-white/5 p-3">
                  <p className="flex items-center gap-2 text-sm font-semibold"><LifeBuoy size={15} className="text-sl-green" /> THRILL Guarantee</p>
                  {claim ? (
                    <p className="mt-1 text-xs text-white/70">Your claim ({claim.reason}) is <b>{claim.status === "open" ? "being reviewed" : claim.status}</b>.{claim.note ? ` ${claim.note}` : ""}</p>
                  ) : (
                    <>
                      <p className="mt-1 text-[11px] text-white/55">Problem with this ticket? Tell THRILL. If the event is cancelled or you were wrongly refused, you get your money back.</p>
                      <select aria-label="What went wrong" value={claimReason} onChange={(e) => setClaimReason(e.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm">
                        <option value="" className="text-black">Choose a problem…</option>
                        {["Event was cancelled", "Refused entry with a valid ticket", "Charged the wrong amount", "Event was not as described"].map((r) => <option key={r} className="text-black">{r}</option>)}
                      </select>
                      <button onClick={() => sendClaim(openTicket)} className="mt-2 w-full rounded-xl bg-white/10 py-2 text-sm font-semibold">Send to THRILL</button>
                    </>
                  )}
                </div>
              );
            })()}
            {(stateOf(openTicket) === "IN" || stateOf(openTicket) === "OUT") && (
              <div className="mt-4 rounded-2xl bg-white/5 p-3 text-center">
                <p className="text-sm font-semibold">{openTicket.rating ? "Thanks for rating this event" : "How was it? Rate this event"}</p>
                <div role="group" aria-label="Rate this event" className="mt-2 flex justify-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      aria-label={`${n} star${n === 1 ? "" : "s"}`}
                      onClick={() => {
                        const code = openTicket.code;
                        update((s) => ({ ...s, tickets: s.tickets.map((t) => (t.code === code ? { ...t, rating: n } : t)) }));
                        setOpenTicket({ ...openTicket, rating: n });
                        toast("Thanks. Your rating helps others trust good organizers.");
                      }}
                      className="p-1"
                    >
                      <Star size={26} className={(openTicket.rating ?? 0) >= n ? "fill-gold text-gold" : "text-white/30"} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </Sheet>

      <AnimatePresence>
        {msg && (
          <motion.div
            role="status"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="absolute inset-x-0 bottom-24 z-50 mx-auto w-fit max-w-[85%] rounded-full bg-white px-4 py-2 text-sm font-semibold text-night shadow-xl"
          >
            {msg}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function Empty({ icon, text, action, onAction }: { icon: React.ReactNode; text: string; action: string; onAction: () => void }) {
  return (
    <div className="mt-16 text-center">
      <div className="mx-auto mb-4 grid size-20 place-items-center rounded-full bg-gradient-to-br from-hot to-sunset">{icon}</div>
      <p className="px-6 text-sm text-white/60">{text}</p>
      <button onClick={onAction} className="mt-4 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-night">{action}</button>
    </div>
  );
}
