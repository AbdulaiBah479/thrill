const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, ShadingType,
  AlignmentType, LevelFormat, Header, Footer, PageNumber, BorderStyle, PageBreak, TabStopType,
} = require("docx");

const OUT = process.argv[2];
const FONT = "Calibri";
const W = 9026; // A4 with 2.54 cm margins: content width in DXA
const PLUM = "2A0A3A", PINK = "C2185B", GREY = "555555", LIGHT = "F3EEF8", NOTE = "FFF4D6", GREEN = "E6F4EA";

// ---------- helpers ----------
function runs(text, base = {}) {
  // **bold** inline
  return text.split("**").map((part, i) => new TextRun({ text: part, bold: i % 2 === 1 || base.bold, font: FONT, color: base.color, size: base.size, italics: base.italics }));
}
const P = (t, o = {}) => new Paragraph({ children: runs(t, o), spacing: { after: o.after ?? 120, line: 288 }, alignment: o.align, keepNext: o.keepNext });
const H1 = (t, pageBreak = true) => new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: pageBreak, children: [new TextRun({ text: t, font: FONT })] });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: t, font: FONT })] });
const H3 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text: t, font: FONT })] });
const bullets = (items, level = 0) => items.map((t) => new Paragraph({ numbering: { reference: "bullets", level }, children: runs(t), spacing: { after: 60, line: 276 } }));
let numRefs = 0;
const numbered = (items) => {
  const ref = "num" + numRefs++;
  numberings.push({ reference: ref, levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 360 } } } }] });
  return items.map((t) => new Paragraph({ numbering: { reference: ref, level: 0 }, children: runs(t), spacing: { after: 60, line: 276 } }));
};
const numberings = [
  { reference: "bullets", levels: [
    { level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } },
    { level: 1, format: LevelFormat.BULLET, text: "\u2013", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1000, hanging: 270 } } } },
  ] },
];

const border = { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
function cell(text, width, o = {}) {
  const paras = String(text).split("\n").map((line) => new Paragraph({ children: runs(line, { bold: o.bold, color: o.color, size: 20 }), spacing: { after: 40 } }));
  return new TableCell({
    width: { size: width, type: WidthType.DXA }, borders,
    shading: o.fill ? { fill: o.fill, type: ShadingType.CLEAR, color: "auto" } : undefined,
    margins: { top: 70, bottom: 70, left: 110, right: 110 }, children: paras,
  });
}
function table(headers, rows, widths) {
  const total = widths.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: total, type: WidthType.DXA }, columnWidths: widths,
    rows: [
      new TableRow({ tableHeader: true, children: headers.map((h, i) => cell(h, widths[i], { bold: true, color: "FFFFFF", fill: PLUM })) }),
      ...rows.map((r, ri) => new TableRow({ cantSplit: true, children: r.map((c, i) => cell(c, widths[i], { fill: ri % 2 ? "FAF8FC" : undefined, bold: i === 0 })) })),
    ],
  });
}
function callout(title, lines, fill = NOTE) {
  return new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: [W],
    rows: [new TableRow({ cantSplit: true, children: [new TableCell({
      width: { size: W, type: WidthType.DXA }, borders,
      shading: { fill, type: ShadingType.CLEAR, color: "auto" },
      margins: { top: 110, bottom: 110, left: 160, right: 160 },
      children: [new Paragraph({ children: runs(title, { bold: true }), spacing: { after: 60 } }), ...lines.map((l) => new Paragraph({ children: runs(l, { size: 21 }), spacing: { after: 50 } }))],
    })] })],
  });
}
const gap = () => new Paragraph({ children: [], spacing: { after: 100 } });

// ---------- content ----------
const c = [];

// Cover
c.push(
  new Paragraph({ children: [], spacing: { before: 2400 } }),
  new Paragraph({ children: [new TextRun({ text: "T H R I L L", font: FONT, size: 120, bold: true, color: PLUM })], alignment: AlignmentType.LEFT, spacing: { after: 80 } }),
  new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 24, color: PINK, space: 4 } }, children: [], spacing: { after: 200 } }),
  new Paragraph({ children: [new TextRun({ text: "The complete guide", font: FONT, size: 52, color: PLUM })], spacing: { after: 120 } }),
  new Paragraph({ children: [new TextRun({ text: "Event discovery and ticketing for Sierra Leone", font: FONT, size: 30, color: GREY })], spacing: { after: 600 } }),
  P("Everything about the app in one place: what it is, who uses it, what has been built, how it keeps events safe, how it is made, how to run it, and what still has to be done.", { size: 24, color: GREY }),
  new Paragraph({ children: [], spacing: { after: 1200 } }),
  P("**Status:** working demo. Everything is saved on one phone. Real accounts, payments and sharing between phones need the online database (Supabase), which is prepared but not yet connected.", { size: 22 }),
  P("**Document date:** 10 November 2026", { size: 22 }),
  P("**Private working document.** It contains demo PINs (section 12). Remove those before sharing it outside your team.", { size: 22, color: PINK }),
);

