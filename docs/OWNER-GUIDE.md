# THRILL owner's guide

You are the owner and the only admin. This is how you run THRILL day to day.

## The three kinds of people

| Who | What they do | Where |
|---|---|---|
| **Buyer** | Finds events, buys passes, goes in with the pass on their phone | The main app |
| **Organizer** | Applies once. After you verify them: creates events, orders official wristbands, sees sales, runs the door | Organizer area (You tab → organizer) |
| **You (admin)** | Verifies organizers, approves print orders, handles reports, watches money | `/admin` (staff only) |

Promoters (door staff) are people an organizer trusts to scan tickets. They use the door check-in page.

## How you open the admin area
- Today (demo): go to `your-link/admin`, or open the You tab and tap the grey "THRILL demo build" text 5 times. Sign in with the PIN.
- Change the PIN: create `web/.env.local` and add `NEXT_PUBLIC_ADMIN_PIN=your-number`. Restart the app.
- **Important:** this PIN is a speed bump, not real security (see SECURITY.md). Real admin protection arrives with Supabase: you sign in with your own account, the server knows you are admin, and nobody else can open the admin area, even by guessing the address.
- Regular users never see a link to the admin area.

## Your routine

**Every day (5 minutes)**
1. **Organizers tab.** Verify or reject new applications. Use the checklist on the screen: call or WhatsApp them, match their ID to them, ask for a past event or venue booking, look at their social page. Say no when unsure. Trust is your product.
2. **Print tab.** Approve new print orders. When you start printing, the app creates the unique wristband codes. Open the print batch and print (or save the PDF for the print shop).
3. **Claims tab (THRILL Guarantee).** Read buyers' problems. Refund the ticket if the claim is true (it then stops working at the door), or reject it with a reason the buyer can read. To cancel a whole event, use **Cancel + refund all** in the Events tab.
3b. **Reports tab.** Read reports. Suspend an event that looks like a scam. Dismiss false alarms.
4. **Overview tab.** Check sales and your earnings (the 2% fee).

**Before event night: set up your door staff**
1. In the organizer area, open your event → **Door staff and security**.
2. Add each promoter with a name, a 4-digit PIN and ONE gate (Entry or Exit). Never give two people the same PIN.
3. Set a 6-digit **manager PIN**. Keep it to yourself. It approves risky scans.
4. Tell staff: sign in on the check-in page with your own PIN. Everything you scan is recorded under your name.

**Event readiness:** every event in the organizer area has a 6-step checklist (details, tickets, entry and exit staff, manager PIN, wristbands ordered, live). Aim for 6 of 6 before the event.

**Event night**
0. Door staff screens are built for the dark and for glare: huge colour results (green admit, yellow check, red refuse), a different sound and vibration for each, an "Inside now" count, and a **Need help** button. A help request appears at the top of the organizer dashboard. Sound can be switched off.
1. Staff open **Door check-in** and sign in. Entry gate staff scan each guest. Green means admit. Yellow "ALREADY INSIDE" means do not admit and check the wristband. Red "NOT FOUND" means no entry.
2. Door sales: a blank wristband shows "NOT ACTIVATED". Take the money first, then activate it.
3. Exit gate staff scan people who step out (only if the event allows re-entry).
4. You or the organizer export the attendee list (CSV) afterwards.

**After the event**
- Check ratings and reports. Pay the organizer only after the event has finished and there are no open problems. That payout hold is your protection against organizers who disappear.

## How money works (planned)
- Buyers pay through a licensed mobile-money provider. THRILL does not hold money itself.
- THRILL earns a 2% fee per online ticket (shown to the buyer) plus optional boosts.
- Printing wristbands has a real cost (paper, printing, delivery). Decide your price and quote the organizer before approving an order.

## Things only you can do
- Create the Supabase account and run `supabase/schema.sql`.
- Apply for mobile-money merchant access (Monime or the providers).
- Arrange a print shop for numbered wristbands, and decide the print price.
- Register the business, write the terms and privacy policy with a lawyer.
- Call and verify organizers.

## Your rules for trust
1. No verification, no listing.
2. Refunds only when an event is cancelled or a payment error happened.
3. One official wristband design, printed only by THRILL.
4. Pay organizers after the event.
5. Keep the audit log. It records every admin decision.
