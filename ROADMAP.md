# THRILL: Complete Beginner Roadmap (zero budget, part-time, solo, AI-built)

Launch: Freetown, all event types. Principle: **ship the smallest thing that sells a real ticket, then grow.**
Items marked (verify) are from my memory and may have changed. Check pricing and availability before relying on them.

---
## 0. Mindset and rules
1. You are the product owner. AI writes the code, you decide what and why.
2. Build in small steps and commit to GitHub after each working step.
3. Never put secrets (API keys, payment keys) in code. Use environment variables.
4. Real money flows only after a lawyer or payment partner confirms the setup.
5. 5 to 10 real organizers using it beats 50 features nobody uses.

---
## 1. Your free toolbox

### AI coding (pick one main, one backup)
| Tool | Use | Cost |
|---|---|---|
| Claude Code (this) in VS Code | Main builder: writes, runs, and fixes code | Your current plan |
| GitHub Copilot Free | Autocomplete backup | Free tier (verify) |
| Google AI Studio / Gemini | Free-tier LLM for app features and for asking questions | Free tier |
| Groq, OpenRouter free models | Free-tier APIs for in-app AI | Free tiers (verify limits) |
| Ollama | Run open models on your PC | Free |

### Stack (all have free tiers)
| Need | Tool | Why |
|---|---|---|
| Web app | **Next.js** + **Tailwind CSS** + **shadcn/ui** | Most AI-friendly, huge community |
| Database, login, storage, realtime | **Supabase** (Postgres) | Free tier, row-level security, phone/email auth |
| Hosting | **Vercel** or **Cloudflare Pages** | Vercel's free Hobby plan is non-commercial only (paid plan needed once THRILL earns money). Check Cloudflare Pages terms. See the Word guide, section 16. |
| Code home and backups | **GitHub** (private repo) | Free |
| Offline / installable app | **PWA** via `serwist` (Next.js) or Workbox | Installs on phones, works offline, no app store |
| QR generate | `qrcode` (npm) | Simple |
| QR scan in browser | `qr-scanner` (nimiq) or `html5-qrcode` | Works on cheap phones |
| Signed tickets | `jose` (JWT/JWS) or Node `crypto` HMAC | Tamper-proof QR tokens |
| Swipe feed | `embla-carousel` or CSS scroll-snap (TikTok style) | Light and fast |
| Images/video | Supabase Storage, **Cloudinary** free tier | Resize and compress for low data |
| Email | **Resend** free tier | Receipts and organizer mail |
| Analytics | **PostHog** free tier | Funnels, see where users drop |
| Errors | **Sentry** free tier | Know when it breaks |
| Uptime | **UptimeRobot** free | Alerts if the site is down |
| Maps | **OpenStreetMap + Leaflet** | Free, no card needed |
| Design | **Figma** free, **Canva** free | You already have connectors |
| Automation | **Make.com** free (you already use it) | Post events to social media |

### MCP servers and connectors (give the AI hands)
You already have connectors for Figma, Canva, Notion, Airtable, Gmail, Drive, Make and Zapier. Useful additions for THRILL:
- **Supabase MCP**: the AI can inspect and migrate your database (use on a dev project only).
- **GitHub MCP / `gh` CLI**: issues, pull requests, releases.
- **Playwright MCP**: the AI opens your app in a browser and tests it.
- **Context7 MCP**: gives the AI current library docs, so fewer outdated-code bugs.
- **Vercel MCP** (verify): deploy logs.
Start with GitHub and Supabase. Add the rest later.

### Payments (Sierra Leone reality)
- **Monime**: you already track this for Kopor. Ask them about merchant/checkout APIs and webhooks.
- Direct merchant APIs from Afrimoney, Orange Money, and Airtel Money: apply early, since approval is slow.
- Fallback for MVP: manual confirmation. The buyer pays the organizer's merchant number and sends a reference. The organizer or admin confirms, then the ticket becomes PAID. This is fine for the first 10 to 20 events.
- Diaspora payments: Stripe is not available in Sierra Leone for local accounts. Consider a partner or later Paystack/Flutterwave style providers, if they cover SL (verify).

