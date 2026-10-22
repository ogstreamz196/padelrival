import { TrendingDown, TrendingUp } from "lucide-react";
import { tierProgress } from "@/lib/game";
import { cn } from "@/lib/utils";

/** Progress bar toward the next rank tier, with a "1 win gets you there" nudge. */
export function TierProgress({ rating, compact }: { rating: number; compact?: boolean }) {
  const t = tierProgress(rating);
  return (
    <div className={cn("rounded-2xl border bg-card p-3", compact && "border-0 bg-transparent p-0")}>
      <div className="flex items-end justify-between">
        <div className="text-xs font-black uppercase tracking-widest text-primary">{t.current}</div>
        <div className="text-xs font-bold text-muted-foreground">{t.next ?? "Top tier"}</div>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-background/60">
        <div className="h-full rounded-full bg-gradient-to-r from-primary to-court transition-all duration-700" style={{ width: `${t.pct}%` }} />
      </div>
      <div className="mt-1.5 text-xs text-muted-foreground">
        {t.next ? (
          <>
            <span className="font-bold tabular-nums text-foreground">{t.toGo}</span> rating to {t.next}
            {t.toGo <= 16 ? (
              <span className="ml-1 font-bold text-primary">· one win gets you there</span>
            ) : (
              <span className="ml-1">· about {Math.ceil(t.toGo / 16)} wins</span>
            )}
          </>
        ) : (
          "You're in the top tier — hold your ground."
        )}
      </div>
    </div>
  );
}

/** Last matches as W/L dots plus the net rating swing across them. */
export function FormStrip({ results, netDelta }: { results: boolean[]; netDelta: number }) {
  if (!results.length) return null;
  const up = netDelta >= 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        {results.map((w, i) => (
          <span
            key={i}
            title={w ? "Win" : "Loss"}
            className={cn(
              "grid size-5 place-items-center rounded-md text-[9px] font-black",
              w ? "bg-win/20 text-win" : "bg-destructive/20 text-destructive",
            )}
          >
            {w ? "W" : "L"}
          </span>
        ))}
      </div>
      <span className={cn("ml-auto inline-flex items-center gap-1 font-display text-sm font-black tabular-nums", up ? "text-win" : "text-destructive")}>
        {up ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
        {up ? "+" : ""}
        {netDelta}
      </span>
    </div>
  );
}
