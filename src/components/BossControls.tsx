import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatSets } from "@/lib/game";

/** Recent matches with a delete-and-roll-back button. */
export function MatchLog() {
  const qc = useQueryClient();
  const matches = useQuery({
    queryKey: ["admin-matches"],
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

  return (
    <div className="space-y-3">
      {matches.isLoading && <p className="text-sm text-muted-foreground">Loading matches…</p>}
      {matches.data?.map((m) => {
        const roster = (m.players ?? []) as unknown as {
          team: number;
          name: string | null;
          delta: number;
        }[];
        const t1 = roster.filter((r) => r.team === 1);
        const t2 = roster.filter((r) => r.team === 2);
        return (
          <div key={m.id} className="rounded-2xl border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 text-sm">
                <p className="truncate font-bold">
                  {t1.map((r) => r.name).join(" & ")}{" "}
                  <span className="text-muted-foreground">vs</span>{" "}
                  {t2.map((r) => r.name).join(" & ")}
                </p>
                <p className="mt-1 font-display font-black">
                  {formatSets(m.sets as unknown as [number, number][])}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {new Date(m.created_at).toLocaleString()} · {m.match_type}
                  {m.venue ? ` · ${m.venue}` : ""} · by {m.creator ?? "—"}
                </p>
              </div>
              <button
                onClick={() => {
                  if (confirm("Delete this match and roll back all four players' stats?"))
                    voidMatch.mutate(m.id);
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
      {matches.data?.length === 0 && (
        <p className="text-sm text-muted-foreground">No matches logged yet.</p>
      )}
    </div>
  );
}