// Contents
c.push(H1("Contents"));
[
  "1. What THRILL is", "2. The problem and the idea", "3. Who uses THRILL", "4. How a ticket works, from purchase to the door",
  "5. What has been built", "6. How THRILL stops fraud", "7. Security: what is real and what is demo", "8. How the app is built",
  "9. How to run and use it", "10. The business: money, competitors, numbers", "11. What is left to do",
  "12. Demo guide: links, PINs and things to try", "13. Risks and open questions", "14. Glossary", "15. Credits and tools",
  "16. Free APIs, MCP servers, repos and services", "17. Best features from other apps, and the new painkillers", "18. Best features from fintech and consumer apps",
].forEach((t) => c.push(P(t, { after: 70 })));

// 1
c.push(H1("1. What THRILL is"));
c.push(
  P("THRILL is a phone app for finding events in Sierra Leone and buying tickets with mobile money. People swipe through a feed of parties, concerts, festivals and campus events. When they buy, they get a digital pass with a QR code. At the event, door staff scan it and hand over an official THRILL wristband."),
  P("It is built for how Sierra Leone actually works: cheap phones, slow or missing internet, mobile money instead of cards, and a real worry about fake tickets and fake organizers. Everything is designed to be fast, light and trustworthy."),
  H2("The promise, in one sentence each"),
  ...bullets([
    "**For buyers:** find a good night out in seconds, pay safely, and walk in without queue stress.",
    "**For organizers:** sell tickets, see who is coming, control the door, and be trusted because THRILL verified you.",
    "**For door staff:** a screen so clear that green means in, red means stop, even in the dark.",
    "**For you, the owner:** a system where nothing goes live until you have checked it, and every decision is recorded.",
  ]),
  H2("What makes it different"),
  ...bullets([
    "**Verified organizers only.** THRILL checks identity before any event goes public.",
    "**THRILL prints the wristbands.** One official, numbered design. A blank wristband is worthless until a promoter activates it with a sale.",
    "**A pass that cannot be screenshotted.** The QR code on the phone changes every 30 seconds.",
    "**Door rules that stop promoter fraud**, for example a dishonest promoter marking someone as \u201cout\u201d while they are still inside.",
    "**Built for low data:** a Lite mode, tickets that open offline, and a design that works on cheap Android phones.",
    "**Social and safe:** see which friends are going, split a squad ticket, share your location with a trusted friend.",
  ]),
);

// 2
c.push(H1("2. The problem and the idea"));
c.push(
  H2("The problems today"),
  ...bullets([
    "People hear about events late, by word of mouth or scattered social posts.",
    "Fake tickets and fake organizers: people pay and then there is no event, or the ticket is refused at the door.",
    "Double entry: one ticket used by two people, or a promoter quietly letting friends in.",
    "Cash at the door is hard to track, so organizers cannot see their real numbers.",
    "Slow queues, because staff cannot easily check who has paid.",
  ]),
  H2("The idea"),
  P("Put discovery, payment and door control in one trusted system. THRILL sells a digital pass that authorises a physical wristband. The organizer still owns the event and the money (paid out after the event). THRILL owns the trust: it verifies organizers, prints official wristbands, and runs the rules at the door."),
  H2("The main existing competitor"),
  P("The main local platform found during research is Beam Hospitality, which describes itself as Sierra Leone\u2019s number one event platform, with free listings, about a 2% ticket fee, QR check-in and paid promotion boosts. THRILL adopts the proven basics and adds a social swipe feed, verified organizers, THRILL-printed wristbands and strict door security. These details come from public pages and should be re-checked before you rely on them."),
);

// 3
c.push(H1("3. Who uses THRILL"));
c.push(
  P("The app has four kinds of users. Each has a different experience, because their needs, devices and surroundings are different."),
  table(["Who", "What they do", "Where they work", "How the screen should feel"], [
    ["Buyer", "Finds events, buys passes, gifts tickets, goes in with the phone, rates the event", "The main app: Discover, Map, Tickets, You", "Visual and exciting, fast, simple"],
    ["Organizer", "Applies once, gets verified, creates events, orders wristbands, adds door staff, watches sales", "Organizer area (dashboard)", "Calm and clear, with numbers"],
    ["Door staff (promoter)", "Signs in with a PIN, locked to one gate (entry or exit), scans passes, activates door-sale wristbands", "Door check-in page", "Huge colour results, sound and vibration, readable in the dark"],
    ["Admin (you)", "Verifies organizers, approves print orders, handles reports, watches money, reads the audit log", "THRILL admin area", "Dense and careful, like a control room"],
  ], [1500, 3000, 2300, 2226]),
  gap(),
  P("When someone first opens the app they choose **Buyer** or **Organizer**. They can switch any time in the You tab. Regular users never see a link to the admin area."),
);

