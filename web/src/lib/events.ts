export type Tier = { name: string; price: number; perk: string };

export type Ev = {
  id: string;
  title: string;
  area: string;
  city: string;
  when: string;
  category: string;
  tiers: Tier[];
  going: number;
  capacity: number;
  friends: string[];
  verified: boolean;
  organizer: string;
  blurb: string;
  colors: [string, string, string];
  pattern: "diamonds" | "circles" | "waves" | "stripes";
  photo?: string;
  startAt: number;
  durationH: number;
  credit?: { name: string; url: string };
  custom?: boolean;
  reentry?: boolean; // undefined = re-entry allowed
  suspended?: boolean; // hidden from the feed by THRILL
  cancelled?: boolean; // cancelled: every ticket is refunded
  lat?: number;
  lng?: number;
};

export const CITIES = ["All", "Freetown", "Bo", "Kenema", "Makeni"] as const;

// Approximate map positions. Organizer events use their city centre until real venue search exists.
export const CITY_CENTERS: Record<string, [number, number]> = {
  Freetown: [8.4657, -13.2317],
  Bo: [7.9647, -11.7383],
  Kenema: [7.8767, -11.19],
  Makeni: [8.8833, -12.05],
};

/** Position for the map: the real spot if known, else the city centre nudged so pins do not stack. */
export function pinFor(e: { id: string; city: string; lat?: number; lng?: number }): [number, number] {
  if (e.lat !== undefined && e.lng !== undefined) return [e.lat, e.lng];
  const c = CITY_CENTERS[e.city] ?? CITY_CENTERS.Freetown;
  let h = 0;
  for (const ch of e.id) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return [c[0] + ((h % 17) - 8) * 0.0025, c[1] + (((h >> 2) % 17) - 8) * 0.0025];
}

export const CATEGORIES = ["All", "For you", "Tonight", "Weekend", "Party", "Concert", "Campus", "Festival", "Free"] as const;
export const CREATE_CATEGORIES = ["Party", "Concert", "Campus", "Festival", "Other"] as const;

export const PRESET_COLORS: Record<string, [string, string, string]> = {
  Party: ["#ff2e88", "#ff7a1a", "#2a0a3a"],
  Concert: ["#0072c6", "#6c5bff", "#071530"],
  Campus: ["#1eb53a", "#0a6b4a", "#04180f"],
  Festival: ["#ffc83d", "#ff7a1a", "#3a1205"],
  Other: ["#6c5bff", "#ff2e88", "#120a2a"],
};
const PATTERNS = ["diamonds", "circles", "waves", "stripes"] as const;
export const patternFor = (cat: string) => PATTERNS[cat.length % 4];

// Sierra Leone is on GMT (UTC+0), so UTC hours here are local event hours.
function nextAt(dow: number | "today", hour: number): number {
  const d = new Date();
  d.setUTCHours(hour, 0, 0, 0);
  if (dow === "today") {
    if (d.getTime() < Date.now()) d.setUTCDate(d.getUTCDate() + 1);
    return d.getTime();
  }
  const diff = (dow - d.getUTCDay() + 7) % 7;
  d.setUTCDate(d.getUTCDate() + diff);
  if (d.getTime() < Date.now()) d.setUTCDate(d.getUTCDate() + 7);
  return d.getTime();
}

