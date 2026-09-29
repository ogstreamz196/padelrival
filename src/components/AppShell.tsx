import { Link, Navigate, useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Home, Plus, Swords, Trophy, User } from "lucide-react";
import { useMyProfile } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/rivals", label: "Rivals", icon: Swords },
  { to: "/record", label: "Record", icon: Plus, primary: true },
  { to: "/leaderboard", label: "Ranks", icon: Trophy },
  { to: "/me", label: "Profile", icon: User },
] as const;

export function AppShell({ children, hideNav }: { children: ReactNode; hideNav?: boolean }) {
  const { profile, loading } = useMyProfile();
  const { pathname } = useLocation();

  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <div className="size-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!profile && pathname !== "/onboarding") return <Navigate to="/onboarding" />;

  return (
    <div className="mx-auto min-h-dvh max-w-md pb-28">
      <main className="px-4 pt-[max(env(safe-area-inset-top),1rem)]">{children}</main>
      {!hideNav && profile && (
        <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
          <div className="flex items-end justify-around rounded-3xl border bg-card/90 px-2 py-2 backdrop-blur-xl">
            {tabs.map((t) => {
              const active = pathname.startsWith(t.to);
              const Icon = t.icon;
              if ("primary" in t) {
                return (
                  <Link key={t.to} to={t.to} className="-mt-8 grid size-16 place-items-center rounded-full bg-primary text-primary-foreground glow transition-transform active:scale-90">
                    <Icon className="size-8" strokeWidth={3} />
                  </Link>
                );
              }
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  className={cn(
                    "flex w-14 flex-col items-center gap-1 rounded-xl py-1 text-[11px] font-semibold uppercase tracking-wide transition-colors",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <Icon className="size-5" />
                  {t.label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
