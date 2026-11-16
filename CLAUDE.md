# THRILL project rules

Sierra Leone event discovery + ticketing. Owner is a beginner: explain steps in simple words, make small changes, one task at a time.

- Stack: Next.js (in `web/`), Tailwind, Supabase, deploy on Vercel. PWA for offline tickets.
- Currency: NLe (new leone). Fee: 2%, paid by the buyer (default; owner can change).
- Never put secrets in code. Use `web/.env.local` (git-ignored). Provide `.env.example` only.
- Every Supabase table gets Row Level Security. Ticket status changes happen server-side and atomically (`UPDATE ... WHERE status='PAID'`).
- Ticket states: PURCHASED -> PAID -> CLAIMED -> ENTERED; CANCELLED / REFUNDED.
- Design for cheap Android phones and slow networks: small images, no heavy libraries.
- Payments: manual confirmation first; real mobile-money API only after provider approval.
- Plan lives in `ROADMAP.md`. Do not add AI attribution to commits or pages.
