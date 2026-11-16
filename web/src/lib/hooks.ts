import { useSyncExternalStore } from "react";

function subMinute(cb: () => void) {
  const t = setInterval(cb, 30_000);
  return () => clearInterval(t);
}

/** Changes once a minute so countdowns stay fresh. 0 on the server. */
export function useMinute() {
  return useSyncExternalStore(subMinute, () => Math.floor(Date.now() / 60_000), () => 0);
}

function subOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

export function useOnline() {
  return useSyncExternalStore(subOnline, () => navigator.onLine, () => true);
}

export function countdown(startAt: number, durationH: number, minute: number) {
  if (!minute) return "";
  const now = minute * 60_000;
  const diff = startAt - now;
  if (diff <= 0) return now < startAt + durationH * 3600_000 ? "Happening now" : "Ended";
  const m = Math.floor(diff / 60_000);
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  if (d > 0) return `Starts in ${d}d ${h}h`;
  if (h > 0) return `Starts in ${h}h ${m % 60}m`;
  return `Starts in ${m}m`;
}

export function levelFor(ticketCount: number, spent: number) {
  const points = ticketCount * 5 + Math.floor(spent / 10);
  const levels = [
    { name: "Rookie", min: 0 },
    { name: "Regular", min: 15 },
    { name: "Night Owl", min: 50 },
    { name: "Legend", min: 120 },
  ];
  let i = 0;
  levels.forEach((l, idx) => { if (points >= l.min) i = idx; });
  const next = levels[i + 1];
  return { points, name: levels[i].name, next: next?.name, toNext: next ? next.min - points : 0, pct: next ? Math.min(100, ((points - levels[i].min) / (next.min - levels[i].min)) * 100) : 100 };
}
