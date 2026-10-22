import { Link, Navigate, useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Home, Megaphone, Plus, Swords, Trophy, User } from "lucide-react";
import { useAuthGate } from "@/components/AuthPrompt";
import { useMyProfile } from "@/hooks/use-auth";
import { useAppSettings } from "@/hooks/use-settings";
import { useNotifications } from "@/components/NotificationBell";
import { cn } from "@/lib/utils";

// `gate` marks tabs that only make sense with an account; guests get the sign-up sheet instead.
const tabs = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/rivals", label: "Rivals", icon: Swords },
  { to: "/record", label: "Record", icon: Plus, primary: true },
  { to: "/leaderboard", label: "Ranks", icon: Trophy },
  {
    to: "/me",
    label: "Profile",
    icon: User,
    gate: "Create a free account to get your own player card.",
  },
] as const;

export function AppShell({ children, hideNav }: { children: ReactNode; hideNav?: boolean }) {
  const { user, profile, loading } = useMyProfile();
  const { gate } = useAuthGate();
  const { pathname } = useLocation();
  const { settings } = useAppSettings();
  const note = settings.announcement;
  const unread = (useNotifications(profile?.id).data ?? []).filter((n) => !n.read_at).length;

  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <div className="size-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }
  if (user && !profile && pathname !== "/onboarding") return <Navigate to="/onboarding" />;

  return (
    <div className="mx-auto min-h-dvh max-w-md pb-28">
      <main className="px-4 pt-[max(env(safe-area-inset-top),1rem)]">
        {note.enabled && note.text.trim() && (
          <div
            className={cn(
              "mb-4 flex items-start gap-2 rounded-2xl border px-3 py-2.5 text-sm",
              note.tone === "warning" && "border-destructive/50 bg-destructive/10",
              note.tone === "promo" && "border-fire/50 bg-fire/10",
              note.tone === "info" && "border-court/50 bg-court/10",
            )}
          >
            <Megaphone
              className={cn(
                "mt-0.5 size-4 shrink-0",
                note.tone === "warning"
                  ? "text-destructive"
                  : note.tone === "promo"
                    ? "text-fire"
                    : "text-court",
              )}
            />
            <span>{note.text}</span>
          </div>
        )}
        {children}
      </main>
      {!hideNav && (profile || !user) && (
        <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
          <div className="flex items-end justify-around rounded-3xl border bg-card/90 px-2 py-2 backdrop-blur-xl">
            {tabs.map((t) => {
              const active = pathname.startsWith(t.to);
              const Icon = t.icon;
              const dot = t.to === "/home" && unread > 0 && !active;
              const onClick = (e: React.MouseEvent) => {
                if ("gate" in t && !gate(t.gate)) e.preventDefault();
              };
              if ("primary" in t) {
                return (
                  <Link
                    key={t.to}
                    to={t.to}
                    onClick={onClick}
                    aria-label="Record a match"
                    className="-mt-8 grid size-16 place-items-center rounded-full bg-primary text-primary-foreground glow transition-transform active:scale-90"
                  >
                    <Icon className="size-8" strokeWidth={3} />
                  </Link>
                );
              }
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  onClick={onClick}
                  className={cn(
                    "flex w-14 flex-col items-center gap-1 rounded-xl py-1 text-[11px] font-semibold uppercase tracking-wide transition-colors",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <span className="relative">
                    <Icon className="size-5" />
                    {dot && <span className="absolute -right-1 -top-0.5 size-2 rounded-full bg-fire" aria-label="New notifications" />}
                  </span>
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
