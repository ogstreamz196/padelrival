import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { levelInfo } from "@/lib/game";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  head: () => ({ meta: [{ title: "Leaderboard — Padel Rival" }, { name: "description", content: "Global and weekly padel rankings." }] }),
  component: Leaderboard,
});

type Row = { id: string; username: string; display_name: string; avatar: string; avatar_color: string; rating: number; value: number; sub: string };

function Leaderboard() {
  const { user } = Route.useRouteContext();
  const [scope, setScope] = useState<"global" | "weekly">("global");
  const [metric, setMetric] = useState<"rating" | "xp">("rating");

  const q = useQuery({
    queryKey: ["leaderboard", scope, metric],
    queryFn: async (): Promise<Row[]> => {
      if (scope === "global") {
        const { data, error } = await supabase.from("profiles").select("*").order(metric, { ascending: false }).limit(100);
        if (error) throw error;
        return data.map((p) => ({
          ...p,
          value: metric === "rating" ? p.rating : p.xp,
          sub: metric === "rating" ? `${p.wins}-${p.losses}` : `Lv ${levelInfo(p.xp).level}`,
        }));
      }
      const { data, error } = await supabase.rpc("weekly_leaderboard");
      if (error) throw error;
      return data
        .map((p) => ({
          id: p.user_id,
          username: p.username,
          display_name: p.display_name,
          avatar: p.avatar,
          avatar_color: p.avatar_color,
          rating: p.rating,
          value: metric === "rating" ? Number(p.rating_gain) : Number(p.xp_gain),
          sub: `${p.matches} matches`,
        }))
        .sort((a, b) => b.value - a.value);
    },
  });

  const seg = (on: boolean) => cn("flex-1 rounded-xl py-2 text-sm font-bold uppercase tracking-wide", on ? "bg-primary text-primary-foreground" : "text-muted-foreground");

  return (
    <AppShell>
      <h1 className="mb-5 text-3xl font-black">Leaderboard</h1>
      <div className="mb-2 flex gap-1 rounded-2xl border bg-card p-1">
        <button className={seg(scope === "global")} onClick={() => setScope("global")}>Global</button>
        <button className={seg(scope === "weekly")} onClick={() => setScope("weekly")}>This week</button>
      </div>
      <div className="mb-5 flex gap-1 rounded-2xl border bg-card p-1">
        <button className={seg(metric === "rating")} onClick={() => setMetric("rating")}>Elo</button>
        <button className={seg(metric === "xp")} onClick={() => setMetric("xp")}>XP / Activity</button>
      </div>

      {q.data && q.data.length === 0 && <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">No matches played this week yet.</div>}
      <div className="space-y-2">
        {q.data?.map((r, i) => (
          <Link
            key={r.id}
            to="/player/$id"
            params={{ id: r.id }}
            className={cn("animate-rise flex items-center gap-3 rounded-2xl border bg-card p-3", r.id === user.id && "border-primary/60 bg-primary/10", i < 3 && "py-4")}
            style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
          >
            <div className={cn("w-8 text-center font-display text-lg font-black", i === 0 ? "text-primary" : i < 3 ? "text-court" : "text-muted-foreground")}>
              {i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}
            </div>
            <PlayerAvatar avatar={r.avatar} color={r.avatar_color} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-bold">{r.display_name}</div>
              <div className="text-xs text-muted-foreground">@{r.username} · {r.sub}</div>
            </div>
            <div className="font-display text-lg font-black tabular-nums">
              {scope === "weekly" && r.value > 0 ? "+" : ""}
              {r.value}
            </div>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
