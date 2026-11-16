import type { Ev } from "./events";

const stamp = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const esc = (t: string) => t.replace(/[\\,;]/g, (c) => "\\" + c).replace(/\n/g, "\\n");

/** Builds a calendar file with a reminder 2 hours before the event. */
export function buildIcs(e: Ev) {
  const end = e.startAt + e.durationH * 3600_000;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//THRILL//EN",
    "BEGIN:VEVENT",
    `UID:${e.id}-${e.startAt}@thrill`,
    `DTSTAMP:${stamp(Date.now())}`,
    `DTSTART:${stamp(e.startAt)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(e.title)}`,
    `LOCATION:${esc(`${e.area}, Sierra Leone`)}`,
    `DESCRIPTION:${esc(`${e.blurb} Organizer: ${e.organizer}. Show your THRILL Pass at the gate.`)}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(e.title)} starts soon`,
    "TRIGGER:-PT2H",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadIcs(e: Ev) {
  const blob = new Blob([buildIcs(e)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${e.id}-thrill.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
