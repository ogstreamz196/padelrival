import { useState } from "react";
import { Lock, X } from "lucide-react";
import { ACHIEVEMENTS } from "@/lib/game";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/utils";

type Stats = { wins: number; best_streak: number };

/** How close the player is to an unlock, when we can work it out from their stats. */
function progressFor(code: string, s: Stats): { label: string; pct: number } | null {
  if (code === "first_win") return { label: `${Math.min(s.wins, 1)} / 1 win`, pct: Math.min(s.wins, 1) * 100 };
  if (code === "streak_3") return { label: `${Math.min(s.best_streak, 3)} / 3 in a row`, pct: (Math.min(s.best_streak, 3) / 3) * 100 };
  if (code === "streak_5") return { label: `${Math.min(s.best_streak, 5)} / 5 in a row`, pct: (Math.min(s.best_streak, 5) / 5) * 100 };
  return null;
}

export function TrophyCase({
  unlocked,
  stats,
}: {
  unlocked: Map<string, string>;
  stats: Stats;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const codes = Object.keys(ACHIEVEMENTS);
  const won = codes.filter((c) => unlocked.has(c)).length;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-bold text-muted-foreground">
          <span className="font-display text-base font-black text-foreground tabular-nums">{won}</span> / {codes.length} unlocked
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tap a trophy</span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {codes.map((code) => {
          const a = ACHIEVEMENTS[code]!;
          const on = unlocked.has(code);
          return (
            <button
              type="button"
              key={code}
              onClick={() => {
                haptic();
                setOpen(code);
              }}
              className={cn(
                "flex flex-col items-center gap-1 rounded-2xl border p-2 text-center transition active:scale-95",
                on
                  ? "border-primary/50 bg-gradient-to-b from-primary/20 to-transparent shadow-[0_10px_30px_-18px_var(--color-primary)]"
                  : "border-dashed opacity-45",
              )}
            >
              <span className={cn("text-2xl", !on && "grayscale")}>{on ? a.icon : "🔒"}</span>
              <span className="text-[10px] font-bold leading-tight">{a.name}</span>
            </button>
          );
        })}
      </div>

      {open && (
        <TrophyDetail
          code={open}
          unlockedAt={unlocked.get(open)}
          stats={stats}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}

function TrophyDetail({
  code,
  unlockedAt,
  stats,
  onClose,
}: {
  code: string;
  unlockedAt?: string | undefined;
  stats: Stats;
  onClose: () => void;
}) {
  const a = ACHIEVEMENTS[code]!;
  const on = !!unlockedAt;
  const prog = on ? null : progressFor(code, stats);

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-background/80 p-4 backdrop-blur-sm sm:place-items-center" onClick={onClose}>
      <div
        className="animate-rise w-full max-w-sm rounded-3xl border bg-card p-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" onClick={onClose} aria-label="Close" className="float-right -mr-2 -mt-2 rounded-xl p-2 text-muted-foreground">
          <X className="size-5" />
        </button>
        <div
          className={cn(
            "mx-auto grid size-24 place-items-center rounded-3xl text-5xl",
            on ? "animate-pop bg-gradient-to-b from-primary/30 to-transparent glow" : "bg-muted grayscale",
          )}
        >
          {on ? a.icon : <Lock className="size-10 text-muted-foreground" />}
        </div>
        <h3 className="mt-4 font-display text-2xl font-black">{a.name}</h3>
        <p className="mt-1 text-sm font-semibold text-primary">{a.desc}</p>
        <p className="mt-3 text-sm text-muted-foreground">{a.lore}</p>

        {on ? (
          <p className="mt-4 rounded-2xl border bg-background/50 p-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Unlocked {new Date(unlockedAt!).toLocaleDateString()}
          </p>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed p-3">
            {prog ? (
              <>
                <div className="h-2 overflow-hidden rounded-full bg-background/60">
                  <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${prog.pct}%` }} />
                </div>
                <div className="mt-2 text-xs font-bold text-muted-foreground">{prog.label}</div>
              </>
            ) : (
              <div className="text-xs font-bold text-muted-foreground">Still locked — keep playing to earn it.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
