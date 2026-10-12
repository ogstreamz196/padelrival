import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Flame } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ActivityFeed } from "@/components/ActivityFeed";
import { WeeklyLeague } from "@/components/WeeklyLeague";
import { InstallBanner } from "@/components/InstallBanner";
import { PageGuide } from "@/components/PageGuide";
import { QuickLinks } from "@/components/QuickLinks";
import { OpenBeacons } from "@/components/OpenBeacons";

import { RivalryCard, type Rivalry } from "@/components/RivalryCard";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { TierProgress } from "@/components/RankProgress";

import { SectionTitle } from "@/components/PlayerProfile";
import { useMyProfile } from "@/hooks/use-auth";
import { levelInfo, isProvisional } from "@/lib/game";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Clubhouse — Padel Rival" },
      { name: "description", content: "Your weekly division, live rivalries and the latest matches from your padel circle." },
      { property: "og:title", content: "Clubhouse — Padel Rival" },
      { property: "og:description", content: "Weekly divisions, rivalries and live padel match activity." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Home,
});

function Home() {
  const { user } = Route.useRouteContext();
  const { profile } = useMyProfile();

  const rivals = useQuery({
    queryKey: ["rivals", user.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_rivalries", { _user: user.id });
      if (error) throw error;
      return data as Rivalry[];
    },
  });

  const revenge = (rivals.data ?? []).filter((r) => r.losses > r.wins).slice(0, 2);
  const lvl = profile ? levelInfo(profile.xp) : null;
  const played = profile ? profile.wins + profile.losses : 0;

  return (
    <AppShell>
      {profile && lvl && (
        <section className="mb-5 flex items-center gap-3">
          <PlayerAvatar avatar={profile.avatar} color={profile.avatar_color} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-lg font-black">Hey {profile.display_name.split(" ")[0]}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-bold text-foreground tabular-nums">{profile.rating}</span>
              {isProvisional(played) ? (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-black uppercase">Provisional · {5 - played} to go</span>
              ) : (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-black uppercase text-primary">Calibrated</span>
              )}
              <span>Lv {lvl.level}</span>
              {profile.current_streak > 0 && (
                <span className="inline-flex items-center gap-0.5 text-fire">
                  <Flame className={cn("size-3", profile.current_streak >= 3 && "animate-flicker")} />
                  {profile.current_streak}
                </span>
              )}
            </div>
          </div>
          <Link to="/me" className="text-xs font-bold text-muted-foreground">Profile</Link>
        </section>
      )}

      <PageGuide id="home" />

      {profile && (
        <section className="mb-4">
          <TierProgress rating={profile.rating} />
        </section>
      )}

      {profile && <WeeklyLeague meId={user.id} rating={profile.rating} />}


      <InstallBanner />


      <Link
        to="/record"
        className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-display text-lg font-black uppercase text-primary-foreground glow active:scale-[0.98]"
      >
        Record a match
      </Link>

      <QuickLinks className="mt-3" />

      {revenge.length > 0 && (
        <section className="mt-7">
          <SectionTitle>Revenge radar</SectionTitle>
          <div className="space-y-3">
            {revenge.map((r) => (
              <RivalryCard key={r.opponent_id} r={r} meId={user.id} showRevenge />
            ))}
          </div>
        </section>
      )}

      <OpenBeacons meId={user.id} />

      <section className="mt-7">
        <SectionTitle>Latest matches</SectionTitle>
        <ActivityFeed meId={user.id} />
      </section>
    </AppShell>
  );
}