// 4
c.push(H1("4. How a ticket works, from purchase to the door"));
c.push(
  H2("The life of a ticket"),
  table(["State", "Meaning"], [
    ["PAID", "Bought and valid. Not used yet."],
    ["IN", "The person is inside the venue now."],
    ["OUT", "The person stepped out. They may come back only if the event allows re-entry."],
    ["CANCELLED / REFUNDED", "Event cancelled or a payment error was fixed. No longer valid."],
  ], [2400, 6626]),
  gap(),
  H2("Step by step"),
  ...numbered([
    "**Discover.** The buyer swipes the feed or opens the map, filters by Tonight, Weekend, Free, category or city, and opens an event.",
    "**Buy.** They choose a ticket type and quantity, add a promo code if they have one, pick Afrimoney, Orange Money or Airtel Money, and confirm on their phone. A 2% THRILL fee is shown before paying.",
    "**Pass.** A THRILL Pass appears in My Tickets: a QR code that refreshes every 30 seconds, a readable code like SUM-7K92-X81P, a holographic seal, and a countdown. It opens offline.",
    "**At the door.** Door staff sign in with their own PIN, scan the live QR code, and see a big colour result. The guest is admitted and receives an official THRILL wristband.",
    "**Inside.** The ticket is IN. A second scan shows ALREADY INSIDE.",
    "**Stepping out.** At the exit gate, staff scan the guest\u2019s live phone code or wristband. If re-entry is allowed the ticket becomes OUT and can be used again after a short wait.",
    "**After.** The guest can rate the event. The organizer exports the attendee list. THRILL pays the organizer after the event, once there are no open problems.",
  ]),
  gap(),
  H2("Door sales with blank wristbands"),
  P("Some guests pay cash at the door. THRILL prints blank numbered wristbands for the event. A blank wristband shows **NOT ACTIVATED** at the gate. The promoter takes the money, chooses the ticket type, and activates it. Only then does it become a real, used ticket and appear in the organizer\u2019s sales. A stolen blank wristband is worth nothing."),
  H2("Gifting a ticket"),
  P("A buyer can gift a ticket. The app creates a gift code. When the friend claims it, the ticket gets a brand new code and the giver\u2019s old QR stops working. This is useful for family abroad buying for people at home."),
);

// 5
c.push(H1("5. What has been built"));
c.push(P("Everything below works in the demo and was tested in a real browser. Items marked \u201cdemo\u201d are saved on one phone only until the online database is connected."));
c.push(H2("Buyer features"));
c.push(...bullets([
  "Swipe feed with generated poster art and free photos, plus event photos credited to the photographers.",
  "Filters: Tonight, Weekend, Free, Party, Concert, Campus, Festival; city menu (Freetown, Bo, Kenema, Makeni); search.",
  "Map tab with price pins that open the event. Dark map style that matches the app.",
  "Event details: time and countdown, place, directions, add to calendar (with a 2-hour reminder), re-entry rule, refund rule, organizer and verified badge, ratings by ticket holders.",
  "Buying: ticket types, quantity, promo codes (THRILL10 gives 10% off; SQUAD20 gives 20% off for 4 or more tickets), mobile-money choice, fee shown, confetti on success.",
  "Squad tickets: one person books, friends pay their share; share by link or WhatsApp.",
  "THRILL Pass: refreshing QR, holographic seal, tilt effect, offline use, countdown, status (paid, inside, outside).",
  "Gift a ticket; rate an event after using the ticket; waitlist for sold-out events; save events with a heart.",
  "Share an event as a story-size picture for WhatsApp Status or Instagram.",
  "Points and levels (Rookie, Regular, Night Owl, Legend). Back up and restore your own data.",
  "Safe night: one tap to send your live location to a trusted friend on WhatsApp.",
  "Lite mode for low data, offline banner, install as an app on the phone, Help and safety page.",
  "Pay in parts: reserve with a first payment, pay the rest before the event. The pass stays locked until it is paid in full.",
  "For you feed, follow organizers, “Great value” tags, and a live crowd meter at events that have started.",
  "THRILL Wrapped: your nights out and a title, as a shareable story picture.",
  "Trusted contact and SOS: your location goes straight to one person you chose, in WhatsApp.",
  "Night Fund: a savings pot with a goal and optional round-up of spare change (demo tracker).",
  "THRILL Guarantee: send a claim on any ticket. Refunded tickets stop working and are cancelled out of the numbers.",
  "Night streak and badges. Squad pot tracker. A “where your money goes” line at checkout.",
]));
c.push(H2("Organizer features"));
c.push(...bullets([
  "Apply once with name, phone, ID type and number, and a description of past events. Status: pending, verified or rejected (with a note).",
  "Only verified organizers can create events. Events show \u201cVerified by THRILL\u201d.",
  "Create events: venue, city, category, date and time, length, capacity, re-entry choice, up to 4 ticket types.",
  "Dashboard per event: tickets sold, money paid, people entered and inside, ratings, attendee list (CSV export, safe against spreadsheet tricks).",
  "Event readiness checklist (6 steps) with a progress bar.",
  "Door staff and security: add promoters with a name, 4-digit PIN and one gate; set a 6-digit manager PIN; see inside count, exits, overrides and warning flags.",
  "Order official wristbands or ticket cards from THRILL and follow the order status; see the stock and how many were activated.",
  "Help alerts from door staff appear at the top of the dashboard.",
  "Sales team codes: give each street seller a code, see their sales and the commission owed.",
  "Cancelled events: THRILL can cancel an event and refund every ticket in one step.",
]));
c.push(H2("Door staff features"));
c.push(...bullets([
  "Sign in with a personal PIN. The screen is locked to Entry gate or Exit gate.",
  "Scan with the camera (works on iPhone and Android once on HTTPS) or type the code.",
  "Huge colour result cards, a different sound and vibration for each outcome, and an Inside Now counter.",
  "Door sales: activate a blank wristband after taking payment.",
  "Manager approval for exceptions, with a reason, recorded under the promoter\u2019s name.",
  "Need Help button that alerts the organizer.",
  "A ticket that is not fully paid shows NOT FULLY PAID with the balance owed, and cannot be admitted.",
  "A refunded ticket shows REFUNDED / VOID and cannot be admitted.",
]));
c.push(H2("Admin (owner) features"));
c.push(...bullets([
  "Locked area with a PIN and a 5-try lockout. Not shown to regular users.",
  "Overview: organizers waiting, print orders waiting, open reports, live events, tickets sold, sales, THRILL earnings (the 2% fee), wristbands in stock.",
  "Verify or reject organizers with a checklist and a note.",
  "Suspend or restore any event, and handle reports from buyers.",
  "Approve print orders. \u201cStart printing\u201d creates the unique wristband codes. Open a print batch to print or save as a PDF.",
  "Audit log: every admin decision with the time.",
  "Claims tab: review buyers’ problems, refund a ticket or reject with a reason. Cancel an event and refund everyone.",
]));
c.push(H2("Platform features"));
c.push(...bullets([
  "Works as an installable app (PWA) with an offline worker and app icons.",
  "Security headers, no search-engine listing of staff pages, input limits, friendly error and not-found screens.",
  "A Help and safety page, with answers to common questions.",
]));

