"use client";

import Link from "next/link";

// Shown if something unexpected breaks. No technical details are shown to the visitor.
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-md place-items-center bg-night px-6 text-center text-ink">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Something went wrong</h1>
        <p className="mt-2 text-sm text-white/60">Your tickets are safe on this phone. Try again, or go back to the home screen.</p>
        <div className="mt-5 flex justify-center gap-2">
          <button onClick={reset} className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-night">Try again</button>
          <Link href="/" className="glass rounded-2xl px-5 py-3 text-sm font-bold">Home</Link>
        </div>
      </div>
    </main>
  );
}
