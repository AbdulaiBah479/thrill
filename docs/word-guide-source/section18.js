// Section 18: features borrowed from fintech and consumer apps worldwide.
module.exports = function ({ c, H1, H2, H3, P, bullets, numbered, table, callout, gap }) {
  c.push(H1("18. Best features from fintech and consumer apps"));
  c.push(
    P("This section covers the strongest ideas from money apps and consumer apps around the world, which pain each one solves, and what THRILL built. The research covered African mobile money and fintech (M-Pesa, Wave, Chipper Cash, OPay, MTN MoMo, chama and stokvel apps), UK neobanks (Monzo, Revolut, Starling), buy-now-pay-later and buyer protection (Klarna, PayPal), Duolingo’s streaks, and Wise’s transparent fees. Many sources were blogs and vendor pages. The search found nothing usable on Venmo, Cash App, Airbnb’s refund rules or Uber’s safety tools, so no claims about those are used."),
    gap(),
  );

  c.push(H2("Ranked list"));
  c.push(table(["#", "Feature", "Borrowed from", "Pain it solves", "Status"], [
    ["1", "**Night Fund**: a savings pot with a goal, plus round-up of spare change", "Monzo Pots, Revolut Pockets and Starling round-ups (round every purchase up and save the difference). African chama and stokvel apps for group savings", "People cannot afford a ticket in one go", "Built (demo tracker)"],
    ["2", "**THRILL Guarantee**: claim a problem, get a refund; cancel an event and refund everyone", "PayPal Buyer Protection (claims within 180 days) and Klarna’s claims process", "Fear of scams and dead tickets", "Built"],
    ["3", "**Night streak and badges**, with one forgiven quiet week", "Duolingo streaks, described as working through loss aversion. The same sources warn about “streak creep”, so it is built gently", "No reason to come back", "Built"],
    ["4", "**Squad pot tracker**: who has paid their share", "Chama and stokvel apps that track contributions and payouts", "Chasing friends for money", "Built (manual)"],
    ["5", "**Where your money goes**: organizer amount and THRILL fee shown at checkout", "Wise, which shows fees upfront", "Hidden-fee distrust", "Built"],
    ["6", "**Pay-in-parts schedule**", "Klarna Pay in 4: first payment at checkout, the rest later, interest-free", "Cash in small pieces", "Built earlier"],
    ["7", "**Low or zero-cost person-to-person transfers**", "Chipper Cash (one source: free transfers) and Wave (one source: cut prices; zero fees unconfirmed)", "Fees", "Needs a payment partner"],
    ["8", "**Overdraft: buy now, repay from later deposits**", "M-Pesa Fuliza", "Cash gaps", "**Not recommended.** It is regulated lending and can push people into debt"],
  ], [400, 2300, 2900, 1900, 1526]));
  c.push(gap());

  c.push(H2("How the new features work"));
  c.push(
    H3("Night Fund"),
    ...bullets([
      "A pot for nights out. Top up with NLe 10, 20 or 50, set an optional goal, and watch the progress bar.",
      "Round-up: turn it on and every ticket purchase is rounded up to the next NLe 10, with the change saved into the pot. For example a NLe 41 ticket is charged NLe 50 and NLe 9 goes into the fund.",
      "At checkout, “Night Fund” appears as a payment choice only when the balance covers the payment.",
      "**Important limit:** today this is a tracker with simulated top-ups. Holding real money needs a licensed partner such as a mobile money provider, and THRILL should never hold the money itself.",
    ]),
    H3("THRILL Guarantee"),
    ...bullets([
      "On any ticket the buyer can send a claim: event cancelled, refused entry with a valid ticket, charged the wrong amount, or event not as described.",
      "You see claims in the admin Claims tab. Refund marks the ticket REFUNDED. It stops working at the door (REFUNDED / VOID) and no longer counts as a sale, a night out or a streak. Reject sends the buyer your reason.",
      "**Cancel + refund all** in the admin Events tab cancels an event, refunds every ticket at once, removes the event from the feed, and writes the audit log.",
      "Limit: in the demo no real money moves. The real version would trigger refunds through the payment provider.",
    ]),
    H3("Night streak and badges"),
    ...bullets([
      "Streak: how many weeks in a row you went to an event. One quiet week is forgiven if you went the week before, and a lost streak simply starts again. No pressure messages.",
      "Badges: First Night, Night Owl (5 events), Explorer (2 cities), Scene Supporter (3 organizers), Early Bird (bought a week ahead), Saver (started a Night Fund). Refunded tickets never count.",
      "Keep this useful, not manipulative. Do not add fake countdowns or constant nagging.",
    ]),
    H3("Squad pot tracker and fee breakdown"),
    ...bullets([
      "In the Squad window, add your friends and tick them off as they pay you. It shows how many have paid, the money collected out of the total, and an “Everyone has paid” button to book. This is manual until real payments exist, when each friend pays by their own mobile money link and it ticks automatically.",
      "At checkout the app now says exactly where the money goes, for example NLe 40 to the organizer and NLe 1 THRILL fee, with no other charges.",
    ]),
  );

  c.push(H2("What this needs to become real"));
  c.push(
    ...numbered([
      "The online database, so funds, claims, refunds and squads are shared and cannot be edited on a phone.",
      "A licensed payment partner for the Night Fund, part payments and refunds (Monime or the mobile money providers).",
      "Automatic reminders (WhatsApp or SMS) for balances due, savings goals and streaks. Keep them rare.",
      "A clear refund policy, written with a lawyer, so the Guarantee is a promise you can keep.",
    ]),
    P("Sources: pages found by web search for African fintech overviews, Finder and Which? comparisons of Monzo, Revolut and Starling, PayPal and Klarna buyer protection pages, Duolingo and Wise explainers, and stokvel and chama app listings. These are mostly third-party and vendor pages, so verify before relying on a claim.", { size: 20, color: "555555" }),
  );
};
