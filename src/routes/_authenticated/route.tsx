import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ViewModeProvider } from "@/hooks/use-view-mode";

// Guests can browse everything under here; screens that only make sense with an
// account (record, rivals, profile, onboarding, boss) add `beforeLoad: requireUser`.
export const Route = createFileRoute("/_authenticated")({
  staticData: { sitemap: "exclude-subtree" },
  ssr: false,
  beforeLoad: async (): Promise<{ user: User | null }> => {
    const { data } = await supabase.auth.getSession();
    return { user: data.session?.user ?? null };
  },
  component: Layout,
});

function Layout() {
  const { user } = Route.useRouteContext();
  // Same key as useMyProfile, so this shares its cached row.
  const me = useQuery({
    queryKey: ["me", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  return (
    <ViewModeProvider played={me.data ? me.data.wins + me.data.losses : 0}>
      <Outlet />
    </ViewModeProvider>
  );
}

export function requireUser({ context, location }: { context: { user: User | null }; location: { href: string } }) {
  if (!context.user) throw redirect({ to: "/auth", search: { mode: "up", redirect: location.href } });
  return { user: context.user };
}
