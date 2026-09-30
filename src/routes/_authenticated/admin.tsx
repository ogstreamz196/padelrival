import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ShieldAlert, Trash2, Users, Swords, Activity, Crown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/use-admin";
import { AppShell } from "@/components/AppShell";
import { formatSets } from "@/lib/game";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Developer panel — Padel Rival" },
      { name: "description", content: "Boss-only control panel for Padel Rival." },
      { property: "og:title", content: "Developer panel — Padel Rival" },
      { property: "og:description", content: "Boss-only control panel for Padel Rival." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

type Stats = {
  players: number;
  matches: number;
  matches_week: number;
  matches_today: number;
  reactions: number;
  achievements: number;
  guest_slots: number;
  active_week: number;
  top_rating: number | null;
};

function AdminPage() {
  const { isAdmin, loading } = useIsAdmin();
  const [tab, setTab] = useState<"players" | "matches">("players");
  const qc = useQueryClient();

  const stats = useQuery({
    queryKey: ["admin-stats"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_stats");
      if (error) throw error;
      return data as unknown as Stats;
    },
  });

  const players = useQuery({
    queryKey: ["admin-players"],
    enabled: isAdmin && tab === "players",
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_players");
      if (error) throw error;
      return data ?? [];
    },
  });

  const matches = useQuery({
    queryKey: ["admin-matches"],
    enabled: isAdmin && tab === "matches",
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_matches", { _limit: 50 });
      if (error) throw error;
      return data ?? [];
    },
  });

  const voidMatch = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("admin_void_match", { _match_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Match removed and ratings rolled back");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setRating = useMutation({
    mutationFn: async ({ id, rating }: { id: string; rating: number }) => {
      const { error } = await supabase.rpc("admin_set_rating", { _user: id, _rating: rating });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rating updated");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

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
          <p className="mt-2 text-sm text-muted-foreground">This control panel is not available on your account.</p>
          <Link to="/home" className="mt-6 inline-block rounded-2xl border px-5 py-3 font-bold">
            Back to home
          </Link>
        </div>
      </AppShell>
    );
  }

  const s = stats.data;

  return (
    <AppShell>
      <div className="mb-5 flex items-center gap-2">
        <Crown className="size-6 text-primary" />
        <h1 className="text-3xl font-black">Boss panel</h1>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat icon={Users} label="Players" value={s?.players} />
        <Stat icon={Swords} label="Matches" value={s?.matches} />
        <Stat icon={Activity} label="This week" value={s?.matches_week} />
        <Stat icon={Activity} label="Today" value={s?.matches_today} />
        <Stat icon={Users} label="Active (7d)" value={s?.active_week} />
        <Stat icon={Crown} label="Top Elo" value={s?.top_rating ?? 0} />
        <Stat icon={Users} label="Guest slots" value={s?.guest_slots} />
        <Stat icon={Crown} label="Badges won" value={s?.achievements} />
      </div>

      <div className="mt-6 flex gap-2">
        {(["players", "matches"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-2xl border py-3 text-xs font-black uppercase tracking-wide ${
              tab === t ? "border-primary text-primary" : "text-muted-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "players" && (
        <div className="mt-4 space-y-3">
          {players.isLoading && <p className="text-sm text-muted-foreground">Loading players…</p>}
          {players.data?.map((p) => (
            <div key={p.id} className="rounded-2xl border bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-bold">
                    {p.avatar} {p.display_name}{" "}
                    {p.is_admin && <span className="ml-1 text-[10px] font-black uppercase text-primary">boss</span>}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    @{p.username} · {p.email ?? "no email"}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-display text-xl font-black">{p.rating}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {p.wins}W {p.losses}L
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <RatingEditor current={p.rating} onSave={(rating) => setRating.mutate({ id: p.id, rating })} />
                <Link
                  to="/player/$id"
                  params={{ id: p.id }}
                  className="rounded-xl border px-3 py-2 text-xs font-bold text-muted-foreground"
                >
                  View card
                </Link>
              </div>
            </div>
          ))}
          {players.data?.length === 0 && <p className="text-sm text-muted-foreground">No players yet.</p>}
        </div>
      )}

      {tab === "matches" && (
        <div className="mt-4 space-y-3">
          {matches.isLoading && <p className="text-sm text-muted-foreground">Loading matches…</p>}
          {matches.data?.map((m) => {
            const roster = (m.players ?? []) as { team: number; name: string | null; delta: number }[];
            const t1 = roster.filter((r) => r.team === 1);
            const t2 = roster.filter((r) => r.team === 2);
            return (
              <div key={m.id} className="rounded-2xl border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 text-sm">
                    <p className="truncate font-bold">
                      {t1.map((r) => r.name).join(" & ")} <span className="text-muted-foreground">vs</span>{" "}
                      {t2.map((r) => r.name).join(" & ")}
                    </p>
                    <p className="mt-1 font-display font-black">{formatSets(m.sets as number[][])}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {new Date(m.created_at).toLocaleString()} · {m.match_type}
                      {m.venue ? ` · ${m.venue}` : ""} · by {m.creator ?? "—"}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm("Delete this match and roll back all four players' stats?")) voidMatch.mutate(m.id);
                    }}
                    className="shrink-0 rounded-xl border border-destructive/40 p-2 text-destructive"
                    aria-label="Delete match"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            );
          })}
          {matches.data?.length === 0 && <p className="text-sm text-muted-foreground">No matches logged yet.</p>}
        </div>
      )}
    </AppShell>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Users; label: string; value?: number }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <Icon className="size-4 text-muted-foreground" />
      <p className="mt-2 font-display text-2xl font-black">{value ?? "—"}</p>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}

function RatingEditor({ current, onSave }: { current: number; onSave: (rating: number) => void }) {
  const [value, setValue] = useState(String(current));
  return (
    <div className="flex items-center gap-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value.replace(/\D/g, "").slice(0, 4))}
        inputMode="numeric"
        className="w-20 rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        aria-label="Rating"
      />
      <button
        onClick={() => {
          const n = Number(value);
          if (!Number.isFinite(n)) return;
          onSave(n);
        }}
        disabled={value === String(current) || value === ""}
        className="rounded-xl border px-3 py-2 text-xs font-bold disabled:opacity-40"
      >
        Set Elo
      </button>
    </div>
  );
}
