import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ChevronLeft, Swords } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PlayerProfile } from "@/components/PlayerProfile";
import { FollowButton } from "@/components/FollowButton";
import { haptic } from "@/lib/utils";

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
        {id !== user.id && (
          <div className="flex items-center gap-2">
            <Link
              to="/compare"
              search={{ p1: user.id, p2: id }}
              onClick={() => haptic()}
              className="flex items-center gap-1 rounded-full border bg-card px-3 py-1.5 text-xs font-black uppercase text-court active:scale-95"
            >
              <Swords className="size-3.5" /> Compare with me
            </Link>
            <FollowButton meId={user.id} id={id} />
          </div>
        )}
      </div>
      <PlayerProfile userId={id} isMe={id === user.id} />
    </AppShell>
  );
}
