import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Swords } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { PageGuide } from "@/components/PageGuide";
import { RivalryCard, type Rivalry } from "@/components/RivalryCard";

export const Route = createFileRoute("/_authenticated/rivals")({
  head: () => ({
    meta: [
      { title: "Rivalries — Padel Rival" },
      { name: "description", content: "Your head-to-head rivalries." },
    ],
  }),
  component: Rivals,
});

function Rivals() {
  const { user } = Route.useRouteContext();
  const meId = user?.id ?? null;
  const q = useQuery({
    queryKey: ["rivals", meId],
    enabled: !!meId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_rivalries", { _user: meId! });
      if (error) throw error;
      return data as Rivalry[];
    },
  });
  const revenge = q.data?.filter((r) => r.losses > r.wins) ?? [];
  const rest = q.data?.filter((r) => r.losses <= r.wins) ?? [];
  return (
    <AppShell>
      <h1 className="text-3xl font-black">Rivalries</h1>
      <p className="mb-4 mt-1 text-muted-foreground">Face someone twice and it gets personal.</p>
      <PageGuide id="rivals" />
      {!meId ? (
        <GuestRivals />
      ) : q.isLoading ? null : !q.data?.length ? (
        <div className="rounded-3xl border border-dashed p-5 text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-muted">
            <Swords className="size-6 text-muted-foreground" />
          </div>
          <p className="mt-3 font-bold">No rivalries yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            A rivalry activates automatically the second time you face the same opponent.
          </p>
          <div className="mt-4 rounded-2xl border bg-card/60 p-3 text-left">
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Preview
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="font-bold text-muted-foreground">You vs Sam</span>
              <span className="font-display text-lg font-black text-muted-foreground">3 – 2</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Head-to-head record, revenge alerts and a one-tap rematch.
            </p>
          </div>
          <Link
            to="/record"
            className="mt-4 inline-block rounded-2xl bg-primary px-6 py-3 text-sm font-black uppercase tracking-wide text-primary-foreground"
          >
            Record a match
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {revenge.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-black uppercase tracking-widest text-destructive">
                Unfinished business
              </h2>
              {revenge.map((r) => (
                <RivalryCard key={r.opponent_id} r={r} meId={meId} showRevenge />
              ))}
            </section>
          )}
          {rest.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">
                Holding the edge
              </h2>
              {rest.map((r) => (
                <RivalryCard key={r.opponent_id} r={r} meId={meId} />
              ))}
            </section>
          )}
        </div>
      )}
    </AppShell>
  );
}

function GuestRivals() {
  return (
    <div className="space-y-3">
      <div className="rounded-3xl border bg-card p-4">
        <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          How it looks
        </div>
        {[
          ["You vs Sam & Priya", "3 – 2", "Holding the edge", "text-win"],
          ["You vs Alex & Jordan", "1 – 4", "Unfinished business", "text-destructive"],
        ].map(([who, score, tag, tone]) => (
          <div
            key={who}
            className="mt-3 flex items-center justify-between rounded-2xl border bg-background/40 p-3"
          >
            <div>
              <div className="text-sm font-bold">{who}</div>
              <div className={`text-[11px] font-black uppercase tracking-wide ${tone}`}>{tag}</div>
            </div>
            <span className="font-display text-xl font-black tabular-nums">{score}</span>
          </div>
        ))}
        <p className="mt-3 text-xs text-muted-foreground">
          Face the same players twice and a rivalry starts on its own. You get the head-to-head
          record, a revenge alert when someone is beating you, and a one-tap rematch.
        </p>
      </div>
      <Link
        to="/auth"
        search={{ mode: "up", redirect: "/rivals" }}
        className="block rounded-2xl bg-primary py-4 text-center font-display font-black uppercase text-primary-foreground glow"
      >
        Start tracking rivals free
      </Link>
      <Link to="/compare" className="block rounded-2xl border py-3 text-center text-sm font-bold">
        Compare any two players now
      </Link>
    </div>
  );
}
