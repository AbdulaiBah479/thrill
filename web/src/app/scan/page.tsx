"use client";

import { useEffect, useRef, useState } from "react";
import { signal, type Tone } from "@/lib/feedback";
import Link from "next/link";
import { ArrowLeft, ScanLine, ShieldCheck, ShieldAlert, ShieldX, Camera, LogIn, LogOut, DoorOpen, Banknote, KeyRound, Clock, Users, Volume2, VolumeX, LifeBuoy } from "lucide-react";
import { stateOf, useAppState, type Staff, type Ticket } from "@/lib/store";
import { EVENTS, type Ev } from "@/lib/events";
import { DEMO_MANAGER_PIN, DEMO_STAFF, MAX_ENTRIES, decide, lastOf, parseScan, type Decision, type Parsed } from "@/lib/gate";

type Result =
  | { kind: "none" }
  | { kind: "invalid"; code: string }
  | { kind: "stock"; code: string }
  | { kind: "done"; code: string; note: string }
  | { kind: "decision"; code: string; d: Decision; parsed: Parsed };

const LOCK_KEY = "thrill:staff-lock";
const lockRead = (): { n: number; until: number } => {
  try {
    return JSON.parse(localStorage.getItem(LOCK_KEY) ?? "") as { n: number; until: number };
  } catch {
    return { n: 0, until: 0 };
  }
};
const lockWrite = (v: { n: number; until: number }) => {
  try {
    localStorage.setItem(LOCK_KEY, JSON.stringify(v));
  } catch {
    /* storage blocked */
  }
};