// 6
c.push(H1("6. How THRILL stops fraud"));
c.push(
  H2("The main danger: promoter and pass-back fraud"),
  P("A dishonest promoter marks a guest as \u201cout\u201d while they are still inside. The same ticket, or a copy, then lets a second person in. THRILL closes each route with a rule. The same rules are in the app code and in the database file, so the real version enforces them on the server."),
  table(["Rule", "What it stops"], [
    ["Staff sign in with their own PIN and are locked to ONE gate", "An entry promoter recording exits, or an exit promoter admitting people"],
    ["Exit needs live proof: the guest\u2019s refreshing phone code or a camera scan of the wristband. A typed code is refused at the exit.", "A promoter marking someone out alone, without the guest present"],
    ["Minimum stay: nobody can be let out within 2 minutes of entering", "Admit-then-release tricks"],
    ["Re-entry cooldown: wait 2 minutes after leaving", "Handing a ticket back over the fence"],
    ["Entry cap: a ticket can be admitted at most 4 times", "Endless reuse of one ticket"],
    ["Fresh codes only: a phone code must be about a minute old at most", "Screenshots and old photos of a pass"],
    ["Manager approval for exceptions, with a reason. In the real version only the organizer\u2019s own account can override, never a promoter.", "A promoter waiving the rules for a friend"],
    ["Wrong-event check", "Staff scanning a ticket for a different event"],
    ["Every scan records who did it and how (live, static, typed or override)", "Quiet abuse going unnoticed"],
  ], [5200, 3826]),
  gap(),
  H2("Other protections"),
  ...bullets([
    "**Verified organizers only.** Nothing goes live before THRILL checks the person.",
    "**Blank wristbands do not work** until activated with a recorded sale.",
    "**Single-use codes** with a lock on the ticket row in the real database, so two scans at the same instant cannot both succeed.",
    "**Payout after the event** protects buyers from organizers who disappear.",
    "**Report this event** lets buyers flag a scam; you can suspend the event with one tap.",
    "**Gift codes** void the old QR when claimed.",
  ]),
  H2("What this cannot stop"),
  P("A promoter who physically waves someone through without scanning. That is a staffing problem. The warning flags (many overrides, quick exits, more people inside than capacity) and the Inside Now count against the real crowd are how you notice it. For big events use two people per gate."),
);