export const EVENTS: Ev[] = [
  {
    id: "SUM",
    title: "Summer Night Afrobeats",
    area: "Lumley Beach, Freetown",
    city: "Freetown",
    when: "Tonight · 9:00 PM",
    category: "Party",
    tiers: [
      { name: "Regular", price: 150, perk: "Entry" },
      { name: "VIP", price: 350, perk: "Entry + fast lane + 1 drink" },
    ],
    going: 312,
    capacity: 400,
    friends: ["Aminata", "Musa", "Sia"],
    verified: true,
    organizer: "Lumley Nights",
    reentry: false,
    blurb: "Sunset sets, live DJs and beach vibes till late.",
    colors: ["#ff2e88", "#ff7a1a", "#2a0a3a"],
    pattern: "diamonds",
    photo: "/photos/SUM.jpg",
    lat: 8.4467,
    lng: -13.2886,
    startAt: nextAt("today", 21),
    durationH: 5,
    credit: { name: "Pexels", url: "https://www.pexels.com/photo/silhouette-of-people-during-sunset-1000444/" },
  },
  {
    id: "GOS",
    title: "Praise Night Live",
    area: "National Stadium",
    city: "Freetown",
    when: "Sat · 4:00 PM",
    category: "Concert",
    tiers: [{ name: "Open entry", price: 0, perk: "Free pass, first come" }],
    going: 1204,
    capacity: 5000,
    friends: ["Fatmata"],
    verified: true,
    organizer: "Faith Voices SL",
    blurb: "Choirs, worship and a night of joy. Everyone welcome.",
    colors: ["#0072c6", "#6c5bff", "#071530"],
    pattern: "circles",
    photo: "/photos/GOS.jpg",
    lat: 8.4575,
    lng: -13.232,
    startAt: nextAt(6, 16),
    durationH: 4,
    credit: { name: "Mirian Managadze", url: "https://www.pexels.com/photo/energetic-night-concert-with-vibrant-crowd-32399568/" },
  },
  {
    id: "UNI",
    title: "Freshers Bash",
    area: "Mount Aureol, FBC",
    city: "Freetown",
    when: "Fri · 8:00 PM",
    category: "Campus",
    tiers: [
      { name: "Student", price: 50, perk: "Show student ID at gate" },
      { name: "Guest", price: 80, perk: "Entry" },
    ],
    going: 600,
    capacity: 600,
    friends: [],
    verified: false,
    organizer: "Student Union",
    blurb: "Meet your year. Music, games and surprises.",
    colors: ["#1eb53a", "#0a6b4a", "#04180f"],
    pattern: "stripes",
    photo: "/photos/UNI.jpg",
    lat: 8.478,
    lng: -13.217,
    startAt: nextAt(5, 20),
    durationH: 5,
    credit: { name: "Maor Attias", url: "https://www.pexels.com/photo/people-on-concert-5192307/" },
  },
  {
    id: "CUL",
    title: "Krio Culture Festival",
    area: "Cotton Tree, Freetown",
    city: "Freetown",
    when: "Sun · 11:00 AM",
    category: "Festival",
    tiers: [
      { name: "Day pass", price: 30, perk: "Entry + food stalls" },
      { name: "Family (4)", price: 100, perk: "4 entries" },
    ],
    going: 860,
    capacity: 2000,
    friends: ["Ibrahim", "Kadi", "Sia", "Musa"],
    verified: true,
    organizer: "Heritage SL",
    blurb: "Food, dance, drums and stories. Bring the family.",
    colors: ["#ffc83d", "#ff7a1a", "#3a1205"],
    pattern: "waves",
    photo: "/photos/CUL.jpg",
    lat: 8.484,
    lng: -13.234,
    startAt: nextAt(0, 11),
    durationH: 7,
    credit: { name: "Audy of Course", url: "https://www.pexels.com/photo/traditional-music-band-performing-during-festival-18807626/" },
  },
  {
    id: "BOR",
    title: "Bo Reggae Sunset",
    area: "Bo Town Ground",
    city: "Bo",
    when: "Sat · 6:00 PM",
    category: "Concert",
    tiers: [{ name: "Entry", price: 40, perk: "Entry" }],
    going: 140,
    capacity: 800,
    friends: [],
    verified: true,
    organizer: "Bo Live",
    blurb: "Roots reggae under the open sky.",
    colors: ["#1eb53a", "#ffc83d", "#10200a"],
    pattern: "waves",
    photo: "/photos/BOR.jpg",
    lat: 7.9647,
    lng: -11.7383,
    startAt: nextAt(6, 18),
    durationH: 4,
    credit: { name: "Freek Wolsink", url: "https://www.pexels.com/photo/joyful-crowd-dancing-at-night-party-33721374/" },
  },
  {
    id: "MAK",
    title: "Makeni Youth Fest",
    area: "Wusum Stadium",
    city: "Makeni",
    when: "Sun · 2:00 PM",
    category: "Festival",
    tiers: [{ name: "Free entry", price: 0, perk: "Free pass" }],
    going: 380,
    capacity: 3000,
    friends: [],
    verified: false,
    organizer: "Makeni Youth Council",
    blurb: "Sports, music and talent show for all ages.",
    colors: ["#0072c6", "#ff2e88", "#0a1230"],
    pattern: "circles",
    photo: "/photos/MAK.jpg",
    lat: 8.8833,
    lng: -12.05,
    startAt: nextAt(0, 14),
    durationH: 5,
    credit: { name: "Safari Consoler", url: "https://www.pexels.com/photo/traditional-african-drum-dance-performance-28928756/" },
  },
];

export function minPrice(e: Ev) {
  return Math.min(...e.tiers.map((t) => t.price));
}

export function withFee(price: number) {
  return Math.ceil(price * 1.02);
}

function patternSvg(p: Ev["pattern"]) {
  const shapes: Record<Ev["pattern"], string> = {
    diamonds: "<path d='M30 4 56 30 30 56 4 30Z' fill='none' stroke='white' stroke-width='1.5'/><path d='M30 18 42 30 30 42 18 30Z' fill='white' fill-opacity='.35'/>",
    circles: "<circle cx='30' cy='30' r='24' fill='none' stroke='white' stroke-width='1.5'/><circle cx='30' cy='30' r='10' fill='white' fill-opacity='.35'/>",
    waves: "<path d='M0 30Q15 10 30 30T60 30' fill='none' stroke='white' stroke-width='2'/><path d='M0 46Q15 26 30 46T60 46' fill='none' stroke='white' stroke-opacity='.5' stroke-width='2'/>",
    stripes: "<path d='M0 60 60 0M-10 20 20-10M40 70 70 40' stroke='white' stroke-width='2' fill='none'/>",
  };
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='60' height='60'>${shapes[p]}</svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
}

/** Generated poster art: free, tiny, works offline, no stock photos needed. */
export function posterStyle(e: Ev) {
  const [a, b, c] = e.colors;
  return {
    backgroundImage: `radial-gradient(120% 70% at 85% 8%, ${a} 0%, transparent 60%), radial-gradient(90% 60% at 10% 40%, ${b} 0%, transparent 62%), linear-gradient(180deg, ${c} 0%, #0b0712 100%)`,
  };
}

export function patternStyle(e: Ev) {
  return { backgroundImage: patternSvg(e.pattern), backgroundSize: "60px 60px" };
}

export function isSoldOut(e: Ev) {
  return e.going >= e.capacity;
}

export function mapsUrl(e: Ev) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${e.area}, Sierra Leone`)}`;
}
