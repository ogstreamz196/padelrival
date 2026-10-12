import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Beacon } from "@/lib/beacons";

const PLAYER_COLS = "id,display_name,avatar,avatar_color,rating";

/** Upcoming beacons that are open or filled; games that started over 30 minutes ago drop off. */
export function useBeacons(limit = 50) {
  return useQuery({
    queryKey: ["beacons", limit],
    queryFn: async (): Promise<Beacon[]> => {
      const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("beacons")
        .select(
          `id,created_by,venue,scheduled_at,players_needed,target_tier,court_side,match_type,notes,status,
           host:profiles!beacons_created_by_fkey(${PLAYER_COLS}),
           beacon_players(user_id,joined_at,profiles(${PLAYER_COLS}))`,
        )
        .in("status", ["open", "filled"])
        .gte("scheduled_at", since)
        .order("scheduled_at", { ascending: true })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as Beacon[];
    },
  });
}

export type BeaconAction = "join" | "leave" | "cancel";

export function useBeaconAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action }: { id: string; action: BeaconAction }) => {
      const fn =
        action === "join" ? "join_beacon" : action === "leave" ? "leave_beacon" : "cancel_beacon";
      const { data, error } = await supabase.rpc(fn, { _beacon_id: id });
      if (error) throw error;
      return data;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["beacons"] }),
  });
}

/** Re-renders every `ms` so countdowns stay current. */
export function useNow(ms = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}
