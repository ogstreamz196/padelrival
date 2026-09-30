import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Undo2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatSets, undoLeft, type SetScore } from "@/lib/game";
import { PlayerAvatar } from "./PlayerAvatar";
import { cn } from "@/lib/utils";

type FeedPlayer = {
  team: number;
  user_id: string | null;
  guest_name: string | null;
  rating_delta: number;
  profiles: { display_name: string; avatar: string; avatar_color: string } | null;
};

type FeedMatch = {
  id: string;
  created_at: string;
  created_by: string;
  venue: string | null;
  match_type: string;
  sets: SetScore[];
  winner_team: number;
  match_players: FeedPlayer[];
};

export function ActivityFeed({ meId }: { meId: string }) {
  const qc = useQueryClient();

  const feed = useQuery({
    queryKey: ["feed"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("id,created_at,created_by,venue,match_type,sets,winner_team,match_players(team,user_id,guest_name,rating_delta,profiles(display_name,avatar,avatar_color))")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as unknown as FeedMatch[];
    },
  });

  const reactions = useQuery({
    queryKey: ["reactions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("match_reactions").select("match_id,user_id");
      if (error) throw error;
      return data;
    },
  });

  const bump = useMutation({
    mutationFn: async ({ matchId, on }: { matchId: string; on: boolean }) => {
      if (on) {
        const { error } = await supabase.from("match_reactions").delete().eq("match_id", matchId).eq("user_id", meId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("match_reactions").insert({ match_id: matchId, user_id: meId, emoji: "🤜" });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reactions"] }),
  });

  const undo = useMutation({
    mutationFn: async (matchId: string) => {
      const { error } = await supabase.rpc("void_match", { _match_id: matchId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Match removed — ratings restored");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (feed.isLoading) return <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">Loading activity…</div>;
  if (!feed.data?.length) return <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">No matches logged yet. Be the first.</div>;

  return (
    <div className="space-y-3">
      {feed.data.map((m) => {
        const name = (p: FeedPlayer) => p.profiles?.display_name ?? p.guest_name ?? "Guest";
        const winners = m.match_players.filter((p) => p.team === m.winner_team);
        const losers = m.match_players.filter((p) => p.team !== m.winner_team);
        const bumps = reactions.data?.filter((r) => r.match_id === m.id) ?? [];
        const mine = bumps.some((r) => r.user_id === meId);
        const iAmIn = m.match_players.some((p) => p.user_id === meId);
        const left = m.created_by === meId ? undoLeft(m.created_at) : 0;

        return (
          <div key={m.id} className={cn("overflow-hidden rounded-2xl border bg-card", iAmIn && "border-primary/40")}>
            <div className="flex items-start gap-3 p-3">
              <div className="flex -space-x-2">
                {winners.map((p, i) => (
                  <PlayerAvatar key={i} avatar={p.profiles?.avatar ?? "👤"} color={p.profiles?.avatar_color ?? "court"} size="sm" />
                ))}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold">
                  {winners.map(name).join(" & ")} <span className="font-normal text-muted-foreground">beat</span> {losers.map(name).join(" & ")}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {formatSets(m.sets, m.winner_team === 2)} · {m.venue || m.match_type} · {timeAgo(m.created_at)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 border-t px-3 py-2">
              <button
                onClick={() => bump.mutate({ matchId: m.id, on: mine })}
                className={cn("flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold active:scale-95", mine && "border-primary bg-primary/15 text-primary")}
              >
                🤜🤛 {bumps.length || ""}
                <span className={cn(bumps.length && "hidden")}>Fist bump</span>
              </button>
              {winners[0]?.user_id && (
                <Link to="/player/$id" params={{ id: winners[0].user_id }} className="text-xs font-bold text-muted-foreground">
                  View player
                </Link>
              )}
              {left > 0 && (
                <button
                  onClick={() => undo.mutate(m.id)}
                  disabled={undo.isPending}
                  className="ml-auto flex items-center gap-1 text-xs font-bold text-destructive"
                >
                  <Undo2 className="size-3" /> Undo ({left}m)
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}
