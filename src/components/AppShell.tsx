import { Link, Navigate, useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Home, MapPin, Megaphone, Plus, ScrollText, Swords, Trophy, User, UsersRound } from "lucide-react";
import { useAuthGate } from "@/components/AuthPrompt";
import { useMyProfile } from "@/hooks/use-auth";
import { useAppSettings } from "@/hooks/use-settings";
import { useNotifications } from "@/components/NotificationBell";
import { ViewModeToggle } from "@/hooks/use-view-mode";
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

/** `wide` lets data-heavy screens (the boss dashboard) use more of a desktop screen. */
export function AppShell({ children, hideNav, wide }: { children: ReactNode; hideNav?: boolean; wide?: boolean }) {
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

  const shown = !hideNav && (profile || !user);
  const navProps = (t: (typeof tabs)[number]) => ({
    active: pathname.startsWith(t.to),
    dot: t.to === "/home" && unread > 0 && !pathname.startsWith(t.to),
    onClick: (e: React.MouseEvent) => {
      if ("gate" in t && !gate(t.gate)) e.preventDefault();
    },
  });

  return (
    <div className="min-h-dvh">
      {shown && <SideRail navProps={navProps} />}
      <div
        className={cn(
          "mx-auto max-w-md pb-28",
          shown && "wide:ml-[var(--rail)] wide:pb-10",
          "wide:max-w-none wide:pr-[env(safe-area-inset-right)]",
        )}
      >
        <main
          className={cn(
            "px-4 pt-[max(env(safe-area-inset-top),1rem)] wide:mx-auto wide:px-6 wide:pt-6",
            // One width rule each: Tailwind orders the custom "wide" variant after lg/xl, so mixing them loses.
            wide ? "wide:max-w-6xl" : "wide:max-w-3xl",
          )}
        >
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
                  note.tone === "warning" ? "text-destructive" : note.tone === "promo" ? "text-fire" : "text-court",
                )}
              />
              <span>{note.text}</span>
            </div>
          )}
          {children}
        </main>
      </div>
      {shown && (
        <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] wide:hidden">
          <div className="flex items-end justify-around rounded-3xl border bg-card/90 px-2 py-2 backdrop-blur-xl">
            {tabs.map((t) => {
              const { active, dot, onClick } = navProps(t);
              const Icon = t.icon;
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

const EXTRA = [
  { to: "/beacons", label: "Open matches", icon: UsersRound },
  { to: "/venues", label: "Clubs", icon: MapPin },
  { to: "/compare", label: "Dossier", icon: ScrollText },
] as const;

type NavProps = (t: (typeof tabs)[number]) => { active: boolean; dot: boolean; onClick: (e: React.MouseEvent) => void };

/** Left-hand navigation for tablets, desktops and phones in landscape (replaces the bottom bar). */
function SideRail({ navProps }: { navProps: NavProps }) {
  const { pathname } = useLocation();
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[var(--rail)] flex-col border-r bg-card/70 pb-[max(env(safe-area-inset-bottom),0.75rem)] pl-[env(safe-area-inset-left)] pt-[max(env(safe-area-inset-top),0.75rem)] backdrop-blur-xl wide:flex">
      <Link to="/home" className="mb-4 flex items-center justify-center gap-2.5 px-3 lg:justify-start lg:px-5">
        <img src="/icon-192.png" alt="Padel Rival" width={36} height={36} className="size-9 rounded-xl" />
        <span className="hidden font-display text-base font-black lg:inline">PADEL RIVAL</span>
      </Link>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 lg:px-3">
        {tabs.map((t) => {
          const { active, dot, onClick } = navProps(t);
          const Icon = t.icon;
          if ("primary" in t) {
            return (
              <Link
                key={t.to}
                to={t.to}
                onClick={onClick}
                aria-label="Record a match"
                className="my-1 flex items-center justify-center gap-2 rounded-2xl bg-primary py-2.5 font-display text-sm font-black uppercase text-primary-foreground glow active:scale-95 lg:py-3"
              >
                <Icon className="size-5" strokeWidth={3} />
                <span className="hidden lg:inline">Record match</span>
              </Link>
            );
          }
          return (
            <Link
              key={t.to}
              to={t.to}
              onClick={onClick}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-[10px] font-bold uppercase tracking-wide transition-colors lg:flex-row lg:gap-3 lg:px-3 lg:text-sm lg:normal-case lg:tracking-normal",
                active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
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
        <div className="mt-4 hidden flex-col gap-1 border-t pt-4 lg:flex">
          {EXTRA.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold transition-colors",
                pathname.startsWith(to) ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          ))}
        </div>
      </nav>
      <div className="px-2 pt-3 lg:px-3">
        <div className="mb-1.5 hidden text-[10px] font-black uppercase tracking-widest text-muted-foreground lg:block">Detail</div>
        <ViewModeToggle className="hidden lg:flex" />
        <ViewModeToggle compact className="flex-col rounded-2xl lg:hidden" />
      </div>
    </aside>
  );
}
