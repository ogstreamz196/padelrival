import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** IDs of players the signed-in user follows (empty for guests). */
export function useFriendIds(meId: string | null | undefined) {
  return useQuery({
    queryKey: ["friends", meId],
    enabled: !!meId,
    queryFn: async () => {
      const { data, error } = await supabase.from("follows").select("followee_id").eq("follower_id", meId!);
      if (error) throw error;
      return data.map((r) => r.followee_id);
    },
  });
}

export function useToggleFollow(meId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, on }: { id: string; on: boolean }) => {
      if (!meId) throw new Error("Sign in to add friends");
      const q = on
        ? supabase.from("follows").delete().eq("follower_id", meId).eq("followee_id", id)
        : supabase.from("follows").insert({ follower_id: meId, followee_id: id });
      const { error } = await q;
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["friends", meId] }),
  });
}
