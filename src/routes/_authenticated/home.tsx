import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Crown, Flame } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ActivityFeed } from "@/components/ActivityFeed";
import { WeeklyLeague } from "@/components/WeeklyLeague";
import { PageGuide } from "@/components/PageGuide";
import { QuickLinks } from "@/components/QuickLinks";
import { NotificationBell } from "@/components/NotificationBell";
import { useIsAdmin } from "@/hooks/use-admin";
import { ProOfferBanner } from "@/components/ProUpgrade";
import { OpenBeacons } from "@/components/OpenBeacons";

import { RivalryCard, type Rivalry } from "@/components/RivalryCard";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { TierProgress } from "@/components/RankProgress";

import { SectionTitle } from "@/components/PlayerProfile";
import { useMyProfile } from "@/hooks/use-auth";
import { levelInfo, isProvisional } from "@/lib/game";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/home")({
  staticData: { sitemap: false },
  head: () =>
    seo({
      title: "Padel Rival — Your padel clubhouse: matches, ratings & rivals",
      description:
        "See the latest padel matches, weekly rankings and open matches looking for players. Log your own games and climb the ladder.",
      path: "/home",
    }),
  component: Home,
});

function Home() {
  const { user } = Route.useRouteContext();
  const meId = user?.id ?? null;
  const { profile } = useMyProfile();
  const { isAdmin } = useIsAdmin();

  const rivals = useQuery({
    queryKey: ["rivals", meId],
    enabled: !!meId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_rivalries", { _user: meId! });
      if (error) throw error;
      return data as Rivalry[];
    },
  });

  const revenge = (rivals.data ?? []).filter((r) => r.losses > r.wins).slice(0, 2);
  const lvl = profile ? levelInfo(profile.xp) : null;
  const played = profile ? profile.wins + profile.losses : 0;

  return (
    <AppShell wide>
      {profile && <h1 className="sr-only">Clubhouse</h1>}
      {profile && lvl && (
        <section className="mb-5 flex items-center gap-3">
          <PlayerAvatar avatar={profile.avatar} color={profile.avatar_color} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-lg font-black">
              Hey {profile.display_name.split(" ")[0]}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-bold text-foreground tabular-nums">{profile.rating}</span>
              {isProvisional(played) ? (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-black uppercase">
                  Provisional · {5 - played} to go
                </span>
              ) : (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-black uppercase text-primary">
                  Calibrated
                </span>
              )}
              <span>Lv {lvl.level}</span>
              {profile.current_streak > 0 && (
                <span className="inline-flex items-center gap-0.5 text-fire">
                  <Flame
                    className={cn("size-3", profile.current_streak >= 3 && "animate-flicker")}
                  />
                  {profile.current_streak}
                </span>
              )}
            </div>
          </div>
          <NotificationBell meId={profile.id} />
        </section>
      )}

      {!meId && <GuestWelcome />}

      {isAdmin && (
        <Link
          to="/admin"
          className="mb-4 flex items-center gap-3 rounded-3xl border border-primary/50 bg-primary/5 p-3.5 active:scale-[0.99]"
        >
          <Crown className="size-5 shrink-0 text-primary" />
          <span className="flex-1 font-display text-sm font-black uppercase tracking-wide text-primary">
            Boss dashboard
          </span>
          <ChevronRight className="size-5 text-primary" />
        </Link>
      )}

      {/* Desktop: two columns (you on the left, what's happening on the right). */}
      <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-8">
        <div>
          <PageGuide id="home" />

          {profile && (
            <section className="mb-4">
              <TierProgress rating={profile.rating} />
            </section>
          )}

          {profile && <WeeklyLeague meId={profile.id} rating={profile.rating} />}

          {profile && <ProOfferBanner />}

          <Link
            to="/record"
            className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-display text-lg font-black uppercase text-primary-foreground glow active:scale-[0.98]"
          >
            Record a match
          </Link>

          <QuickLinks className="mt-3" />
        </div>
        <div className="lg:[&>*:first-child]:mt-0">
          {revenge.length > 0 && (
            <section className="mt-7">
              <SectionTitle>Revenge radar</SectionTitle>
              <div className="space-y-3">
                {revenge.map((r) => (
                  <RivalryCard key={r.opponent_id} r={r} meId={meId!} showRevenge />
                ))}
              </div>
            </section>
          )}

          <OpenBeacons meId={meId} />

          <section className="mt-7">
            <SectionTitle>Latest matches</SectionTitle>
            <ActivityFeed meId={meId} />
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function GuestWelcome() {
  return (
    <section className="mb-5 rounded-3xl border border-primary/40 bg-primary/5 p-5">
      <div className="flex items-center gap-2">
        <img src="/icon-192.png" alt="" className="size-8 rounded-xl" />
        <span className="font-display text-sm font-black uppercase tracking-wide">Padel Rival</span>
      </div>
      <h1 className="mt-3 text-2xl font-black leading-tight">Have a look around.</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        See who's on top, find a game that needs a player and check out the clubs. When you want to
        save a match or add friends, a free account takes about 20 seconds.
      </p>
      <div className="mt-4 flex gap-2">
        <Link
          to="/auth"
          search={{ mode: "up" }}
          className="flex-1 rounded-2xl bg-primary py-3 text-center text-sm font-black uppercase text-primary-foreground"
        >
          Join free
        </Link>
        <Link to="/auth" className="flex-1 rounded-2xl border py-3 text-center text-sm font-bold">
          Sign in
        </Link>
      </div>
    </section>
  );
}
