import { cn } from "@/lib/utils";

export type SideStat = { wins: number; losses: number };

function pct(s: SideStat) {
  const t = s.wins + s.losses;
  return t ? Math.round((s.wins / t) * 100) : 0;
}

export function CourtSideSplit({ left, right }: { left: SideStat; right: SideStat }) {
  const sides: [string, SideStat, string][] = [
    ["Left", left, "text-court"],
    ["Right", right, "text-primary"],
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {sides.map(([label, s, tone]) => {
        const total = s.wins + s.losses;
        const p = pct(s);
        return (
          <div key={label} className="rounded-2xl border bg-card p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label} side</span>
              <span className={cn("font-display text-lg font-black tabular-nums", tone)}>{total ? `${p}%` : "—"}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div className={cn("h-full rounded-full", p >= 50 ? "bg-win" : "bg-destructive")} style={{ width: `${total ? p : 0}%` }} />
            </div>
            <div className="mt-1.5 text-xs text-muted-foreground tabular-nums">
              {total ? `${s.wins}W · ${s.losses}L` : "No matches tagged yet"}
            </div>
          </div>
        );
      })}
    </div>
  );
}
