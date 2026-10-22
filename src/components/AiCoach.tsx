import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getMatchInsights } from "@/lib/insights.functions";
import { formatSets, type SetScore } from "@/lib/game";
import { cn } from "@/lib/utils";

type Row = { team: number; rating_delta: number; matches: { id: string; created_at: string; sets: SetScore[]; winner_team: number; venue: string | null } | null };

function Md({ text }: { text: string }) {
  return (
    <div className="space-y-1.5 text-sm leading-relaxed">
      {text.split("\n").filter((l) => l.trim()).map((l, i) => {
        const bullet = /^\s*([-*]|\d+\.)\s+/.test(l);
        const clean = l.replace(/^\s*([-*]|\d+\.)\s+/, "").replace(/^#+\s*/, "");
        const parts = clean.split(/\*\*(.+?)\*\*/g).map((p, j) => (j % 2 ? <strong key={j} className="text-primary">{p}</strong> : p));
        return bullet ? (
          <div key={i} className="flex gap-2"><span className="text-primary">•</span><span>{parts}</span></div>
        ) : (
          <p key={i}>{parts}</p>
        );
      })}
    </div>
  );
}

export function AiCoach({ userId }: { userId: string }) {
  const run = useServerFn(getMatchInsights);
  const [picked, setPicked] = useState<Set<string> | null>(null);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState<string | null>(null);

  const recent = useQuery({
    queryKey: ["coach-matches", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_players")
        .select("team,rating_delta,matches(id,created_at,sets,winner_team,venue)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data as unknown as Row[]).filter((r) => r.matches);
    },
  });
  const rows = recent.data ?? [];
  const sel = picked ?? new Set(rows.map((r) => r.matches!.id));
  const toggle = (id: string) => {
    const n = new Set(sel);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    setPicked(n);
  };

  const go = async () => {
    setBusy(true);
    setText(null);
    try {
      const r = await run({ data: { matchIds: [...sel] } });
      setText(r.text);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't get insights");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-6 rounded-3xl border border-accent/40 bg-accent/5 p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="size-5 text-accent" />
        <h2 className="font-display text-lg font-black uppercase tracking-wide">AI coach</h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Share your recent matches and get personal tips you can use next time on court. Only the matches you tick are sent.</p>

      {rows.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed p-4 text-center text-sm text-muted-foreground">Log a match to unlock coaching.</p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {rows.map((r) => {
              const m = r.matches!;
              const on = sel.has(m.id);
              const won = m.winner_team === r.team;
              return (
                <button
                  key={m.id}
                  onClick={() => toggle(m.id)}
                  className={cn("rounded-full border px-2.5 py-1 text-[11px] font-bold tabular-nums", on ? (won ? "border-win bg-win/15 text-win" : "border-destructive bg-destructive/15 text-destructive") : "opacity-40")}
                >
                  {won ? "W" : "L"} {formatSets(m.sets, r.team === 2)}
                </button>
              );
            })}
          </div>
          <button
            onClick={go}
            disabled={busy || sel.size === 0}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-3 font-display font-black uppercase text-accent-foreground disabled:opacity-50"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {busy ? "Analysing…" : `Get insights (${sel.size} match${sel.size === 1 ? "" : "es"})`}
          </button>
        </>
      )}

      {text && <div className="mt-4 rounded-2xl border bg-card p-4"><Md text={text} /></div>}
    </section>
  );
}
