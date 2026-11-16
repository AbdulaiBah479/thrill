# THRILL security: what is real, what is demo

## The most important point
**A browser app cannot protect itself.** Anyone can open the developer tools, read the app's code, and change what is saved in their browser. So today's demo has **no real security**. The admin PIN, organizer approval, tickets and "verified" badges are all stored in the user's own phone, so a technical person could fake any of them.

Real security means the **server decides**. That is what `supabase/schema.sql` is for: it moves every decision into a database that checks who is asking.

## Today (demo) vs after Supabase

| Protection | Demo today | With Supabase (schema ready, not yet run) |
|---|---|---|
| Hide admin from users | Link not shown; PIN gate; 5-try lockout. Easy to bypass. | Admin role stored in the database. Non-admins get "not allowed" from the server, even if they type the address. |
| Nobody can make themselves admin | Not enforced | A database trigger blocks role changes unless an admin does it |
| Organizer must be verified | Enforced only in the app | Database rule: unverified organizers cannot publish events |
| Fake tickets | Codes are random but nothing is signed | Codes exist only in the database, so an invented code is "NOT FOUND". Payment webhook creates tickets. |
| Same ticket twice | Local check only | Row lock inside `scan_entry`: two scans at the same instant cannot both be admitted |
| Reading other people's data | Not applicable (one phone) | Row Level Security: buyers see only their tickets |
| ID documents | Only last 4 digits kept | Private storage bucket, visible only to the owner and admins |
| Erasing tracks | Local audit log | `audit_log` has no write or delete policy for users |
| Screenshots of passes | QR refreshes every 30 seconds | Same, and the server signs each token |

## Door security: stopping promoter and pass-back fraud
The attack: a dishonest promoter marks a guest as "out" while they are still inside, so the same ticket (or a copy) can bring in a second person. Each rule closes one route. They are in `web/src/lib/gate.ts` (demo) and `supabase/schema.sql` (real, enforced by the database).

| Rule | What it stops |
|---|---|
| **Gate lock.** Each promoter signs in with their own PIN and works one gate only. | An entry promoter recording exits, or an exit promoter admitting people. |
| **Exit needs live proof.** The guest's refreshing phone code, or a camera scan of their wristband or ticket. A typed code is refused at the exit. | A promoter marking someone out alone, without the guest present. |
| **Minimum stay.** Nobody can be let out within 2 minutes of entering. | Instant "admit then release" tricks. |
| **Re-entry cooldown.** After leaving, 2 minutes before coming back. | Handing a ticket back over the fence. |
| **Entry cap.** A ticket can be admitted at most 4 times. | Endless re-use of one ticket. |
| **Fresh codes only.** A phone code must be under about a minute old. | Screenshots and old photos of a pass. |
| **Manager approval for exceptions.** Typed codes at exit, quick exits and typed re-entry need the organizer's manager PIN and a reason. Real version: only the organizer's or an admin's own account can override, never a promoter. | A promoter waiving the rules for a friend. |
| **Unpaid balance.** A ticket bought in parts is refused at both gates until it is paid in full (NOT FULLY PAID, with the amount owed). | Walking in on a part payment |
| **Refunded tickets are void.** A refunded ticket shows REFUNDED / VOID at both gates. | Using a ticket after getting the money back |
| **Every scan carries who, how and why.** The organizer sees warning flags: overrides by one person, quick exits, more people inside than the capacity. | Quiet abuse going unnoticed. |

What this cannot stop: a promoter who physically waves someone through without scanning. That is a staffing problem. The flags and the inside-count versus the real crowd are how you notice it. Use two people per gate for big events.

## Security review (latest pass)
I searched the whole app for risky patterns and tested the fixes. What was found and fixed:

| Problem found | Fix |
|---|---|
| Organizer-typed event titles could run code on the map | Escaped before use. Tested with a hostile title. |
| Exported spreadsheets could run formulas | Cells starting with `= + - @` are neutralised |
| A file restore trusted whatever it was given | Every field is checked, trimmed and limited. Bad prices are rejected, duplicates dropped, staff and admin data can never be restored. |
| Closing the pay sheet mid-payment still created the ticket | Payment is cancelled when the sheet closes |
| Corrupted or edited saved data could crash the app | Data is validated on load; bad parts fall back to empty. A friendly error screen exists as a last resort. |
| Promo box accepted names like `constructor` | Only real codes are looked up |
| A ticket for a removed event silently showed another event | Shows "Event no longer available" |
| Pop-up sheets could not be closed with the keyboard | Escape closes them; focus never jumps while typing |
| No dependency problems found | `npm audit` (production): 0 vulnerabilities |

Known limits that remain (be honest with yourself about these):
- **Everything the user can see or store, a technical user can change.** Real protection needs the server (Supabase).
- **The content-security rule still allows inline scripts and styles** because Next.js and the animation library need them. Tightening this needs per-request nonces, which is a later step.
- **Phone clocks:** a guest whose phone clock is more than about a minute wrong will see "OLD CODE". Staff can type the code at the entry gate. The real app fixes this by asking the server for the time.
- **The demo's PINs are stored in plain text on the phone.** The real app has no PINs for staff: they sign in with accounts.

## Protections already in the demo app
- **Security headers** (`next.config.ts`): no framing (stops clickjacking), strict content rules, camera and location allowed only for this site, no search-engine indexing of staff pages.
- **XSS fix:** organizer-typed text is escaped before it is used in map pins. React already escapes normal text.
- **CSV safety:** exported spreadsheets cannot run formulas from attendee or ticket names.
- **Input limits:** names, venues and descriptions have maximum lengths.
- **Admin lockout:** 5 wrong PINs lock the sign-in for 5 minutes (a speed bump only).
- **Audit log:** every admin decision is recorded with the time.
- **Backups restore only personal data.** A backup file can never restore organizer approval, wristbands or admin data.
- **Single-use codes, blank wristbands are worthless until activated, no re-entry rules,** and gift codes that void the old QR.

## Must do before real money or real people
1. Run `supabase/schema.sql` on a test project, fix any errors, then on the real project.
2. Replace the localStorage store with Supabase calls (accounts, tickets, scans go through the database functions).
3. Turn on **two-factor login** for your admin account.
4. Payments: use the provider's **signed webhook** to create tickets. Never trust the phone saying "I paid".
5. Keep secrets (service key, payment keys) only on the server, never in `NEXT_PUBLIC_` variables.
6. Add **rate limits** on login, purchase and scan.
7. Get a lawyer to review the terms, privacy policy and how payouts are held. Sierra Leone payment rules apply.
8. Test with a security checklist (OWASP basics) or hire a short review before launch.

## Reporting a problem
If you find a security hole, do not post it publicly. Tell the owner directly.