// 7
c.push(H1("7. Security: what is real and what is demo"));
c.push(
  callout("The most important point", [
    "A browser app cannot protect itself. Anyone technical can read the app\u2019s code and change what is saved on their phone. So today\u2019s demo has no real security: the admin PIN, organizer approval, tickets and the verified badge are stored on the user\u2019s own phone.",
    "Real security means the server decides. That is what the prepared database file (supabase/schema.sql) is for. It has not been run yet. Test it on a fresh project first.",
  ]),
  gap(),
  H2("Demo today versus after the database is connected"),
  table(["Protection", "Demo today", "With the database"], [
    ["Hide the admin area", "No link shown to users, PIN, 5-try lockout. Easy for a technical person to bypass.", "Admin role stored in the database. Anyone who is not admin is refused by the server, even if they type the address."],
    ["Nobody can make themselves admin", "Not enforced", "A database rule blocks role changes unless an admin does it"],
    ["Organizer must be verified", "Enforced only in the app", "Database rule: unverified organizers cannot publish"],
    ["Fake tickets", "Random codes, nothing signed", "Codes exist only in the database; invented codes are NOT FOUND. Phone QR is signed and expires."],
    ["Same ticket twice", "Local check only", "Row lock: two simultaneous scans cannot both win"],
    ["Reading other people\u2019s data", "Not applicable (one phone)", "Row Level Security: buyers see only their own tickets"],
    ["ID documents", "Only the last 4 digits kept", "Private storage, visible only to the owner and admins"],
    ["Erasing tracks", "Local audit log", "Audit log nobody can edit or delete"],
  ], [2000, 3200, 3826]),
  gap(),
  H2("Result of the code review"),
  P("The app was searched for risky patterns and tested. These problems were found and fixed:"),
  ...bullets([
    "Organizer-typed event titles could run code on the map. Now escaped. Tested with a hostile title.",
    "Exported spreadsheets could run formulas. Now neutralised.",
    "A backup restore trusted whatever the file said. Now every field is checked and limited, and staff or admin data can never be restored from a file.",
    "Closing the payment window mid-payment still created a ticket. Fixed.",
    "Corrupted or edited saved data could crash the app. Now it recovers, and there is a friendly error screen.",
    "Promo codes such as \u201cconstructor\u201d were looked up as if real. Fixed.",
    "A ticket for a removed event silently showed another event. Now says \u201cEvent no longer available\u201d.",
    "Pop-ups could not be closed with the keyboard, and focus could jump while typing. Fixed.",
    "Dependency check: 0 vulnerabilities in the production packages.",
  ]),
  H2("Known limits that remain"),
  ...bullets([
    "Everything the user can store, a technical user can change. The cure is the online database.",
    "The browser content-security rule still allows inline scripts and styles, which the app\u2019s libraries need. Tightening this is a later step.",
    "A guest whose phone clock is more than about a minute wrong sees OLD CODE. Staff can type the code at the entry gate. The real app asks the server for the time.",
    "Demo PINs are stored in plain text on the phone. The real app uses accounts instead of PINs for staff.",
  ]),
  H2("Before real money or real people"),
  ...numbered([
    "Run the database file on a test Supabase project, fix any errors, then on the real project.",
    "Replace the phone storage with database calls (accounts, tickets, scans).",
    "Turn on two-factor login for your admin account.",
    "Create tickets only from the payment provider\u2019s signed confirmation, never from the phone saying \u201cI paid\u201d.",
    "Keep secret keys only on the server, never in public settings.",
    "Add limits on login, purchase and scan attempts.",
    "Have a lawyer review the terms, privacy policy and how payouts are held. Sierra Leone payment rules apply.",
    "Run a security check before launch, or hire a short independent review.",
  ]),
);

// 8
c.push(H1("8. How the app is built"));
c.push(
  H2("Technology"),
  table(["Part", "What is used", "Why"], [
    ["App framework", "Next.js 16 with React 19 and TypeScript", "Fast, popular, works well with AI help"],
    ["Look and feel", "Tailwind CSS 4, motion (animation), lucide icons, Sora and DM Sans fonts", "Modern design that stays light on data"],
    ["QR codes", "qrcode (create) and qr-scanner (read)", "Works on iPhone and Android"],
    ["Map", "Leaflet with OpenStreetMap tiles", "Free, no card needed"],
    ["Database (planned)", "Supabase (Postgres) with Row Level Security", "Free tier to build, login, rules enforced by the database. Free projects pause when idle, so use a paid plan for live events"],
    ["Hosting (planned)", "Vercel or another host (see section 16)", "Gives HTTPS. Vercel’s free plan is for non-commercial use only, so a paid plan is needed once THRILL earns money"],
    ["Tests", "Door-rule unit tests and browser tests with Playwright", "Catch mistakes before users do"],
  ], [2000, 3500, 3526]),
  gap(),
  H2("Pages of the app"),
  table(["Address", "What it is", "Who sees it"], [
    ["/", "Feed, Map, Tickets, You", "Everyone"],
    ["/organizer", "Application and dashboard", "Organizers"],
    ["/scan", "Door check-in", "Door staff (PIN sign-in)"],
    ["/admin", "THRILL admin", "You (PIN, demo)"],
    ["/print", "Print batches of wristbands and tickets", "Admin only"],
    ["/help", "Help, safety and refunds", "Everyone"],
  ], [1700, 4300, 3026]),
  gap(),
  H2("The planned database"),
  P("The file supabase/schema.sql defines these tables, each with security rules: profiles (with a role), organizers, events, ticket types, event staff (each promoter has a gate), tickets, scan log, print orders, wristbands, reports, audit log and a private storage place for ID photos. It also defines the safe check-in functions (scan entry, scan exit, activate wristband), signed pass tokens, and the rule that an admin role can only be given by an admin or by you in the database editor."),
  H2("Project folders"),
  table(["Folder or file", "What it holds"], [
    ["thrill/README.md", "Overview and how to run"],
    ["thrill/ROADMAP.md", "The full plan, phases and tools"],
    ["thrill/docs/", "Owner guide and security notes"],
    ["thrill/supabase/schema.sql", "Database, security rules, safe check-in functions"],
    ["thrill/web/src/app/", "The pages"],
    ["thrill/web/src/components/", "Event card, sheets, pass, map, confetti"],
    ["thrill/web/src/lib/", "Event data, saved data, door rules, share, calendar, sound"],
    ["thrill/web/tests/", "Door-rule tests and browser tests"],
    ["thrill/web/public/", "Photos (credits file), icons, offline worker"],
  ], [3400, 5626]),
  gap(),
  H2("Testing"),
  ...bullets([
    "29 door-rule checks run directly against the real door-rule code.",
    "Five browser test files click through the real app: main app, door security, organizer/admin/printing, security/gifting/backup, and the hardening checks. All passed with no JavaScript errors.",
    "Command: npm run check (fast) and npm run test:e2e (all browser tests, about 10 minutes).",
  ]),
);

