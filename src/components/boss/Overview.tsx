import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Activity,
  CalendarCheck,
  Crown,
  MapPin,
  Radio,
  ShieldCheck,
  Sparkles,
  Swords,
  UserPlus,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { adminHealth } from "@/lib/admin.functions";
import { cn } from "@/lib/utils";
import { Panel, StatTile } from "./shared";

type Overview = Record<
  | "players"
  | "signups_today"
  | "signups_week"
  | "active_week"
  | "matches"
  | "matches_today"
  | "matches_week"
  | "open_beacons"
  | "beacons_week"
  | "checkins_today"
  | "venues"
  | "pro"
  | "admins"
  | "reactions",
  number
> & { top_rating: number | null };

export function useHealth(enabled = true) {
  const run = useServerFn(adminHealth);
  return useQuery({
    queryKey: ["admin-health"],
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: () => run(),
  });
}

export function OverviewPanel({
  onOpen,
}: {
  onOpen: (tab: "system" | "players" | "pricing") => void;
}) {
  const stats = useQuery({
    queryKey: ["admin-overview"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_overview");
      if (error) throw error;
      return data as unknown as Overview;
    },
  });
  const activity = useQuery({
    queryKey: ["admin-activity"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_activity", { _days: 14 });
      if (error) throw error;
      return data.map((d) => ({
        ...d,
        signups: Number(d.signups),
        matches: Number(d.matches),
        beacons: Number(d.beacons),
      }));
    },
  });
  const health = useHealth();
  const s = stats.data;
  const down = (health.data ?? []).filter((h) => h.status === "down");
  const live = (health.data ?? []).filter((h) => h.status === "live").length;

  return (
    <div className="space-y-4">
      {stats.error && (
        <p className="rounded-2xl border border-destructive/50 bg-destructive/10 p-3 text-sm">
          Couldn't load stats: {stats.error.message}. If this mentions a missing function, run the
          latest SQL migration.
        </p>
      )}

      <button
        onClick={() => onOpen("system")}
        className={cn(
          "flex w-full items-center gap-3 rounded-3xl border p-4 text-left",
          health.isLoading
            ? "bg-card"
            : down.length
              ? "border-destructive/60 bg-destructive/10"
              : "border-win/50 bg-win/10",
        )}
      >
        <ShieldCheck
          className={cn("size-6 shrink-0", down.length ? "text-destructive" : "text-win")}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black">
            {health.isLoading
              ? "Checking systems…"
              : down.length
                ? `${down.length} system${down.length > 1 ? "s" : ""} need attention`
                : "All systems running"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {health.isLoading
              ? "Database, sign-in, AI coach and integrations"
              : down.length
                ? down.map((d) => d.name).join(", ")
                : `${live} services live`}
          </p>
        </div>
        <span className="text-xs font-bold text-muted-foreground">Details</span>
      </button>

      <Panel title="Players">
        <div className="grid grid-cols-3 gap-2">
          <StatTile icon={Users} label="Total" value={s?.players} />
          <StatTile
            icon={UserPlus}
            label="New today"
            value={s?.signups_today}
            tone="text-primary"
          />
          <StatTile icon={UserPlus} label="New 7d" value={s?.signups_week} />
          <StatTile icon={Activity} label="Active 7d" value={s?.active_week} tone="text-win" />
          <StatTile icon={Sparkles} label="Pro" value={s?.pro} tone="text-fire" />
          <StatTile icon={Crown} label="Top Elo" value={s?.top_rating ?? 0} />
        </div>
      </Panel>

      <Panel title="Activity">
        <div className="grid grid-cols-3 gap-2">
          <StatTile icon={Swords} label="Matches" value={s?.matches} />
          <StatTile icon={Swords} label="Today" value={s?.matches_today} tone="text-primary" />
          <StatTile icon={Swords} label="7 days" value={s?.matches_week} />
          <StatTile icon={Radio} label="Open games" value={s?.open_beacons} tone="text-primary" />
          <StatTile icon={CalendarCheck} label="Check-ins today" value={s?.checkins_today} />
          <StatTile icon={MapPin} label="Clubs" value={s?.venues} />
        </div>
      </Panel>

      <Panel title="Last 14 days">
        {activity.data ? (
          <div className="space-y-4">
            <MiniBars
              label="Sign-ups"
              rows={activity.data.map((d) => ({ day: d.day, v: d.signups }))}
            />
            <MiniBars
              label="Matches recorded"
              rows={activity.data.map((d) => ({ day: d.day, v: d.matches }))}
            />
            <MiniBars
              label="Games posted"
              rows={activity.data.map((d) => ({ day: d.day, v: d.beacons }))}
            />
          </div>
        ) : (
          <div className="h-40 animate-pulse rounded-2xl bg-muted" />
        )}
      </Panel>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onOpen("players")}
          className="rounded-2xl border bg-card py-3 text-xs font-black uppercase tracking-wide"
        >
          Manage players
        </button>
        <button
          onClick={() => onOpen("pricing")}
          className="rounded-2xl border bg-card py-3 text-xs font-black uppercase tracking-wide"
        >
          Pricing & offer
        </button>
      </div>
    </div>
  );
}

const dayLabel = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString([], {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

/** One measure per chart (small multiples), so each bar reads against its own axis. Tap or hover a bar for its value. */
function MiniBars({ label, rows }: { label: string; rows: { day: string; v: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...rows.map((r) => r.v));
  const total = rows.reduce((a, r) => a + r.v, 0);
  const shown = hover !== null ? rows[hover] : null;
  return (
    <figure>
      <figcaption className="mb-1.5 flex items-baseline justify-between text-xs">
        <span className="font-bold">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {shown ? (
            <>
              {dayLabel(shown.day)} · <span className="font-black text-foreground">{shown.v}</span>
            </>
          ) : (
            <>
              <span className="font-black text-foreground">{total}</span> in 14 days
            </>
          )}
        </span>
      </figcaption>
      <div
        className="flex h-16 items-end gap-[2px] border-b border-border"
        onMouseLeave={() => setHover(null)}
      >
        {rows.map((r, i) => (
          <button
            key={r.day}
            type="button"
            aria-label={`${dayLabel(r.day)}: ${r.v}`}
            onMouseEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
            onClick={() => setHover(hover === i ? null : i)}
            className="flex h-full flex-1 items-end"
          >
            <span
              className={cn(
                "block w-full rounded-t-[4px] transition-opacity",
                hover === null || hover === i ? "bg-primary" : "bg-primary/40",
              )}
              style={{
                height: r.v ? `${Math.max(6, (r.v / max) * 100)}%` : "2px",
                opacity: r.v ? 1 : 0.35,
              }}
            />
          </button>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>{rows[0] ? dayLabel(rows[0].day) : ""}</span>
        <span>Today</span>
      </div>
    </figure>
  );
}
