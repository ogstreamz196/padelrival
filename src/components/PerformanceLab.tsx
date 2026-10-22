import { useMemo, useState } from "react";
import type { SetScore } from "@/lib/game";
import { cn } from "@/lib/utils";

export type LabRow = {
  rating_before: number | null;
  rating_delta: number;
  team: number;
  matches: {
    created_at: string;
    venue: string | null;
    match_type: string;
    sets: SetScore[];
    winner_team: number;
    match_players: { team: number; rating_before: number | null }[];
  } | null;
};

type Rec = { w: number; l: number };
const rec = (): Rec => ({ w: 0, l: 0 });
const pct = (r: Rec) => (r.w + r.l ? Math.round((r.w / (r.w + r.l)) * 100) : null);

/** Deeper stats worked out from a player's recent matches (newest first). */
export function labStats(rows: LabRow[]) {
  const sets = rec();
  const games = rec();
  const deciders = rec();
  const tiebreaks = rec();
  const upsets = rec();
  const types = new Map<string, Rec>();
  const venues = new Map<string, Rec>();
  let comebacks = 0;
  let bagels = 0;

  for (const h of rows) {
    const m = h.matches;
    if (!m) continue;
    const won = m.winner_team === h.team;
    const mine = (s: SetScore) => (h.team === 1 ? s[0] : s[1]);
    const theirs = (s: SetScore) => (h.team === 1 ? s[1] : s[0]);
    m.sets.forEach((s, i) => {
      const a = mine(s);
      const b = theirs(s);
      const isStb = i === 2 && Math.max(a, b) >= 10;
      if (a > b) sets.w++;
      else sets.l++;
      if (!isStb) {
        games.w += a;
        games.l += b;
        if (Math.max(a, b) === 7 && Math.min(a, b) === 6) tiebreaks[a > b ? "w" : "l"]++;
        if (a === 6 && b === 0) bagels++;
      }
    });
    if (m.sets.length === 3) deciders[won ? "w" : "l"]++;
    const first = m.sets[0];
    if (won && first && mine(first) < theirs(first)) comebacks++;

    const avg = (team: boolean) => {
      const xs = m.match_players.filter((p) => (p.team === h.team) === team).map((p) => p.rating_before ?? 1000);
      return xs.reduce((s, x) => s + x, 0) / Math.max(xs.length, 1);
    };
    if (avg(false) - avg(true) >= 25) upsets[won ? "w" : "l"]++;

    const t = types.get(m.match_type) ?? rec();
    t[won ? "w" : "l"]++;
    types.set(m.match_type, t);
    const v = (m.venue ?? "").trim();
    if (v) {
      const r = venues.get(v) ?? rec();
      r[won ? "w" : "l"]++;
      venues.set(v, r);
    }
  }

  const bestVenue =
    [...venues.entries()]
      .filter(([, r]) => r.w + r.l >= 2)
      .sort((a, b) => (pct(b[1]) ?? 0) - (pct(a[1]) ?? 0) || b[1].w + b[1].l - (a[1].w + a[1].l))[0] ?? null;

  return { sets, games, deciders, tiebreaks, upsets, comebacks, bagels, types, bestVenue };
}

/** Rating after each match, oldest first, starting from the rating before the first one. */
export function ratingSeries(rows: LabRow[]) {
  const chrono = rows.filter((h) => h.matches && h.rating_before != null).reverse();
  if (!chrono.length) return [];
  const pts = [{ rating: chrono[0]!.rating_before!, at: null as string | null, delta: 0 }];
  for (const h of chrono) pts.push({ rating: h.rating_before! + h.rating_delta, at: h.matches!.created_at, delta: h.rating_delta });
  return pts;
}

