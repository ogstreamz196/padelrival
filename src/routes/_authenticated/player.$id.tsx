import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ChevronLeft, Swords } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PlayerProfile } from "@/components/PlayerProfile";
import { FollowButton } from "@/components/FollowButton";
import { haptic } from "@/lib/utils";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/player/$id")({
  head: ({ params }) =>
    seo({
      title: "Padel player card — Padel Rival",
      description: "Padel player card with rating, form, rivalries and match history.",
      path: `/player/${params.id}`,
      noindex: true,
    }),
  component: PlayerPage,
});

function PlayerPage() {
  const { id } = Route.useParams();
  const { user } = Route.useRouteContext();
  const meId = user?.id ?? null;
  const router = useRouter();
  return (
    <AppShell>
      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => router.history.back()} className="flex items-center gap-1 text-sm font-bold text-muted-foreground">
          <ChevronLeft className="size-4" /> Back
        </button>
        {id !== meId && (
          <div className="flex items-center gap-2">
            <Link
              to="/compare"
              search={meId ? { p1: meId, p2: id } : { p1: id }}
              onClick={() => haptic()}
              className="flex items-center gap-1 rounded-full border bg-card px-3 py-1.5 text-xs font-black uppercase text-court active:scale-95"
            >
              <Swords className="size-3.5" /> {meId ? "Compare with me" : "Compare"}
            </Link>
            <FollowButton meId={meId} id={id} />
          </div>
        )}
      </div>
      <PlayerProfile userId={id} isMe={id === meId} />
    </AppShell>
  );
}
