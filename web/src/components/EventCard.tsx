"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { BadgeCheck, Heart, Share2, MapPin, Users, Flame, Info, Bell } from "lucide-react";
import { type Ev, minPrice, isSoldOut, posterStyle, patternStyle } from "@/lib/events";

const AVATAR = ["bg-hot", "bg-sunset", "bg-sl-blue", "bg-sl-green"];

export function EventCard({
  ev,
  lite,
  saved,
  onSave,
  onShare,
  onBuy,
  onSquad,
  onDetails,
  onWaitlist,
  waitlisted,
  reason,
  value,
  crowd,
}: {
  ev: Ev;
  lite: boolean;
  saved: boolean;
  onSave: () => void;
  onShare: () => void;
  onBuy: () => void;
  onSquad: () => void;
  onDetails: () => void;
  onWaitlist: () => void;
  waitlisted: boolean;
  reason?: string | null;
  value?: boolean;
  crowd?: string | null;
}) {
  const price = minPrice(ev);
  const sold = Math.round((ev.going / ev.capacity) * 100);
  const out = isSoldOut(ev);
  const hot = sold >= 70 && !out;

  return (
    <section className="relative h-dvh snap-start overflow-hidden" style={lite ? { background: "#15101d" } : posterStyle(ev)}>
      {!lite && (
        <>
          {ev.photo && <Image src={ev.photo} alt="" fill sizes="448px" priority={false} className="object-cover" />}
          <div className="absolute inset-0 opacity-40 mix-blend-multiply" style={posterStyle(ev)} />
          <div className="absolute inset-0 opacity-[0.08]" style={patternStyle(ev)} />
          <div className="floaty absolute right-[-60px] top-[22%] size-64 rounded-full opacity-40 blur-3xl" style={{ background: ev.colors[0] }} />
          <div className="grain absolute inset-0" />
        </>
      )}
      <div className="absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-night via-night/75 to-transparent" />

      {/* right action rail */}
      <div className="absolute bottom-64 right-3 z-20 flex flex-col items-center gap-4">
        <motion.button whileTap={{ scale: 0.8 }} onClick={onSave} aria-label="Save event" className="glass grid size-11 place-items-center rounded-full">
          <Heart size={20} className={saved ? "fill-hot text-hot" : ""} />
        </motion.button>
        <motion.button whileTap={{ scale: 0.8 }} onClick={onDetails} aria-label="Event details" className="glass grid size-11 place-items-center rounded-full">
          <Info size={19} />
        </motion.button>
        <motion.button whileTap={{ scale: 0.8 }} onClick={onShare} aria-label="Share" className="glass grid size-11 place-items-center rounded-full">
          <Share2 size={19} />
        </motion.button>
      </div>

      <div className="absolute inset-x-0 bottom-24 z-10 px-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-night">{ev.when}</span>
          <span className="glass rounded-full px-2.5 py-1 text-[11px]">{ev.category}</span>
          {crowd && <span className="rounded-full bg-sl-blue px-2.5 py-1 text-[11px] font-bold">● {crowd}</span>}
          {value && !hot && <span className="rounded-full bg-sl-green px-2.5 py-1 text-[11px] font-bold text-night">Great value</span>}
          {hot && (
            <span className="flex items-center gap-1 rounded-full bg-hot px-2.5 py-1 text-[11px] font-bold">
              <Flame size={12} /> Selling fast
            </span>
          )}
        </div>

        {reason && <p className="mt-2 text-[11px] font-semibold text-gold">★ {reason}</p>}
        <h2 className="font-display mt-3 pr-14 text-[2rem] font-extrabold leading-[1.05] tracking-tight">
          <button onClick={onDetails} className="text-left">{ev.title}</button>
        </h2>
        <p className="mt-2 flex items-center gap-1 text-sm text-white/80"><MapPin size={14} /> {ev.area}</p>
        <p className="mt-1 flex items-center gap-1 text-xs text-white/60">
          by {ev.organizer} {ev.verified && <BadgeCheck size={14} className="text-sl-green" aria-label="Verified organizer" />}
        </p>
        {!lite && <p className="mt-2 pr-14 text-sm text-white/75">{ev.blurb}</p>}

        <div className="mt-3 flex items-center gap-3">
          {ev.friends.length > 0 ? (
            <div className="flex items-center">
              {ev.friends.slice(0, 3).map((f, i) => (
                <span key={f} className={`-ml-2 first:ml-0 grid size-7 place-items-center rounded-full border-2 border-night text-[11px] font-bold ${AVATAR[i % 4]}`}>
                  {f[0]}
                </span>
              ))}
              <span className="ml-2 text-xs text-white/80">{ev.friends[0]}{ev.friends.length > 1 ? ` +${ev.friends.length - 1}` : ""} going</span>
            </div>
          ) : (
            <span className="flex items-center gap-1 text-xs text-white/70"><Users size={14} /> {ev.going} going</span>
          )}
        </div>

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15" aria-label={`${sold}% sold`}>
          <motion.div initial={{ width: 0 }} whileInView={{ width: `${sold}%` }} transition={{ duration: 0.9 }} className="h-full rounded-full bg-gradient-to-r from-gold to-hot" />
        </div>
        <p className="mt-1 text-[10px] text-white/50">{out ? "Sold out" : `${sold}% claimed`}</p>

        <div className="mt-3 flex gap-2">
          {out ? (
            <motion.button whileTap={{ scale: 0.96 }} onClick={onWaitlist} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gold py-3.5 text-base font-bold text-night">
              <Bell size={18} /> {waitlisted ? "On the waitlist ✓" : "Sold out · Join waitlist"}
            </motion.button>
          ) : (
            <motion.button whileTap={{ scale: 0.96 }} onClick={onBuy} className="flex-1 rounded-2xl bg-white py-3.5 text-base font-bold text-night shadow-lg shadow-black/30">
              {price === 0 ? "Get free pass" : `Get pass · from NLe ${price}`}
            </motion.button>
          )}
          {price > 0 && !out && (
            <motion.button whileTap={{ scale: 0.96 }} onClick={onSquad} className="glass flex items-center gap-1 rounded-2xl px-4 font-bold">
              <Users size={18} /> Squad
            </motion.button>
          )}
        </div>
      </div>
      {!lite && ev.credit && (
        <a href={ev.credit.url} target="_blank" rel="noopener noreferrer" className="absolute bottom-[4.6rem] left-5 z-10 text-[9px] text-white/45 underline">
          Photo: {ev.credit.name} / Pexels
        </a>
      )}
    </section>
  );
}