export function PerformanceLab({ rows }: { rows: LabRow[] }) {
  const s = useMemo(() => labStats(rows), [rows]);
  const series = useMemo(() => ratingSeries(rows), [rows]);
  const n = rows.filter((r) => r.matches).length;
  if (!n) return null;
  const fmt = (r: Rec) => `${r.w}-${r.l}`;
  const tiles: { label: string; value: string; sub?: string }[] = [
    { label: "Sets won", value: pct(s.sets) == null ? "–" : `${pct(s.sets)}%`, sub: fmt(s.sets) },
    { label: "Games won", value: pct(s.games) == null ? "–" : `${pct(s.games)}%`, sub: fmt(s.games) },
    { label: "Deciders", value: fmt(s.deciders), sub: "3-set matches" },
    { label: "Tie-breaks", value: fmt(s.tiebreaks), sub: "7-6 sets" },
    { label: "Vs stronger teams", value: fmt(s.upsets), sub: "25+ rating above you" },
    { label: "Comebacks", value: String(s.comebacks), sub: "won after losing set 1" },
  ];
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Performance lab</h2>
        <span className="text-[11px] font-bold text-muted-foreground">Last {n} matches</span>
      </div>
      {series.length >= 3 && <RatingTrend points={series} />}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-2xl border bg-card p-3">
            <div className="font-display text-xl font-black tabular-nums">{t.value}</div>
            <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{t.label}</div>
            {t.sub && <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{t.sub}</div>}
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-bold">
        {[...s.types.entries()].map(([t, r]) => (
          <span key={t} className="rounded-full border px-2.5 py-1 capitalize text-muted-foreground">
            {t} <span className="text-foreground tabular-nums">{fmt(r)}</span>
          </span>
        ))}
        {s.bestVenue && (
          <span className="max-w-full truncate rounded-full border px-2.5 py-1 text-muted-foreground">
            Best club <span className="text-foreground">{s.bestVenue[0]}</span>{" "}
            <span className="tabular-nums text-foreground">{pct(s.bestVenue[1])}%</span>
          </span>
        )}
        {s.bagels > 0 && (
          <span className="rounded-full border px-2.5 py-1 text-muted-foreground">
            6-0 sets <span className="text-foreground tabular-nums">{s.bagels}</span>
          </span>
        )}
      </div>
    </section>
  );
}

/** Single-series rating line with a hover/touch crosshair. */
function RatingTrend({ points }: { points: { rating: number; at: string | null; delta: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 320;
  const H = 110;
  const pad = { t: 10, b: 18, l: 4, r: 4 };
  const vals = points.map((p) => p.rating);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const span = Math.max(hi - lo, 20);
  const mid = (hi + lo) / 2;
  const y = (v: number) => pad.t + (1 - (v - (mid - span / 2)) / span) * (H - pad.t - pad.b);
  const x = (i: number) => pad.l + (i / (points.length - 1)) * (W - pad.l - pad.r);
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.rating).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.length - 1).toFixed(1)},${H - pad.b} L${x(0).toFixed(1)},${H - pad.b} Z`;
  const first = points[0]!.rating;
  const last = points[points.length - 1]!.rating;
  const net = last - first;
  const peak = vals.indexOf(hi);
  const h = hover != null ? points[hover]! : null;

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const f = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    setHover(Math.round(f * (points.length - 1)));
  }

  return (
    <div className="rounded-2xl border bg-card p-3">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Rating trend</span>
        <span className="text-xs font-bold tabular-nums">
          <span className={cn(net >= 0 ? "text-win" : "text-destructive")}>
            {net >= 0 ? "+" : ""}
            {net}
          </span>{" "}
          <span className="text-muted-foreground">· peak {hi}</span>
        </span>
      </div>
      <div
        className="relative mt-2 touch-none select-none"
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-28 w-full overflow-visible" preserveAspectRatio="none" role="img" aria-label={`Rating went from ${first} to ${last} over ${points.length - 1} matches, peaking at ${hi}`}>
          <defs>
            <linearGradient id="trend-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="var(--primary)" stopOpacity="0.25" />
              <stop offset="1" stopColor="var(--primary)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((f) => (
            <line key={f} x1={0} x2={W} y1={pad.t + f * (H - pad.t - pad.b)} y2={pad.t + f * (H - pad.t - pad.b)} stroke="var(--border)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          ))}
          <path d={area} fill="url(#trend-fill)" />
          <path d={line} fill="none" stroke="var(--primary)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          {hover != null && (
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} stroke="var(--muted-foreground)" strokeWidth={1} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
          )}
        </svg>
        {/* Dots as HTML so they stay round when the SVG stretches. */}
        {[peak, points.length - 1, ...(hover != null ? [hover] : [])].map((i, k) => (
          <span
            key={`${i}-${k}`}
            className={cn("pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card", i === hover ? "bg-foreground" : "bg-primary")}
            style={{ left: `${(x(i) / W) * 100}%`, top: `${(y(points[i]!.rating) / H) * 100}%` }}
          />
        ))}
        {h && (
          <div
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border bg-popover px-2 py-1 text-[11px] shadow-lg"
            style={{ left: `${Math.min(85, Math.max(15, (x(hover!) / W) * 100))}%` }}
          >
            <span className="font-black tabular-nums">{h.rating}</span>
            {h.at ? (
              <>
                {" "}
                <span className={cn("font-bold tabular-nums", h.delta >= 0 ? "text-win" : "text-destructive")}>
                  {h.delta >= 0 ? "+" : ""}
                  {h.delta}
                </span>{" "}
                <span className="text-muted-foreground">{new Date(h.at).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</span>
              </>
            ) : (
              <span className="text-muted-foreground"> start</span>
            )}
          </div>
        )}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground tabular-nums">
        <span>{first}</span>
        <span>now {last}</span>
      </div>
    </div>
  );
}