// 9
c.push(H1("9. How to run and use it"));
c.push(
  H2("Run the app on your computer"),
  ...numbered([
    "Open a terminal in the thrill/web folder.",
    "First time only: npm install.",
    "Fast production version: npm run build, then npm run start -- -H 0.0.0.0 -p 3003.",
    "Open http://localhost:3003 on the computer. On a phone on the same Wi-Fi, use http://YOUR-COMPUTER-IP:3003 (run ipconfig to find the address).",
  ]),
  P("The camera scan, install-as-app and offline mode need HTTPS, so they work once the app is on Vercel. The app only runs while the server is running."),
  H2("Your routine as owner"),
  H3("Every day, about 5 minutes"),
  ...numbered([
    "**Organizers tab:** verify or reject new applications. Call or WhatsApp them, match the ID to the person, ask for a past event or a venue booking, check their social page. Say no when unsure. Trust is your product.",
    "**Print tab:** approve new print orders, start printing, open the print batch and print or save the PDF for the print shop.",
    "**Reports tab:** read reports, suspend scams, dismiss false alarms.",
    "**Overview tab:** check sales and your earnings (the 2% fee).",
  ]),
  H3("Before an event"),
  ...numbered([
    "Organizer opens the event, checks the 6-step readiness checklist.",
    "Adds each promoter with a name, a 4-digit PIN and ONE gate. Never give two people the same PIN.",
    "Sets a 6-digit manager PIN and keeps it private.",
    "Orders the official wristbands. You approve and print them.",
  ]),
  H3("On event night"),
  ...numbered([
    "Staff sign in on the check-in page with their own PIN.",
    "Entry gate: green means admit, yellow ALREADY INSIDE means do not admit and check the wristband, red NOT FOUND means no entry.",
    "Door sales: a blank wristband says NOT ACTIVATED. Take the money first, then activate it.",
    "Exit gate: scan guests who step out, only if the event allows re-entry.",
    "Use the Need Help button if something is wrong. The organizer sees it at once.",
  ]),
  H3("After the event"),
  ...bullets([
    "Export the attendee list (CSV). Check ratings and reports.",
    "Pay the organizer only after the event has finished and no problems are open. This payout delay protects you from organizers who disappear.",
  ]),
  H2("Your rules for trust"),
  ...numbered([
    "No verification, no listing.",
    "Refunds only when an event is cancelled or a payment error happened.",
    "One official wristband design, printed only by THRILL.",
    "Pay organizers after the event.",
    "Keep the audit log. It records every admin decision.",
  ]),
);

// 10
c.push(H1("10. The business: money, competitors, numbers"));
c.push(
  H2("How THRILL earns"),
  table(["Income", "Details"], [
    ["Ticket fee", "2% of each online ticket, paid by the buyer and shown at checkout. No listing fee for organizers. (You can change who pays.)"],
    ["Event boosts", "Optional packages to be featured: starter ideas NLe 150, NLe 300, NLe 500. Competitors charge about NLe 500 to NLe 3,000 for similar boosts."],
    ["THRILL+", "Optional monthly pass for attendees, about NLe 5 a month, for early access and alerts."],
    ["Wristband printing", "A cost to recover. Quote the organizer before approving each order. Not yet priced."],
  ], [2200, 6826]),
  gap(),
  H2("Payments"),
  ...bullets([
    "THRILL does not hold money. Buyers pay through a licensed mobile-money provider (Afrimoney, Orange Money, Airtel Money) or a partner such as Monime.",
    "Until a provider approves THRILL, the first events can use \u201cmanual confirm\u201d: the buyer pays the organizer\u2019s merchant number and an admin confirms the ticket.",
    "Under Sierra Leone\u2019s payment rules, anyone handling payments directly must be licensed, which is why THRILL relies on a licensed partner. Confirm details with a lawyer.",
  ]),
  H2("Example numbers from the plan"),
  P("These are planning assumptions, not predictions. They do not include printing, hosting, SMS or your time."),
  table(["", "Conservative year", "Aggressive year"], [
    ["Events", "100", "500"],
    ["Tickets per event and price", "100 tickets at NLe 300", "500 tickets at NLe 500"],
    ["Total ticket sales", "NLe 3,000,000", "NLe 125,000,000"],
    ["2% fee", "NLe 60,000", "NLe 2,500,000"],
    ["Boosts and subscriptions", "about NLe 1,500", "about NLe 62,500"],
    ["Approximate total", "NLe 61,500", "NLe 2,562,500"],
    ["Rough US dollars*", "about 2,700", "about 113,000"],
  ], [3000, 3013, 3013]),
  P("*At an assumed 22.7 NLe per US dollar. Check the current exchange rate. In the conservative case the income is small compared with real costs, so the first goals are proving trust and growing the number of events.", { size: 20, color: GREY }),
  H2("Competition"),
  P("Beam Hospitality is the main local competitor. THRILL differs by using a social swipe feed, verified organizers, THRILL-printed wristbands and strict door security. Other regional options exist but have little presence in Sierra Leone."),
  H2("Open-source ticketing projects to learn from"),
  ...bullets([
    "Hi.Events (AGPL-3.0 with extra terms) and pretix (free community edition and paid enterprise edition). Study their ideas and screens. Do not copy their code, because AGPL code copied into your app can force you to publish your own source.",
  ]),
);

