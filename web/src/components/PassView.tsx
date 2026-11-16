"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { WifiOff, ShieldCheck, Lock } from "lucide-react";
import { type Ev, posterStyle, patternStyle } from "@/lib/events";

export function PassView({ ev, tier, code, owe = 0, voided = false }: { ev: Ev; tier: string; code: string; owe?: number; voided?: boolean }) {
  const [now, setNow] = useState(() => Date.now());
  const [qr, setQr] = useState("");

  // Tilt and shine follow your finger. The shimmer is the "live" part a screenshot cannot copy.
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const sx = useSpring(px, { stiffness: 200, damping: 20 });
  const sy = useSpring(py, { stiffness: 200, damping: 20 });
  const rotY = useTransform(sx, [0, 1], [-12, 12]);
  const rotX = useTransform(sy, [0, 1], [10, -10]);
  const shine = useTransform(sx, [0, 1], ["-60%", "160%"]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const slot = Math.floor(now / 30000);
  const left = 30 - Math.floor((now % 30000) / 1000);

  useEffect(() => {
    // Demo token. In the real app the server signs this so it cannot be forged.
    QRCode.toDataURL(`THRILL:${code}:${slot}`, { margin: 1, width: 360, color: { dark: "#0b0712", light: "#ffffff" } }).then(setQr).catch(() => setQr(""));
  }, [code, slot]);

  return (
    <div style={{ perspective: 900 }} className="mt-4">
      <motion.div
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          px.set((e.clientX - r.left) / r.width);
          py.set((e.clientY - r.top) / r.height);
        }}
        onPointerLeave={() => {
          px.set(0.5);
          py.set(0.5);
        }}
        style={{ rotateX: rotX, rotateY: rotY, transformStyle: "preserve-3d", touchAction: "pan-y" }}
        className="relative overflow-hidden rounded-3xl bg-white text-night shadow-2xl"
      >
        <div className="relative h-24 p-4 text-white" style={posterStyle(ev)}>
          <div className="absolute inset-0 opacity-20" style={patternStyle(ev)} />
          <p className="relative text-[10px] uppercase tracking-[0.2em] opacity-80">THRILL Pass · {tier}</p>
          <p className="relative font-display text-lg font-extrabold leading-tight">{ev.title}</p>
          {/* holographic seal */}
          <motion.div
            aria-label="Genuine THRILL hologram"
            className="absolute right-3 top-3 grid size-11 place-items-center rounded-full border border-white/70 text-[15px] font-black"
            style={{ background: "conic-gradient(from 0deg,#ff2e88,#ffc83d,#1eb53a,#0072c6,#ff2e88)", backgroundPositionX: shine }}
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 9, ease: "linear" }}
          >
            <span style={{ transform: "rotate(0deg)" }} className="drop-shadow">T</span>
          </motion.div>
        </div>
        <div className="relative">
          <div className="absolute -left-3 -top-3 size-6 rounded-full bg-[#1a1124]" />
          <div className="absolute -right-3 -top-3 size-6 rounded-full bg-[#1a1124]" />
          <div className="flex flex-col items-center px-5 pb-5 pt-6">
            {voided ? (
              <div role="status" className="grid size-44 place-items-center rounded-xl bg-zinc-100 p-3 text-center">
                <div>
                  <p className="text-lg font-extrabold">REFUNDED</p>
                  <p className="text-xs text-zinc-600">This ticket is no longer valid</p>
                </div>
              </div>
            ) : owe > 0 ? (
              <div role="status" className="grid size-44 place-items-center rounded-xl bg-zinc-100 p-3 text-center">
                <div>
                  <Lock className="mx-auto text-zinc-500" size={34} />
                  <p className="mt-2 text-sm font-bold">Pass locked</p>
                  <p className="text-xs text-zinc-600">Pay the balance of NLe {owe} to unlock your QR code</p>
                </div>
              </div>
            ) : qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt="Entry QR code" className="size-44" />
            ) : (
              <div className="size-44 animate-pulse rounded-xl bg-zinc-200" />
            )}
            <p className="mt-2 font-mono text-xl font-bold tracking-wider">{code}</p>
            <div className="mt-2 h-1.5 w-40 overflow-hidden rounded-full bg-zinc-200">
              <div className="h-full bg-sl-green transition-all duration-1000" style={{ width: `${(left / 30) * 100}%` }} />
            </div>
            <p className="mt-1 text-[11px] text-zinc-500">Code refreshes in {left}s · screenshots won&apos;t work</p>
            <div className="mt-3 flex gap-3 text-[11px] text-zinc-600">
              <span className="flex items-center gap-1"><WifiOff size={12} /> Works offline</span>
              <span className="flex items-center gap-1"><ShieldCheck size={12} /> Verified by THRILL</span>
            </div>
          </div>
        </div>
        {/* moving shine */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: "linear-gradient(115deg, transparent 35%, rgba(255,255,255,.55) 47%, rgba(255,46,136,.18) 52%, rgba(0,114,198,.18) 57%, transparent 68%)",
            backgroundSize: "250% 100%",
            backgroundPositionX: shine,
            mixBlendMode: "overlay",
          }}
        />
      </motion.div>
    </div>
  );
}
