"use client";

import { CalendarPlus, Navigation, BadgeCheck, Clock, MapPin, Bell, DoorOpen, Flag, ShieldCheck, Star, ImageDown, UserPlus, UserCheck } from "lucide-react";
import { shareCard } from "@/lib/shareCard";
import { useState } from "react";
import { Sheet } from "./Sheet";
import { type Ev, isSoldOut, mapsUrl } from "@/lib/events";
import { downloadIcs } from "@/lib/ics";
import { countdown, useMinute } from "@/lib/hooks";

export function DetailSheet({
  ev,
  onClose,
  onBuy,
  onWaitlist,
  onWaitlisted,
  onReport,
  rating,
  following,
  onFollow,
  toast,
}: {
  ev: Ev | null;
  onClose: () => void;
  onBuy: (e: Ev) => void;
  onWaitlist: (e: Ev) => void;
  onWaitlisted: boolean;
  onReport: (e: Ev, reason: string) => void;
  rating: { count: number; avg: number };
  following: boolean;
  onFollow: (name: string) => void;
  toast: (m: string) => void;
}) {
  const minute = useMinute();
  const [reporting, setReporting] = useState(false);
  return (
    <Sheet open={!!ev} onClose={onClose} title={ev ? ev.title : ""}>
      {ev && (
        <div>
          <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs">
            <Clock size={12} /> {countdown(ev.startAt, ev.durationH, minute) || ev.when}
          </p>
          <p className="mt-3 text-sm text-white/80">{ev.blurb}</p>
          <ul className="mt-4 space-y-2 text-sm text-white/70">
            <li className="flex items-center gap-2"><Clock size={15} /> {ev.when} · about {ev.durationH}h</li>
            <li className="flex items-center gap-2"><MapPin size={15} /> {ev.area}</li>
            <li className="flex items-center gap-2"><DoorOpen size={15} /> {ev.reentry === false ? "No re-entry. Once you leave, the ticket is used." : "Re-entry allowed. Show your pass again at the gate."}</li>
            <li className="flex items-center gap-2">
              <BadgeCheck size={15} className={ev.verified ? "text-sl-green" : "text-white/30"} />
              {ev.organizer} · {ev.verified ? "Verified by THRILL" : "Not yet verified"}
            </li>
            <li>
              <button onClick={() => onFollow(ev.organizer)} aria-pressed={following} className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${following ? "bg-sl-green/20 text-sl-green" : "bg-white/10"}`}>
                {following ? <><UserCheck size={13} /> Following {ev.organizer}</> : <><UserPlus size={13} /> Follow {ev.organizer} for new events</>}
              </button>
            </li>
            {rating.count > 0 && (
              <li className="flex items-center gap-2"><Star size={15} className="fill-gold text-gold" /> {rating.avg.toFixed(1)} from {rating.count} rating{rating.count === 1 ? "" : "s"} by ticket holders</li>
            )}
            <li className="flex items-center gap-2"><ShieldCheck size={15} /> Refunds only if the event is cancelled or you were charged by mistake.</li>
          </ul>

          <p className="mt-4 text-xs uppercase tracking-widest text-white/50">Tickets</p>
          <ul className="mt-2 space-y-1 text-sm">
            {ev.tiers.map((t) => (
              <li key={t.name} className="flex justify-between rounded-xl bg-white/5 px-3 py-2">
                <span>{t.name} <span className="text-white/50">· {t.perk}</span></span>
                <b>{t.price === 0 ? "FREE" : `NLe ${t.price}`}</b>
              </li>
            ))}
          </ul>

          <button
            onClick={async () => {
              try {
                const r = await shareCard(ev);
                toast(r === "shared" ? "Story card shared" : "Story image saved. Post it on WhatsApp Status or Instagram.");
              } catch {
                toast("Could not make the image on this device");
              }
            }}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-white/10 py-3 text-sm font-semibold"
          >
            <ImageDown size={16} /> Share as story image
          </button>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <a href={mapsUrl(ev)} target="_blank" rel="noopener noreferrer" className="glass flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold">
              <Navigation size={16} /> Directions
            </a>
            <button onClick={() => { downloadIcs(ev); toast("Calendar file ready, with a 2-hour reminder"); }} className="glass flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold">
              <CalendarPlus size={16} /> Add to calendar
            </button>
          </div>

          {isSoldOut(ev) ? (
            <button onClick={() => onWaitlist(ev)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-gold py-3.5 font-bold text-night">
              <Bell size={18} /> {onWaitlisted ? "You're on the waitlist (tap to leave)" : "Sold out · Join waitlist"}
            </button>
          ) : (
            <button onClick={() => { onClose(); onBuy(ev); }} className="mt-3 w-full rounded-2xl bg-gradient-to-r from-hot to-sunset py-3.5 font-bold">
              Get pass
            </button>
          )}

          {!reporting ? (
            <button onClick={() => setReporting(true)} className="mt-3 flex w-full items-center justify-center gap-2 text-xs text-white/45">
              <Flag size={13} /> Report this event
            </button>
          ) : (
            <div className="mt-3 rounded-2xl bg-white/5 p-3">
              <p className="text-xs text-white/60">What is wrong?</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                {["Looks like a scam", "Wrong info", "Event cancelled", "Unsafe / illegal"].map((r) => (
                  <button key={r} onClick={() => { onReport(ev, r); setReporting(false); toast("Thanks. THRILL will review this event."); }} className="rounded-xl bg-white/10 py-2">{r}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}