### SMS / WhatsApp
- Email works free from day one. SMS in Sierra Leone costs money: check Africa's Talking, Twilio, and local aggregators for SL coverage (verify).
- WhatsApp: share links with `wa.me`. The official WhatsApp Business API is not free.
- Cheap trick for MVP: after purchase, show the pass on screen plus a "Share to WhatsApp" button.

---
## 2. Feature set

### MVP (must have)
1. Event feed with swipe cards, filters (date, area, category, free/paid), and search.
2. Event page: poster, time, map, ticket types, organizer badge.
3. Sign-up/login by phone number or email.
4. Buy a ticket: mobile money checkout, or manual confirm at first.
5. THRILL Pass: QR plus a human code (`SUM-7K92-X81P`), saved offline.
6. Organizer dashboard: create events, ticket types, sales, promoters.
7. Promoter scan page: scan or type a code, PAID → CLAIMED, with a duplicate warning.
8. Admin panel: approve organizers and events, cancel events, refund flags.

### Unique and loved (your differentiators)
**Social**
- "Who's going": see friends attending (opt-in).
- **Squad Tickets**: one person books for a group, and friends pay their share by mobile money link. Unpaid shares expire.
- Event "vibe" posts: attendees add photos after the event to build a living feed.
- Share cards: auto-generated image per event for WhatsApp/Instagram status.

**Low-data / offline first (your strongest edge in Sierra Leone)**
- "Lite mode": text-first feed, compressed images, no video autoplay.
- Tickets work offline after first load; promoter check-in works offline with a downloaded pack.
- Ticket by SMS or USSD later if an aggregator supports it.
- Show data cost: "This page uses ~200KB".

**Trust and safety**
- Verified organizer tiers: Bronze (phone), Silver (ID), Gold (ID plus 3 clean events). Show them on events.
- Payout held until after the event (check legality with your payment partner).
- Rotating QR (token refreshes every 30s) to stop screenshot sharing.
- Fake-event report button, plus an auto-flag on suspicious patterns (new organizer, big sales, no ID).
- Safe-night kit: share your live location with a contact, a "get home safe" check-in, and venue safety ratings.
- Waitlist and official resale with a price cap: kills scalping and fake resale.

**AI**
- Recommendations ("because you liked X").
- Poster and caption generator for organizers.
- Krio/English assistant: "Wetin dey happen this weekend?"
- Auto-translate event text, and an assistant that answers organizer questions.
- Fraud scoring on organizers.

**Extras to consider later**
- Loyalty points per event attended, redeemable at partner venues.
- Venue pages with calendars, and organizer follow with new-event alerts.
- Group chat per event (after launch).
- Promoter leaderboard and commission tracking.
- Diaspora mode: buy for family back home, and gift tickets.
- Cashless vendor tokens at events (needs licensing: skip until later).

---
## 3. Security, trust, and reliability checklist
- Supabase **Row Level Security** on every table. Users see only their own data.
- All ticket changes done server-side (never trust the phone). Use atomic updates (`UPDATE ... WHERE status='PAID'`) to prevent double claims.
- Payment webhooks: verify signatures and make handlers idempotent.
- Rate limit login, purchase, and scan endpoints.
- Store ID photos in a private bucket with access logging and encryption. Delete after the retention period you set.
- Daily database backups (Supabase export plus manual monthly copy).
- Audit log for every purchase, claim, refund, and admin action.
- Privacy policy and terms (use a generator, then a lawyer review). Sierra Leone payment law retention applies (verify the 7-year claim).
- Test on cheap Android phones on slow networks, not just your laptop.
- Accessibility: large buttons, high contrast, and support for Krio/English.

---
## 4. Roadmap by phase

