import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { PlayerAvatar } from "./PlayerAvatar";
import { FollowButton } from "./FollowButton";
import { SectionTitle } from "./PlayerProfile";
import { useFriendIds } from "@/hooks/use-friends";
import { useHideBlocked } from "@/hooks/use-blocks";
import { padelLevel, winChance } from "@/lib/game";

/** Players rated close to you who aren't friends yet: the people you'd have a good game with. */
export function PlayersAtYourLevel({ meId, rating, limit = 4 }: { meId: string; rating: number; limit?: number }) {
  const friends = useFriendIds(meId);
  const hidden = useHideBlocked();
  const near = useQuery({
    queryKey: ["at-level", meId, Math.round(rating / 25)],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,display_name,username,avatar,avatar_color,rating,wins,losses")
        .gte("rating", rating - 120)
        .lte("rating", rating + 120)
        .neq("id", meId)
        .order("wins", { ascending: false })
        .limit(40);
      if (error) throw error;
      return data;
    },
  });
  const list = (near.data ?? [])
    .filter((p) => p.id !== meId && !(friends.data ?? []).includes(p.id) && !hidden([p.id]) && p.wins + p.losses > 0)
    .sort((a, b) => Math.abs(a.rating - rating) - Math.abs(b.rating - rating))
    .slice(0, limit);
  if (!list.length) return null;

  return (
    <section className="mt-7">
      <SectionTitle>Players at your level</SectionTitle>
      <div className="space-y-2">
        {list.map((p) => {
          const chance = Math.round(winChance([rating], [p.rating]) * 100);
          const fit = Math.abs(chance - 50) <= 6 ? "Even match" : chance > 50 ? "Just below you" : "A step up";
          return (
            <Link
              key={p.id}
              to="/player/$id"
              params={{ id: p.id }}
              className="flex items-center gap-3 rounded-2xl border bg-card p-3 active:scale-[0.99]"
            >
              <PlayerAvatar avatar={p.avatar} color={p.avatar_color} size="sm" rating={p.rating} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold">{p.display_name}</div>
                <div className="truncate text-xs text-muted-foreground">
                  Level {padelLevel(p.rating).toFixed(1)} · {p.wins}-{p.losses} ·{" "}
                  <span className={chance > 56 ? "text-win" : chance < 44 ? "text-fire" : "text-foreground"}>{fit}</span>
                </div>
              </div>
              <FollowButton meId={meId} id={p.id} className="whitespace-nowrap px-2.5" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
