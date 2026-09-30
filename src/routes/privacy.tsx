import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Padel Rival" },
      { name: "description", content: "How Padel Rival collects, uses and protects your data: account details, match results and rankings." },
      { property: "og:title", content: "Privacy Policy — Padel Rival" },
      { property: "og:description", content: "How Padel Rival collects, uses and protects your data." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
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
        Padel Rival ("we", "the app") is a padel match tracker and ranking service. This policy explains what we collect,
        why we collect it, and the control you have over it. We do not sell your data and we do not run advertising.
      </P>

      <H>Information we collect</H>
      <ul className="list-disc pl-5">
        <Li>
          <strong className="text-foreground">Account details.</strong> Your email address, and — if you sign in with
          Google — the basic profile information Google returns (name, email, profile picture).
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
          <strong className="text-foreground">Guest names.</strong> If you log a match with someone who has no account,
          only the name you type is stored against that match.
        </Li>
        <Li>
          <strong className="text-foreground">Technical data.</strong> Basic security and error logs needed to keep the
          service running and to prevent abuse.
        </Li>
      </ul>
      <P>
        We do not collect your phone number, your location, your contacts, your photos, or any payment details. The app
        contains no advertising and no third-party advertising trackers.
      </P>

      <H>How we use it</H>
      <ul className="list-disc pl-5">
        <Li>To create and secure your account and sign you in.</Li>
        <Li>To calculate ratings, XP, levels, streaks, achievements, rivalries and leaderboards.</Li>
        <Li>To show match history to the players who took part in those matches.</Li>
        <Li>To send account emails you request, such as a password reset.</Li>
        <Li>To detect abuse and fix faults.</Li>
      </ul>

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

      <H>Where your data is stored</H>
      <P>
        Data is stored on our managed hosting and database provider on secured servers. Connections are encrypted in
        transit, passwords are stored hashed and are never readable by us, and access rules restrict each player to the
        data they are entitled to see.
      </P>

      <H>How long we keep it</H>
      <P>
        We keep your account and match data for as long as your account exists. If you delete your account, your
        profile and login are removed. Matches you played in remain, because they are part of other players' records,
        but your name appears on them only as a plain guest name with no link to you or your email.
      </P>

      <H>Your rights and controls</H>
      <ul className="list-disc pl-5">
        <Li>Edit your display name, username, avatar and court side at any time in Profile → Edit.</Li>
        <Li>Undo a match you logged by mistake within 15 minutes of recording it.</Li>
        <Li>Delete your account and profile permanently from Profile → Edit → Delete my account.</Li>
        <Li>Request a copy of your data, or ask us to correct or erase it, by contacting us.</Li>
      </ul>

      <H>Children</H>
      <P>
        Padel Rival is not directed at children under 13. If you believe a child has created an account, contact us and
        we will remove it.
      </P>

      <H>Changes to this policy</H>
      <P>
        If we make a material change we will update the date at the top of this page and, where appropriate, notify you
        in the app.
      </P>

      <H>Contact</H>
      <P>
        Privacy questions, data requests and deletion requests:{" "}
        <a href="mailto:ogstreamz196@gmail.com" className="font-semibold text-primary underline">
          ogstreamz196@gmail.com
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
