import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { PageGuide } from "@/components/PageGuide";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { RankCrest } from "@/components/RankCrest";
import { levelInfo } from "@/lib/game";
import { FollowButton } from "@/components/FollowButton";
import { useFriendIds } from "@/hooks/use-friends";
import { cn } from "@/lib/utils";
import { useAuthGate } from "@/components/AuthPrompt";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Leaderboard — Padel Rival" },
      { name: "description", content: "Global and weekly padel rankings." },
      { property: "og:title", content: "Leaderboard — Padel Rival" },
      { property: "og:description", content: "See who tops the global and weekly padel Elo rankings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Leaderboard,
});

type Row = { id: string; username: string; display_name: string; avatar: string; avatar_color: string; rating: number; value: number; sub: string };

function Leaderboard() {
  const { user } = Route.useRouteContext();
  const meId = user?.id ?? null;
  const { gate } = useAuthGate();
  const [scope, setScope] = useState<"global" | "weekly" | "friends">("global");
  const [search, setSearch] = useState("");
  const friends = useFriendIds(meId);
  const [metric, setMetric] = useState<"rating" | "xp">("rating");

  const q = useQuery({
    queryKey: ["leaderboard", scope, metric, scope === "friends" ? friends.data : null],
    enabled: scope !== "friends" || !!friends.data,
    queryFn: async (): Promise<Row[]> => {
      if (scope === "global" || scope === "friends") {
        let qb = supabase.from("profiles").select("*").order(metric, { ascending: false }).limit(100);
        if (scope === "friends") qb = qb.in("id", [...(friends.data ?? []), ...(meId ? [meId] : [])]);
        const { data, error } = await qb;
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
      <h1 className="mb-4 text-3xl font-black">Leaderboard</h1>
      <PageGuide id="leaderboard" />
      <div className="mb-2 flex gap-1 rounded-2xl border bg-card p-1">
        <button className={seg(scope === "global")} onClick={() => setScope("global")}>Global</button>
        <button className={seg(scope === "weekly")} onClick={() => setScope("weekly")}>This week</button>
        <button className={seg(scope === "friends")} onClick={() => gate("Create a free account to add friends and see your own league.") && setScope("friends")}>Friends</button>
      </div>
      <div className="mb-5 flex gap-1 rounded-2xl border bg-card p-1">
        <button className={seg(metric === "rating")} onClick={() => setMetric("rating")}>Elo</button>
        <button className={seg(metric === "xp")} onClick={() => setMetric("xp")}>XP / Activity</button>
      </div>

      {scope === "friends" && meId && <FriendSearch meId={meId} search={search} setSearch={setSearch} />}
      {q.data && q.data.length === 0 && (
        <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          {scope === "weekly" ? "No matches played this week yet — log one and you are instantly on the board." : "No players ranked yet."}
        </div>
      )}
      <div className="space-y-2">
        {q.data?.map((r, i) => (
          <Link
            key={r.id}
            to="/player/$id"
            params={{ id: r.id }}
            className={cn("animate-rise flex items-center gap-3 rounded-2xl border bg-card p-3", r.id === meId && "border-primary/60 bg-primary/10", i < 3 && "py-4")}
            style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
          >
            <div className={cn("w-8 text-center font-display text-lg font-black", i === 0 ? "text-primary" : i < 3 ? "text-court" : "text-muted-foreground")}>
              {i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}
            </div>
            <PlayerAvatar avatar={r.avatar} color={r.avatar_color} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate font-bold">{r.display_name}</span>
                {scope !== "weekly" && <RankCrest rating={r.value} size="sm" />}
              </div>
              <div className="text-xs text-muted-foreground">@{r.username} · {r.sub}</div>
            </div>
            <div className="font-display text-lg font-black tabular-nums">
              {scope === "weekly" && r.value > 0 ? "+" : ""}
              {r.value}
            </div>
            {scope === "friends" && r.id !== meId && <FollowButton meId={meId} id={r.id} className="px-2" />}
          </Link>
        ))}
      </div>
    </AppShell>
  );
}

function FriendSearch({ meId, search, setSearch }: { meId: string; search: string; setSearch: (s: string) => void }) {
  const term = search.trim().replace(/^@/, "");
  const res = useQuery({
    queryKey: ["player-search", term],
    enabled: term.length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,username,display_name,avatar,avatar_color,rating")
        .or(`username.ilike.%${term.replace(/[%,()]/g, "")}%,display_name.ilike.%${term.replace(/[%,()]/g, "")}%`)
        .neq("id", meId)
        .limit(8);
      if (error) throw error;
      return data;
    },
  });
  return (
    <div className="mb-5">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Find players by name or @username"
        className="w-full rounded-2xl border bg-card px-4 py-3 text-sm outline-none focus:border-primary"
      />
      {term.length >= 2 && (
        <div className="mt-2 space-y-2">
          {res.data?.map((p) => (
            <Link key={p.id} to="/player/$id" params={{ id: p.id }} className="flex items-center gap-3 rounded-2xl border bg-card p-2.5">
              <PlayerAvatar avatar={p.avatar} color={p.avatar_color} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold">{p.display_name}</div>
                <div className="text-xs text-muted-foreground">@{p.username} · {p.rating}</div>
              </div>
              <FollowButton meId={meId} id={p.id} />
            </Link>
          ))}
          {res.data?.length === 0 && <p className="text-center text-xs text-muted-foreground">No players found.</p>}
        </div>
      )}
    </div>
  );
}
