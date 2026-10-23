import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CountUp, CourtFx, Reveal, Spotlight, Tilt } from "@/components/fx";
import { useEffect } from "react";
import { ChevronDown, MapPin, Share2, Swords, Trophy, UsersRound, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { FAQ, jsonLd, OG_IMAGE, seo, SITE_NAME, SITE_URL } from "@/lib/seo";

const TITLE = "Padel Rival — Free padel score tracker, ratings & rivalries";
const DESCRIPTION =
  "Log padel matches in 20 seconds, get an Elo rating, track head-to-head rivalries and find players for your next game. Free padel app for the UK.";

export const Route = createFileRoute("/")({
  staticData: { sitemap: true },
  head: () => ({
    ...seo({ title: TITLE, description: DESCRIPTION, path: "/" }),
    scripts: [
      jsonLd({
        "@context": "https://schema.org",
        "@type": "Organization",
        name: SITE_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}/icon-512.png`,
        email: "Ogbot196@gmail.com",
        areaServed: "GB",
      }),
      jsonLd({
        "@context": "https://schema.org",
        "@type": "WebSite",
        alternateName: ["PadelRival", "Padel Rival app"],
        name: SITE_NAME,
        url: SITE_URL,
        description: DESCRIPTION,
        inLanguage: "en-GB",
      }),
      jsonLd({
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: SITE_NAME,
        url: SITE_URL,
        applicationCategory: "SportsApplication",
        operatingSystem: "Any (web browser)",
        browserRequirements: "Requires JavaScript",
        description: DESCRIPTION,
        image: OG_IMAGE,
        offers: { "@type": "Offer", price: "0", priceCurrency: "GBP" },
        featureList: [
          "Padel match score tracker",
          "Elo-style padel rating",
          "Head-to-head rivalries",
          "Open matches to find padel players",
          "Padel club directory with court booking links",
        ],
      }),
      jsonLd({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: FAQ.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      }),
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: Trophy,
    title: "A real padel rating",
    body: "Everyone starts at 1000. Beat a stronger pair and you climb faster. Climb from Bronze to Diamond on the leaderboard.",
  },
  {
    icon: Swords,
    title: "Rivalries that remember",
    body: "Play the same people twice and a head-to-head record starts on its own, with revenge alerts and one-tap rematches.",
  },
  {
    icon: UsersRound,
    title: "Find players for your game",
    body: "Short of a fourth? Open your spare spots to everyone. The first players to accept are added automatically.",
  },
  {
    icon: MapPin,
    title: "Padel clubs near you",
    body: "Browse UK padel clubs, jump to court booking and see which friends are playing today.",
  },
  {
    icon: Zap,
    title: "Logged in 20 seconds",
    body: "Pick your team, tap the score, done. Friends not on the app yet can be added as guests.",
  },
  {
    icon: Share2,
    title: "Made for the group chat",
    body: "Share results, player cards and side-by-side comparisons straight to WhatsApp and Instagram.",
  },
];

function Landing() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/home" });
    });
  }, [navigate]);

  return (
    <div className="mx-auto max-w-md px-6 md:max-w-3xl md:px-10 lg:max-w-6xl">
      <section className="relative isolate flex min-h-dvh flex-col justify-between py-10 lg:grid lg:grid-cols-[1.1fr_0.9fr] lg:grid-rows-[auto_1fr_auto] lg:gap-x-16 short:grid short:min-h-0 short:grid-cols-[1.3fr_1fr] short:items-end short:gap-x-8 short:gap-y-4 short:py-6">
        <Spotlight />
        <div className="pointer-events-none absolute inset-y-0 left-1/2 -z-10 w-screen -translate-x-1/2 overflow-hidden short:hidden">
          <CourtFx className="bottom-0 left-1/2 h-[40vh] w-[115vw] -translate-x-1/2 opacity-70 lg:h-[46vh] lg:w-[110vw]" />
        </div>
        <header className="flex items-center gap-2 lg:col-span-2 short:col-span-2">
          <img
            src="/icon-192.png"
            alt="Padel Rival logo"
            width={36}
            height={36}
            className="size-9 rounded-xl"
          />
          <span className="font-display text-lg font-black">PADEL RIVAL</span>
        </header>

        <div className="animate-rise lg:self-end">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.3em] text-primary">
            Season 1 is live
          </p>
          <h1 className="text-[2.5rem] font-black leading-[0.95] md:text-6xl short:text-[2.1rem]">
            Every match
            <br />
            counts.
            <br />
            <span className="fx-text-shimmer text-primary">Every rival</span>
            <br />
            remembered.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground short:mt-3 short:text-sm">
            The free padel score tracker. Log your 2v2 games in seconds, climb the Elo ladder, keep
            the streak on fire and never let a rival forget who won last.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-2 text-center short:mt-4">
            {[
              ["1000", "Starting Elo"],
              ["+100", "XP per win"],
              ["H2H", "Rivalries"],
            ].map(([a, b]) => (
              <div key={b} className="rounded-2xl border bg-card p-3">
                <div className="font-display text-xl font-black text-primary">
                  <CountUp value={a!} />
                </div>
                <div className="text-[11px] font-bold uppercase text-muted-foreground">{b}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:max-w-md lg:self-start lg:pt-8 short:self-end short:pt-0">
          <Link
            to="/home"
            className="fx-shine block rounded-2xl bg-primary py-4 text-center font-display text-lg font-black uppercase text-primary-foreground glow active:scale-[0.98]"
          >
            Enter the court
          </Link>
          <Link
            to="/auth"
            className="mt-3 block py-2 text-center text-sm font-bold text-muted-foreground"
          >
            Already a player? <span className="text-primary">Sign in</span>
          </Link>
          <a
            href="#how-it-works"
            className="mx-auto mt-2 flex w-fit items-center gap-1 text-xs text-muted-foreground"
          >
            How it works <ChevronDown className="size-3.5" />
          </a>
        </div>
        <div className="hidden lg:col-start-2 lg:row-span-2 lg:row-start-2 lg:flex lg:items-center lg:justify-center">
          <div className="fx-float">
            <Tilt className="rounded-[2.5rem]">
              <img
                src="/screens/app-home.webp"
                alt="Padel Rival home screen showing a player's rating, weekly division and rivalries"
                width={540}
                height={997}
                loading="lazy"
                className="max-h-[78vh] w-auto rounded-[2.5rem] border-[10px] border-card shadow-2xl"
              />
            </Tilt>
          </div>
        </div>
      </section>

      <Reveal>
        <section id="how-it-works" className="py-10">
          <h2 className="text-2xl font-black">How Padel Rival works</h2>
          <ol className="mt-5 space-y-3 md:grid md:grid-cols-3 md:gap-3 md:space-y-0">
            {[
              ["Play your match", "Any 2v2 padel game, at any club, with anyone."],
              ["Log the score", "Pick your partner and opponents, tap the sets. About 20 seconds."],
              [
                "Watch the table move",
                "Ratings, XP, streaks and rivalries update for all four players.",
              ],
            ].map(([t, d], i) => (
              <li key={t} className="fx-lift flex gap-3 rounded-2xl border bg-card p-4">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary font-display text-sm font-black text-primary-foreground">
                  {i + 1}
                </span>
                <span>
                  <span className="block font-bold">{t}</span>
                  <span className="block text-sm text-muted-foreground">{d}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      </Reveal>

      <Reveal>
        <section className="py-10">
          <h2 className="text-2xl font-black">Everything your padel group needs</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <article key={title} className="fx-lift flex gap-3 rounded-2xl border bg-card p-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
                  <Icon className="size-5" />
                </span>
                <span>
                  <h3 className="font-bold">{title}</h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">{body}</p>
                </span>
              </article>
            ))}
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="py-10">
          <h2 className="text-2xl font-black">Find padel courts near you</h2>
          <p className="mt-2 text-muted-foreground">
            Browse padel clubs across the UK, see indoor and outdoor courts, and go straight to
            booking.
          </p>
          <Link
            to="/padel-courts"
            className="mt-4 flex items-center justify-center gap-2 rounded-2xl border border-court/60 py-3.5 font-bold text-court md:inline-flex md:px-8"
          >
            <MapPin className="size-4" /> Browse UK padel clubs
          </Link>
        </section>
      </Reveal>

      <Reveal>
        <section className="py-10">
          <h2 className="text-2xl font-black">Questions</h2>
          <div className="mt-5 max-w-3xl space-y-2">
            {FAQ.map((f) => (
              <details key={f.q} className="group rounded-2xl border bg-card p-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-bold">
                  <h3>{f.q}</h3>
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="py-10 text-center">
          <h2 className="text-2xl font-black">Ready for your next match?</h2>
          <p className="mt-2 text-muted-foreground">Free to use. No download needed.</p>
          <Link
            to="/home"
            className="fx-shine mx-auto mt-5 block max-w-sm rounded-2xl bg-primary py-4 font-display text-lg font-black uppercase text-primary-foreground glow"
          >
            Start playing
          </Link>
        </section>
      </Reveal>

      <footer className="flex flex-wrap justify-center gap-4 pb-12 pt-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Link to="/padel-courts">Padel clubs</Link>
        <Link to="/find-padel-players">Find padel players</Link>
        <Link to="/padel-rating">Padel rating calculator</Link>
        <Link to="/privacy">Privacy</Link>
        <Link to="/terms">Terms</Link>
      </footer>
    </div>
  );
}
