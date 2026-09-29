import { Link } from "@tanstack/react-router";
import { PlayerAvatar } from "./PlayerAvatar";
import { cn } from "@/lib/utils";

export type Rivalry = {
  opponent_id: string;
  username: string;
  display_name: string;
  avatar: string;
  avatar_color: string;
  rating: number;
  matches: number;
  wins: number;
  losses: number;
  sets_won: number;
  sets_lost: number;
  last_winner: string;
  last_played: string;
};

export function RivalryCard({ r, meId, showRevenge }: { r: Rivalry; meId: string; showRevenge?: boolean }) {
  const trailing = r.losses > r.wins;
  const leading = r.wins > r.losses;
  const lastMine = r.last_winner === meId;
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      {showRevenge && trailing && (
        <Link
          to="/record"
          search={{ opp: r.opponent_id }}
          className="flex items-center justify-between bg-destructive px-4 py-2 text-sm font-black uppercase tracking-wider text-destructive-foreground"
        >
          <span>⚔️ Revenge match available</span>
          <span>Play →</span>
        </Link>
      )}
      <Link to="/player/$id" params={{ id: r.opponent_id }} className="flex items-center gap-3 p-4">
        <PlayerAvatar avatar={r.avatar} color={r.avatar_color} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-bold">{r.display_name}</div>
          <div className="text-xs text-muted-foreground">
            {r.matches} meetings · Sets {r.sets_won}-{r.sets_lost} · Last: {lastMine ? "You" : r.display_name.split(" ")[0]}
          </div>
        </div>
        <div className="text-right">
          <div className={cn("font-display text-2xl font-black tabular-nums", leading ? "text-win" : trailing ? "text-destructive" : "text-foreground")}>
            {r.wins}-{r.losses}
          </div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">H2H</div>
        </div>
      </Link>
    </div>
  );
}
