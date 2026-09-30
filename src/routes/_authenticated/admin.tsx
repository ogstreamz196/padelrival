import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldAlert, Crown } from "lucide-react";
import { useIsAdmin } from "@/hooks/use-admin";
import { AppShell } from "@/components/AppShell";
import { BossPulse, BossTools } from "@/components/BossControls";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Boss controls — Padel Rival" },
      { name: "description", content: "Boss-only control panel for Padel Rival." },
      { property: "og:title", content: "Boss controls — Padel Rival" },
      { property: "og:description", content: "Boss-only control panel for Padel Rival." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { isAdmin, loading } = useIsAdmin();

  if (loading) {
    return (
      <AppShell>
        <div className="grid min-h-[60vh] place-items-center">
          <div className="size-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell>
        <div className="mt-24 text-center">
          <ShieldAlert className="mx-auto size-12 text-destructive" />
          <h1 className="mt-4 text-2xl font-black">Boss access only</h1>
          <p className="mt-2 text-sm text-muted-foreground">This control panel is not available on your account.</p>
          <Link to="/home" className="mt-6 inline-block rounded-2xl border px-5 py-3 font-bold">
            Back to home
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-5 flex items-center gap-2">
        <Crown className="size-6 text-primary" />
        <h1 className="text-3xl font-black">Boss controls</h1>
      </div>
      <BossPulse />
      <div className="mt-6">
        <BossTools />
      </div>
    </AppShell>
  );
}
