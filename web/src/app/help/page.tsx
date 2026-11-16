import Link from "next/link";
import { ArrowLeft, CircleHelp } from "lucide-react";

const FAQ: { q: string; a: string }[] = [
  { q: "How do I get a ticket?", a: "Open an event, tap Get pass, choose a ticket, and pay with mobile money. Your THRILL Pass appears in My Tickets and works offline." },
  { q: "What do I show at the gate?", a: "Your pass on your phone. Staff scan the code and give you an official THRILL wristband. The code refreshes every 30 seconds, so a screenshot will not work." },
  { q: "Can I go out and come back?", a: "Only if the event allows re-entry. The event page tells you. If it does, show your pass again at the gate." },
  { q: "Can I get a refund?", a: "Tickets are final, except when an event is cancelled or you were charged by mistake. If that happens, tell us through Report this event." },
  { q: "How do I give a ticket to a friend?", a: "Open the ticket in My Tickets and tap Gift. Send your friend the gift code. When they claim it, your QR stops working and they get a new one." },
  { q: "How do I know an event is real?", a: "Look for Verified by THRILL. Every organizer is checked before their events go live. If something feels wrong, tap Report this event." },
  { q: "I lost my phone. What now?", a: "Your tickets are saved on this phone in the demo, so make a backup in the You tab. With a THRILL account, you will sign in on a new phone and your tickets come back." },
  { q: "I organize events. How do I start?", a: "Choose Organizer, apply once with your details, and THRILL verifies you. After that you can create events, order official wristbands and see your sales." },
  { q: "Who prints the wristbands?", a: "Only THRILL. Every wristband is numbered and in one official design, and blank ones do not work until a promoter activates them at the door." },
  { q: "Is my data safe?", a: "THRILL asks only for what it needs. In this demo, data stays on your phone. In the full app it is encrypted, and ID documents can only be seen by THRILL staff." },
];

export default function Help() {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-md bg-night px-4 pb-12 pt-5 text-ink">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-white/60"><ArrowLeft size={16} /> Back</Link>
      <h1 className="font-display mt-3 flex items-center gap-2 text-2xl font-extrabold"><CircleHelp /> Help and safety</h1>
      <div className="mt-4 space-y-2">
        {FAQ.map((f) => (
          <details key={f.q} className="glass group rounded-2xl p-4">
            <summary className="cursor-pointer list-none font-semibold marker:hidden">{f.q}</summary>
            <p className="mt-2 text-sm text-white/70">{f.a}</p>
          </details>
        ))}
      </div>
      <p className="mt-6 text-center text-xs text-white/40">Stay safe: go with friends, share your location with someone you trust (You tab → Safe night), and never share your pass code with strangers.</p>
    </main>
  );
}
