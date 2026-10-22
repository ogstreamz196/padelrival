import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { weekReset, type SetScore } from "@/lib/game";
import { SectionTitle } from "./PlayerProfile";
import { cn } from "@/lib/utils";

type Row = {
  team: number;
  rating_before: number | null;
  matches: {
    venue: string | null;
    match_type: string;
    sets: SetScore[];
    winner_team: number;
    match_players: { team: number; rating_before: number | null }[];
  } | null;
};

type Challenge = { id: string; icon: string; title: string; goal: number; count: (rows: Row[]) => number };

const won = (r: Row) => !!r.matches && r.matches.winner_team === r.team;
const avg = (r: Row, mine: boolean) => {
  const xs = (r.matches?.match_players ?? []).filter((p) => (p.team === r.team) === mine).map((p) => p.rating_before ?? 1000);
  return xs.reduce((s, x) => s + x, 0) / Math.max(xs.length, 1);
};

const POOL: Challenge[] = [
  { id: "play3", icon: "🎾", title: "Play 3 matches", goal: 3, count: (rs) => rs.length },
  { id: "win2", icon: "🏆", title: "Win 2 matches", goal: 2, count: (rs) => rs.filter(won).length },
  { id: "decider", icon: "🔥", title: "Win a 3-set thriller", goal: 1, count: (rs) => rs.filter((r) => won(r) && r.matches!.sets.length === 3).length },
  { id: "clubs", icon: "📍", title: "Play at 2 different clubs", goal: 2, count: (rs) => new Set(rs.map((r) => r.matches?.venue?.trim().toLowerCase()).filter(Boolean)).size },
  { id: "upset", icon: "🗡️", title: "Beat a higher-rated team", goal: 1, count: (rs) => rs.filter((r) => won(r) && avg(r, false) > avg(r, true)).length },
  {
    id: "bagel",
    icon: "🥯",
    title: "Win a set 6-0 or 6-1",
    goal: 1,
    count: (rs) =>
      rs.filter((r) => r.matches!.sets.some((s) => (r.team === 1 ? s[0] : s[1]) === 6 && (r.team === 1 ? s[1] : s[0]) <= 1)).length,
  },
  { id: "comp", icon: "⚔️", title: "Play 2 competitive matches", goal: 2, count: (rs) => rs.filter((r) => r.matches?.match_type === "competitive").length },
  { id: "play5", icon: "⚡", title: "Play 5 matches", goal: 5, count: (rs) => rs.length },
];

/** Three challenges per week, rotating so every Monday brings a fresh set. */
export function weeklySet(weekStart: Date) {
  const week = Math.floor(weekStart.getTime() / (7 * 86400000));
  const first = POOL[week % 2 === 0 ? 0 : 7]!; // always one "just play" goal
  const rest = POOL.filter((c) => c.id !== "play3" && c.id !== "play5");
  return [first, rest[week % rest.length]!, rest[(week + 3) % rest.length]!];
}

/** Weekly goals worked out from the matches you've logged since Monday. */
export function WeeklyChallenges({ meId, detailed }: { meId: string; detailed: boolean }) {
  const reset = weekReset();
  const start = new Date(reset.end.getTime() - 7 * 86400000);
  const rows = useQuery({
    queryKey: ["week-challenges", meId, start.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_players")
        .select("team,rating_before,matches(venue,match_type,sets,winner_team,match_players(team,rating_before))")
        .eq("user_id", meId)
        .gte("created_at", start.toISOString())
        .limit(100);
      if (error) throw error;
      return (data as unknown as Row[]).filter((r) => r.matches);
    },
  });
  if (!rows.data) return null;
  const set = weeklySet(start).map((c) => ({ ...c, done: Math.min(c.goal, c.count(rows.data)) }));
  const complete = set.filter((c) => c.done >= c.goal).length;
  // Simple mode shows only the next goal to chase (or the finished banner).
  const shown = detailed ? set : set.filter((c) => c.done < c.goal).slice(0, 1);

  return (
    <section className="mt-7">
      <div className="mb-3 flex items-baseline justify-between">
        <SectionTitle>Weekly challenges</SectionTitle>
        <span className="text-[11px] font-bold text-muted-foreground">
          {complete}/3 · new set in {reset.label.replace(" left", "")}
        </span>
      </div>
      {complete === 3 ? (
        <div className="animate-rise rounded-2xl border border-primary/50 bg-primary/10 p-4 text-center">
          <div className="text-3xl">🏅</div>
          <p className="mt-1 font-display font-black uppercase">Clean sweep this week</p>
          <p className="text-xs text-muted-foreground">All three done. Fresh challenges land on Monday.</p>
        </div>
      ) : (
        <div className={cn("grid gap-2", detailed && "sm:grid-cols-3 lg:grid-cols-1")}>
          {shown.map((c) => {
            const ok = c.done >= c.goal;
            return (
              <div key={c.id} className={cn("rounded-2xl border bg-card p-3", ok && "border-win/50 bg-win/10")}>
                <div className="flex items-center gap-2.5">
                  <span className="text-xl" aria-hidden>
                    {c.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold">{c.title}</div>
                    <div className="text-[11px] text-muted-foreground tabular-nums">
                      {ok ? "Done" : `${c.done} of ${c.goal}`}
                    </div>
                  </div>
                  {ok && (
                    <span className="grid size-6 place-items-center rounded-full bg-win text-primary-foreground">
                      <Check className="size-4" strokeWidth={3} />
                    </span>
                  )}
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background/60">
                  <div
                    className={cn("h-full rounded-full transition-all duration-700", ok ? "bg-win" : "bg-primary")}
                    style={{ width: `${(c.done / c.goal) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
