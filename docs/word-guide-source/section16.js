// Section 16: recommended free (and nearly free) APIs, MCP servers, repos and services.
// Facts marked "verify" came from third-party pages or memory and must be checked on the vendor's own site.
module.exports = function ({ c, H1, H2, P, bullets, numbered, table, callout, gap }) {
  c.push(H1("16. Free APIs, MCP servers, repos and services"));
  c.push(
    P("This section lists the best free (or nearly free) tools for THRILL, what each is for, and the catches. Free plans change often and some have rules that matter for a business that earns money. Every figure below was checked against web pages found in November 2026, but many came from third-party blogs. **Confirm each one on the vendor’s own pricing and terms page before you rely on it.**"),
    callout("Important correction to earlier advice", [
      "Earlier notes said to host the app on Vercel “for free”. That is only true for demos. Vercel’s own documentation says the free Hobby plan is for personal, non-commercial use only. Once THRILL sells tickets and takes a fee, plan on a paid host plan (Vercel Pro was listed at about $20 per user per month) or another host whose free terms allow business use. Check Cloudflare Pages’ terms yourself, because my search did not confirm them.",
      "Also note that Supabase’s free projects pause after about a week of no activity. That is fine for building, but not for a live ticketing service.",
    ]),
    gap(),
  );

  c.push(H2("A. Core: needed to go live"));
  c.push(table(["Tool", "What it is for", "Free tier (verify)", "Catches"], [
    ["Supabase", "Database, login, private ID-photo storage, the security rules in schema.sql", "500 MB database, 50,000 monthly active users, 2 active projects, 5 GB egress, 1 GB file storage", "Free projects pause after about 1 week of inactivity. Pro starts around $25 a month. Use Pro before real events."],
    ["Hosting: Vercel", "Puts the app online with HTTPS, so the camera scan, install and offline mode work", "Hobby: about 100 GB bandwidth and 100 build minutes a month", "Hobby is non-commercial only. Pro about $20 per user per month."],
    ["Hosting: alternatives", "Cloudflare Pages or another host", "Not confirmed in my search", "Read their terms for business use before choosing."],
    ["Monime", "One connection to Orange Money, Afrimoney and Visa debit; says it has standard APIs and documentation", "Not stated. Payments normally charge a percentage per transaction", "Check Monime’s own site for sandbox access, fees and approval time. A TypeScript package listing exists, but I could not confirm it is official."],
    ["Afrimoney and Orange Money direct", "Merchant payment links straight with the providers", "Per transaction fees", "Approval can be slow. Apply early."],
    ["GitHub", "Safe copy of all code, history, private repository", "Free private repositories", "Never commit secret keys. Commit often."],
  ], [1500, 2600, 2300, 2626]));
  c.push(gap());

  c.push(H2("B. Trust, safety and running the service"));
  c.push(table(["Tool", "What it is for", "Free tier (verify)", "Catches"], [
    ["Sentry", "Tells you when the app breaks and where", "One source: about 5,000 errors a month, 1 user. Sources conflicted", "Check the real limit. Good enough to start."],
    ["PostHog", "Usage analytics: where users drop off, which events sell", "One source: 1 million events a month, session replays, feature flags", "Do not record personal data."],
    ["Resend", "Emails: receipts, organizer approval notices", "About 3,000 emails a month, 100 a day, 1 domain", "You need to own a domain for good delivery."],
    ["Cloudflare Turnstile", "Free CAPTCHA-style bot check for sign-up, purchase and promo-code boxes", "Listed as free; I found no limits", "Verify terms. Helps stop fake accounts and code guessing."],
    ["UptimeRobot (from memory)", "Alerts you if the site goes down", "Free plan exists", "Verify current limits."],
    ["SMS provider", "Login codes and ticket texts", "Not free. Paid per message", "Africell holds about 60% and Orange about 33% of the market (one source). Several providers claim Sierra Leone coverage, but I could not confirm Africa’s Talking. Start with WhatsApp share links and email, add SMS later."],
  ], [1500, 2600, 2300, 2626]));
  c.push(gap());

  c.push(H2("C. Free data APIs"));
  c.push(table(["API", "What it is for in THRILL", "Free terms (verify)", "Catches"], [
    ["OpenStreetMap map tiles (already used)", "The Map tab", "Free, with credit: © OpenStreetMap contributors", "Heavy traffic needs a proper tile provider. Keep the credit visible."],
    ["Nominatim (OpenStreetMap search)", "Turn a venue name into map coordinates when an organizer creates an event", "Free, run on donated servers. About 1 request per second per app. Must identify your app and cache results", "No search-as-you-type. No bulk jobs. For heavy use run your own or pay a provider."],
    ["Open-Meteo weather", "Show the forecast on an event page", "Official terms: free tier is for NON-COMMERCIAL use only, under 10,000 calls a day, credit required", "Because THRILL earns money, you would need their paid plan. Do not rely on the free one for a business."],
    ["Frankfurter exchange rates", "Show prices in USD, GBP or EUR for family abroad", "Free, no key. European Central Bank daily rates", "Daily, not live. I could not confirm that the Sierra Leone leone is covered. Check before building on it."],
    ["Pexels / Unsplash photo APIs (from memory)", "Free event photos", "Free with a key; credit the photographer", "Check each licence. Real organizer photos are better."],
  ], [1900, 2600, 2400, 2126]));
  c.push(gap());

  c.push(H2("D. Free AI APIs, for features like captions, recommendations and a Krio assistant"));
  c.push(
    P("These come from memory and were not re-checked, so confirm all of it. Candidates are Google’s Gemini API free tier, Groq’s free tier, and OpenRouter’s free models."),
    ...bullets([
      "Free tiers usually have low daily limits, can change without notice, and **some free tiers may use your prompts to improve their models**. Never send tickets, phone numbers, ID details or other personal data to a free AI service.",
      "Good first uses: write an event description from a few bullet points, suggest a poster caption, summarise reviews. Keep a person in the loop for anything public.",
      "For Krio, have a native speaker check every translation. A machine will make mistakes.",
    ]),
  );

  c.push(H2("E. MCP servers (tools that let an AI helper work with your accounts)"));
  c.push(
    P("An MCP server lets an AI assistant do real work in another service, for example create database tables or open a browser. They save time while building, but they also give an AI access to your accounts, so be careful. MCP tools change quickly. Always read the vendor’s current instructions."),
    table(["MCP server", "What it does", "Use it for"], [
      ["Supabase MCP (@supabase/mcp-server-supabase)", "Lets an AI create tables, run queries and manage a Supabase project. Needs a personal access token", "Setting up and testing the database. **Connect it to a test project, in read-only mode where possible, never the live one.**"],
      ["GitHub MCP (ghcr.io/github/github-mcp-server)", "Lets an AI read and manage repositories, issues and pull requests. Needs a GitHub token", "Tracking work and reviews. Give the token only the access it needs."],
      ["Playwright MCP", "Gives the AI a real browser to open pages and click, using page structure instead of screenshots", "Automatic testing of the app, like the tests already in the project"],
      ["Context7", "Feeds the AI current documentation for libraries and frameworks (optional free API key for higher limits)", "Fewer mistakes from outdated library knowledge"],
    ], [2700, 3300, 3026]),
    gap(),
    P("**You already have connectors** in your Claude setup for Figma, Canva, Notion, Airtable, Make, Zapier and others. Canva can make event posters, and Make can post events to social media automatically. These do not need extra setup in the app."),
    ...bullets([
      "Never paste a token or password into a chat. Add it to the tool’s own settings.",
      "Create a separate token per tool with the smallest access it needs, and delete it when you no longer need it.",
      "Treat anything an MCP tool brings back as information, not as instructions.",
    ]),
  );

  c.push(H2("F. GitHub projects and libraries"));
  c.push(table(["Project", "Why", "Licence note (verify)"], [
    ["Hi.Events", "Open-source ticketing with a good organizer experience. Study its screens and ideas", "AGPL-3.0 with extra terms. Learn from it, do not copy code."],
    ["pretix", "Mature ticketing with check-in apps that scan offline, waiting lists, vouchers and seating. Good source of ideas", "Free community edition plus paid editions. Check its licence before using any code."],
    ["nimiq/qr-scanner", "QR scanning on iPhone and Android. Already in THRILL", "MIT"],
    ["Leaflet", "Map library. Already in THRILL", "Open source. Keep the OpenStreetMap credit."],
    ["shadcn/ui, react-hook-form, zod, dexie, serwist (from memory)", "Ready-made components, form checks, offline storage, offline app support", "Verify each licence. All are commonly used in commercial apps."],
  ], [2300, 4200, 2526]));
  c.push(gap());

  c.push(H2("G. What to do first, and what it really costs"));
  c.push(
    ...numbered([
      "**Now (free):** GitHub private repository, a Supabase test project, Sentry and PostHog accounts, Playwright and Context7 for building. Keep using Vercel Hobby only for private demos.",
      "**Before the first real event:** move to a paid Supabase plan and a business-allowed hosting plan, turn on Turnstile, connect Monime or a provider, add Resend for email.",
      "**After launch:** add SMS, weather only if you pay for it, and AI helpers for captions and posters.",
    ]),
    P("**Rough minimum running cost once live:** about $45 a month if you use the two paid plans quoted in the sources (Supabase Pro about $25 and Vercel Pro about $20), plus a domain name, SMS, and the cost of printing wristbands. Payment fees come out of each ticket. These are the prices seen in November 2026 and can change."),
    ...bullets([
      "Never put secret keys in settings that start with NEXT_PUBLIC. Everyone can read those.",
      "Keep a list of every account and where its keys are stored. Use a password manager.",
      "Set a calendar reminder to re-check all free limits every few months.",
    ]),
  );

  c.push(H2("Sources used for this section"));
  c.push(
    ...bullets([
      "Vercel Hobby plan: vercel.com/docs/plans/hobby, plus third-party Vercel pricing guides.",
      "Supabase pricing: supabase.com/pricing and several third-party guides that agreed on the main limits.",
      "Monime launch coverage: thecalabashnewspaper.com and visitsierraleone.org (news pages, not Monime’s own documentation).",
      "SMS market in Sierra Leone: D7 Networks, Telnyx, Prelude and BudgetSMS pages (vendor claims).",
      "Open-Meteo terms: open-meteo.com/en/terms. Nominatim policy: operations.osmfoundation.org/policies/nominatim.",
      "Frankfurter: frankfurter.dev. Free-tier figures for Resend, PostHog and Sentry: costbench.com, automationatlas.io, agentdeals.dev and activepieces.com.",
      "MCP servers: third-party directories (lobehub, agentpedia) and setup guides. Use each vendor’s own repository for the current instructions.",
    ]),
  );
};
