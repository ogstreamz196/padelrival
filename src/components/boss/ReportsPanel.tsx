import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, Check, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const REASON: Record<string, string> = {
  abuse: "Abusive or threatening",
  fake_result: "Fake or wrong result",
  cheating: "Rating manipulation",
  inappropriate: "Inappropriate name or picture",
  spam: "Spam or scam",
  other: "Something else",
};
const KIND: Record<string, string> = { player: "Player", match: "Match", open_match: "Open match" };
const FILTERS = [
  { id: "open", label: "To review" },
  { id: "actioned", label: "Actioned" },
  { id: "dismissed", label: "Dismissed" },
  { id: "all", label: "All" },
] as const;

/** Player reports: review each one, then mark it actioned or dismissed. */
export function ReportsPanel() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<(typeof FILTERS)[number]["id"]>("open");
  const reports = useQuery({
    queryKey: ["admin-reports", status],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_reports", { _status: status });
      if (error) throw error;
      return data;
    },
  });
  const resolve = useMutation({
    mutationFn: async ({ id, to }: { id: number; to: string }) => {
      const { error } = await supabase.rpc("admin_resolve_report", { _id: id, _status: to });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-reports"] });
      qc.invalidateQueries({ queryKey: ["admin-log"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setStatus(f.id)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-bold",
              status === f.id ? "border-primary bg-primary/15 text-primary" : "text-muted-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Google expects reports to be looked at promptly. To act on a player, open them in the Players tab to
        suspend or delete the account, or use Matches to void a fake result.
      </p>
      {reports.isLoading && <p className="text-sm text-muted-foreground">Loading reports…</p>}
      {reports.data && !reports.data.length && (
        <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          {status === "open" ? "Nothing to review. 🎉" : "No reports here."}
        </p>
      )}
      <div className="grid gap-2 lg:grid-cols-2">
        {reports.data?.map((r) => (
          <article key={r.id} className="rounded-2xl border bg-card p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-black">{REASON[r.reason] ?? r.reason}</p>
                <p className="text-xs text-muted-foreground">
                  {KIND[r.kind] ?? r.kind} · {new Date(r.created_at).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black uppercase",
                  r.status === "open" ? "bg-fire/15 text-fire" : r.status === "actioned" ? "bg-win/15 text-win" : "bg-muted text-muted-foreground",
                )}
              >
                {r.status}
              </span>
            </div>
            <p className="mt-2 text-xs">
              <span className="text-muted-foreground">About </span>
              {r.target_user ? (
                <Link to="/player/$id" params={{ id: r.target_user }} className="font-bold underline-offset-2 hover:underline">
                  {r.target_name ?? "Deleted player"}
                </Link>
              ) : (
                <span className="font-bold">Deleted player</span>
              )}
              {r.target_username && <span className="text-muted-foreground"> @{r.target_username}</span>}
              {Number(r.target_reports) > 1 && (
                <span className="ml-1 inline-flex items-center gap-0.5 rounded-full bg-destructive/15 px-1.5 text-[10px] font-black text-destructive">
                  <Ban className="size-3" /> {r.target_reports} reports
                </span>
              )}
              <span className="text-muted-foreground"> · from {r.reporter_name ?? "deleted player"}</span>
            </p>
            {r.details && <p className="mt-2 rounded-xl bg-background/50 p-2 text-xs italic">“{r.details}”</p>}
            {r.target_id && <p className="mt-1 truncate text-[10px] text-muted-foreground">ID {r.target_id}</p>}
            <div className="mt-3 flex gap-2">
              {r.status === "open" ? (
                <>
                  <button
                    onClick={() => resolve.mutate({ id: r.id, to: "actioned" })}
                    className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-primary py-2 text-xs font-black uppercase text-primary-foreground"
                  >
                    <Check className="size-3.5" /> Actioned
                  </button>
                  <button
                    onClick={() => resolve.mutate({ id: r.id, to: "dismissed" })}
                    className="flex flex-1 items-center justify-center gap-1 rounded-xl border py-2 text-xs font-bold"
                  >
                    <X className="size-3.5" /> Dismiss
                  </button>
                </>
              ) : (
                <button
                  onClick={() => resolve.mutate({ id: r.id, to: "open" })}
                  className="flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-bold text-muted-foreground"
                >
                  <RotateCcw className="size-3.5" /> Reopen
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
