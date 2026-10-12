import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeftRight,
  ChevronLeft,
  Lock,
  MessageCircle,
  Search,
  Swords,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { RankCrest, TierPill } from "@/components/RankCrest";
import { SectionTitle } from "@/components/PlayerProfile";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useFriendIds } from "@/hooks/use-friends";
import { supabase } from "@/integrations/supabase/client";
import { ACHIEVEMENTS, levelInfo, rankTier } from "@/lib/game";
import { SITE_URL } from "@/lib/beacons";
import { whatsappUrl } from "@/lib/share";
import { cn, haptic } from "@/lib/utils";

type Search = { p1?: string | undefined; p2?: string | undefined };

export const Route = createFileRoute("/_authenticated/compare")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    p1: typeof s["p1"] === "string" && s["p1"] ? s["p1"] : undefined,
    p2: typeof s["p2"] === "string" && s["p2"] ? s["p2"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "The Dossier — Padel Rival" },
      {
        name: "description",
        content:
          "Compare two padel players side by side: rating, head-to-head, form and court side.",
      },
    ],
  }),
  component: Compare,
});

const BADGE_ORDER = ["rivalry_victor", "giant_killer", "streak_5", "streak_3", "first_win"];

function usePlayer(id: string | undefined) {
  return useQuery({
    queryKey: ["dossier", id],
    enabled: !!id,
    queryFn: async () => {
      const [prof, sides, ach] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", id!).maybeSingle(),
        supabase.rpc("get_court_sides", { _user: id! }),
        supabase.from("achievements").select("code").eq("user_id", id!),
      ]);
      if (prof.error) throw prof.error;
      if (!prof.data) return null;
      const side = (k: string) => {
        const r = (sides.data ?? []).find((x) => x.court_side === k);
        return { wins: Number(r?.wins ?? 0), losses: Number(r?.losses ?? 0) };
      };
      return {
        profile: prof.data,
        left: side("left"),
        right: side("right"),
        badges: (ach.data ?? []).map((a) => a.code),
      };
    },
  });
}

type Dossier = NonNullable<ReturnType<typeof usePlayer>["data"]>;

