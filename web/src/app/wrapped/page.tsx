"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles, Share2 } from "lucide-react";
import { useAppState } from "@/lib/store";
import { EVENTS } from "@/lib/events";
import { makeWrappedCard, wrappedStats } from "@/lib/wrapped";

export default function WrappedPage() {
  const [app] = useAppState();
  const [msg, setMsg] = useState("");
  const w = wrappedStats(app.tickets, [...EVENTS, ...app.customEvents]);

  async function share() {
    try {
      const blob = await makeWrappedCard(w, app.name);
      const file = new File([blob], "thrill-wrapped.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "My THRILL Wrapped" });
        return setMsg("Shared!");
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMsg("Image saved. Post it on your WhatsApp Status or Instagram.");
    } catch (e) {
      if ((e as Error).name !== "AbortError") setMsg("Could not make the image on this device.");
    }
  }

  const stat = (big: string | number, small: string) => (
    <div className="rounded-3xl bg-white/10 p-4 backdrop-blur">
      <b className="font-display text-3xl font-extrabold">{big}</b>
      <p className="text-xs text-white/75">{small}</p>
    </div>
  );

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md bg-gradient-to-br from-[#2a0a3a] via-[#c2185b] to-[#ff7a1a] px-4 pb-12 pt-5 text-white">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-white/80"><ArrowLeft size={16} /> Back</Link>
      <h1 className="font-display mt-3 flex items-center gap-2 text-2xl font-extrabold"><Sparkles className="text-gold" /> {app.name ? `${app.name}'s` : "My"} THRILL Wrapped</h1>

      {w.bought === 0 ? (
        <div className="mt-10 rounded-3xl bg-black/25 p-6 text-center">
          <p className="font-display text-xl font-extrabold">Your Wrapped starts with your first night out</p>
          <p className="mt-2 text-sm text-white/80">Buy a pass and come back. Your nights, your vibe and your title will show here.</p>
          <Link href="/" className="mt-4 inline-block rounded-2xl bg-white px-5 py-3 text-sm font-bold text-night">Find an event</Link>
        </div>
      ) : (
        <>
          <p className="mt-6 text-sm text-white/80">You are a</p>
          <p className="font-display text-5xl font-extrabold leading-tight" data-testid="wrapped-title">{w.title}</p>
          <p className="mt-1 text-sm text-gold">{w.level} · {w.points} points</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {stat(w.bought, "tickets bought")}
            {stat(w.attended, "nights out")}
            {stat(`NLe ${w.spent.toLocaleString()}`, "spent on fun")}
            {stat(w.topCategory || "-", "favourite vibe")}
            {stat(w.topCity || "-", "favourite city")}
            {stat(w.organizers, "organizers you backed")}
          </div>
          <button onClick={share} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-4 font-bold text-night"><Share2 size={18} /> Share my Wrapped</button>
          {msg && <p role="status" className="mt-3 text-center text-sm">{msg}</p>}
          <p className="mt-4 text-center text-[11px] text-white/60">Worked out from the tickets saved on this phone. Nothing is sent anywhere.</p>
        </>
      )}
    </main>
  );
}
