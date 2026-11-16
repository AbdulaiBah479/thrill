"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { ArrowLeft, Printer, Lock } from "lucide-react";
import { useAdmin, useAppState } from "@/lib/store";
import { EVENTS, type Ev } from "@/lib/events";

const noop = () => () => {};
type Item = { code: string; no: number };

function Qr({ code, size }: { code: string; size: number }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    // Printed QR is static. A copy has the same code, so the first scan wins and the copy is refused.
    QRCode.toDataURL(`THRILL:${code}`, { margin: 1, width: size * 3, errorCorrectionLevel: "H" }).then(setSrc).catch(() => setSrc(""));
  }, [code, size]);
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} alt={`QR ${code}`} width={size} height={size} /> : <div style={{ width: size, height: size }} />;
}

const exact = { printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" } as const;

function TicketCard({ it, ev }: { it: Item; ev: Ev }) {
  return (
    <div className="break-inside-avoid overflow-hidden rounded-xl border-2 border-black bg-white text-black" style={{ width: "92mm" }}>
      <div className="flex items-center justify-between px-3 py-2 text-white" style={{ background: ev.colors[0], ...exact }}>
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.2em]">THRILL Official Pass</p>
          <p className="text-base font-extrabold leading-tight">{ev.title}</p>
        </div>
        <p className="text-lg font-black tracking-widest">T</p>
      </div>
      <div className="flex items-center gap-3 px-3 py-2">
        <Qr code={it.code} size={96} />
        <div className="min-w-0 text-[10px] leading-snug">
          <p className="font-bold">{ev.when}</p>
          <p>{ev.area}</p>
          <p className="mt-1 font-mono text-sm font-bold tracking-wider">{it.code}</p>
          <p>No. {String(it.no).padStart(4, "0")} · 1 person</p>
          <p className="text-[9px]">{ev.reentry === false ? "No re-entry." : "Re-entry allowed."} Valid only after THRILL activation.</p>
        </div>
      </div>
      <div className="border-t-2 border-dashed border-black px-3 py-1 text-[9px]">
        Stub (THRILL keeps): <b className="font-mono">{it.code}</b> · {ev.title}
      </div>
    </div>
  );
}

function Wristband({ it, ev }: { it: Item; ev: Ev }) {
  return (
    <div className="flex break-inside-avoid items-center gap-3 border-2 border-black bg-white px-2 py-1 text-black" style={{ width: "200mm", height: "24mm", borderLeft: `10mm solid ${ev.colors[0]}`, ...exact }}>
      <Qr code={it.code} size={64} />
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-sm font-extrabold">{ev.title}</p>
        <p className="text-[10px]">{ev.when} · {ev.area}</p>
        <p className="font-mono text-xs font-bold tracking-wider">{it.code}</p>
      </div>
      <div className="text-right text-[10px] font-bold">
        <p>THRILL OFFICIAL</p>
        <p>No. {String(it.no).padStart(4, "0")}</p>
      </div>
    </div>
  );
}

export default function PrintPage() {
  const [isAdmin] = useAdmin();
  const [app] = useAppState();
  const search = useSyncExternalStore(noop, () => window.location.search, () => "");
  const [layout, setLayout] = useState<"ticket" | "wristband" | null>(null);

  const orderId = new URLSearchParams(search).get("order");
  const order = app.orders.find((o) => o.id === orderId);
  const ev = order ? ([...EVENTS, ...app.customEvents].find((e) => e.id === order.evId) ?? null) : null;
  const items: Item[] = order ? app.wristbands.filter((w) => w.orderId === order.id).map((w, i) => ({ code: w.code, no: i + 1 })) : [];
  const style = layout ?? order?.style ?? "wristband";

  if (!isAdmin) {
    return (
      <main className="mx-auto min-h-dvh max-w-md bg-night px-4 pt-5 text-ink">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-white/60"><ArrowLeft size={16} /> Back</Link>
        <div className="mt-12 text-center">
          <Lock className="mx-auto" size={40} />
          <h1 className="font-display mt-3 text-2xl font-extrabold">Printing is done by THRILL</h1>
          <p className="mt-2 text-sm text-white/60">Every wristband and ticket is printed by THRILL in one official design, so fakes are easy to spot. Order yours from the organizer area.</p>
          <Link href="/admin" className="mt-5 inline-block rounded-2xl bg-white px-5 py-3 text-sm font-bold text-night">THRILL staff sign in</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-night p-4 text-ink print:bg-white print:p-0 print:text-black">
      <div className="mx-auto max-w-3xl print:hidden">
        <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-white/60"><ArrowLeft size={16} /> Admin</Link>
        <h1 className="font-display mt-3 flex items-center gap-2 text-2xl font-extrabold"><Printer /> Print batch {order?.id}</h1>
        <p className="mt-1 text-sm text-white/60">{ev ? `${ev.title} · ` : ""}{items.length} item{items.length === 1 ? "" : "s"}. Official THRILL design. Print, or save as PDF for the print shop.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <div role="group" aria-label="Print style" className="grid grid-cols-2 gap-1 rounded-2xl bg-white/10 p-1">
            {(["ticket", "wristband"] as const).map((l) => (
              <button key={l} onClick={() => setLayout(l)} aria-pressed={style === l} className={`rounded-xl px-4 py-2 text-sm font-bold ${style === l ? "bg-white text-night" : "text-white/70"}`}>
                {l === "ticket" ? "Ticket cards" : "Wristbands"}
              </button>
            ))}
          </div>
          <button onClick={() => window.print()} disabled={items.length === 0} className="rounded-2xl bg-gradient-to-r from-hot to-sunset px-5 py-2 font-bold disabled:opacity-40">Print / save PDF</button>
        </div>
        <ul className="mt-4 list-disc space-y-1 pl-5 text-xs text-white/50">
          <li>Use tear-resistant adhesive wristband stock so a wristband can&apos;t be removed and reused.</li>
          <li>Every code starts as unsold stock. It only works after a THRILL promoter activates it at the door, so stolen blanks are worthless.</li>
          <li>A photocopy has the same code. The first scan wins and the copy shows ALREADY INSIDE.</li>
        </ul>
        {!order && <p className="mt-6 text-sm text-gold">Order not found. Open a batch from the admin Print tab.</p>}
        {order && items.length === 0 && <p className="mt-6 text-sm text-gold">No codes yet. In the admin Print tab, move the order to &quot;Start printing&quot; first.</p>}
      </div>

      {ev && (
        <div className={`mx-auto mt-5 ${style === "ticket" ? "grid max-w-3xl grid-cols-1 justify-items-center gap-3 sm:grid-cols-2 print:max-w-none print:grid-cols-2" : "flex flex-col items-center gap-2"} print:mt-0 print:gap-2`}>
          {items.map((it) => (style === "ticket" ? <TicketCard key={it.code} it={it} ev={ev} /> : <Wristband key={it.code} it={it} ev={ev} />))}
        </div>
      )}
    </main>
  );
}
