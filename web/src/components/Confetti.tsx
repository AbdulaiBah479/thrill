"use client";

import { motion } from "motion/react";

const COLORS = ["#ff2e88", "#ff7a1a", "#ffc83d", "#1eb53a", "#0072c6", "#ffffff"];
// Fixed pseudo-random values so the burst looks the same on every render.
const r = (i: number, k: number) => {
  const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/** One-shot celebration burst. Hidden from screen readers and skipped for people who prefer less motion. */
export function Confetti() {
  if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return null;
  return (
    <div aria-hidden data-testid="confetti" className="pointer-events-none absolute inset-x-0 top-0 z-50 h-0 overflow-visible">
      {Array.from({ length: 42 }, (_, i) => (
        <motion.span
          key={i}
          className="absolute block rounded-[2px]"
          style={{ left: `${r(i, 1) * 100}%`, top: -10, width: 6 + r(i, 2) * 6, height: 10 + r(i, 3) * 8, background: COLORS[i % COLORS.length] }}
          initial={{ y: 0, opacity: 1, rotate: 0 }}
          animate={{ y: 520 + r(i, 4) * 260, x: (r(i, 5) - 0.5) * 160, opacity: 0, rotate: 360 * (r(i, 6) - 0.5) * 3 }}
          transition={{ duration: 1.8 + r(i, 7) * 1.2, ease: "easeOut", delay: r(i, 8) * 0.25 }}
        />
      ))}
    </div>
  );
}
