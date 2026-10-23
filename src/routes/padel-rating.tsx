import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PublicPage } from "@/components/PublicPage";
import { padelLevel, ratingSwing, TIERS, winChance } from "@/lib/game";
import { jsonLd, seo, SITE_URL } from "@/lib/seo";

const TITLE = "Padel rating calculator & padel levels explained | Padel Rival";
const DESCRIPTION =
  "Free padel rating calculator. See your chance of winning, how many points a win or loss is worth, and what your rating means on the 1–7 padel level scale.";

const RATING_FAQ = [
  {
    q: "How is a padel rating calculated?",
    a: "Padel Rival uses an Elo-style rating. Each team's rating is the average of its two players. Before the match the app works out each team's chance of winning from the gap between those averages, then moves every player's rating by 32 × (result − expected result). Beating a stronger pair earns more points; losing to a weaker pair costs more.",
  },
  {
    q: "What rating does everyone start on?",
    a: "Everyone starts at 1000. Your first five matches are provisional while your rating settles, then you climb through Bronze, Silver, Gold and Platinum to Diamond.",
  },
  {
    q: "What padel level am I?",
    a: "Club padel levels usually run from 1 (beginner) to 7 (professional). Padel Rival shows an approximate level from your rating: about 2.8 for a new player at 1000, 3.9 at 1186, 5 around 1370 and 7 at 1700 and above. It's a guide to help you find even games, not an official grading.",
  },
  {
    q: "Do guests affect the rating?",
    a: "Players without an account count as 1000 when working out the odds. Only players with an account have their rating changed.",
  },
];

const LEVELS = [
  ["1.0 – 2.0", "Beginner", "Learning the basic strokes and the walls."],
  ["2.0 – 3.0", "Improver", "Can rally, starting to use the glass."],
  ["3.0 – 4.0", "Intermediate", "Consistent from the back, volleys with control."],
  ["4.0 – 5.0", "Advanced", "Bandeja, vibora and good positioning."],
  ["5.0 – 6.0", "Expert", "Strong club and league player, plays for points."],
  ["6.0 – 7.0", "Elite", "Top amateur and professional level."],
];

export const Route = createFileRoute("/padel-rating")({
  staticData: { sitemap: true },
  head: () => ({
    ...seo({ title: TITLE, description: DESCRIPTION, path: "/padel-rating" }),
    scripts: [
      jsonLd({
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "Padel rating calculator",
        url: `${SITE_URL}/padel-rating`,
        description: DESCRIPTION,
        inLanguage: "en-GB",
      }),
      jsonLd({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: RATING_FAQ.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      }),
    ],
  }),
  component: RatingPage,
});

function RatingInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <input
        type="number"
        inputMode="numeric"
        min={500}
        max={2500}
        step={10}
        value={value}
        onChange={(e) => onChange(Math.max(0, Math.min(3000, Number(e.target.value) || 0)))}
        className="mt-1 w-full rounded-xl border bg-background px-3 py-2.5 font-display text-lg font-black tabular-nums outline-none focus:border-primary"
      />
    </label>
  );
}

