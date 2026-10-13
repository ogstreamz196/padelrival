import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// Guests can browse everything under here; screens that only make sense with an
// account (record, rivals, profile, onboarding, boss) add `beforeLoad: requireUser`.
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async (): Promise<{ user: User | null }> => {
    const { data } = await supabase.auth.getSession();
    return { user: data.session?.user ?? null };
  },
  component: () => <Outlet />,
});

export function requireUser({ context, location }: { context: { user: User | null }; location: { href: string } }) {
  if (!context.user) throw redirect({ to: "/auth", search: { mode: "up", redirect: location.href } });
  return { user: context.user };
}
