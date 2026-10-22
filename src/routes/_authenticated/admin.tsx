import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ShieldAlert, Crown } from "lucide-react";
import { useIsAdmin } from "@/hooks/use-admin";
import { AppShell } from "@/components/AppShell";
import { MatchLog } from "@/components/BossControls";
import { OverviewPanel } from "@/components/boss/Overview";
import { PlayersPanel } from "@/components/boss/PlayersPanel";
import { ReportsPanel } from "@/components/boss/ReportsPanel";
import { LaunchPanel, MessagesPanel } from "@/components/boss/LaunchPanels";
import { ClubsPanel, GamesPanel } from "@/components/boss/ContentPanels";
import {
  LogPanel,
  PricingPanel,
  SettingsPanel,
  SystemPanel,
} from "@/components/boss/ControlPanels";
import { cn, haptic } from "@/lib/utils";
import { requireUser } from "./route";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "launch", label: "Launch" },
  { id: "players", label: "Players" },
  { id: "reports", label: "Reports" },
  { id: "matches", label: "Matches" },
  { id: "games", label: "Open matches" },
  { id: "clubs", label: "Clubs" },
  { id: "pricing", label: "Pricing" },
  { id: "messages", label: "Messages" },
  { id: "settings", label: "Settings" },
  { id: "system", label: "System" },
  { id: "log", label: "Log" },
] as const;
type Tab = (typeof TABS)[number]["id"];

export const Route = createFileRoute("/_authenticated/admin")({
  staticData: { sitemap: false },
  beforeLoad: requireUser,
  validateSearch: (s: Record<string, unknown>): { tab?: Tab | undefined } => ({
    tab: TABS.some((t) => t.id === s["tab"]) ? (s["tab"] as Tab) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Boss dashboard — Padel Rival" },
      { name: "description", content: "Boss-only control panel for Padel Rival." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { isAdmin, loading } = useIsAdmin();
  const { user } = Route.useRouteContext();
  const tab = Route.useSearch().tab ?? "overview";
  const navigate = useNavigate({ from: "/admin" });
  const go = (t: Tab) => {
    haptic();
    navigate({ search: { tab: t }, replace: true });
    window.scrollTo({ top: 0 });
  };

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
          <p className="mt-2 text-sm text-muted-foreground">
            This control panel is not available on your account.
          </p>
          <Link to="/home" className="mt-6 inline-block rounded-2xl border px-5 py-3 font-bold">
            Back to home
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell wide>
      <div className="mb-3 flex items-center gap-2">
        <Crown className="size-6 text-primary" />
        <h1 className="text-2xl font-black">Boss dashboard</h1>
      </div>

      <div className="sticky top-0 z-30 -mx-4 mb-4 bg-background/90 px-4 py-2 backdrop-blur-xl wide:-mx-6 wide:px-6">
        <div className="flex gap-1.5 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => go(t.id)}
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-2 text-xs font-black uppercase tracking-wide",
                tab === t.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "overview" && <OverviewPanel onOpen={go} />}
      {tab === "players" && <PlayersPanel meId={user.id} />}
      {tab === "launch" && <LaunchPanel onOpen={go} />}
      {tab === "messages" && <MessagesPanel />}
      {tab === "reports" && <ReportsPanel />}
      {tab === "matches" && <MatchLog />}
      {tab === "games" && <GamesPanel />}
      {tab === "clubs" && <ClubsPanel />}
      {tab === "pricing" && <PricingPanel />}
      {tab === "settings" && <SettingsPanel />}
      {tab === "system" && <SystemPanel />}
      {tab === "log" && <LogPanel />}
    </AppShell>
  );
}
