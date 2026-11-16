"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Check, Smartphone, Loader2 } from "lucide-react";
import { Sheet } from "./Sheet";
import { PassView } from "./PassView";
import { Confetti } from "./Confetti";
import { type Ev } from "@/lib/events";
import { makeCode, type Fund, type Promoter, type Ticket } from "@/lib/store";

const METHODS = ["Afrimoney", "Orange Money", "Airtel Money"];

// Demo promo codes. The real app checks these on the server so they can't be guessed or reused.
const PROMOS: Record<string, { label: string; apply: (base: number, qty: number) => number }> = {
  THRILL10: { label: "10% off", apply: (b) => Math.round(b * 0.1) },
  SQUAD20: { label: "20% off for 4+ tickets", apply: (b, q) => (q >= 4 ? Math.round(b * 0.2) : 0) },
};

export function BuySheet({
  ev,
  onClose,
  onBought,
  onGoTickets,
  promoters,
  fund,
  onFund,
}: {
  ev: Ev | null;
  onClose: () => void;
  onBought: (tickets: Ticket[]) => void;
  onGoTickets: () => void;
  promoters: Promoter[];
  fund: Fund;
  onFund: (delta: number, note: string) => void;
}) {
  return (
    <Sheet open={!!ev} onClose={onClose} title={ev ? ev.title : ""}>
      {ev && <BuyFlow key={ev.id} ev={ev} onClose={onClose} onBought={onBought} onGoTickets={onGoTickets} promoters={promoters} fund={fund} onFund={onFund} />}
    </Sheet>
  );
}

