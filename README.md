# THRILL

Event discovery and ticketing for Sierra Leone. Find events, buy a pass with mobile money, go in with your phone and an official THRILL wristband.

**Status:** working demo. Everything is saved on one phone. Real accounts, payments and cross-phone data need the Supabase backend (schema is ready in `supabase/schema.sql`, not yet run).

## Folders
```
thrill/
  README.md           this file
  ROADMAP.md          the full plan, phases and tools
  CLAUDE.md           project rules for the AI that helps build it
  docs/
    OWNER-GUIDE.md    how you run THRILL day to day
    SECURITY.md       what is real security and what is demo
  supabase/
    schema.sql        database, security rules and safe check-in functions
  web/                the app (Next.js)
    src/app/          pages: feed (/), organizer, admin, scan, print, help
    src/components/   event card, sheets, pass, map, confetti
    src/lib/          events data, local store, share, calendar, hooks
    public/           photos (credits in public/photos/CREDITS.md), icons, offline worker
```

## Run it
```
cd web
npm install
npm run dev            # development, http://localhost:3000
# or the faster production build:
npm run build
npm run start -- -H 0.0.0.0 -p 3003
```
Open the link on a phone on the same Wi-Fi: `http://YOUR-COMPUTER-IP:3003`.
Camera scan, install-as-app and offline mode need HTTPS, so they work once the app is hosted with HTTPS (for example Vercel; note its free plan is non-commercial only).

## Checks and tests
```
cd web
npm run check          # type check + code check + door-rule tests (fast)
npm run test:rules     # just the door rules (29 checks)
npm run test:e2e       # all browser tests; start the app first. Takes about 10 minutes.
```
Browser tests are in `web/tests/e2e/`. They need Microsoft Edge installed, and run against `http://localhost:3003` (set `BASE=...` to change it). You can also run one file: `node tests/e2e/door-security.mjs http://localhost:3003` from `web/tests/out`.

## Settings
Copy `web/.env.example` to `web/.env.local` and fill in (never commit `.env.local`):
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (when you create Supabase)
- `NEXT_PUBLIC_ADMIN_PIN` (demo admin PIN, not real security)

## Who can do what
- **Buyer:** browse, buy, gift tickets, rate events, share story images.
- **Organizer:** apply, get verified by THRILL, create events, order official wristbands, run the door.
- **Admin (owner):** verify organizers, approve print orders, review reports, see earnings, audit log.

## Credits
Photos from Pexels (free licence), credits in `web/public/photos/CREDITS.md`. Map tiles by OpenStreetMap contributors. Icons: lucide. Animations: motion.
