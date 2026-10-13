import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Privacy Policy — Padel Rival" },
      { name: "description", content: "How Padel Rival collects, uses, stores and protects your personal data, and the rights you have over it." },
      { property: "og:title", content: "Privacy Policy — Padel Rival" },
      { property: "og:description", content: "How Padel Rival collects, uses, stores and protects your personal data." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://padel.ogbot.co.uk/privacy" }],
  }),
  component: Privacy,
});

function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{children}</p>;
}
function H({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-8 font-display text-lg font-black">{children}</h2>;
}
function Li({ children }: { children: React.ReactNode }) {
  return <li className="mt-2 text-sm leading-relaxed text-muted-foreground">{children}</li>;
}

function Privacy() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <Link to="/" className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
        ← Padel Rival
      </Link>
      <h1 className="mt-6 font-display text-3xl font-black">Privacy Policy</h1>
      <p className="mt-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Last updated 30 September 2026</p>

      <P>
        Padel Rival ("we", "us", "the app") is a padel match tracker and ranking service. This policy explains what
        personal data we collect, why we collect it, how long we keep it, and the rights you have over it. We do not
        sell your data and we do not run advertising.
      </P>

      <H>Who we are (data controller)</H>
      <P>
        The data controller for Padel Rival is the operator of the service, contactable at{" "}
        <a href="mailto:Ogbot196@gmail.com" className="font-semibold text-primary underline">
          Ogbot196@gmail.com
        </a>
        . We decide how and why your personal data is processed, and we are responsible for it under the UK General
        Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.
      </P>

      <H>Information we collect</H>
      <ul className="list-disc pl-5">
        <Li>
          <strong className="text-foreground">Account details.</strong> Your email address, and — if you sign in with
          Google — the basic profile information Google returns (name, email, profile picture). Your password is stored
          only as an irreversible hash and is never readable by us.
        </Li>
        <Li>
          <strong className="text-foreground">Profile details you choose.</strong> Display name, username, avatar and
          preferred court side.
        </Li>
        <Li>
          <strong className="text-foreground">Match data.</strong> Set scores, who played, the venue you type in, match
          type, and the resulting rating, XP, streak and achievement changes.
        </Li>
        <Li>
          <strong className="text-foreground">Guest names.</strong> If you log a match with someone who has no
          account, only the name you type is stored against that match.
        </Li>
        <Li>
          <strong className="text-foreground">Technical and security data.</strong> IP address, device and browser
          information, session records and error logs, needed to keep the service secure, prevent abuse and fix faults.
        </Li>
        <Li>
          <strong className="text-foreground">Support correspondence.</strong> If you email us, we keep your message
          and email address so we can respond.
        </Li>
      </ul>
      <P>
        We do not collect your phone number, your precise location, your contacts, your photos, your contacts list, or
        any payment details. The app contains no advertising and no third-party advertising or analytics trackers.
      </P>

      <H>Why we use your data (legal bases)</H>
      <ul className="list-disc pl-5">
        <Li>
          <strong className="text-foreground">To provide the service you signed up for (performance of a contract):</strong>{" "}
          creating and securing your account, signing you in, calculating ratings, XP, levels, streaks, achievements,
          rivalries and leaderboards, and showing match history to the players who took part.
        </Li>
        <Li>
          <strong className="text-foreground">To keep the service safe (legitimate interests):</strong> detecting
          abuse, fraud or manipulated results, maintaining security logs, and fixing faults.
        </Li>
        <Li>
          <strong className="text-foreground">To send emails you request (performance of a contract / consent):</strong>{" "}
          account confirmation and password reset emails. We do not send marketing emails.
        </Li>
        <Li>
          <strong className="text-foreground">To comply with the law (legal obligation):</strong> keeping records where
          required, and responding to lawful requests from authorities.
        </Li>
      </ul>

      <H>Automated calculations</H>
      <P>
        Ratings, XP, levels, streaks, badges, rivalries and leaderboard positions are produced automatically from match
        results you and other players enter. These are game features only: they do not produce legal effects about you
        and are not used for automated decision-making in any legal sense. Where a result appears manipulated, a human
        (the service administrator) reviews it before any correction.
      </P>

      <H>What other players can see</H>
      <P>
        Padel Rival is a social ranking app, so some information is visible to other signed-in players: your display
        name, username, avatar, rating and rank tier, wins and losses, streaks, level, badges, and the matches you took
        part in, including set scores and the venue you entered.
      </P>
      <P>
        <strong className="text-foreground">Your email address is never shown to other players.</strong> Neither are
        your password, your sign-in method, or any other account credential. Only the service administrator can see
        account email addresses, and only for support and moderation.
      </P>

      <H>Who we share data with</H>
      <P>
        We share your data only with the providers needed to run the service, each acting under a data processing
        agreement:
      </P>
      <ul className="list-disc pl-5">
        <Li>Our managed hosting, database and authentication provider, which stores accounts, profiles and match data.</Li>
        <Li>Google, if you choose "Continue with Google", which shares your name, email and profile picture with us when you sign in.</Li>
        <Li>Our email delivery provider, for account confirmation and password reset emails.</Li>
      </ul>
      <P>
        We never sell your personal data, and we do not share it with advertisers. We will disclose data to authorities
        only where the law requires it.
      </P>

      <H>International transfers</H>
      <P>
        Our service providers may process data outside the United Kingdom. Where that happens, we rely on the
        provider's certification under the UK Extension to the EU–US Data Privacy Framework, or on the International
        Data Transfer Agreement / UK International Data Transfer Addendum, so your data keeps UK-equivalent protection.
      </P>

      <H>Where your data is stored and how it is protected</H>
      <P>
        Data is stored on our managed hosting and database provider on secured servers. Connections are encrypted in
        transit, passwords are stored hashed and are never readable by us, and access rules (row-level security)
        restrict each player to the data they are entitled to see. Access to production data is limited to the service
        administrator.
      </P>

      <H>How long we keep it</H>
      <P>
        We keep your account and match data for as long as your account exists. If you delete your account, your
        profile and login are removed (residual backup copies are deleted on the provider's normal backup cycle).
        Matches you played in remain, because they are part of other players' records, but your name appears on them
        only as a plain guest name with no link to you or your email. Security and error logs are kept for up to 12
        months. Support correspondence is kept for up to 24 months.
      </P>

      <H>Local storage and cookies</H>
      <P>
        The app stores a small amount of data in your browser's local storage: your sign-in session, your dismissed
        tips, and whether you have dismissed the install banner. These are strictly necessary for the app to work. We
        use no advertising cookies and no third-party tracking.
      </P>

      <H>Your rights</H>
      <P>You have the following rights over your personal data:</P>
      <ul className="list-disc pl-5">
        <Li>Access — get a copy of the personal data we hold about you.</Li>
        <Li>Rectification — correct inaccurate data. You can edit your display name, username, avatar and court side at any time in Profile → Edit.</Li>
        <Li>Erasure — delete your account and profile permanently from Profile → Edit → Delete my account, or ask us to do it.</Li>
        <Li>Restriction — ask us to pause processing while a dispute is resolved.</Li>
        <Li>Portability — receive your account and match data in a structured, commonly used format.</Li>
        <Li>Objection — object to processing based on legitimate interests.</Li>
        <Li>Withdraw consent — where we rely on consent, you can withdraw it at any time without affecting earlier processing.</Li>
        <Li>Undo a match you logged by mistake within 15 minutes of recording it.</Li>
      </ul>
      <P>
        To exercise any right, email us at{" "}
        <a href="mailto:Ogbot196@gmail.com" className="font-semibold text-primary underline">
          Ogbot196@gmail.com
        </a>
        . We will respond within one month. You also have the right to complain to the Information Commissioner's
        Office (ICO), the UK data protection regulator, at ico.org.uk — but please contact us first and we will try to
        sort it out.
      </P>

      <H>Children</H>
      <P>
        Padel Rival is not directed at children under 13, and you must be at least 13 to create an account. If you
        believe a child has created an account, contact us and we will remove it and any associated data.
      </P>

      <H>Changes to this policy</H>
      <P>
        If we make a material change we will update the date at the top of this page and, where appropriate, notify you
        in the app before the change takes effect.
      </P>

      <H>Contact</H>
      <P>
        Privacy questions, data requests and deletion requests:{" "}
        <a href="mailto:Ogbot196@gmail.com" className="font-semibold text-primary underline">
          Ogbot196@gmail.com
        </a>
      </P>

      <div className="mt-10 border-t pt-6 text-sm">
        <Link to="/terms" className="font-semibold text-primary underline">
          Terms of Service
        </Link>
      </div>
    </div>
  );
}
