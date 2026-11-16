import type { Ev } from "./events";
import { counted, stateOf, type Fund, type Ticket } from "./store";

const DAY = 86_400_000;
// Weeks start on Monday. Day 0 of the Unix calendar was a Thursday, so shift by 3 days.
const weekOf = (ms: number) => Math.floor((ms / DAY + 3) / 7);

const firstIn = (t: Ticket) => t.log?.find((l) => l.act === "IN")?.at ?? t.claimedAt;

/**
 * Night streak: how many weeks in a row you went out. A quiet week does not break it if you went the week before
 * (one free "freeze"), and nothing is lost forever: the streak simply starts again. No nagging, no punishment.
 */
export function nightStreak(tickets: Ticket[], now: number) {
  if (!now) return { weeks: 0, thisWeek: false };
  const weeks = new Set(counted(tickets).filter((t) => stateOf(t) !== "PAID").map(firstIn).filter((x): x is number => !!x).map(weekOf));
  const cur = weekOf(now);
  let w = weeks.has(cur) ? cur : weeks.has(cur - 1) ? cur - 1 : -1;
  let n = 0;
  while (w >= 0 && weeks.has(w)) {
    n++;
    w--;
  }
  return { weeks: n, thisWeek: weeks.has(cur) };
}

export type Badge = { id: string; label: string; desc: string; earned: boolean };

export function badgesFor(tickets: Ticket[], events: Ev[], fund: Fund): Badge[] {
  const mine = counted(tickets);
  const evOf = (id: string) => events.find((e) => e.id === id);
  const attended = mine.filter((t) => stateOf(t) !== "PAID");
  const cities = new Set(mine.map((t) => evOf(t.evId)?.city).filter(Boolean));
  const organizers = new Set(mine.map((t) => evOf(t.evId)?.organizer).filter(Boolean));
  const early = mine.some((t) => {
    const e = evOf(t.evId);
    return !!e && t.at <= e.startAt - 7 * DAY;
  });
  return [
    { id: "first", label: "First Night", desc: "Go to your first event", earned: attended.length >= 1 },
    { id: "owl", label: "Night Owl", desc: "Go to 5 events", earned: attended.length >= 5 },
    { id: "explorer", label: "Explorer", desc: "Buy tickets in 2 cities", earned: cities.size >= 2 },
    { id: "backer", label: "Scene Supporter", desc: "Back 3 different organizers", earned: organizers.size >= 3 },
    { id: "early", label: "Early Bird", desc: "Buy a ticket a week or more ahead", earned: early },
    { id: "saver", label: "Saver", desc: "Start your Night Fund", earned: fund.balance > 0 || fund.history.length > 0 },
  ];
}