function BuyFlow({
  ev,
  onClose,
  onBought,
  onGoTickets,
  promoters,
  fund,
  onFund,
}: {
  ev: Ev;
  onClose: () => void;
  onBought: (tickets: Ticket[]) => void;
  onGoTickets: () => void;
  promoters: Promoter[];
  fund: Fund;
  onFund: (delta: number, note: string) => void;
}) {
  const [step, setStep] = useState<"pick" | "wait" | "done">("pick");
  const [tier, setTier] = useState(0);
  const [qty, setQty] = useState(1);
  const [method, setMethod] = useState(METHODS[0]);
  const [bought, setBought] = useState<Ticket[]>([]);
  const [promoIn, setPromoIn] = useState("");
  const [promo, setPromo] = useState("");
  const [promoMsg, setPromoMsg] = useState("");
  const [promoter, setPromoter] = useState("");
  const [parts, setParts] = useState(1);
  const [nowAt] = useState(() => Date.now());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const t = ev.tiers[tier];
  const base = t.price * qty;
  const discount = promo ? Math.min(base, PROMOS[promo].apply(base, qty)) : 0;
  const net = base - discount;
  const fee = net > 0 ? Math.ceil(net * 0.02) : 0;
  const total = net + fee;

  // Pay in parts: reserve now, pay the rest before the event. Only when the event is more than a day away.
  const canSplit = t.price > 0 && total >= 60 && ev.startAt - nowAt > 24 * 3600_000;
  const perTicket = Math.round(total / qty);
  const firstEach = parts > 1 ? Math.ceil(perTicket / parts) : perTicket;
  const balanceEach = parts > 1 ? perTicket - firstEach : 0;
  const payNow = firstEach * qty;
  const payBy = Math.min(nowAt + 7 * 86_400_000, ev.startAt - 2 * 3600_000);

  // Night Fund: pay from your saved money, or round the payment up and save the change.
  const canUseFund = payNow > 0 && fund.balance >= payNow;
  const usingFund = method === "Night Fund" && canUseFund;
  const roundExtra = fund.roundUp && !usingFund && payNow > 0 ? (Math.ceil(payNow / 10) * 10 - payNow) : 0;
  const chargeNow = payNow + roundExtra;

  function applyPromo() {
    const c = promoIn.trim().toUpperCase();
    setPromoter("");
    const sales = promoters.find((x) => x.evId === ev.id && x.code === c);
    if (sales) { setPromo(""); setPromoter(sales.code); return setPromoMsg(`Code accepted. This supports ${sales.name}.`); }
    const p = Object.hasOwn(PROMOS, c) ? PROMOS[c] : undefined;
    if (!p) { setPromo(""); return setPromoMsg("That code isn't valid."); }
    if (p.apply(base, qty) === 0) { setPromo(""); return setPromoMsg(`${c} needs ${p.label}.`); }
    setPromo(c);
    setPromoMsg(`${c} applied: ${p.label}`);
  }

  function pay() {
    setStep("wait");
    timer.current = setTimeout(() => {
      const made: Ticket[] = Array.from({ length: qty }, () => ({
        code: makeCode(ev.id),
        evId: ev.id,
        tier: t.name,
        price: perTicket,
        promo: promo || undefined,
        promoter: promoter || undefined,
        balance: balanceEach > 0 ? balanceEach : undefined,
        payBy: balanceEach > 0 ? payBy : undefined,
        method: t.price === 0 ? "Free" : usingFund ? "Night Fund" : method === "Night Fund" ? METHODS[0] : method,
        at: Date.now(),
      }));
      if (usingFund) onFund(-payNow, `Ticket: ${ev.title}`);
      else if (roundExtra > 0) onFund(roundExtra, `Round-up: ${ev.title}`);
      setBought(made);
      onBought(made);
      setStep("done");
    }, 1800);
  }

  if (step === "done") {
    return (
      <div>
        <Confetti />
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mt-4 flex items-center gap-2 text-sl-green">
          <span className="grid size-7 place-items-center rounded-full bg-sl-green text-night"><Check size={16} /></span>
          <b>{balanceEach > 0 ? `Spot reserved! Pay the balance by ${new Date(payBy).toLocaleDateString([], { day: "numeric", month: "short" })} to unlock your pass.` : `You're in! ${bought.length > 1 ? `${bought.length} passes saved.` : "Pass saved to My Tickets."}`}</b>
        </motion.div>
        <PassView ev={ev} tier={t.name} code={bought[0].code} owe={balanceEach} />
        <div className="mt-4 flex gap-2">
          <button onClick={() => { onClose(); onGoTickets(); }} className="flex-1 rounded-2xl bg-white py-3.5 font-bold text-night">View my tickets</button>
          <button onClick={onClose} className="glass rounded-2xl px-5 font-bold">Done</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="mt-1 text-xs text-white/60">{ev.when} · {ev.area}</p>

      <p className="mt-4 text-xs uppercase tracking-widest text-white/50">Choose ticket</p>
      <div className="mt-2 space-y-2">
        {ev.tiers.map((x, i) => (
          <button
            key={x.name}
            onClick={() => setTier(i)}
            className={`flex w-full items-center justify-between rounded-2xl border p-3 text-left transition ${tier === i ? "border-white bg-white/15" : "border-white/15 bg-white/5"}`}
          >
            <span>
              <b className="block">{x.name}</b>
              <span className="text-xs text-white/60">{x.perk}</span>
            </span>
            <b className="font-display">{x.price === 0 ? "FREE" : `NLe ${x.price}`}</b>
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm">Quantity</span>
        <div className="flex items-center gap-3">
          <button onClick={() => setQty(Math.max(1, qty - 1))} className="size-9 rounded-full bg-white/10 text-lg" aria-label="Less">−</button>
          <b className="w-5 text-center">{qty}</b>
          <button onClick={() => setQty(Math.min(10, qty + 1))} className="size-9 rounded-full bg-white/10 text-lg" aria-label="More">+</button>
        </div>
      </div>

      {t.price > 0 && (
        <>
          <div className="mt-4 flex gap-2">
            <input
              value={promoIn}
              onChange={(e) => { setPromoIn(e.target.value); if (promo || promoter) { setPromo(""); setPromoter(""); setPromoMsg(""); } }}
              placeholder="Promo or promoter code"
              aria-label="Promo code"
              className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm uppercase outline-none placeholder:normal-case placeholder:text-white/30"
            />
            <button onClick={applyPromo} className="rounded-xl bg-white/10 px-4 text-sm font-semibold">Apply</button>
          </div>
          {promoMsg && <p className={`mt-1 text-xs ${promo || promoter ? "text-sl-green" : "text-hot"}`}>{promoMsg}</p>}

          {canSplit && (
            <>
              <p className="mt-4 text-xs uppercase tracking-widest text-white/50">How do you want to pay?</p>
              <div role="group" aria-label="Payment plan" className="mt-2 grid grid-cols-3 gap-2">
                {[1, 2, 3].map((n) => (
                  <button key={n} onClick={() => setParts(n)} aria-pressed={parts === n} className={`rounded-xl border px-2 py-2 text-xs font-semibold ${parts === n ? "border-sl-green bg-sl-green/15 text-sl-green" : "border-white/15 bg-white/5"}`}>
                    {n === 1 ? "Pay in full" : `${n} parts`}
                  </button>
                ))}
              </div>
              {parts > 1 && <p className="mt-1 text-[11px] text-white/55">Pay NLe {payNow} now to reserve your spot. Pay the rest (NLe {balanceEach * qty}) by {new Date(payBy).toLocaleDateString([], { day: "numeric", month: "short" })}. Your pass unlocks when it is fully paid.</p>}
            </>
          )}

          <p className="mt-4 text-xs uppercase tracking-widest text-white/50">Pay with</p>
          <div className="mt-2 flex gap-2">
            {[...METHODS, ...(canUseFund ? ["Night Fund"] : [])].map((m) => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                aria-pressed={m === "Night Fund" ? usingFund : method === m}
                className={`flex-1 rounded-xl border px-2 py-2 text-xs font-semibold ${(m === "Night Fund" ? usingFund : method === m) ? "border-gold bg-gold/15 text-gold" : "border-white/15 bg-white/5"}`}
              >
                {m === "Night Fund" ? `Night Fund (NLe ${fund.balance})` : m}
              </button>
            ))}
          </div>
          <p className="mt-2 flex items-center gap-1 text-[11px] text-white/50">
            <Smartphone size={12} /> You&apos;ll confirm on your phone. We never see your PIN.
          </p>
        </>
      )}

      <div className="mt-4 rounded-2xl bg-white/5 p-3 text-sm">
        <div className="flex justify-between"><span>{qty} × {t.name}</span><span>NLe {base}</span></div>
        {discount > 0 && <div className="flex justify-between text-sl-green"><span>Promo {promo}</span><span>− NLe {discount}</span></div>}
        {t.price > 0 && <div className="flex justify-between text-white/60"><span>THRILL fee (2%)</span><span>NLe {fee}</span></div>}
        <div className="mt-1 flex justify-between border-t border-white/10 pt-1 font-bold"><span>Total</span><span>NLe {total}</span></div>
        {parts > 1 && <div className="flex justify-between text-gold"><span>Pay now</span><span>NLe {payNow}</span></div>}
        {roundExtra > 0 && <div className="flex justify-between text-sl-green"><span>Round-up to your Night Fund</span><span>NLe {roundExtra}</span></div>}
      </div>

      {t.price > 0 && <p className="mt-2 text-[11px] text-white/50">Where your money goes: NLe {net} to the organizer, NLe {fee} THRILL fee. No other charges.</p>}

      <button
        onClick={pay}
        disabled={step === "wait"}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-hot to-sunset py-3.5 font-bold text-white active:scale-[0.98]"
      >
        {step === "wait" ? <><Loader2 className="animate-spin" size={18} /> Waiting for approval…</> : t.price === 0 ? "Get free pass" : `Pay NLe ${parts > 1 ? chargeNow : total + roundExtra}`}
      </button>
      <p className="mt-2 text-center text-[10px] text-white/40">Demo only. No real payment happens.</p>
    </div>
  );
}
