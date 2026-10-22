import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/** Players the signed-in user has blocked (RLS only returns your own rows; empty for guests). */
export function useBlockedIds() {
  return useQuery({
    queryKey: ["blocks"],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<string[]> => {
      const { data: s } = await supabase.auth.getSession();
      if (!s.session) return [];
      const { data, error } = await supabase.from("blocks").select("blocked");
      if (error) throw error;
      return data.map((r) => r.blocked);
    },
  });
}

/** `hidden(ids)` is true when any of the ids belongs to someone you've blocked. */
export function useHideBlocked() {
  const blocked = useBlockedIds().data;
  return useCallback(
    (ids: (string | null | undefined)[]) => !!blocked?.length && ids.some((id) => !!id && blocked.includes(id)),
    [blocked],
  );
}

export function useBlockToggle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, block }: { id: string; block: boolean }) => {
      const { error } = block
        ? await supabase.rpc("block_player", { _user: id })
        : await supabase.rpc("unblock_player", { _user: id });
      if (error) throw error;
      return block;
    },
    onSuccess: (block) => {
      toast.success(block ? "Player blocked. You won't see their games or matches." : "Player unblocked");
      qc.invalidateQueries({ queryKey: ["blocks"] });
      qc.invalidateQueries({ queryKey: ["friends"] });
      qc.invalidateQueries({ queryKey: ["beacons"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
