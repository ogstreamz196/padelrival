import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PlayerProfile } from "@/components/PlayerProfile";
import { FollowButton } from "@/components/FollowButton";

export const Route = createFileRoute("/_authenticated/player/$id")({
  head: () => ({ meta: [{ title: "Player — Padel Rival" }, { name: "description", content: "Player card, rivalries and match history." }] }),
  component: PlayerPage,
});

function PlayerPage() {
  const { id } = Route.useParams();
  const { user } = Route.useRouteContext();
  const router = useRouter();
  return (
    <AppShell>
      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => router.history.back()} className="flex items-center gap-1 text-sm font-bold text-muted-foreground">
          <ChevronLeft className="size-4" /> Back
        </button>
        <FollowButton meId={user.id} id={id} />
      </div>
      <PlayerProfile userId={id} isMe={id === user.id} />
    </AppShell>
  );
}