function Compare() {
  const { user } = Route.useRouteContext();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/compare" });
  const p1 = search.p1 ?? user.id;
  const p2 = search.p2 && search.p2 !== p1 ? search.p2 : undefined;
  const [picking, setPicking] = useState<"p1" | "p2" | null>(null);

  const a = usePlayer(p1);
  const b = usePlayer(p2);

  const h2h = useQuery({
    queryKey: ["h2h", p1, p2],
    enabled: !!p2,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_head_to_head", { _a: p1, _b: p2! });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  function pick(slot: "p1" | "p2", id: string) {
    haptic();
    setPicking(null);
    navigate({ search: (s: Search) => ({ ...s, p1: s.p1 ?? user.id, [slot]: id }) });
  }

  function swap() {
    if (!p2) return;
    haptic();
    navigate({ search: { p1: p2, p2: p1 } });
  }

  const A = a.data;
  const B = b.data;
  const visible = (
    d: Dossier | null | undefined,
    k: "show_record" | "show_court_side" | "show_achievements" | "show_rivalries",
  ) => !!d && (d.profile.id === user.id || d.profile[k] !== false);

  function share() {
    if (!A || !B) return;
    haptic();
    const lines = [
      "🎾 PADEL RIVAL — THE DOSSIER",
      `${A.profile.display_name} (${A.profile.rating}, ${rankTier(A.profile.rating)}) vs ${B.profile.display_name} (${B.profile.rating}, ${rankTier(B.profile.rating)})`,
    ];
    if (h2h.data && visible(A, "show_rivalries") && visible(B, "show_rivalries")) {
      if (h2h.data.matches_against > 0)
        lines.push(
          `⚔️ Head-to-head: ${h2h.data.a_wins}-${h2h.data.b_wins} (sets ${h2h.data.a_sets}-${h2h.data.b_sets})`,
        );
      if (h2h.data.matches_together > 0)
        lines.push(`🤝 As partners: ${h2h.data.together_wins}W from ${h2h.data.matches_together}`);
    }
    if (visible(A, "show_record") && visible(B, "show_record"))
      lines.push(`📊 Win rate: ${pct(A)}% vs ${pct(B)}%`);
    lines.push(`${SITE_URL}/compare?p1=${A.profile.id}&p2=${B.profile.id}`);
    window.open(whatsappUrl(lines.join("\n")), "_blank", "noopener");
  }

  return (
    <AppShell>
      <Link
        to="/home"
        className="mb-3 flex items-center gap-1 text-sm font-bold text-muted-foreground"
      >
        <ChevronLeft className="size-4" /> Home
      </Link>
      <h1 className="text-3xl font-black">The Dossier</h1>
      <p className="mt-1 text-muted-foreground">Two players. Every number that matters.</p>

      <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-stretch gap-2">
        <PlayerSlot
          d={A}
          loading={a.isLoading}
          onPick={() => setPicking("p1")}
          tone="text-primary"
        />
        <button
          onClick={swap}
          disabled={!p2}
          className="self-center rounded-full border bg-card p-2 text-muted-foreground active:scale-90 disabled:opacity-30"
          aria-label="Swap players"
        >
          <ArrowLeftRight className="size-4" />
        </button>
        <PlayerSlot
          d={B}
          loading={!!p2 && b.isLoading}
          onPick={() => setPicking("p2")}
          tone="text-court"
        />
      </div>

      {A && B && (
        <>
          <section className="mt-6">
            <SectionTitle>Head to head</SectionTitle>
            {!visible(A, "show_rivalries") || !visible(B, "show_rivalries") ? (
              <Hidden />
            ) : h2h.isLoading ? (
              <div className="h-28 animate-pulse rounded-3xl bg-card" />
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-3xl border bg-card p-4">
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    <Swords className="size-3.5" /> Against
                  </div>
                  {h2h.data && h2h.data.matches_against > 0 ? (
                    <>
                      <div className="mt-2 font-display text-3xl font-black tabular-nums">
                        <span className="text-primary">{h2h.data.a_wins}</span>
                        <span className="text-muted-foreground"> – </span>
                        <span className="text-court">{h2h.data.b_wins}</span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground tabular-nums">
                        Sets {h2h.data.a_sets}–{h2h.data.b_sets}
                      </div>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">Never met across the net.</p>
                  )}
                </div>
                <div className="rounded-3xl border bg-card p-4">
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    <Users className="size-3.5" /> Together
                  </div>
                  {h2h.data && h2h.data.matches_together > 0 ? (
                    <>
                      <div className="mt-2 font-display text-3xl font-black tabular-nums text-win">
                        {h2h.data.together_wins}
                        <span className="text-muted-foreground">/{h2h.data.matches_together}</span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground tabular-nums">
                        Sets won together {h2h.data.together_sets_won}–{h2h.data.together_sets_lost}
                      </div>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">Haven't partnered yet.</p>
                  )}
                </div>
              </div>
            )}
          </section>

          <section className="mt-6">
            <SectionTitle>Tale of the tape</SectionTitle>
            <div className="space-y-2 rounded-3xl border bg-card p-4">
              <Bar label="Rating" a={A.profile.rating} b={B.profile.rating} />
              <Bar
                label="Level"
                a={levelInfo(A.profile.xp).level}
                b={levelInfo(B.profile.xp).level}
              />
              {visible(A, "show_record") && visible(B, "show_record") ? (
                <>
                  <Bar label="Win %" a={pct(A)} b={pct(B)} suffix="%" />
                  <Bar
                    label="Matches"
                    a={A.profile.wins + A.profile.losses}
                    b={B.profile.wins + B.profile.losses}
                  />
                  <Bar label="Streak" a={A.profile.current_streak} b={B.profile.current_streak} />
                  <Bar label="Best streak" a={A.profile.best_streak} b={B.profile.best_streak} />
                </>
              ) : (
                <p className="pt-1 text-center text-xs text-muted-foreground">
                  <Lock className="mr-1 inline size-3" />
                  Record is private for one of these players.
                </p>
              )}
            </div>
          </section>

          <section className="mt-6">
            <SectionTitle>Court side</SectionTitle>
            <div className="grid grid-cols-2 gap-2">
              {[A, B].map((d, i) => (
                <SideCard
                  key={d.profile.id}
                  d={d}
                  shown={visible(d, "show_court_side")}
                  tone={i === 0 ? "bg-primary" : "bg-court"}
                />
              ))}
            </div>
          </section>

          <section className="mt-6">
            <SectionTitle>Trophy cabinet</SectionTitle>
            <div className="grid grid-cols-2 gap-2">
              {[A, B].map((d) => (
                <div key={d.profile.id} className="rounded-3xl border bg-card p-3">
                  {!visible(d, "show_achievements") ? (
                    <p className="text-xs text-muted-foreground">
                      <Lock className="mr-1 inline size-3" /> Private
                    </p>
                  ) : d.badges.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No badges yet</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {BADGE_ORDER.filter((c) => d.badges.includes(c)).map((c) => (
                        <span
                          key={c}
                          title={ACHIEVEMENTS[c]?.name}
                          className="grid size-9 place-items-center rounded-xl bg-muted text-lg"
                        >
                          {ACHIEVEMENTS[c]?.icon}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          <button
            onClick={share}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-win/50 py-3.5 text-sm font-black uppercase text-win active:scale-[0.98]"
          >
            <MessageCircle className="size-4" /> Share comparison
          </button>
        </>
      )}

      {!p2 && (
        <div className="mt-6 rounded-3xl border border-dashed p-6 text-center">
          <p className="font-bold">Pick someone to compare against</p>
          <p className="mt-1 text-sm text-muted-foreground">
            A friend, a rival or the player at the top of the ladder.
          </p>
          <button
            onClick={() => setPicking("p2")}
            className="mt-4 rounded-2xl bg-primary px-6 py-3 text-sm font-black uppercase text-primary-foreground"
          >
            Choose player
          </button>
        </div>
      )}

      <PlayerPicker
        open={picking !== null}
        onOpenChange={(v) => !v && setPicking(null)}
        meId={user.id}
        exclude={picking === "p1" ? p2 : p1}
        onPick={(id) => picking && pick(picking, id)}
      />
    </AppShell>
  );
}

function pct(d: Dossier) {
  const t = d.profile.wins + d.profile.losses;
  return t ? Math.round((d.profile.wins / t) * 100) : 0;
}

function Hidden() {
  return (
    <div className="rounded-3xl border border-dashed p-4 text-center text-xs text-muted-foreground">
      <Lock className="mr-1 inline size-3" />
      One of these players keeps their match-ups private.
    </div>
  );
}

function PlayerSlot({
  d,
  loading,
  onPick,
  tone,
}: {
  d: Dossier | null | undefined;
  loading: boolean;
  onPick: () => void;
  tone: string;
}) {
  if (loading) return <div className="h-44 animate-pulse rounded-3xl bg-card" />;
  if (!d)
    return (
      <button
        onClick={onPick}
        className="grid h-44 place-items-center rounded-3xl border border-dashed text-sm font-bold text-muted-foreground"
      >
        + Pick player
      </button>
    );
  const p = d.profile;
  return (
    <button
      onClick={onPick}
      className="flex flex-col items-center gap-1.5 rounded-3xl border bg-card p-3 text-center active:scale-[0.98]"
    >
      <PlayerAvatar avatar={p.avatar} color={p.avatar_color} size="lg" rating={p.rating} />
      <div className="w-full truncate text-sm font-black">{p.display_name}</div>
      <div
        className={cn("flex items-center gap-1 font-display text-xl font-black tabular-nums", tone)}
      >
        <RankCrest rating={p.rating} size="sm" />
        {p.rating}
      </div>
      <TierPill rating={p.rating} />
      <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        Tap to change
      </span>
    </button>
  );
}

function Bar({
  label,
  a,
  b,
  suffix = "",
}: {
  label: string;
  a: number;
  b: number;
  suffix?: string;
}) {
  const total = Math.max(1, Math.abs(a) + Math.abs(b));
  const aw = Math.round((Math.abs(a) / total) * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-sm tabular-nums">
        <span
          className={cn(
            "font-display font-black",
            a > b ? "text-primary" : "text-muted-foreground",
          )}
        >
          {a}
          {suffix}
        </span>
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
        <span
          className={cn("font-display font-black", b > a ? "text-court" : "text-muted-foreground")}
        >
          {b}
          {suffix}
        </span>
      </div>
      <div className="mt-1 flex h-2 overflow-hidden rounded-full bg-muted">
        {a + b !== 0 && (
          <>
            <div className="h-full bg-primary" style={{ width: `${aw}%` }} />
            <div className="h-full flex-1 bg-court" />
          </>
        )}
      </div>
    </div>
  );
}

function SideCard({ d, shown, tone }: { d: Dossier; shown: boolean; tone: string }) {
  const l = d.left.wins + d.left.losses;
  const r = d.right.wins + d.right.losses;
  const lp = l + r ? Math.round((l / (l + r)) * 100) : 0;
  return (
    <div className="rounded-3xl border bg-card p-3">
      <div className="truncate text-xs font-bold">{d.profile.display_name.split(" ")[0]}</div>
      {!shown ? (
        <p className="mt-2 text-xs text-muted-foreground">
          <Lock className="mr-1 inline size-3" /> Private
        </p>
      ) : l + r === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">No sides tagged yet</p>
      ) : (
        <>
          <div className="mt-2 flex justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <span>L {lp}%</span>
            <span>R {100 - lp}%</span>
          </div>
          <div className="mt-1 flex h-2 overflow-hidden rounded-full bg-muted">
            <div className={cn("h-full", tone)} style={{ width: `${lp}%` }} />
          </div>
          <div className="mt-1.5 text-[11px] text-muted-foreground tabular-nums">
            {d.left.wins}-{d.left.losses} left · {d.right.wins}-{d.right.losses} right
          </div>
        </>
      )}
    </div>
  );
}

function PlayerPicker({
  open,
  onOpenChange,
  meId,
  exclude,
  onPick,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  meId: string;
  exclude?: string | undefined;
  onPick: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const friendIds = useFriendIds(meId);
  const term = q.trim().replace(/[%_,()]/g, "");

  const results = useQuery({
    queryKey: ["player-picker", term, friendIds.data],
    enabled: open,
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("id,display_name,username,avatar,avatar_color,rating");
      if (term)
        query = query
          .or(`display_name.ilike.%${term}%,username.ilike.%${term}%`)
          .order("rating", { ascending: false });
      else query = query.in("id", [meId, ...(friendIds.data ?? [])]).order("display_name");
      const { data, error } = await query.limit(20);
      if (error) throw error;
      return data;
    },
  });

  const list = (results.data ?? []).filter((p) => p.id !== exclude);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Pick a player</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search any player"
            className="w-full rounded-2xl border bg-card py-3 pl-10 pr-4 outline-none focus:border-primary"
          />
        </div>
        {!term && (
          <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            You & your friends
          </div>
        )}
        <div className="space-y-1.5">
          {list.map((p) => (
            <button
              key={p.id}
              onClick={() => onPick(p.id)}
              className="flex w-full items-center gap-3 rounded-2xl border bg-card p-2.5 text-left active:scale-[0.98]"
            >
              <PlayerAvatar avatar={p.avatar} color={p.avatar_color} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold">
                  {p.display_name}
                  {p.id === meId && <span className="text-muted-foreground"> (you)</span>}
                </div>
                <div className="truncate text-xs text-muted-foreground">@{p.username}</div>
              </div>
              <span className="font-display text-sm font-black tabular-nums">{p.rating}</span>
            </button>
          ))}
          {!results.isLoading && list.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {term ? "No players found." : "Add friends to see them here, or search above."}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
