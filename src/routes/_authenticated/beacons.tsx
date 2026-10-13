import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Plus, Radio } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { BeaconCard } from "@/components/BeaconCard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useBeacons, useNow } from "@/hooks/use-beacons";
import { BEACON_SIDES, BEACON_TIERS, sideLabel, tierLabel } from "@/lib/beacons";
import { supabase } from "@/integrations/supabase/client";
import { cn, haptic } from "@/lib/utils";
import { useAuthGate } from "@/components/AuthPrompt";
import { FeatureGate } from "@/components/FeatureGate";

export const Route = createFileRoute("/_authenticated/beacons")({
  head: () => ({
    meta: [
      { title: "Need a 4th — Padel Rival" },
      {
        name: "description",
        content: "Open padel games near you that need one more player. Join in one tap.",
      },
    ],
  }),
  component: Beacons,
});

const DAY_FILTERS = [
  { id: "all", label: "Any day" },
  { id: "today", label: "Today" },
  { id: "tomorrow", label: "Tomorrow" },
  { id: "week", label: "Next 7 days" },
] as const;
type DayFilter = (typeof DAY_FILTERS)[number]["id"];

function inDay(iso: string, f: DayFilter) {
  if (f === "all") return true;
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  const diff = Math.round((day.getTime() - today.getTime()) / 86400000);
  if (f === "today") return diff <= 0;
  if (f === "tomorrow") return diff === 1;
  return diff < 7;
}

function Beacons() {
  return (
    <FeatureGate feature="beacons">
      <BeaconsPage />
    </FeatureGate>
  );
}

function BeaconsPage() {
  const { user } = Route.useRouteContext();
  const meId = user?.id ?? null;
  const { gate } = useAuthGate();
  const post = () => gate("Create a free account to post a game and let players join you.") && setOpen(true);
  const beacons = useBeacons();
  const now = useNow();
  const [venue, setVenue] = useState("all");
  const [day, setDay] = useState<DayFilter>("all");
  const [open, setOpen] = useState(false);

  const venues = useMemo(
    () => [...new Set((beacons.data ?? []).map((b) => b.venue))].sort(),
    [beacons.data],
  );
  const list = (beacons.data ?? []).filter(
    (b) => (venue === "all" || b.venue === venue) && inDay(b.scheduled_at, day),
  );
  const mine = list.filter((b) => b.beacon_players.some((p) => p.user_id === meId));
  const others = list.filter((b) => !b.beacon_players.some((p) => p.user_id === meId));

  return (
    <AppShell>
      <Link
        to="/home"
        className="mb-3 flex items-center gap-1 text-sm font-bold text-muted-foreground"
      >
        <ChevronLeft className="size-4" /> Home
      </Link>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black">Need a 4th</h1>
          <p className="mt-1 text-muted-foreground">Short of players? Light a beacon.</p>
        </div>
        <button
          onClick={() => {
            haptic();
            post();
          }}
          className="flex shrink-0 items-center gap-1 rounded-2xl bg-primary px-4 py-3 text-xs font-black uppercase text-primary-foreground glow active:scale-95"
        >
          <Plus className="size-4" strokeWidth={3} /> Post
        </button>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {DAY_FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setDay(f.id)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold",
              day === f.id ? "border-primary bg-primary/15 text-primary" : "text-muted-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      {venues.length > 1 && (
        <select
          value={venue}
          onChange={(e) => setVenue(e.target.value)}
          className="mt-2 w-full rounded-2xl border bg-card px-4 py-3 text-sm outline-none focus:border-primary"
        >
          <option value="all">All venues</option>
          {venues.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      )}

      {beacons.isLoading ? (
        <div className="mt-6 space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-3xl bg-card" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed p-6 text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-muted">
            <Radio className="size-6 text-muted-foreground" />
          </div>
          <p className="mt-3 font-bold">No open games right now</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Post one and share it to your WhatsApp group. Whoever taps first gets the spot.
          </p>
          <button
            onClick={post}
            className="mt-4 rounded-2xl bg-primary px-6 py-3 text-sm font-black uppercase tracking-wide text-primary-foreground"
          >
            Post a beacon
          </button>
        </div>
      ) : (
        <div className="mt-5 space-y-6">
          {mine.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-black uppercase tracking-widest text-primary">
                Your games
              </h2>
              {mine.map((b) => (
                <BeaconCard key={b.id} b={b} meId={meId} now={now} />
              ))}
            </section>
          )}
          {others.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">
                Open games
              </h2>
              {others.map((b) => (
                <BeaconCard key={b.id} b={b} meId={meId} now={now} />
              ))}
            </section>
          )}
        </div>
      )}

      {meId && <PostBeaconDialog open={open} onOpenChange={setOpen} meId={meId} />}
    </AppShell>
  );
}

/** Value for <input type="datetime-local"> in local time. */
function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultTime() {
  const d = new Date(Date.now() + 2 * 60 * 60 * 1000);
  d.setMinutes(d.getMinutes() < 30 ? 30 : 60, 0, 0);
  return toLocalInput(d);
}

