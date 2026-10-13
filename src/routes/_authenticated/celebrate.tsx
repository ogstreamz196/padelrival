import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Flame } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ACHIEVEMENTS, formatSets, levelInfo, type SetScore } from "@/lib/game";
import type { Rivalry } from "@/components/RivalryCard";
import { ShareResult } from "@/components/ShareResult";
import { useMyProfile } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { requireUser } from "./route";

export const Route = createFileRoute("/_authenticated/celebrate")({
  beforeLoad: requireUser,
  head: () => ({ meta: [{ title: "Match result — Padel Rival" }, { name: "description", content: "Your match result." }] }),
  component: Celebrate,
});

type Result = {
  won: boolean;
  rating_before: number;
  rating_delta: number;
  xp_gained: number;
  xp_before: number;
  streak: number;
  best_streak: number;
  unlocked: string[];
  sets: SetScore[];
  partner: string;
  opponents: { user_id?: string; display_name: string }[];
  match_id?: string;
};

function useCounter(target: number, duration = 1200, delay = 400) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t = setTimeout(() => {
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / duration);
        setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => {
      clearTimeout(t);
      cancelAnimationFrame(raf);
    };
  }, [target, duration, delay]);
  return v;
}

function Celebrate() {
  const { user } = Route.useRouteContext();
  const { profile } = useMyProfile();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [undoing, setUndoing] = useState(false);
  const [r] = useState<Result | null>(() => {
    try {
      return JSON.parse(sessionStorage.getItem("lastMatch") ?? "null");
    } catch {
      return null;
    }
  });
  const rivals = useQuery({
    queryKey: ["rivals", user.id],
    queryFn: async () => (await supabase.rpc("get_rivalries", { _user: user.id })).data as Rivalry[],
  });
  const delta = useCounter(r?.rating_delta ?? 0);
  const xp = useCounter(r?.xp_gained ?? 0, 1000, 900);

  if (!r) return <Navigate to="/home" />;
  const oppIds = r.opponents.map((o) => o.user_id).filter(Boolean);
  const rivalUpdates = rivals.data?.filter((x) => oppIds.includes(x.opponent_id)) ?? [];
  const lvBefore = levelInfo(r.xp_before);
  const lvAfter = levelInfo(r.xp_before + r.xp_gained);
  const leveledUp = lvAfter.level > lvBefore.level;

  return (
    <div className={cn("relative min-h-dvh overflow-hidden", r.won ? "bg-primary/10" : "bg-destructive/10")}>
      <div
        className={cn("pointer-events-none absolute inset-x-0 top-0 h-96 blur-3xl", r.won ? "bg-primary/30" : "bg-destructive/25")}
        style={{ clipPath: "ellipse(60% 50% at 50% 0%)" }}
      />
      <div className="relative mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-8 pt-[max(env(safe-area-inset-top),2rem)]">
        <div className="animate-pop text-center">
          <div className="text-7xl">{r.won ? "🏆" : "💥"}</div>
          <h1 className={cn("mt-2 font-display text-6xl font-black uppercase", r.won ? "text-primary" : "text-destructive")}>{r.won ? "Victory" : "Defeat"}</h1>
          <p className="mt-2 text-muted-foreground">
            with {r.partner} vs {r.opponents.map((o) => o.display_name).join(" & ")}
          </p>
          <p className="mt-1 font-display text-xl font-black tracking-widest">{formatSets(r.sets)}</p>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3">
          <div className="animate-rise rounded-3xl border bg-card p-4 text-center" style={{ animationDelay: "200ms" }}>
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Rating</div>
            <div className={cn("font-display text-4xl font-black tabular-nums", r.rating_delta >= 0 ? "text-win" : "text-destructive")}>
              {delta >= 0 ? "+" : ""}
              {delta}
            </div>
            <div className="text-sm text-muted-foreground tabular-nums">
              {r.rating_before} → {r.rating_before + r.rating_delta}
            </div>
          </div>
          <div className="animate-rise rounded-3xl border bg-card p-4 text-center" style={{ animationDelay: "400ms" }}>
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">XP earned</div>
            <div className="font-display text-4xl font-black tabular-nums text-primary">+{xp}</div>
            <div className="text-sm text-muted-foreground">{leveledUp ? <span className="font-bold text-primary">Level up! Lv {lvAfter.level}</span> : `Lv ${lvAfter.level}`}</div>
          </div>
        </div>

        <div className="animate-rise mt-3 rounded-3xl border bg-card p-4" style={{ animationDelay: "600ms" }}>
          <div className="mb-2 h-3 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all duration-1000 ease-out" style={{ width: `${xp === (r.xp_gained ?? 0) ? lvAfter.pct : lvBefore.pct}%` }} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className={cn("size-6", r.streak > 0 ? "text-fire" : "text-muted-foreground", r.streak >= 3 && "animate-flicker")} />
              <span className="font-bold">{r.streak > 0 ? `${r.streak}-match win streak` : "Streak reset"}</span>
            </div>
            <span className="text-sm text-muted-foreground">Best {r.best_streak}</span>
          </div>
        </div>

        <div className="animate-rise mt-4" style={{ animationDelay: "700ms" }}>
          <div className="mb-2 text-center text-xs font-black uppercase tracking-widest text-muted-foreground">Share the bragging rights</div>
          <ShareResult
            data={{
              won: r.won,
              me: profile?.display_name ?? "Me",
              partner: r.partner,
              opponents: r.opponents.map((o) => o.display_name),
              sets: r.sets,
              ratingDelta: r.rating_delta,
              ratingAfter: r.rating_before + r.rating_delta,
              xp: r.xp_gained,
              streak: r.streak,
            }}
          />
        </div>


        {r.unlocked.length > 0 && (
          <div className="mt-6">
            <div className="mb-2 text-center text-xs font-black uppercase tracking-widest text-primary">Badge unlocked</div>
            <div className="flex flex-wrap justify-center gap-3">
              {r.unlocked.map((code, i) => {
                const a = ACHIEVEMENTS[code];
                return (
                  <div key={code} className="animate-pop glow flex w-28 flex-col items-center rounded-3xl border border-primary bg-primary/15 p-3" style={{ animationDelay: `${900 + i * 200}ms` }}>
                    <span className="text-4xl">{a?.icon}</span>
                    <span className="mt-1 text-center text-xs font-black">{a?.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {rivalUpdates.length > 0 && (
          <div className="animate-rise mt-6 space-y-2" style={{ animationDelay: "1100ms" }}>
            <div className="text-center text-xs font-black uppercase tracking-widest text-muted-foreground">Rivalry update</div>
            {rivalUpdates.map((x) => (
              <div key={x.opponent_id} className="flex items-center justify-between rounded-2xl border bg-card px-4 py-3">
                <span className="font-bold">vs {x.display_name}</span>
                <span className={cn("font-display text-xl font-black", x.wins > x.losses ? "text-win" : x.wins < x.losses ? "text-destructive" : "")}>
                  {x.wins}-{x.losses}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-auto grid gap-2 pt-8">
          <Link to="/home" className="rounded-2xl bg-primary py-4 text-center font-display font-black uppercase text-primary-foreground glow">Continue</Link>
          <Link to="/record" className="rounded-2xl border py-4 text-center font-bold">Record another</Link>
          {r.match_id && (
            <button
              onClick={async () => {
                if (undoing) return;
                setUndoing(true);
                const { error } = await supabase.rpc("void_match", { _match_id: r.match_id! });
                setUndoing(false);
                if (error) {
                  toast.error(error.message);
                  return;
                }
                sessionStorage.removeItem("lastMatch");
                toast.success("Match removed — everyone's rating restored");
                qc.invalidateQueries();
                navigate({ to: "/record" });
              }}
              className="py-2 text-center text-sm font-bold text-muted-foreground underline"
            >
              {undoing ? "Undoing…" : "Wrong score? Undo this match"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