export default function Scan() {
  const [app, update] = useAppState();
  const [me, setMe] = useState<Staff | null>(null);
  const [staffId, setStaffId] = useState("");
  const [pin, setPin] = useState("");
  const [loginMsg, setLoginMsg] = useState("");
  const [input, setInput] = useState("");
  const [res, setRes] = useState<Result>({ kind: "none" });
  const [cam, setCam] = useState(false);
  const [camMsg, setCamMsg] = useState("");
  const [tierIdx, setTierIdx] = useState(0);
  const [mgrPin, setMgrPin] = useState("");
  const [mgrReason, setMgrReason] = useState("Guest phone is dead");
  const [mgrMsg, setMgrMsg] = useState("");
  const [mgrFails, setMgrFails] = useState(0);
  const [sound, setSound] = useState(true);
  const [helpMsg, setHelpMsg] = useState("");
  const video = useRef<HTMLVideoElement>(null);
  const scanner = useRef<{ stop: () => void; destroy: () => void } | null>(null);
  const live = useRef({ app, me });
  useEffect(() => {
    live.current = { app, me };
  });

  useEffect(() => {
    const k = res.kind === "decision" ? res.d.kind : res.kind;
    const tone: Tone | null =
      k === "admit" || k === "readmit" || k === "letout" || k === "done"
        ? "ok"
        : k === "manager" || k === "toosoon" || k === "notinside" || k === "stock"
          ? "warn"
          : k === "none"
            ? null
            : "bad";
    if (tone) signal(tone, sound);
  }, [res, sound]);

  const allEvents = (a: typeof app): Ev[] => [...EVENTS, ...a.customEvents];
  const roster: Staff[] = [...DEMO_STAFF, ...app.staff];
  const gateLabel = (s: Staff) => (s.gate === "entry" ? "Entry gate" : "Exit gate");

  function signIn() {
    const lock = lockRead();
    if (lock.until > Date.now()) return setLoginMsg(`Too many wrong PINs. Wait ${Math.ceil((lock.until - Date.now()) / 60000)} min.`);
    const s = roster.find((x) => x.id === staffId);
    if (!s) return setLoginMsg("Choose your name.");
    if (s.pin !== pin) {
      const n = lock.n + 1;
      if (n >= 5) {
        lockWrite({ n: 0, until: Date.now() + 5 * 60_000 });
        return setLoginMsg("Too many wrong PINs. Locked for 5 minutes.");
      }
      lockWrite({ n, until: 0 });
      return setLoginMsg(`Wrong PIN. ${5 - n} tries left.`);
    }
    lockWrite({ n: 0, until: 0 });
    setLoginMsg("");
    setPin("");
    setMe(s);
    setRes({ kind: "none" });
  }

  function signOut() {
    stopCamera();
    setMe(null);
    setRes({ kind: "none" });
    setInput("");
  }

  /** Looks at one scan and says what the door should do. Nothing changes until the promoter confirms. */
  function check(raw: string, source: "typed" | "camera") {
    const { app: a, me: who } = live.current;
    if (!who) return;
    const now = Date.now();
    const parsed = parseScan(raw, source, now);
    setTierIdx(0);
    setMgrPin("");
    setMgrMsg("");
    const t = a.tickets.find((x) => x.code === parsed.code);
    if (!t) {
      const w = a.wristbands.find((x) => x.code === parsed.code);
      if (w?.state === "STOCK") {
        if (who.evId !== "*" && who.evId !== w.evId) return setRes({ kind: "decision", code: parsed.code, d: { kind: "wrongevent" }, parsed });
        return setRes(who.gate === "entry" ? { kind: "stock", code: parsed.code } : { kind: "decision", code: parsed.code, d: { kind: "notinside" }, parsed });
      }
      return setRes({ kind: "invalid", code: parsed.code });
    }
    const ev = allEvents(a).find((e) => e.id === t.evId);
    setRes({ kind: "decision", code: parsed.code, d: decide(who.gate, t, ev, who, parsed, now), parsed });
  }

  function canCommit(act: "IN" | "OUT", t: Ticket, ev: Ev | undefined) {
    const st = stateOf(t);
    if (act === "OUT") return st === "IN";
    if (st === "PAID") return true;
    if (st !== "OUT" || ev?.reentry === false || (t.entries ?? 1) >= MAX_ENTRIES) return false;
    return true; // the cooldown and typed-code limits are checked by decide(); only a manager override can skip them
  }

  function commit(act: "IN" | "OUT", override: boolean, how: Parsed["how"], reason?: string) {
    const who = me;
    const code = res.kind === "decision" || res.kind === "stock" ? res.code : "";
    if (!who || !code) return;
    let applied = false;
    update((s) => {
      const out = {
        ...s,
        tickets: s.tickets.map((t) => {
          if (t.code !== code) return t;
          const ev = [...EVENTS, ...s.customEvents].find((e) => e.id === t.evId);
          // Re-check inside the update so a double tap cannot admit or release twice.
          if (!canCommit(act, t, ev)) return t;
          applied = true;
          const at = Date.now();
          const first = act === "IN" ? (t.entries ?? (stateOf(t) === "OUT" ? 1 : 0)) + 1 : t.entries;
          return {
            ...t,
            status: act,
            entries: first,
            claimedAt: t.claimedAt ?? (act === "IN" ? at : undefined),
            log: [...(t.log ?? []), { at, act, by: who.name, how: override ? ("override" as const) : how }],
          };
        }),
      };
      if (override) out.audit = [...s.audit, { at: Date.now(), action: `Manager override at ${who.name}'s gate: ${act === "OUT" ? "exit" : "re-entry"} of ${code}. Reason: ${reason}` }].slice(-500);
      return out;
    });
    setRes({ kind: "done", code, note: applied ? (act === "IN" ? "Admitted. Now inside." : "Marked as outside.") : "Not changed. The ticket state moved on." });
    setInput("");
  }

  function askForHelp() {
    const who = me;
    if (!who) return;
    update((st) => ({ ...st, alerts: [...st.alerts, { at: Date.now(), by: who.name, evId: who.evId, msg: "Needs help at the " + who.gate + " gate" }].slice(-100) }));
    setHelpMsg("The organizer has been alerted.");
    setTimeout(() => setHelpMsg(""), 4000);
  }

  function approveOverride() {
    if (res.kind !== "decision" || res.d.kind !== "manager") return;
    if (mgrFails >= 3) return setMgrMsg("Locked. Ask the organizer to sign you out and back in.");
    const t = app.tickets.find((x) => x.code === res.code);
    const expected = t && !app.customEvents.some((e) => e.id === t.evId) ? DEMO_MANAGER_PIN : app.managerPins[t?.evId ?? ""];
    if (!expected) return setMgrMsg("No manager PIN is set for this event. The organizer sets it in the organizer area.");
    if (mgrPin !== expected) {
      setMgrFails(mgrFails + 1);
      return setMgrMsg(`Wrong manager PIN. ${2 - mgrFails} tries left.`);
    }
    commit(res.d.then === "letout" ? "OUT" : "IN", true, res.parsed.how, `${res.d.why}. ${mgrReason}`);
    setMgrFails(0);
  }

  function activate() {
    const who = me;
    const code = res.kind === "stock" ? res.code : "";
    if (!who || !code) return;
    const w = app.wristbands.find((x) => x.code === code);
    const ev = allEvents(app).find((e) => e.id === w?.evId);
    const tier = ev?.tiers[tierIdx];
    if (!w || !ev || !tier) return;
    update((s) => {
      const wb = s.wristbands.find((x) => x.code === code);
      if (!wb || wb.state !== "STOCK") return s;
      const at = Date.now();
      return {
        ...s,
        wristbands: s.wristbands.map((x) => (x.code === code ? { ...x, state: "ACTIVE" as const } : x)),
        tickets: [...s.tickets, { code, evId: ev.id, tier: tier.name, price: tier.price, method: "Door sale", at, status: "IN", entries: 1, claimedAt: at, log: [{ at, act: "IN", by: who.name, how: "static" }] }],
      };
    });
    setRes({ kind: "done", code, note: `Door sale NLe ${tier.price} recorded. Now inside.` });
    setInput("");
  }

  async function startCamera() {
    try {
      const { default: QrScanner } = await import("qr-scanner");
      if (!(await QrScanner.hasCamera())) return setCamMsg("No camera found. Type the code instead.");
      setCam(true);
      setCamMsg("");
      await new Promise((r) => setTimeout(r, 50));
      const qr = new QrScanner(
        video.current!,
        (result) => {
          qr.stop();
          qr.destroy();
          scanner.current = null;
          setCam(false);
          setInput(result.data);
          check(result.data, "camera");
        },
        { returnDetailedScanResult: true, preferredCamera: "environment", highlightScanRegion: true },
      );
      scanner.current = qr;
      await qr.start();
    } catch {
      setCam(false);
      setCamMsg("Camera blocked or needs HTTPS. Type the code instead.");
    }
  }

  function stopCamera() {
    scanner.current?.stop();
    scanner.current?.destroy();
    scanner.current = null;
    setCam(false);
  }

  const evOfCode = (code: string) => {
    const evId = app.tickets.find((x) => x.code === code)?.evId ?? app.wristbands.find((x) => x.code === code)?.evId;
    return allEvents(app).find((e) => e.id === evId);
  };
  const time = (at?: number) => (at ? new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "");
  const card = "mt-5 rounded-3xl border-2 p-6 text-center";

  // ----- sign-in screen -----
  if (!me) {
    return (
      <main className="mx-auto min-h-dvh w-full max-w-md bg-night px-4 pb-10 pt-5 text-ink">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-white/60"><ArrowLeft size={16} /> Back</Link>
        <h1 className="font-display mt-3 flex items-center gap-2 text-2xl font-extrabold"><ScanLine /> Door staff sign-in</h1>
        <p className="mt-1 text-sm text-white/60">Every scan is recorded under your name. You are locked to the gate you were given.</p>
        <label className="mt-5 block text-xs text-white/50">Your name
          <select aria-label="Staff name" value={staffId} onChange={(e) => setStaffId(e.target.value)} className="mt-1 w-full rounded-xl border border-white/15 bg-white/10 px-3 py-3 text-sm">
            <option value="" className="text-black">Choose…</option>
            {roster.map((s) => (
              <option key={s.id} value={s.id} className="text-black">{s.name} · {gateLabel(s)}{s.evId === "*" ? " · sample events" : ` · ${app.customEvents.find((e) => e.id === s.evId)?.title ?? s.evId}`}</option>
            ))}
          </select>
        </label>
        <input aria-label="Staff PIN" type="password" inputMode="numeric" autoComplete="off" value={pin} onChange={(e) => { setPin(e.target.value); setLoginMsg(""); }} onKeyDown={(e) => e.key === "Enter" && signIn()} placeholder="Your PIN" className="glass mt-3 w-full rounded-2xl px-4 py-3 outline-none placeholder:text-white/35" />
        {loginMsg && <p role="alert" className="mt-2 text-sm text-hot">{loginMsg}</p>}
        <button onClick={signIn} className="mt-4 w-full rounded-2xl bg-white py-5 text-lg font-bold text-night">Sign in</button>
        <p className="mt-6 rounded-xl bg-white/5 p-3 text-[11px] text-white/45">Sample events: Demo Entry PIN 1111, Demo Exit PIN 2222, manager PIN 9999. For your own events the organizer creates staff and PINs in the organizer area.</p>
      </main>
    );
  }

  const insideNow = app.tickets.filter((t) => (me.evId === "*" || t.evId === me.evId) && stateOf(t) === "IN").length;
  const evTitle = me.evId === "*" ? "Sample events" : (app.customEvents.find((e) => e.id === me.evId)?.title ?? me.evId);
  const title = (code: string) => evOfCode(code)?.title;

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md bg-night px-4 pb-10 pt-5 text-ink">
      <div className="flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-white/60"><ArrowLeft size={16} /> Back</Link>
        <button onClick={signOut} className="text-xs text-white/50">Sign out</button>
      </div>
      <h1 className="font-display mt-3 flex items-center gap-2 text-2xl font-extrabold">
        {me.gate === "entry" ? <LogIn /> : <LogOut />} {gateLabel(me)}
      </h1>
      <p className="mt-1 text-xs text-white/60">Signed in as <b>{me.name}</b> · {evTitle}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <p className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs"><Users size={12} /> Inside now: <b>{insideNow}</b></p>
        <button onClick={() => setSound(!sound)} aria-pressed={sound} aria-label="Sound" className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs">
          {sound ? <Volume2 size={12} /> : <VolumeX size={12} />} Sound {sound ? "on" : "off"}
        </button>
        <button onClick={askForHelp} className="inline-flex items-center gap-1 rounded-full bg-hot/30 px-3 py-1 text-xs font-semibold"><LifeBuoy size={12} /> Need help</button>
      </div>
      {helpMsg && <p role="status" className="mt-2 text-xs text-sl-green">{helpMsg}</p>}

      <div className="mt-4 flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && check(input, "typed")} placeholder="SUM-AB12-CD34" aria-label="Pass code" className="glass min-w-0 flex-1 rounded-2xl px-4 py-3 font-mono text-sm uppercase outline-none placeholder:text-white/30" />
        <button onClick={() => check(input, "typed")} className="rounded-2xl bg-white px-5 font-bold text-night">Check</button>
      </div>
      <button onClick={startCamera} className="glass mt-2 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold">
        <Camera size={16} /> Scan QR with camera
      </button>
      {me.gate === "exit" && <p className="mt-2 text-[11px] text-white/45">Exit gate: scan the guest&apos;s live phone code or wristband. A typed code needs manager approval.</p>}
      {camMsg && <p className="mt-2 text-xs text-gold">{camMsg}</p>}
      {cam && (
        <>
          <video ref={video} muted playsInline className="mt-3 w-full rounded-2xl" />
          <button onClick={stopCamera} className="mt-2 w-full rounded-2xl border border-white/20 py-2 text-sm">Stop camera</button>
        </>
      )}

      {res.kind === "invalid" && (
        <div className={`${card} border-hot/60 bg-hot/25`}>
          <ShieldX className="mx-auto text-hot" size={64} />
          <p className="font-display mt-2 text-3xl font-extrabold text-hot">NOT FOUND</p>
          <p className="font-mono text-xs text-white/60">{res.code}</p>
          <p className="mt-2 text-xs">No valid pass with this code. Do not admit.</p>
        </div>
      )}

      {res.kind === "stock" && (() => {
        const w = app.wristbands.find((x) => x.code === res.code);
        const ev = allEvents(app).find((e) => e.id === w?.evId);
        return (
          <div className={`${card} border-gold/60 bg-gold/25`}>
            <Banknote className="mx-auto text-gold" size={64} />
            <p className="font-display mt-2 text-3xl font-extrabold text-gold">NOT ACTIVATED</p>
            <p className="text-sm">{ev?.title}</p>
            <p className="font-mono text-xs text-white/60">{res.code}</p>
            <p className="mt-2 text-xs">Blank THRILL wristband. Collect payment first, then activate it.</p>
            <select aria-label="Ticket type" value={tierIdx} onChange={(e) => setTierIdx(+e.target.value)} className="mt-3 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm">
              {ev?.tiers.map((t, i) => <option key={t.name} value={i} className="text-black">{t.name} · {t.price === 0 ? "Free" : `NLe ${t.price}`}</option>)}
            </select>
            <button onClick={activate} className="mt-3 w-full rounded-2xl bg-gold py-5 text-lg font-bold text-night">Payment received → activate &amp; admit</button>
          </div>
        );
      })()}

      {res.kind === "done" && (
        <div className={`${card} border-white/30 bg-white/10`}>
          <ShieldCheck className="mx-auto text-sl-green" size={64} />
          <p className="font-display mt-2 text-3xl font-extrabold">{res.note}</p>
          <p className="font-mono text-xs text-white/60">{res.code}</p>
          <p className="mt-2 text-xs text-white/60">Next person: scan or type the next code.</p>
        </div>
      )}

      {res.kind === "decision" && (() => {
        const d = res.d;
        const t = app.tickets.find((x) => x.code === res.code);
        switch (d.kind) {
          case "admit":
            return (
              <div className={`${card} border-sl-green/50 bg-sl-green/25`}>
                <ShieldCheck className="mx-auto text-sl-green" size={64} />
                <p className="font-display mt-2 text-3xl font-extrabold text-sl-green">PAID &amp; VALID</p>
                <p className="text-sm">{title(res.code)}</p>
                <p className="font-mono text-xs text-white/60">{res.code}{res.parsed.how === "typed" ? " · typed" : ""}</p>
                <button onClick={() => commit("IN", false, res.parsed.how)} className="mt-4 w-full rounded-2xl bg-sl-green py-5 text-lg font-bold text-night">Admit → put on wristband</button>
              </div>
            );
          case "readmit":
            return (
              <div className={`${card} border-sl-blue/60 bg-sl-blue/20`}>
                <DoorOpen className="mx-auto text-sky-300" size={64} />
                <p className="font-display mt-2 text-3xl font-extrabold text-sky-300">RE-ENTRY</p>
                <p className="text-sm">{title(res.code)}</p>
                <p className="text-xs text-white/60">Stepped out at {time(t && lastOf(t, "OUT"))} · entry {(t?.entries ?? 1) + 1} of {MAX_ENTRIES}</p>
                <button onClick={() => commit("IN", false, res.parsed.how)} className="mt-4 w-full rounded-2xl bg-sky-300 py-5 text-lg font-bold text-night">Let back in</button>
              </div>
            );
          case "letout":
            return (
              <div className={`${card} border-gold/60 bg-gold/25`}>
                <LogOut className="mx-auto text-gold" size={64} />
                <p className="font-display mt-2 text-3xl font-extrabold text-gold">INSIDE NOW</p>
                <p className="text-sm">{title(res.code)}</p>
                <p className="mt-1 text-xs">{evOfCode(res.code)?.reentry === false ? "No re-entry for this event: the ticket will be void after they leave." : "They may come back with the same ticket."}</p>
                <button onClick={() => commit("OUT", false, res.parsed.how)} className="mt-4 w-full rounded-2xl bg-gold py-5 text-lg font-bold text-night">Let out</button>
              </div>
            );
          case "inside":
            return (
              <div className={`${card} border-gold/60 bg-gold/25`}>
                <ShieldAlert className="mx-auto text-gold" size={64} />
                <p className="font-display mt-2 text-3xl font-extrabold text-gold">ALREADY INSIDE</p>
                <p className="text-sm">{title(res.code)}</p>
                <p className="text-xs text-white/60">Entered at {time(d.at)}</p>
                <p className="mt-2 text-xs">Do NOT admit. This code was already used. Possible copy or shared ticket: check the wristband.</p>
              </div>
            );
          case "noreentry":
            return (
              <div className={`${card} border-hot/60 bg-hot/25`}>
                <ShieldX className="mx-auto text-hot" size={64} />
                <p className="font-display mt-2 text-3xl font-extrabold text-hot">NO RE-ENTRY</p>
                <p className="text-sm">{title(res.code)}</p>
                <p className="text-xs text-white/60">Already used and left at {time(d.at)}</p>
              </div>
            );
          case "maxentries":
            return (
              <div className={`${card} border-hot/60 bg-hot/25`}>
                <ShieldX className="mx-auto text-hot" size={64} />
                <p className="font-display mt-2 text-3xl font-extrabold text-hot">TOO MANY ENTRIES</p>
                <p className="text-xs">This ticket has already been used {MAX_ENTRIES} times. Refer to the organizer.</p>
              </div>
            );
          case "toosoon":
            return (
              <div className={`${card} border-gold/60 bg-gold/25`}>
                <Clock className="mx-auto text-gold" size={64} />
                <p className="font-display mt-2 text-3xl font-extrabold text-gold">TOO SOON</p>
                <p className="text-xs">Left a moment ago. Ask them to wait {Math.ceil(d.waitMs / 1000)} seconds, then scan again. This stops tickets being passed back through the fence.</p>
              </div>
            );
          case "stale":
            return (
              <div className={`${card} border-hot/60 bg-hot/25`}>
                <ShieldX className="mx-auto text-hot" size={64} />
                <p className="font-display mt-2 text-3xl font-extrabold text-hot">OLD CODE</p>
                <p className="text-xs">This is a screenshot or an old code. Ask the guest to open their pass again so the code refreshes, then scan. If it keeps failing, their phone clock may be wrong: type the code instead.</p>
              </div>
            );
          case "unpaid":
            return (
              <div className={`${card} border-hot/60 bg-hot/25`}>
                <Banknote className="mx-auto text-hot" size={64} />
                <p className="font-display mt-2 text-3xl font-extrabold text-hot">NOT FULLY PAID</p>
                <p className="text-sm">{title(res.code)}</p>
                <p className="mt-1 text-lg font-bold">Balance owed: NLe {d.owe}</p>
                <p className="mt-2 text-xs">{d.overdue ? "The payment deadline has passed. " : ""}Do not admit. The guest must pay the balance in their THRILL app first, then show the pass again.</p>
              </div>
            );
          case "void":
            return (
              <div className={`${card} border-hot/60 bg-hot/25`}>
                <ShieldX className="mx-auto text-hot" size={64} />
                <p className="font-display mt-2 text-3xl font-extrabold text-hot">REFUNDED / VOID</p>
                <p className="text-sm">{title(res.code)}</p>
                <p className="mt-2 text-xs">This ticket was refunded and is no longer valid. Do not admit.</p>
              </div>
            );
          case "wrongevent":
            return (
              <div className={`${card} border-hot/60 bg-hot/25`}>
                <ShieldX className="mx-auto text-hot" size={64} />
                <p className="font-display mt-2 text-3xl font-extrabold text-hot">WRONG EVENT</p>
                <p className="text-sm">{title(res.code)}</p>
                <p className="text-xs">This ticket is for a different event than the one you are staffing.</p>
              </div>
            );
          case "notinside":
            return (
              <div className={`${card} border-white/30 bg-white/10`}>
                <ShieldAlert className="mx-auto" size={64} />
                <p className="font-display mt-2 text-3xl font-extrabold">NOT INSIDE</p>
                <p className="text-sm">{title(res.code)}</p>
                <p className="mt-1 text-xs text-white/60">This ticket is not marked as inside, so it cannot be let out.</p>
              </div>
            );
          case "manager":
            return (
              <div className={`${card} border-sl-blue/60 bg-sl-blue/15`}>
                <KeyRound className="mx-auto text-sky-300" size={64} />
                <p className="font-display mt-2 text-3xl font-extrabold text-sky-300">MANAGER APPROVAL NEEDED</p>
                <p className="text-sm">{title(res.code)}</p>
                <p className="mt-1 text-xs">{d.why}.</p>
                <select aria-label="Reason" value={mgrReason} onChange={(e) => setMgrReason(e.target.value)} className="mt-3 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm">
                  {["Guest phone is dead", "Guest feels unwell", "Guest left by mistake", "Other"].map((r) => <option key={r} className="text-black">{r}</option>)}
                </select>
                <input aria-label="Manager PIN" type="password" inputMode="numeric" autoComplete="off" value={mgrPin} onChange={(e) => setMgrPin(e.target.value)} placeholder="Manager PIN" className="mt-2 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-center outline-none placeholder:text-white/35" />
                {mgrMsg && <p role="alert" className="mt-2 text-xs text-hot">{mgrMsg}</p>}
                <button onClick={approveOverride} className="mt-3 w-full rounded-2xl bg-sky-300 py-3 font-bold text-night">Approve ({d.then === "letout" ? "let out" : "let in"})</button>
                <p className="mt-2 text-[10px] text-white/45">This is recorded with your name and the manager&apos;s reason.</p>
              </div>
            );
        }
      })()}

      <p className="mt-8 text-[11px] text-white/40">Demo: checks passes saved on this phone only. The real app checks the server, so every gate sees the same state.</p>
    </main>
  );
}
