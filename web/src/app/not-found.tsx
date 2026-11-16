import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-md place-items-center bg-night px-6 text-center text-ink">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Page not found</h1>
        <p className="mt-2 text-sm text-white/60">That page does not exist. Let&apos;s find you an event instead.</p>
        <Link href="/" className="mt-5 inline-block rounded-2xl bg-white px-5 py-3 text-sm font-bold text-night">Back to events</Link>
      </div>
    </main>
  );
}
