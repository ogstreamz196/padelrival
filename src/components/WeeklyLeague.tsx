import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Timer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { rankTier, weekReset } from "@/lib/game";
import { cn } from "@/lib/utils";

export function WeeklyLeague({ meId, rating }: { meId: string; rating: number }) {
  const week = weekReset();
  const q = useQuery({
    queryKey: ["weekly-league"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("weekly_leaderboard");
      if (error) throw error;
      return data;
    },
  });

  const rows = [...(q.data ?? [])].sort((a, b) => Number(b.rating_gain) - Number(a.rating_gain));
  const idx = rows.findIndex((r) => r.user_id === meId);
  const me = idx >= 0 ? rows[idx] : null;
  const promoting = idx >= 0 && idx < 3;

  return (
    <Link to="/leaderboard" className="block rounded-3xl border bg-card p-4 active:scale-[0.99]">
      <div className="flex items-center justify-between">
        <div className="text-xs font-black uppercase tracking-widest text-primary">{rankTier(rating)} division</div>
        <div className="flex items-center gap-1 text-xs font-bold text-muted-foreground">
          <Timer className="size-3" /> {week.label}
        </div>
      </div>
      <div className="mt-3 flex items-end justify-between">
        <div>
          <div className="font-display text-4xl font-black tabular-nums">{idx >= 0 ? `#${idx + 1}` : "—"}</div>
          <div className="text-xs text-muted-foreground">{me ? `${me.matches} matches this week` : "No matches this week"}</div>
        </div>
        <div className="text-right">
          <div className={cn("font-display text-2xl font-black tabular-nums", Number(me?.rating_gain ?? 0) >= 0 ? "text-win" : "text-destructive")}>
            {me ? `${Number(me.rating_gain) >= 0 ? "+" : ""}${me.rating_gain}` : "0"}
          </div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Rating this week</div>
        </div>
      </div>
      <div className="mt-3 rounded-xl bg-background/60 px-3 py-2 text-xs font-bold">
        {promoting ? "🥇 Podium spot — hold it until Monday" : me ? "Win one more to climb the weekly board" : "Play a match to enter this week's board"}
      </div>
    </Link>
  );
}
