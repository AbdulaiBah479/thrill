import type { Ev } from "./events";
import { counted, stateOf, type Ticket } from "./store";
import { levelFor } from "./hooks";

export type Wrapped = {
  bought: number;
  attended: number;
  spent: number;
  freeCount: number;
  topCategory: string;
  topCity: string;
  organizers: number;
  title: string;
  level: string;
  points: number;
};

/** Your nightlife year, worked out from the tickets saved on this phone. */
export function wrappedStats(all: Ticket[], events: Ev[]): Wrapped {
  const tickets = counted(all);
  const evOf = (id: string) => events.find((e) => e.id === id);
  const count = (xs: string[]) => {
    const m = new Map<string, number>();
    xs.forEach((x) => x && m.set(x, (m.get(x) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
  };
  const spent = tickets.reduce((n, t) => n + t.price - (t.balance ?? 0), 0);
  const attended = tickets.filter((t) => stateOf(t) !== "PAID").length;
  const topCategory = count(tickets.map((t) => evOf(t.evId)?.category ?? ""));
  const topCity = count(tickets.map((t) => evOf(t.evId)?.city ?? ""));
  const organizers = new Set(tickets.map((t) => evOf(t.evId)?.organizer ?? "").filter(Boolean)).size;
  const lvl = levelFor(tickets.length, spent);
  const title =
    attended >= 5 ? "Night Owl" : topCategory === "Party" ? "Party Starter" : topCategory === "Concert" ? "Front Row Fan" : topCategory === "Festival" ? "Festival Soul" : topCategory === "Campus" ? "Campus Legend" : tickets.length ? "Rising Regular" : "Just Getting Started";
  return { bought: tickets.length, attended, spent, freeCount: tickets.filter((t) => t.price === 0).length, topCategory, topCity, organizers, title, level: lvl.name, points: lvl.points };
}

/** A 1080x1920 story image of the stats, for WhatsApp Status or Instagram. */
export async function makeWrappedCard(w: Wrapped, name: string): Promise<Blob> {
  const W = 1080;
  const H = 1920;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#2a0a3a");
  bg.addColorStop(0.55, "#c2185b");
  bg.addColorStop(1, "#ff7a1a");
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  g.fillStyle = "rgba(11,7,18,.35)";
  g.fillRect(0, 0, W, H);

  g.fillStyle = "#fff";
  g.font = "800 60px system-ui, sans-serif";
  g.fillText("T H R I L L", 80, 130);
  [["#1eb53a", 0], ["#ffffff", 1], ["#0072c6", 2]].forEach(([col, i]) => {
    g.fillStyle = col as string;
    g.fillRect(80 + (i as number) * 56, 156, 56, 8);
  });

  g.fillStyle = "#ffc83d";
  g.font = "700 56px system-ui, sans-serif";
  g.fillText(name ? `${name}'s Wrapped` : "My Wrapped", 80, 330);
  g.fillStyle = "#fff";
  g.font = "800 150px system-ui, sans-serif";
  g.fillText(w.title, 80, 500);

  const rows: [string, string][] = [
    [String(w.bought), "tickets bought"],
    [String(w.attended), "nights out"],
    [`NLe ${w.spent.toLocaleString()}`, "spent on fun"],
    [w.topCategory || "-", "favourite vibe"],
    [w.topCity || "-", "favourite city"],
    [String(w.organizers), "organizers you backed"],
  ];
  rows.forEach(([big, small], i) => {
    const y = 680 + i * 170;
    g.fillStyle = "#fff";
    g.font = "800 86px system-ui, sans-serif";
    g.fillText(big, 80, y);
    g.fillStyle = "rgba(255,255,255,.75)";
    g.font = "500 40px system-ui, sans-serif";
    g.fillText(small, 80, y + 52);
  });

  g.fillStyle = "#fff";
  g.beginPath();
  if (typeof g.roundRect === "function") g.roundRect(80, H - 300, W - 160, 120, 36);
  else g.rect(80, H - 300, W - 160, 120);
  g.fill();
  g.fillStyle = "#0b0712";
  g.font = "800 50px system-ui, sans-serif";
  g.textAlign = "center";
  g.fillText(`${w.level} · ${w.points} pts. Find your next night on THRILL`, W / 2, H - 228, W - 220);
  g.textAlign = "left";

  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("no image"))), "image/png"));
}