// 11
c.push(H1("11. What is left to do"));
c.push(
  H2("Roadmap"),
  table(["Phase", "What", "Status"], [
    ["0. Prepare", "Accounts, name, talk to organizers and payment partners, one-page plan", "You"],
    ["1. Foundation", "Next.js app, design, deployed demo", "Done (demo)"],
    ["2. Core product", "Feed, tickets, pass, check-in, admin, organizer, door security", "Done (demo)"],
    ["3. Real world test", "Connect Supabase, HTTPS hosting, run 3 to 5 small real events", "Next"],
    ["4. Trust and growth", "Payments, offline check-in pack, waitlist offers, vouchers, referrals", "Planned"],
    ["5. AI and scale", "Recommendations, poster tool, Krio assistant, more cities", "Planned"],
    ["6. Business", "Company, terms, privacy, grants, payouts", "You"],
  ], [1900, 5326, 1800]),
  gap(),
  H2("Only you can do these"),
  ...bullets([
    "Create the Supabase account, run the database file, and give the project URL and key to the developer (or the AI helper).",
    "Create a GitHub repository and choose a host that gives HTTPS (Vercel, or another). Vercel’s free plan is non-commercial only, so plan a paid plan for launch (section 16).",
    "Apply for mobile-money merchant access (Monime or the providers). This is slow, so start early.",
    "Find a print shop for numbered wristbands, get quotes, and decide the print price.",
    "Register the business and write the terms and privacy policy with a lawyer.",
    "Call and verify organizers.",
  ]),
  H2("Best features to add next"),
  table(["Feature", "Why", "Needs"], [
    ["Real waitlist with a timed offer", "Returned tickets go to the next person, who gets a reserved window to buy", "Database"],
    ["Face-value resale only", "Stops scalping and fake resale", "Database and payments"],
    ["Offline check-in pack", "Door phones scan with no signal and sync later", "Database"],
    ["Real voucher codes", "One-time or limited codes made by organizers", "Small build"],
    ["Guest list and approval", "Private parties and VIP nights", "Small build"],
    ["Post-event survey and photo feed", "Builds organizer trust scores", "Database"],
    ["Referral rewards", "Cheap growth using your points system", "Small build"],
    ["Add-ons and VIP tables", "More income per guest", "Database and payments"],
    ["USSD or SMS tickets", "Basic phones with no data", "A telecom partner"],
    ["Krio and English", "Reach everyone. Write with a native speaker", "Translator"],
  ], [2900, 4326, 1800]),
  gap(),
  P("Not recommended yet: interactive seat maps (too heavy), chat and social feeds (need moderation), and your own wallet (needs a payment licence)."),
);

// 12
c.push(H1("12. Demo guide: links, PINs and things to try"));
c.push(
  callout("Demo only", [
    "These PINs are for the demo and are visible to anyone who inspects the app. They are not real security. Change or remove them before sharing this document.",
  ]),
  gap(),
  table(["Item", "Value"], [
    ["App address on your computer", "http://localhost:3003 (while the server is running)"],
    ["Door check-in page", "/scan"],
    ["Admin area", "/admin, PIN 2468. Or tap \u201cTHRILL demo build\u201d 5 times on the You tab."],
    ["Door staff (sample events)", "Demo Entry PIN 1111, Demo Exit PIN 2222"],
    ["Manager override PIN (sample events)", "9999"],
    ["Promo codes", "THRILL10 (10% off), SQUAD20 (20% off for 4 or more tickets)"],
    ["Change the admin PIN", "Add NEXT_PUBLIC_ADMIN_PIN=your-number to web/.env.local and restart"],
  ], [3300, 5726]),
  gap(),
  H2("A short test journey"),
  ...numbered([
    "Choose Buyer. Open Summer Night Afrobeats. Tap Get pass, apply THRILL10, pay. Watch the confetti and the tilting pass.",
    "Open Tickets, open the pass, note the code.",
    "Go to /scan. Sign in as Demo Entry (PIN 1111). Type the code and admit it. Type it again: ALREADY INSIDE.",
    "Sign in as Demo Exit (PIN 2222). Type the code: a typed code needs manager approval. Enter 9999 with a reason. Then try to come back in straight away: TOO SOON.",
    "Choose Organizer on the You tab. Apply. Open /admin (PIN 2468) and verify yourself. Create an event, add door staff, set a manager PIN, and order wristbands.",
    "In admin, approve the order, start printing, open the print batch. Scan a blank wristband to see NOT ACTIVATED, then activate it as a door sale.",
    "Open Map, tap a pin. Try Share as story image, and Report this event.",
  ]),
);

