import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import { PublicPage } from "@/components/PublicPage";
import { fetchClubs, groupByCity } from "@/lib/clubs";
import { jsonLd, seo, SITE_URL } from "@/lib/seo";

const TITLE = "Find padel players near you — fill your fourth | Padel Rival";
const DESCRIPTION =
  "Short of a fourth for padel? Post an open match with your club and time, and any player on Padel Rival can claim the spot. Free, UK-wide.";

const STEPS = [
  ["Post your game", "Pick the club, the time, how many spots are free and the level you want."],
  [
    "Anyone can claim a spot",
    "Players on the app see your open match and claim a spot in one tap. No invite needed.",
  ],
  [
    "Auto-matched",
    "The first players to accept are added to your game automatically, and you get a notification.",
  ],
  [
    "Share it anywhere",
    "Send the invite to your WhatsApp group too, so friends can join from the same link.",
  ],
];

const PLAYER_FAQ = [
  {
    q: "How do I find padel players near me?",
    a: "Post an open match on Padel Rival with your club, time and the number of spare spots. Players who use the app can claim a spot, and the first to accept are added to your game. You can also see which players are checked in at a club today.",
  },
  {
    q: "Can I choose the level of the players who join?",
    a: "Yes. You can set a level for the game, from open to all up to Diamond, and players can open the host's player card to see their rating and padel level before joining.",
  },
  {
    q: "Is it free to post an open match?",
    a: "Yes. Posting and joining open matches is free, with no ads.",
  },
  {
    q: "What if I can't make it any more?",
    a: "You can leave a game you joined, or cancel a game you're hosting. Everyone in it gets a notification.",
  },
];

export const Route = createFileRoute("/find-padel-players")({
  staticData: { sitemap: true },
  loader: async () => groupByCity(await fetchClubs().catch(() => [])),
  head: () => ({
    ...seo({ title: TITLE, description: DESCRIPTION, path: "/find-padel-players" }),
    scripts: [
      jsonLd({
        "@context": "https://schema.org",
        "@type": "HowTo",
        name: "How to find padel players for your match",
        url: `${SITE_URL}/find-padel-players`,
        step: STEPS.map(([name, text], i) => ({
          "@type": "HowToStep",
          position: i + 1,
          name,
          text,
        })),
      }),
      jsonLd({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: PLAYER_FAQ.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      }),
    ],
  }),
  component: FindPlayers,
});

function FindPlayers() {
  const cities = Route.useLoaderData();
  return (
    <PublicPage>
      <h1 className="text-3xl font-black leading-tight">Find padel players near you</h1>
      <p className="mt-3 text-muted-foreground">
        Court booked, three players and no fourth? Post an open match on Padel Rival and any player
        can claim the spare spot. It's free and works at any club in the UK.
      </p>

      <ol className="mt-6 grid gap-3 md:grid-cols-2">
        {STEPS.map(([t, d], i) => (
          <li key={t} className="flex gap-3 rounded-2xl border bg-card p-4">
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

      <Link
        to="/beacons"
        className="mt-6 block rounded-2xl bg-primary py-4 text-center font-display font-black uppercase text-primary-foreground"
      >
        See open matches
      </Link>

      <section className="mt-10">
        <h2 className="text-xl font-black">Play at your level</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Every player has a rating and an approximate padel level from 1 to 7, so you can find even
          games. Padel Rival also suggests players rated close to you, and shows each team's chance
          of winning before you play. Try the{" "}
          <Link to="/padel-rating" className="font-bold text-primary">
            padel rating calculator
          </Link>
          .
        </p>
      </section>

      {cities.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-black">Find players by city</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {cities.map((g) => (
              <li key={g.slug}>
                <Link
                  to="/padel-courts/$city"
                  params={{ city: g.slug }}
                  className="flex items-center gap-2 rounded-2xl border bg-card p-3 text-sm font-bold"
                >
                  <MapPin className="size-4 text-court" /> Padel in {g.city}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-xl font-black">Questions</h2>
        <div className="mt-3 space-y-2">
          {PLAYER_FAQ.map((f) => (
            <details key={f.q} className="rounded-2xl border bg-card p-4">
              <summary className="cursor-pointer list-none font-bold">
                <h3 className="inline">{f.q}</h3>
              </summary>
              <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </PublicPage>
  );
}
