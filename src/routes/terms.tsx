import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Padel Rival" },
      { name: "description", content: "The rules for using Padel Rival: accounts, fair play, match results, ratings, liability, governing law and account deletion." },
      { property: "og:title", content: "Terms of Service — Padel Rival" },
      { property: "og:description", content: "The rules for using Padel Rival: accounts, fair play and match results." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://padel.ogbot.co.uk/terms" }],
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
        These terms are an agreement between you and the operator of Padel Rival ("we", "us"), contactable at{" "}
        <a href="mailto:Ogbot196@gmail.com" className="font-semibold text-primary underline">
          Ogbot196@gmail.com
        </a>
        . By creating an account or using Padel Rival you agree to these terms and to our{" "}
        <Link to="/privacy" className="font-semibold text-primary underline">
          Privacy Policy
        </Link>
        . If you do not agree, please do not use the app.
      </P>

      <H>Your account</H>
      <ul className="list-disc pl-5">
        <Li>You must be at least 13 years old to create an account.</Li>
        <Li>Give accurate details and keep your password private. You are responsible for activity on your account.</Li>
        <Li>One account per person. Do not impersonate another player, and do not create an account for someone else.</Li>
        <Li>You can delete your account at any time from Profile → Edit. Deleting your account ends this agreement.</Li>
        <Li>If you sign in with Google, you must keep that Google account in good standing; Google's own terms also apply to that sign-in.</Li>
      </ul>

      <H>Match results and fair play</H>
      <P>
        Match results are entered by players, not by an official scoring system. Padel Rival does not verify that a
        score is true. By logging a match you confirm it was actually played and the scores are correct.
      </P>
      <ul className="list-disc pl-5">
        <Li>Do not log matches that did not happen, or inflate scores to gain rating.</Li>
        <Li>Do not add another player to a match they did not play in, and do not use offensive or misleading guest names.</Li>
        <Li>Do not create multiple accounts to manipulate ratings, streaks or leaderboards.</Li>
        <Li>The player who logged a match can undo it within 15 minutes if it was recorded incorrectly.</Li>
        <Li>
          We may correct, void or remove matches, adjust ratings, or suspend accounts where results appear manipulated.
        </Li>
      </ul>

      <H>Ratings, XP and rankings</H>
      <P>
        Ratings, levels, badges, leagues and leaderboard positions are entertainment features of the app. They have no
        monetary value, cannot be bought, sold or transferred, and may be recalculated or reset if we change how the
        system works or need to correct an error. Decisions about them are final.
      </P>

      <H>Content you enter</H>
      <P>
        You are responsible for the names, venues and profile details you enter. Do not enter offensive, misleading or
        unlawful content, and do not enter another person's private information. If you post content that breaks these
        rules, we may remove it and suspend your account.
      </P>

      <H>Guests</H>
      <P>
        You may log matches against people without an account by entering a name. Only enter a name the person is happy
        to be identified by. Guests have no rating and gain no stats until they create an account and claim the
        matches.
      </P>

      <H>Acceptable use</H>
      <ul className="list-disc pl-5">
        <Li>Do not attack, disrupt, reverse-engineer, scrape or overload the service, or try to access other players' accounts or data.</Li>
        <Li>Do not use automated tools to create accounts, log matches or interact with the app.</Li>
      </ul>

      <H>Paid features</H>
      <P>
        Some features may be offered as paid subscriptions in future. Before any payment is taken, we will show the
        price, what is included, the billing period and how to cancel. Subscriptions renew automatically until
        cancelled, and you can cancel at any time. Statutory cancellation rights apply.
      </P>

      <H>Availability and changes</H>
      <P>
        The app is provided "as is". We aim to keep it running but do not guarantee uninterrupted or error-free
        service, and we may add, change, suspend or remove features at any time. If a change significantly reduces what
        you get, you may delete your account and stop using the app.
      </P>

      <H>Liability</H>
      <P>
        To the extent permitted by law, we are not liable for indirect or consequential loss arising from your use of
        the app, including disputes between players over results or rankings, lost data on your device, or missed
        games. Nothing in these terms limits liability for death or personal injury caused by negligence, for fraud, or
        for any other liability that cannot be limited by law.
      </P>

      <H>Ending access</H>
      <P>
        We may suspend or close an account that breaks these terms, with notice where reasonable. You may stop using
        the app and delete your account at any time. Sections that should survive ending (liability, governing law,
        data retention) continue to apply.
      </P>

      <H>Changes to these terms</H>
      <P>
        We may update these terms. If a change is material we will update the date at the top of this page and, where
        reasonable, notify you in the app. Continuing to use the app after a change means you accept the updated
        terms.
      </P>

      <H>Governing law and disputes</H>
      <P>
        These terms are governed by the laws of England and Wales. The courts of England and Wales have exclusive
        jurisdiction over any dispute arising from them. Nothing here affects your statutory consumer rights, including
        your right to bring proceedings in your country of residence where applicable law gives you that right.
      </P>

      <H>Contact</H>
      <P>
        Questions about these terms:{" "}
        <a href="mailto:Ogbot196@gmail.com" className="font-semibold text-primary underline">
          Ogbot196@gmail.com
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
