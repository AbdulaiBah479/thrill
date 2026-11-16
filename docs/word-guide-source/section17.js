// Section 17: features borrowed from the best apps, and the new "painkiller" features.
module.exports = function ({ c, H1, H2, H3, P, bullets, numbered, table, callout, gap }) {
  c.push(H1("17. Best features from other apps, and the new painkillers"));
  c.push(
    P("This section records what the strongest entertainment and ticketing apps do well, which pain each one solves, and what THRILL has built from it. The research covered Dice, Posh, Shotgun, Resident Advisor, Partiful, Spotify Wrapped, and several African platforms. Most sources were competitor blogs and vendor pages, so treat their claims as marketing and check them yourself. Fever was not covered by the search."),
    callout("A note on “people cannot reject the app”", [
      "Nobody can be forced to use an app, and tricks like fake scarcity or constant nagging make people leave. What makes people keep using one is that it is the easiest and safest way to get what they want. THRILL’s real hooks are: it is the only place that gives an official wristband and a verified event, it solves the money problem for young people (pay in parts), and it gives people something to show off (Wrapped).",
      "Organizers also stay because THRILL runs their door, tracks their street sellers and prints their wristbands. That is a business reason to stay, not a trick.",
    ]),
    gap(),
  );

  c.push(H2("Pain, feature and where the idea came from"));
  c.push(table(["Pain", "Feature", "Idea from", "Status"], [
    ["Young people have money in small pieces", "**Pay in parts.** Reserve with a first payment, pay the rest before the event. The pass stays locked and the door refuses it until fully paid.", "No source found for installments in ticketing, so this is an original fit for local needs. I cannot claim nobody else has it", "Built (demo)"],
    ["Street sellers are paid on paper lists, with arguments", "**Sales team codes.** Each seller gets a code. Buyers type it at checkout. The organizer sees sales and the commission owed per seller", "Posh’s built-in promoter kickbacks (per Posh’s own blog)", "Built (demo)"],
    ["Too many events, which one is for me?", "**For you.** Ranks events by what you bought or saved and by organizers you follow, with a reason shown. **Follow organizers.** **Great value** tag when an event is clearly cheaper than similar ones", "Personalised discovery, as in music and event apps (from memory, not checked)", "Built"],
    ["Is it packed yet? Is it worth going now?", "**Live crowd meter** (Quiet, Filling up, Busy, Packed) once an event has started, from door check-in numbers", "Original", "Built. Real numbers need the online database"],
    ["Nothing to show off, no reason to come back", "**THRILL Wrapped.** Your nights out, spending, favourite vibe and a title like Night Owl, as a shareable story picture", "Spotify Wrapped. Sources describe it as a free sharing loop. One cites over 500 million shares in the first day of 2025 (company-linked figure, not audited)", "Built"],
    ["Getting home safely", "**Trusted contact and SOS.** Save one person. Safe night and SOS send your live location straight to them in WhatsApp", "Original", "Built"],
    ["Sold out, but people drop out", "**Waitlist** (built). **Timed offer** to the next person: the returned ticket is held for them for a short window", "Dice’s wait list with a reserved buying window (per the comparison sites)", "Waitlist built. Offers need the database"],
    ["Basic phones with no data", "**USSD tickets:** dial a short code and pay by mobile money, with no internet", "Xharp (Ghana), Demfati and eGotickets all describe USSD purchase. Xharp lists a 1.5% processing fee for USSD", "Planned. Needs a telecom or aggregator partner"],
    ["People live in WhatsApp", "**Buy and receive tickets in WhatsApp**", "eGotickets lists WhatsApp as a purchase channel", "Planned. The official WhatsApp business service is not free"],
    ["Reminders that people actually read", "**Text and WhatsApp reminders** before the event", "Partiful’s text reminders, described as having high open rates", "Planned. Calendar reminders are already built. Texts need an SMS provider"],
    ["Organizers want money fast", "**Faster payouts** after the event", "Posh advertises same-night payouts", "Planned. THRILL holds payout until after the event and review. Decide how fast to release"],
    ["Fake resale and scalping", "**Face-value resale** through THRILL only", "Dice’s anti-scalping tools", "Planned. Needs database and payments"],
    ["Payments and trust", "**Money goes straight to the organizer’s own account**, and THRILL never holds it", "Afrilabs Events with Pesapal describes this model", "Option to consider with a payment partner. Check what the licence allows"],
  ], [1700, 3200, 2500, 1626]));
  c.push(gap());

  c.push(H2("How the new features work"));
  c.push(H3("Pay in parts"));
  c.push(
    ...bullets([
      "Offered on paid tickets of NLe 60 or more, when the event is more than a day away.",
      "The buyer picks 1 (full), 2 or 3 parts. They pay the first part now, which holds the spot. The rest is due before the event (at most 7 days, and at least 2 hours before it starts).",
      "Until paid in full, the pass shows “Pass locked” with the balance, and My Tickets shows a Pay balance button.",
      "At the door a reserved ticket shows **NOT FULLY PAID** with the amount owed. Staff must not admit it. This is part of the shared door rules and is covered by tests.",
      "Limits: today the balance is paid with a simulated approval, and nothing releases a spot automatically after the deadline. The real version needs payments and a daily job that frees overdue spots.",
    ]),
    H3("Sales team codes"),
    ...bullets([
      "In the organizer dashboard, add a seller with a name and a commission between 1% and 50%. A code like BIN7K2 is created.",
      "Buyers type the code in the promo box. It gives no discount but credits the seller. A code only works for its own event.",
      "The dashboard shows, per seller: tickets sold, money paid, and the commission owed. These are estimates on the amount paid.",
    ]),
    H3("For you, follow, great value and the crowd meter"),
    ...bullets([
      "For you sorts the feed by your tastes: events like the ones you bought or saved, organizers you follow, and your chosen city. Each card says why (“Because you like Concert”, “You follow …”).",
      "Great value appears only when a category has at least two paid events and this one costs 20% or more below the middle price.",
      "The crowd meter appears for an event that has started and has door scans. It needs shared data to be useful, so it becomes real with the database.",
    ]),
    H3("THRILL Wrapped"),
    ...bullets([
      "Worked out from the tickets on the phone: tickets bought, nights out, money spent, favourite vibe and city, organizers backed, and a title (for example Night Owl for five or more nights).",
      "One tap makes a story-size picture to post on WhatsApp Status or Instagram. Nothing is sent anywhere by the app.",
    ]),
    H3("Trusted contact and SOS"),
    ...bullets([
      "Save one name and number. A Sierra Leone number written the local way (076…) is turned into the international form.",
      "Safe night and SOS get your location and open WhatsApp already addressed to that person. You still tap Send, because phones block automatic sending.",
      "The location needs HTTPS and your permission. SOS does not replace calling emergency services.",
    ]),
  );

  c.push(H2("What to build next from this research"));
  c.push(
    ...numbered([
      "**Database first.** Pay in parts, sales team codes, waitlist offers and the crowd meter all need shared, real data.",
      "**Payments.** Real mobile-money checkout, with part payments and automatic release of unpaid spots.",
      "**Reminders.** Calendar reminders exist. Add WhatsApp or SMS reminders through a provider.",
      "**USSD and WhatsApp channels** for people without data. Talk to Monime or a telecom aggregator about USSD.",
      "**Face-value resale** and **timed waitlist offers.**",
    ]),
    P("Sources: Posh and Ticket Fairy comparison pages for Dice, Posh, Shotgun, Resident Advisor and Partiful; Xharp, Demfati, eGotickets, Quicket, Nilipe, TiME Tickets and Afrilabs Events pages for African platforms; and several marketing articles on Spotify Wrapped. These are vendor and marketing sources, so verify before relying on any claim.", { size: 20, color: "555555" }),
  );
};
