import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { RivalryCard, type Rivalry } from "@/components/RivalryCard";
import { Empty } from "@/components/PlayerProfile";

export const Route = createFileRoute("/_authenticated/rivals")({
  head: () => ({ meta: [{ title: "Rivalries — Padel Rival" }, { name: "description", content: "Your head-to-head rivalries." }] }),
  component: Rivals,
});

function Rivals() {
  const { user } = Route.useRouteContext();
  const q = useQuery({
    queryKey: ["rivals", user.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_rivalries", { _user: user.id });
      if (error) throw error;
      return data as Rivalry[];
    },
  });
  const revenge = q.data?.filter((r) => r.losses > r.wins) ?? [];
  const rest = q.data?.filter((r) => r.losses <= r.wins) ?? [];
  return (
    <AppShell>
      <h1 className="text-3xl font-black">Rivalries</h1>
      <p className="mb-6 mt-1 text-muted-foreground">Face someone twice and it gets personal.</p>
      {q.isLoading ? null : !q.data?.length ? (
        <Empty>No rivalries yet. Play the same opponents again to unlock head-to-head records.</Empty>
      ) : (
        <div className="space-y-6">
          {revenge.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-black uppercase tracking-widest text-destructive">Unfinished business</h2>
              {revenge.map((r) => <RivalryCard key={r.opponent_id} r={r} meId={user.id} showRevenge />)}
            </section>
          )}
          {rest.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Holding the edge</h2>
              {rest.map((r) => <RivalryCard key={r.opponent_id} r={r} meId={user.id} />)}
            </section>
          )}
        </div>
      )}
    </AppShell>
  );
}
