"use client";

import { useState } from "react";
import { Users, Link2, MessageCircle } from "lucide-react";
import { Sheet } from "./Sheet";
import { type Ev, withFee } from "@/lib/events";
import { copyText } from "@/lib/share";

export function SquadSheet({ ev, onClose, toast, people, onPeople, onBook }: { ev: Ev | null; onClose: () => void; toast: (m: string) => void; people: { name: string; paid: boolean }[]; onPeople: (p: { name: string; paid: boolean }[]) => void; onBook: (e: Ev) => void }) {
  const [people4, setPeople] = useState(4);
  const [friend, setFriend] = useState("");
  const price = ev ? Math.min(...ev.tiers.filter((t) => t.price > 0).map((t) => t.price)) : 0;
  const share = withFee(price);

  const link = () => `${window.location.origin}/?event=${ev?.id}&squad=${people4}`;
  const message = () =>
    `Join my squad for ${ev?.title} (${ev?.when}). Your share: NLe ${share}. Open: ${link()}`;

  async function copy() {
    toast((await copyText(link())) ? "Squad link copied" : "Could not copy. Long-press the link to copy.");
  }

  return (
    <Sheet open={!!ev} onClose={onClose} title="Squad ticket">
      {ev && (
        <div>
          <p className="mt-1 flex items-center gap-2 text-sm text-white/70"><Users size={16} /> {ev.title}</p>
          <p className="mt-3 text-sm text-white/70">You book. Friends pay their own share by mobile money. Unpaid shares release after 30 minutes.</p>
          <label htmlFor="squad-size" className="mt-5 block text-sm">Squad size: <b>{people4}</b></label>
          <input id="squad-size" type="range" min={2} max={10} value={people4} onChange={(e) => setPeople(+e.target.value)} className="mt-2 w-full accent-[#ff2e88]" />
          <div className="mt-4 rounded-2xl bg-white/5 p-4 text-center">
            <p className="text-xs text-white/50">Each friend pays</p>
            <p className="font-display text-3xl font-extrabold">NLe {share}</p>
            <p className="text-[11px] text-white/50">incl. 2% fee · group total NLe {share * people4}</p>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={copy} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sl-blue to-sl-green py-3.5 font-bold">
              <Link2 size={18} /> Copy link
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(message())}`}
              target="_blank"
              rel="noopener noreferrer"
              className="glass flex items-center justify-center gap-2 rounded-2xl px-4 font-bold"
            >
              <MessageCircle size={18} /> WhatsApp
            </a>
          </div>
          <div className="mt-5 rounded-2xl bg-white/5 p-3">
            <p className="text-sm font-semibold">Who has paid their share?</p>
            <p className="text-[11px] text-white/50">Add your friends and tick them off as they pay you. Manual for now. With real payments, each friend pays through their own mobile money link and it ticks by itself.</p>
            <div className="mt-2 flex gap-2">
              <input aria-label="Friend name" value={friend} maxLength={30} onChange={(e) => setFriend(e.target.value)} placeholder="Friend's name" className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-white/30" />
              <button onClick={() => { if (friend.trim().length >= 2 && people.length < 15) { onPeople([...people, { name: friend.trim(), paid: false }]); setFriend(""); } }} className="rounded-xl bg-white px-3 text-sm font-bold text-night">Add</button>
            </div>
            <ul className="mt-2 space-y-1">
              {people.map((p, i) => (
                <li key={i} className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2"><input type="checkbox" checked={p.paid} onChange={() => onPeople(people.map((x, j) => (j === i ? { ...x, paid: !x.paid } : x)))} className="size-4 accent-[#1eb53a]" aria-label={`${p.name} has paid`} /> {p.name}</label>
                  <button onClick={() => onPeople(people.filter((_, j) => j !== i))} aria-label={`Remove ${p.name}`} className="text-xs text-white/40 underline">remove</button>
                </li>
              ))}
            </ul>
            {people.length > 0 && (() => {
              const paid = people.filter((p) => p.paid).length;
              return (
                <>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-sl-green" style={{ width: `${(paid / people.length) * 100}%` }} /></div>
                  <p className="mt-1 text-xs text-white/60">{paid} of {people.length} paid · NLe {paid * share} of NLe {people.length * share} collected</p>
                  {paid === people.length && <button onClick={() => onBook(ev)} className="mt-2 w-full rounded-xl bg-sl-green py-2.5 text-sm font-bold text-night">Everyone has paid. Book the tickets</button>}
                </>
              );
            })()}
          </div>
        </div>
      )}
    </Sheet>
  );
}