### Phase 0: Prepare (week 1 to 2)
- [ ] Create GitHub, Vercel, Supabase, Resend, Sentry, PostHog accounts.
- [ ] Reserve the name: check the domain (`.com` or `.sl` costs money, so use the free Vercel subdomain at first), plus social handles.
- [ ] Talk to 10 people: 5 organizers, 5 attendees. Ask how they sell and buy tickets today and what goes wrong.
- [ ] Contact Monime and one mobile money provider about merchant access.
- [ ] Write one page: the problem, the user, the 3 core features.

### Phase 1: Foundation (weeks 3 to 6)
- [ ] Set up Next.js + Tailwind + shadcn/ui + Supabase with AI.
- [ ] Database: users, organizers, events, ticket_types, tickets, promoters, transactions, audit_log.
- [ ] Login, roles, and RLS policies.
- [ ] Deploy to Vercel. Share the link with a friend.

### Phase 2: Core product (weeks 7 to 12)
- [ ] Feed, event page, filters, search.
- [ ] Organizer: create event and ticket types.
- [ ] Ticket purchase (manual confirm first), pass with QR and code.
- [ ] Promoter scan page with CLAIMED logic.
- [ ] Admin approval screen.
- [ ] PWA install and offline pass.

### Phase 3: Real-world test (weeks 13 to 18)
- [ ] Run 3 to 5 small real events with friendly organizers.
- [ ] Watch what breaks. Fix it. Interview users after each event.
- [ ] Add payment API once approved.
- [ ] Add Sentry, PostHog, and uptime alerts.

### Phase 4: Trust and growth (months 5 to 8)
- [ ] Verified organizer tiers, rotating QR, reports.
- [ ] Squad Tickets, "who's going", share cards.
- [ ] Lite mode and the offline check-in pack.
- [ ] Boost packages (manual billing first).
- [ ] Referral codes for promoters.

### Phase 5: AI and scale (months 9 to 14)
- [ ] Recommendations, poster generator, Krio assistant.
- [ ] Fraud scoring.
- [ ] Expo mobile app if the PWA limits you.
- [ ] Expand beyond Freetown (Bo, Kenema, Makeni).

### Phase 6: Business (ongoing)
- [ ] Register the company, bank account, and tax setup (local advice).
- [ ] Terms, privacy, and refund policy reviewed by a lawyer.
- [ ] Apply to startup programs and grants (Orange Social Venture Prize, local hubs, and similar: verify).
- [ ] Track KPIs weekly: events, tickets, active organizers, repeat rate, fee revenue.

---
## 5. How to build with AI (beginner workflow)
1. Pick **one small task** ("create the events table").
2. Tell the AI the goal, what to touch, and what "done" looks like.
3. Let it write the code, run it, and test it.
4. You check it in the browser. If it works, commit. If not, paste the error.
5. Ask "explain what you did in simple words" until you understand.
6. Keep a `CLAUDE.md` file in the project with your rules (stack, naming, never expose secrets, always add RLS). The AI reads it every session.

Good prompts to start:
- "Set up a Next.js app with Tailwind, shadcn/ui and Supabase for THRILL. Explain each step."
- "Design the Postgres schema for events, tickets and promoters with row level security."
- "Build the promoter scan page that atomically marks a PAID ticket as CLAIMED and shows a clear warning if already claimed."

---
## 6. Learning (free)
- freeCodeCamp (JavaScript, React), The Odin Project, Next.js official tutorial, Supabase docs and YouTube, CS50.
- 30 minutes a day beats a weekend binge.

---
## 7. Risks to handle early
| Risk | Plan |
|---|---|
| Payment approval is slow | Manual confirm MVP, and apply now |
| Organizers don't trust a new platform | Start with friends, show payout proof, and use the verified badge |
| Fake tickets / screenshots | Rotating QR, claim-once logic, and physical handover |
| Low connectivity | PWA, lite mode, offline pack |
| Legal (payments, data) | Use licensed providers only and get legal review |
| Burnout | Small weekly goals and one feature at a time |

---
## 8. Open questions I still need from you
1. App name final: THRILL? Check the name conflicts.
2. Do you have a smartphone and laptop to build and test on?
3. Do you know any organizers who would be your first partners?
4. Will buyers pay the 2% fee or organizers?
5. Will you register a company before launch?
