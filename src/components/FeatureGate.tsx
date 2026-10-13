import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { PauseCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useIsAdmin } from "@/hooks/use-admin";
import { useAppSettings, type Features } from "@/hooks/use-settings";

/** Shows a "paused" screen when the boss has switched a feature off (the boss still sees it). */
export function FeatureGate({
  feature,
  children,
}: {
  feature: keyof Features;
  children: ReactNode;
}) {
  const { settings, loading } = useAppSettings();
  const { isAdmin } = useIsAdmin();
  if (loading || settings.features[feature] || isAdmin) return <>{children}</>;
  return (
    <AppShell>
      <div className="mt-24 text-center">
        <PauseCircle className="mx-auto size-12 text-muted-foreground" />
        <h1 className="mt-4 text-2xl font-black">Taking a short break</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This part of the app is paused for now. Check back soon.
        </p>
        <Link to="/home" className="mt-6 inline-block rounded-2xl border px-5 py-3 font-bold">
          Back to home
        </Link>
      </div>
    </AppShell>
  );
}
