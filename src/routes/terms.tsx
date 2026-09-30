import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Padel Rival" },
      { name: "description", content: "The rules for using Padel Rival: accounts, fair play, match results, ratings and account deletion." },
      { property: "og:title", content: "Terms of Service — Padel Rival" },
      { property: "og:description", content: "The rules for using Padel Rival: accounts, fair play and match results." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Terms,
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

function Terms() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <Link to="/" className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
        ← Padel Rival
      </Link>
      <h1 className="mt-6 font-display text-3xl font-black">Terms of Service</h1>
      <p className="mt-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Last updated 30 September 2026</p>

      <P>
        By creating an account or using Padel Rival you agree to these terms. If you do not agree, please do not use the
        app.
      </P>

      <H>Your account</H>
      <ul className="list-disc pl-5">
        <Li>You must be at least 13 years old to create an account.</Li>
        <Li>Give accurate details and keep your password private. You are responsible for activity on your account.</Li>
        <Li>One account per person. Do not impersonate another player.</Li>
        <Li>You can delete your account at any time from Profile → Edit.</Li>
      </ul>

      <H>Match results and fair play</H>
      <P>
        Match results are entered by players, not by an official scoring system. Padel Rival does not verify that a
        score is true. By logging a match you confirm it was actually played and the scores are correct.
      </P>
      <ul className="list-disc pl-5">
        <Li>Do not log matches that did not happen, or inflate scores to gain rating.</Li>
        <Li>Do not add another player to a match they did not play in.</Li>
        <Li>The player who logged a match can undo it within 15 minutes if it was recorded incorrectly.</Li>
        <Li>
          We may correct, void or remove matches, adjust ratings, or suspend accounts where results appear manipulated.
        </Li>
      </ul>

      <H>Ratings, XP and rankings</H>
      <P>
        Ratings, levels, badges, leagues and leaderboard positions are features of the app. They have no monetary value,
        cannot be bought, sold or transferred, and may be recalculated or reset if we change how the system works or
        need to correct an error.
      </P>

      <H>Content you enter</H>
      <P>
        You are responsible for the names, venues and profile details you enter. Do not enter offensive, misleading or
        unlawful content, and do not enter another person's private information. We may remove content that breaks
        these rules.
      </P>

      <H>Guests</H>
      <P>
        You may log matches against people without an account by entering a name. Only enter a name the person is happy
        to be identified by. Guests have no rating and gain no stats until they create an account and claim the matches.
      </P>

      <H>Availability</H>
      <P>
        The app is provided "as is". We aim to keep it running but do not guarantee uninterrupted service, and we may
        add, change or remove features at any time.
      </P>

      <H>Liability</H>
      <P>
        To the extent permitted by law, we are not liable for indirect or consequential loss arising from your use of
        the app, including disputes between players over results or rankings. Nothing in these terms limits liability
        that cannot be limited by law.
      </P>

      <H>Ending access</H>
      <P>
        We may suspend or close an account that breaks these terms. You may stop using the app and delete your account
        at any time.
      </P>

      <H>Contact</H>
      <P>
        Questions about these terms:{" "}
        <a href="mailto:ogstreamz196@gmail.com" className="font-semibold text-primary underline">
          ogstreamz196@gmail.com
        </a>
      </P>

      <div className="mt-10 border-t pt-6 text-sm">
        <Link to="/privacy" className="font-semibold text-primary underline">
          Privacy Policy
        </Link>
      </div>
    </div>
  );
}