function RatingPage() {
  const [team, setTeam] = useState<[number, number]>([1100, 1050]);
  const [opp, setOpp] = useState<[number, number]>([1180, 1120]);
  const chance = winChance(team, opp);
  const pct = Math.round(chance * 100);
  const swing = ratingSwing(chance);
  const avg = (xs: number[]) => Math.round((xs[0]! + xs[1]!) / 2);

  return (
    <PublicPage>
      <h1 className="text-3xl font-black leading-tight">Padel rating calculator</h1>
      <p className="mt-3 text-muted-foreground">
        Put in the four players' ratings to see each team's chance of winning and how many rating
        points a win or a loss is worth. It uses the same maths as the Padel Rival app.
      </p>

      <section className="mt-6 rounded-3xl border bg-card p-4" aria-label="Calculator">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2 rounded-2xl border-2 border-primary/50 bg-primary/5 p-3">
            <p className="text-center text-[11px] font-black uppercase tracking-widest text-primary">
              Your team
            </p>
            <RatingInput label="You" value={team[0]} onChange={(v) => setTeam([v, team[1]])} />
            <RatingInput label="Partner" value={team[1]} onChange={(v) => setTeam([team[0], v])} />
          </div>
          <div className="space-y-2 rounded-2xl border-2 border-court/60 bg-court/10 p-3">
            <p className="text-center text-[11px] font-black uppercase tracking-widest text-court">
              Opponents
            </p>
            <RatingInput label="Opponent 1" value={opp[0]} onChange={(v) => setOpp([v, opp[1]])} />
            <RatingInput label="Opponent 2" value={opp[1]} onChange={(v) => setOpp([opp[0], v])} />
          </div>
        </div>

        <div
          className="mt-4 flex h-3 gap-0.5 overflow-hidden rounded-full"
          role="img"
          aria-label={`Your team ${pct}% to win`}
        >
          <div className="rounded-l-full bg-primary" style={{ width: `${pct}%` }} />
          <div className="flex-1 rounded-r-full bg-court" />
        </div>
        <div className="mt-1.5 flex justify-between text-sm font-bold tabular-nums">
          <span>Your team {pct}%</span>
          <span className="text-muted-foreground">{100 - pct}% opponents</span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-2xl bg-background/50 p-3">
            <p className="font-display text-3xl font-black tabular-nums text-win">+{swing.win}</p>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              If you win
            </p>
          </div>
          <div className="rounded-2xl bg-background/50 p-3">
            <p className="font-display text-3xl font-black tabular-nums text-destructive">
              {swing.loss}
            </p>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              If you lose
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Team averages {avg(team)} vs {avg(opp)}. Your padel levels: about{" "}
          {padelLevel(team[0]).toFixed(1)} and {padelLevel(team[1]).toFixed(1)}. Both partners move
          by the same amount.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-black">How the padel rating works</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Every player starts at 1000. Each team's rating is the average of its two players, and the
          gap between the two teams sets the expected result. After the match everyone's rating
          moves by 32 × (actual result − expected result), so an upset moves ratings a lot and an
          expected win only a little. Your first five matches are provisional while your rating
          settles.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-black">Rating tiers</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {TIERS.map((t, i) => (
            <div key={t.name} className="rounded-2xl border bg-card p-3 text-center">
              <p className="font-display font-black">{t.name}</p>
              <p className="text-xs text-muted-foreground tabular-nums">
                {i === 0
                  ? `Under ${TIERS[1]!.min}`
                  : TIERS[i + 1]
                    ? `${t.min}–${TIERS[i + 1]!.min - 1}`
                    : `${t.min}+`}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-black">Padel levels explained (1 to 7)</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Most clubs and booking apps grade players from 1 to 7. Padel Rival shows an approximate
          level worked out from your rating, so you can find even games.
        </p>
        <div className="mt-3 overflow-hidden rounded-2xl border">
          <table className="w-full text-left text-sm">
            <thead className="bg-card text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Level</th>
                <th className="px-3 py-2">Standard</th>
                <th className="hidden px-3 py-2 sm:table-cell">What it looks like</th>
              </tr>
            </thead>
            <tbody>
              {LEVELS.map(([lvl, name, desc]) => (
                <tr key={lvl} className="border-t">
                  <td className="px-3 py-2 font-bold tabular-nums">{lvl}</td>
                  <td className="px-3 py-2">{name}</td>
                  <td className="hidden px-3 py-2 text-muted-foreground sm:table-cell">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-black">Questions</h2>
        <div className="mt-3 space-y-2">
          {RATING_FAQ.map((f) => (
            <details key={f.q} className="rounded-2xl border bg-card p-4">
              <summary className="cursor-pointer list-none font-bold">
                <h3 className="inline">{f.q}</h3>
              </summary>
              <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mt-10 rounded-3xl border border-primary/40 bg-primary/5 p-5 text-center">
        <h2 className="text-xl font-black">Get your real padel rating</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Log your matches free and your rating updates after every game.
        </p>
        <Link
          to="/home"
          className="mt-4 inline-block rounded-2xl bg-primary px-6 py-3 font-display text-sm font-black uppercase text-primary-foreground"
        >
          Start free
        </Link>
      </section>
    </PublicPage>
  );
}
