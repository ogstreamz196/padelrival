import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Flame, Share2, Trophy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ACHIEVEMENTS, formatSets, levelInfo, rankTier, type SetScore } from "@/lib/game";
import { PlayerAvatar } from "./PlayerAvatar";
import { FormStrip, TierProgress } from "./RankProgress";
import { RankCrest, tierTheme } from "./RankCrest";
import { TrophyCase } from "./TrophyCase";
import { CourtSideSplit, type SideStat } from "./CourtSideSplit";
import { sharePlayerCard } from "@/lib/share";

import { RivalryCard, type Rivalry } from "./RivalryCard";
import { cn, haptic } from "@/lib/utils";

type MP = { team: number; guest_name: string | null; user_id: string | null; profiles: { display_name: string } | null };

type HistoryRow = {
  rating_delta: number;
  xp_gained: number;
  team: number;
  court_side: string | null;
  matches: {
    id: string;
    created_at: string;
    venue: string | null;
    match_type: string;
    notes: string | null;
    sets: SetScore[];
    winner_team: number;
    match_players: MP[];
  } | null;
};

export function PlayerProfile({ userId, isMe }: { userId: string; isMe?: boolean }) {
  const [allHistory, setAllHistory] = useState(false);
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
        .select("rating_delta,xp_gained,team,court_side,matches(id,created_at,venue,match_type,notes,sets,winner_team,match_players(team,guest_name,user_id,profiles(display_name)))")
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
  const courtSides = useQuery({
    queryKey: ["court-sides", userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_court_sides", { _user: userId });
      if (error) throw error;
      return data;
    },
  });
  const [sharing, setSharing] = useState(false);

  const p = profile.data;
  if (!p) return <div className="mt-20 text-center text-muted-foreground">{profile.isLoading ? "Loading…" : "Player not found"}</div>;
  const show = (k: "show_record" | "show_history" | "show_court_side" | "show_partners" | "show_rivalries" | "show_achievements") => isMe || p[k] !== false;
  const lvl = levelInfo(p.xp);
  const total = p.wins + p.losses;
  const winPct = total ? Math.round((p.wins / total) * 100) : 0;
  const unlocked = new Set(achievements.data?.map((a) => a.code));
  const recent = (history.data ?? []).slice(0, 10);
  const formResults = recent.map((h) => (h.matches ? h.matches.winner_team === h.team : false)).reverse();
  const netDelta = recent.reduce((s, h) => s + (h.rating_delta ?? 0), 0);

  const sideRow = (k: "left" | "right"): SideStat => {
    const r = (courtSides.data ?? []).find((x) => x.court_side === k);
    return { wins: Number(r?.wins ?? 0), losses: Number(r?.losses ?? 0) };
  };
  const leftSide = sideRow("left");
  const rightSide = sideRow("right");
  const hasSides = leftSide.wins + leftSide.losses + rightSide.wins + rightSide.losses > 0;

  const theme = tierTheme(p.rating);
  const featured = ["rivalry_victor", "giant_killer", "streak_5", "streak_3", "first_win"].find((c) => unlocked.has(c));
  const unlockedMap = new Map((achievements.data ?? []).map((a) => [a.code, a.unlocked_at as string]));

  async function shareCard() {
    if (!p) return;
    haptic();
    setSharing(true);
    const res = await sharePlayerCard({
      name: p.display_name,
      username: p.username,
      avatar: p.avatar,
      rating: p.rating,
      tier: rankTier(p.rating),
      level: lvl.level,
      wins: p.wins,
      losses: p.losses,
      streak: p.current_streak,
      best: p.best_streak,
      badge: featured ? `${ACHIEVEMENTS[featured]!.icon} ${ACHIEVEMENTS[featured]!.name}` : undefined,
      left: hasSides ? leftSide : undefined,
      right: hasSides ? rightSide : undefined,
    });
    setSharing(false);
    if (res === "downloaded") toast.success("Card saved to your downloads");
    if (res === "failed") toast.error("Could not create the card");
  }

  return (
    <div className="space-y-6">
      {/* Collectible player card */}
      <section
        className={cn("court-lines animate-rise relative overflow-hidden rounded-3xl border-2 p-5")}
        style={{ borderColor: theme.from, boxShadow: theme.glow }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: `radial-gradient(120% 80% at 100% 0%, ${theme.from}22, transparent 60%)` }}
        />
        <div className="absolute -right-6 -top-6 font-display text-[7rem] font-black leading-none text-foreground/5">{lvl.level}</div>
        <div className="relative flex items-center gap-4">
          <PlayerAvatar avatar={p.avatar} color={p.avatar_color} size="lg" rating={p.rating} />
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-black">{p.display_name}</h1>
            <p className="text-sm text-muted-foreground">
              @{p.username}
              {show("show_court_side") && <> · {p.court_side === "both" ? "Both sides" : `${p.court_side.charAt(0).toUpperCase()}${p.court_side.slice(1)} side`}</>}
            </p>
            {featured && show("show_achievements") && (
              <span className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-primary">
                <span>{ACHIEVEMENTS[featured]!.icon}</span>
                {ACHIEVEMENTS[featured]!.name}
              </span>
            )}
          </div>
        </div>

        <div className="relative mt-5 flex items-end justify-between">
          <div>
            <div className={cn("flex items-center gap-1.5 text-xs font-black uppercase tracking-widest", theme.text)}>
              <RankCrest rating={p.rating} size="sm" />
              {rankTier(p.rating)} · Rating
            </div>
            <div className="font-display text-5xl font-black tabular-nums">{p.rating}</div>
          </div>
          <RankCrest rating={p.rating} size="lg" />
          <div className="text-right">
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Level</div>
            <div className="font-display text-3xl font-black">{lvl.level}</div>
          </div>
        </div>
        <div className="relative mt-3">
          <div className="h-3 overflow-hidden rounded-full bg-background/60">
            <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${lvl.pct}%` }} />
          </div>
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>{p.xp} XP</span>
            <span>{lvl.needed - lvl.into} XP to Lv {lvl.level + 1}</span>
          </div>
        </div>

        {show("show_record") && <div className="relative mt-5 grid grid-cols-4 gap-2">
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
        </div>}

        <div className="relative mt-5 border-t pt-4">
          <TierProgress rating={p.rating} compact />
        </div>

        {show("show_history") && formResults.length > 0 && (
          <div className="relative mt-4 border-t pt-4">
            <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Recent form · last {formResults.length}</div>
            <FormStrip results={formResults} netDelta={netDelta} />
          </div>
        )}
      </section>

      <button
        onClick={shareCard}
        disabled={sharing}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-primary/60 bg-primary/10 py-3.5 font-display text-sm font-black uppercase tracking-wide text-primary active:scale-[0.98] disabled:opacity-50"
      >
        <Share2 className="size-4" />
        {sharing ? "Making your card…" : "Share player card"}
      </button>

      {show("show_court_side") && hasSides && (
        <section>
          <SectionTitle>Court side split</SectionTitle>
          <CourtSideSplit left={leftSide} right={rightSide} />
        </section>
      )}

      {isMe && (
        <Link to="/record" className="flex items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-display text-lg font-black uppercase text-primary-foreground glow active:scale-[0.98]">
          Record a match
        </Link>
      )}

      {/* Trophy case */}
      {show("show_achievements") && <section>
        <SectionTitle>Trophy case</SectionTitle>
        <TrophyCase unlocked={unlockedMap} stats={{ wins: p.wins, best_streak: p.best_streak }} />
      </section>}

      {/* Partner chemistry */}
      {show("show_partners") && <section>
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
      </section>}


      {/* Rivalries */}
      {show("show_rivalries") && <section>
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
      </section>}

      {/* Match history */}
      {show("show_history") && <section>
        <SectionTitle>Match history</SectionTitle>
        {history.data?.length ? (
          <div className="space-y-2">
            {history.data.length > 3 && (
              <button onClick={() => setAllHistory((v) => !v)} className="w-full rounded-xl border border-dashed py-2 text-xs font-bold text-muted-foreground order-last">
                {allHistory ? "Show less" : `Show all ${history.data.length} matches`}
              </button>
            )}
            {(allHistory ? history.data : history.data.slice(0, 3)).map((h) => {
              const m = h.matches;
              if (!m) return null;
              const won = m.winner_team === h.team;
              const name = (x: MP) => x.profiles?.display_name ?? x.guest_name ?? "Guest";
              const mine = m.match_players.filter((x) => x.team === h.team && x.user_id !== userId).map(name);
              const opp = m.match_players.filter((x) => x.team !== h.team).map(name);
              return (
                <div key={m.id} className="rounded-2xl border bg-card p-3">
                  <div className="flex items-center gap-3">
                    <div className={cn("grid size-10 shrink-0 place-items-center rounded-xl font-display font-black", won ? "bg-win/20 text-win" : "bg-destructive/20 text-destructive")}>
                      {won ? "W" : "L"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">
                        w/ {mine.join(", ") || "—"} <span className="text-muted-foreground">vs</span> {opp.join(" & ")}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-xs text-muted-foreground">
                          {formatSets(m.sets, h.team === 2)} · {m.venue || m.match_type} · {new Date(m.created_at).toLocaleDateString()}
                        </span>
                        {h.court_side && show("show_court_side") && (
                          <span className="shrink-0 rounded-full border px-1.5 text-[10px] font-black uppercase text-muted-foreground">
                            {h.court_side === "left" ? "L" : "R"}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={cn("font-display text-sm font-black tabular-nums", h.rating_delta >= 0 ? "text-win" : "text-destructive")}>
                      {h.rating_delta >= 0 ? "+" : ""}
                      {h.rating_delta}
                    </div>
                  </div>
                  {m.notes && <p className="mt-2 border-t pt-2 text-xs italic text-muted-foreground">“{m.notes}”</p>}
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
      </section>}
      {!isMe && PRIVATE_NOTE(show)}
    </div>
  );
}

function PRIVATE_NOTE(show: (k: any) => boolean) {
  const hidden = ["show_record", "show_history", "show_partners", "show_rivalries", "show_achievements"].some((k) => !show(k));
  return hidden ? <Empty>Some of this player's details are private.</Empty> : null;
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