// 13
c.push(H1("13. Risks and open questions"));
c.push(
  table(["Risk", "What to do"], [
    ["Payment approval is slow", "Start with manual confirmation, and apply to providers now"],
    ["Organizers do not trust a new platform", "Start with friends, show payout proof, use the verified badge"],
    ["Fake tickets and screenshots", "Refreshing QR, single-use codes, THRILL wristbands, door rules"],
    ["Poor connection at venues", "PWA, Lite mode, offline check-in pack (planned)"],
    ["Legal: payments, data protection", "Use only licensed providers, get a lawyer to review terms and privacy"],
    ["Printing cost and logistics", "Quote print shops, price printing into the organizer fee"],
    ["Data only on one phone (demo)", "Connect Supabase before real events"],
    ["Your time and energy", "Small weekly goals, one feature at a time, commit often"],
  ], [3600, 5426]),
  gap(),
  H2("Questions still open"),
  ...bullets([
    "Final app name. Check the name and the social handles are free.",
    "Who pays the 2% fee in the end: buyers (current setting) or organizers?",
    "Who are the first 5 to 10 organizers?",
    "What will wristband printing cost, and what will you charge?",
    "When will you register the company?",
    "Which mobile-money provider will you go live with first?",
  ]),
  H2("Facts to double-check"),
  P("Several facts came from web research and memory, and should be confirmed before you rely on them: competitor prices and numbers, mobile-money merchant requirements in Sierra Leone, the seven-year record-keeping rule, the exchange rate used for dollar figures, SMS coverage by international providers, and the licence terms of the photos and libraries (see section 15)."),
);

// 14
c.push(H1("14. Glossary"));
c.push(table(["Word", "Simple meaning"], [
  ["PWA", "A website that can be installed like an app and can open without signal"],
  ["QR code", "A square picture a camera reads. THRILL\u2019s changes every 30 seconds"],
  ["Wristband", "A numbered band handed out at the gate. Only THRILL prints them"],
  ["Entry gate / Exit gate", "The door where people come in, and where they step out. A promoter works at one only"],
  ["Re-entry", "Stepping out and coming back with the same ticket"],
  ["Manager override", "An exception approved by the organizer, with a reason, and recorded"],
  ["Verified organizer", "An organizer whose identity THRILL checked"],
  ["Audit log", "A record of every admin decision that cannot be edited"],
  ["Supabase", "The online database and login service the real app will use"],
  ["Row Level Security (RLS)", "Rules inside the database that decide who can see or change each row"],
  ["Vercel", "A service that puts the app on the internet with HTTPS. Its free plan is for non-commercial use only"],
  ["HTTPS", "The secure web address (the padlock). Camera, install and offline need it"],
  ["NLe", "New leone, the currency of Sierra Leone"],
  ["CSV", "A simple spreadsheet file that Excel opens"],
  ["Webhook", "A secure message from the payment provider saying \u201cthis payment is confirmed\u201d"],
], [2700, 6326]));

// 15
c.push(H1("15. Credits and tools"));
c.push(
  H2("Photos"),
  P("Free photos from Pexels, saved inside the project, with a credits file (web/public/photos/CREDITS.md). Photographers: Mirian Managadze, Maor Attias, Audy of Course, Freek Wolsink and Safari Consoler, plus one photo credited to Pexels. Two photos show East African drummers, not Sierra Leone, so replace them with real Sierra Leone photos or event posters before launch. Check the Pexels licence terms before any paid launch."),
  H2("Open-source tools used"),
  ...bullets([
    "Next.js, React, TypeScript and Tailwind CSS for the app.",
    "motion for animation and lucide-react for icons.",
    "qrcode and qr-scanner (nimiq, MIT) for QR codes.",
    "Leaflet and OpenStreetMap (map data by OpenStreetMap contributors).",
    "Playwright for browser tests.",
    "Supabase for the planned database and login.",
  ]),
  H2("Where everything is on your computer"),
  ...bullets([
    "Project folder: C:\\Users\\USER\\thrill",
    "App: C:\\Users\\USER\\thrill\\web",
    "Docs: C:\\Users\\USER\\thrill\\docs (owner guide, security notes, and this document)",
    "Database file: C:\\Users\\USER\\thrill\\supabase\\schema.sql",
    "Nothing has been committed to git yet. Do this soon, so the work is backed up.",
  ]),
);

require("./section16")({ c, H1, H2, P, bullets, numbered, table, callout, gap });
require("./section17")({ c, H1, H2, H3, P, bullets, numbered, table, callout, gap });
require("./section18")({ c, H1, H2, H3, P, bullets, numbered, table, callout, gap });

// ---------- document ----------
const doc = new Document({
  creator: "THRILL",
  title: "THRILL: the complete guide",
  description: "Everything about the THRILL event ticketing app",
  styles: {
    default: { document: { run: { font: FONT, size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: FONT, size: 40, bold: true, color: PLUM },
        paragraph: { spacing: { before: 240, after: 200 }, keepNext: true, outlineLevel: 0,
          border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: PINK, space: 4 } } } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: FONT, size: 28, bold: true, color: PINK },
        paragraph: { spacing: { before: 280, after: 120 }, keepNext: true, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: FONT, size: 24, bold: true, color: PLUM },
        paragraph: { spacing: { before: 200, after: 80 }, keepNext: true, outlineLevel: 2 } },
    ],
  },
  numbering: { config: numberings },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1440, bottom: 1300, left: 1440 } }, titlePage: true },
    headers: {
      default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "THRILL \u00b7 The complete guide", font: FONT, size: 18, color: GREY })] })] }),
      first: new Header({ children: [new Paragraph({ children: [] })] }),
    },
    footers: {
      default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Page ", font: FONT, size: 18, color: GREY }), new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 18, color: GREY })] })] }),
      first: new Footer({ children: [new Paragraph({ children: [] })] }),
    },
    children: c,
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(OUT, buf);
  console.log("written", OUT, buf.length, "bytes");
});
