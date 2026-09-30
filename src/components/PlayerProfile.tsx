import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Flame, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ACHIEVEMENTS, formatSets, levelInfo, rankTier, type SetScore } from "@/lib/game";
import { PlayerAvatar } from "./PlayerAvatar";
import { RivalryCard, type Rivalry } from "./RivalryCard";
import { cn } from "@/lib/utils";

type MP = { team: number; guest_name: string | null; user_id: string | null; profiles: { display_name: string } | null };

type HistoryRow = {
  rating_delta: number;
  xp_gained: number;
  team: number;
  matches: {
    id: string;
    created_at: string;
    venue: string | null;
    match_type: string;
    sets: SetScore[];
    winner_team: number;
    match_players: MP[];
  } | null;
};

export function PlayerProfile({ userId, isMe }: { userId: string; isMe?: boolean }) {
  const profile = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
      if (error) throw error;
      return data;
    },
  });
  const history = useQuery({
    queryKey: ["history", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_players")
        .select("rating_delta,xp_gained,team,matches(id,created_at,venue,match_type,sets,winner_team,match_players(team,guest_name,user_id,profiles(display_name)))")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as unknown as HistoryRow[];
    },
  });
  const rivals = useQuery({
    queryKey: ["rivals", userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_rivalries", { _user: userId });
      if (error) throw error;
      return data as Rivalry[];
    },
  });
  const achievements = useQuery({
    queryKey: ["achievements", userId],
    queryFn: async () => {
      const { data } = await supabase.from("achievements").select("code,unlocked_at").eq("user_id", userId);
      return data ?? [];
    },
  });
  const partners = useQuery({
    queryKey: ["partners", userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_partners", { _user: userId });
      if (error) throw error;
      return data;
    },
  });

  const p = profile.data;
  if (!p) return <div className="mt-20 text-center text-muted-foreground">{profile.isLoading ? "Loading…" : "Player not found"}</div>;
  const lvl = levelInfo(p.xp);
  const total = p.wins + p.losses;
  const winPct = total ? Math.round((p.wins / total) * 100) : 0;
  const unlocked = new Set(achievements.data?.map((a) => a.code));
  const recent = (history.data ?? []).slice(0, 10);
  const formResults = recent.map((h) => (h.matches ? h.matches.winner_team === h.team : false)).reverse();
  const netDelta = recent.reduce((s, h) => s + (h.rating_delta ?? 0), 0);


  return (
    <div className="space-y-6">
      {/* Player card */}
      <section className="court-lines animate-rise relative overflow-hidden rounded-3xl border p-5">
        <div className="absolute -right-6 -top-6 font-display text-[7rem] font-black leading-none text-foreground/5">{lvl.level}</div>
        <div className="flex items-center gap-4">
          <PlayerAvatar avatar={p.avatar} color={p.avatar_color} size="lg" />
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-black">{p.display_name}</h1>
            <p className="text-sm text-muted-foreground">
              @{p.username} · {p.court_side === "both" ? "Both sides" : `${p.court_side.charAt(0).toUpperCase()}${p.court_side.slice(1)} side`}
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-end justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-primary">{rankTier(p.rating)} · Rating</div>
            <div className="font-display text-5xl font-black tabular-nums">{p.rating}</div>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Level</div>
            <div className="font-display text-3xl font-black">{lvl.level}</div>
          </div>
        </div>
        <div className="mt-3">
          <div className="h-3 overflow-hidden rounded-full bg-background/60">
            <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${lvl.pct}%` }} />
          </div>
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>{p.xp} XP</span>
            <span>{lvl.needed - lvl.into} XP to Lv {lvl.level + 1}</span>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-4 gap-2">
          <Stat label="Record" value={`${p.wins}-${p.losses}`} />
          <Stat label="Win %" value={`${winPct}%`} />
          <Stat
            label="Streak"
            value={
              <span className="inline-flex items-center gap-0.5">
                {p.current_streak > 0 && <Flame className={cn("size-4 text-fire", p.current_streak >= 3 && "animate-flicker")} />}
                {p.current_streak}
              </span>
            }
          />
          <Stat label="Best" value={p.best_streak} />
        </div>
      </section>

      {isMe && (
        <Link to="/record" className="flex items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-display text-lg font-black uppercase text-primary-foreground glow active:scale-[0.98]">
          Record a match
        </Link>
      )}

      {/* Achievements */}
      <section>
        <SectionTitle>Achievements</SectionTitle>
        <div className="grid grid-cols-5 gap-2">
          {Object.entries(ACHIEVEMENTS).map(([code, a]) => {
            const on = unlocked.has(code);
            return (
              <div key={code} className={cn("flex flex-col items-center gap-1 rounded-2xl border p-2 text-center", on ? "border-primary/50 bg-primary/10" : "opacity-35 grayscale")} title={a.desc}>
                <span className="text-2xl">{a.icon}</span>
                <span className="text-[10px] font-bold leading-tight">{a.name}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Partner chemistry */}
      <section>
        <SectionTitle>Best partners</SectionTitle>
        {partners.data?.length ? (
          <div className="space-y-2">
            {partners.data.slice(0, 4).map((p) => {
              const total = Number(p.wins) + Number(p.losses);
              const pct = total ? Math.round((Number(p.wins) / total) * 100) : 0;
              return (
                <Link key={p.partner_id} to="/player/$id" params={{ id: p.partner_id }} className="flex items-center gap-3 rounded-2xl border bg-card p-3">
                  <PlayerAvatar avatar={p.avatar} color={p.avatar_color} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold">{p.display_name}</div>
                    <div className="text-xs text-muted-foreground">{p.matches} together · {p.wins}-{p.losses}</div>
                  </div>
                  <div className="text-right">
                    <div className={cn("font-display text-xl font-black tabular-nums", pct >= 50 ? "text-win" : "text-destructive")}>{pct}%</div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Chemistry</div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <Empty>Play with a teammate to build chemistry stats.</Empty>
        )}
      </section>


      {/* Rivalries */}
      <section>
        <SectionTitle>Rivalries</SectionTitle>
        {rivals.data?.length ? (
          <div className="space-y-3">
            {rivals.data.slice(0, 3).map((r) => (
              <RivalryCard key={r.opponent_id} r={r} meId={userId} showRevenge={!!isMe} />
            ))}
          </div>
        ) : (
          <Empty>Face the same opponent twice to start a rivalry.</Empty>
        )}
      </section>

      {/* Match history */}
      <section>
        <SectionTitle>Match history</SectionTitle>
        {history.data?.length ? (
          <div className="space-y-2">
            {history.data.map((h) => {
              const m = h.matches;
              if (!m) return null;
              const won = m.winner_team === h.team;
              const name = (x: MP) => x.profiles?.display_name ?? x.guest_name ?? "Guest";
              const mine = m.match_players.filter((x) => x.team === h.team && x.user_id !== userId).map(name);
              const opp = m.match_players.filter((x) => x.team !== h.team).map(name);
              return (
                <div key={m.id} className="flex items-center gap-3 rounded-2xl border bg-card p-3">
                  <div className={cn("grid size-10 shrink-0 place-items-center rounded-xl font-display font-black", won ? "bg-win/20 text-win" : "bg-destructive/20 text-destructive")}>
                    {won ? "W" : "L"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">
                      w/ {mine.join(", ") || "—"} <span className="text-muted-foreground">vs</span> {opp.join(" & ")}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {formatSets(m.sets, h.team === 2)} · {m.venue || m.match_type} · {new Date(m.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className={cn("font-display text-sm font-black tabular-nums", h.rating_delta >= 0 ? "text-win" : "text-destructive")}>
                    {h.rating_delta >= 0 ? "+" : ""}
                    {h.rating_delta}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Empty>
            <Trophy className="mx-auto mb-2 size-6" />
            No matches yet.
          </Empty>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-background/50 p-2 text-center">
      <div className="font-display text-lg font-black tabular-nums">{value}</div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 text-sm font-black uppercase tracking-widest text-muted-foreground">{children}</h2>;
}
export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">{children}</div>;
}
