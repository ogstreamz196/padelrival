import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PlayerProfile } from "@/components/PlayerProfile";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({ meta: [{ title: "Home — Padel Rival" }, { name: "description", content: "Your player card, streaks and recent matches." }] }),
  component: Home,
});

function Home() {
  const { user } = Route.useRouteContext();
  return (
    <AppShell>
      <PlayerProfile userId={user.id} isMe />
    </AppShell>
  );
}