function PostBeaconDialog({
  open,
  onOpenChange,
  meId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  meId: string;
}) {
  const qc = useQueryClient();
  const [venue, setVenue] = useState("");
  const [when, setWhen] = useState(defaultTime);
  const [needed, setNeeded] = useState(1);
  const [tier, setTier] = useState<string>("open");
  const [side, setSide] = useState<string>("any");
  const [type, setType] = useState<"competitive" | "friendly">("competitive");
  const [notes, setNotes] = useState("");

  // Venue suggestions: places I've played (most frequent first), then the club directory.
  const suggestions = useQuery({
    queryKey: ["venue-suggestions", meId],
    enabled: open,
    queryFn: async () => {
      const [mine, dir] = await Promise.all([
        supabase
          .from("match_players")
          .select("matches(venue)")
          .eq("user_id", meId)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase.from("venues").select("name").order("name"),
      ]);
      const counts = new Map<string, number>();
      for (const r of mine.data ?? []) {
        const v = (r.matches?.venue ?? "").trim();
        if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
      }
      const recent = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([v]) => v);
      const all = [...recent, ...(dir.data ?? []).map((v) => v.name)];
      return { recent: recent.slice(0, 4), all: [...new Set(all)] };
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("create_beacon", {
        _venue: venue.trim(),
        _scheduled_at: new Date(when).toISOString(),
        _players_needed: needed,
        _target_tier: tier,
        _court_side: side,
        _match_type: type,
        ...(notes.trim() ? { _notes: notes.trim() } : {}),
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      haptic(25);
      toast.success("Beacon is live — share it to your group!");
      qc.invalidateQueries({ queryKey: ["beacons"] });
      setNotes("");
      onOpenChange(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const ready = venue.trim().length > 0 && !!when && !create.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Post a beacon</DialogTitle>
          <DialogDescription>Tell the club you're short and when you're playing.</DialogDescription>
        </DialogHeader>

        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Venue
        </label>
        <input
          value={venue}
          onChange={(e) => setVenue(e.target.value)}
          list="beacon-venues"
          maxLength={120}
          placeholder="Club name"
          className="w-full rounded-2xl border bg-card px-4 py-3 outline-none focus:border-primary"
        />
        <datalist id="beacon-venues">
          {(suggestions.data?.all ?? []).map((v) => (
            <option key={v} value={v} />
          ))}
        </datalist>
        {(suggestions.data?.recent.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-2">
            {suggestions.data!.recent.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVenue(v)}
                className={cn(
                  "max-w-full truncate rounded-full border px-3 py-1.5 text-xs font-bold",
                  venue === v
                    ? "border-primary bg-primary/15 text-primary"
                    : "text-muted-foreground",
                )}
              >
                {v}
              </button>
            ))}
          </div>
        )}

        <label className="mt-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          When
        </label>
        <input
          type="datetime-local"
          value={when}
          min={toLocalInput(new Date())}
          onChange={(e) => setWhen(e.target.value)}
          className="w-full rounded-2xl border bg-card px-4 py-3 outline-none focus:border-primary"
        />

        <label className="mt-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Players needed
        </label>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setNeeded(n)}
              className={cn(
                "rounded-2xl border py-2.5 text-sm font-black",
                needed === n ? "border-primary bg-primary text-primary-foreground" : "bg-card",
              )}
            >
              {n}
            </button>
          ))}
        </div>

        <label className="mt-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Side preference
        </label>
        <div className="grid grid-cols-3 gap-2">
          {BEACON_SIDES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSide(s)}
              className={cn(
                "rounded-2xl border py-2.5 text-xs font-bold",
                side === s ? "border-court bg-court text-court-foreground" : "bg-card",
              )}
            >
              {sideLabel(s)}
            </button>
          ))}
        </div>

        <label className="mt-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Level
        </label>
        <div className="flex flex-wrap gap-2">
          {BEACON_TIERS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTier(t)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-bold",
                tier === t ? "border-primary bg-primary/15 text-primary" : "text-muted-foreground",
              )}
            >
              {tierLabel(t)}
            </button>
          ))}
        </div>

        <div className="mt-1 grid grid-cols-2 gap-2">
          {(["competitive", "friendly"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={cn(
                "rounded-2xl border py-2.5 text-sm font-bold capitalize",
                type === t ? "border-primary bg-primary text-primary-foreground" : "bg-card",
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={140}
          placeholder="Notes (optional) — e.g. court 3, bring balls"
          className="w-full rounded-2xl border bg-card px-4 py-3 text-sm outline-none focus:border-primary"
        />

        <button
          disabled={!ready}
          onClick={() => create.mutate()}
          className="mt-1 w-full rounded-2xl bg-primary py-4 font-display text-base font-black uppercase text-primary-foreground glow active:scale-[0.98] disabled:opacity-40"
        >
          {create.isPending ? "Posting…" : "Light the beacon"}
        </button>
      </DialogContent>
    </Dialog>
  );
}
