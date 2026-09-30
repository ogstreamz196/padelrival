import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/hooks/use-auth";

/**
 * Resolves whether the signed-in user has developer (boss) access.
 * claim_boss() is a no-op for everyone except the hard-coded boss email,
 * which it promotes to admin on first sign-in.
 */
export function useIsAdmin() {
  const { user, loading } = useUser();
  const q = useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      await supabase.rpc("claim_boss");
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .eq("role", "admin")
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });
  return { isAdmin: q.data === true, loading: loading || (!!user && q.isLoading) };
}
