import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, Swords } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PlayerProfile } from "@/components/PlayerProfile";
import { FollowButton } from "@/components/FollowButton";
import { SafetyMenu } from "@/components/SafetyMenu";
import { haptic } from "@/lib/utils";
import { seo } from "@/lib/seo";
import { useViewMode } from "@/hooks/use-view-mode";

export const Route = createFileRoute("/_authenticated/player/$id")({
  staticData: { sitemap: false },
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
  // Same key and query as PlayerProfile, so this shares its fetch.
  const player = useQuery({
    queryKey: ["profile", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });
  const { advanced } = useViewMode();
  return (
    <AppShell wide={advanced}>
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
              <Swords className="size-3.5" /> <span className="whitespace-nowrap">{meId ? <>Compare<span className="hidden min-[420px]:inline"> with me</span></> : "Compare"}</span>
            </Link>
            <FollowButton meId={meId} id={id} className="whitespace-nowrap" />
            <SafetyMenu meId={meId} userId={id} name={player.data?.display_name.split(" ")[0] ?? "this player"} />
          </div>
        )}
      </div>
      <PlayerProfile userId={id} isMe={id === meId} />
    </AppShell>
  );
}
