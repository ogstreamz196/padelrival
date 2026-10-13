import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarCheck,
  ChevronLeft,
  ExternalLink,
  MapPin,
  Search,
  Star,
  Swords,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { PageGuide } from "@/components/PageGuide";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { useAuthGate } from "@/components/AuthPrompt";
import { FeatureGate } from "@/components/FeatureGate";
import { useBeacons } from "@/hooks/use-beacons";
import { useFriendIds } from "@/hooks/use-friends";
import { supabase } from "@/integrations/supabase/client";
import { cn, haptic } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/venues")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Clubs — Padel Rival" },
      {
        name: "description",
        content:
          "Find padel clubs, book a court, see who is playing today and open a match at any club.",
      },
    ],
  }),
  component: Venues,
});

type Venue = {
  id: string;
  name: string;
  city: string;
  postcode: string | null;
  courts_count: number;
  court_type: string;
  booking_url: string | null;
};

type Checkin = {
  venue_id: string;
  user_id: string;
  profiles: { id: string; display_name: string; avatar: string; avatar_color: string } | null;
};

/** Check-ins are keyed by the database's date (UTC), matching `current_date` in the RLS policy. */
function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function bookingLink(v: Venue) {
  return (
    v.booking_url ||
    `https://www.google.com/search?q=${encodeURIComponent(`${v.name} ${v.city} padel court booking`)}`
  );
}

const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

// Starred clubs are a per-device convenience, so they live in browser storage.
const STAR_KEY = "starredClubs";
function useStars() {
  const [stars, setStars] = useState<string[]>([]);
  useEffect(() => {
    try {
      setStars(JSON.parse(localStorage.getItem(STAR_KEY) ?? "[]") as string[]);
    } catch {
      /* storage blocked */
    }
  }, []);
  const toggle = (id: string) =>
    setStars((cur) => {
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      try {
        localStorage.setItem(STAR_KEY, JSON.stringify(next));
      } catch {
        /* storage blocked */
      }
      return next;
    });
  return { stars, toggle };
}

function Venues() {
  return (
    <FeatureGate feature="venues">
      <VenuesPage />
    </FeatureGate>
  );
}

function VenuesPage() {
  const { user } = Route.useRouteContext();
  const meId = user?.id ?? null;
  const { gate } = useAuthGate();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [city, setCity] = useState<string>("all");
  const { stars, toggle: toggleStar } = useStars();
  const friends = useFriendIds(meId);
  const beacons = useBeacons(100);
  const day = todayKey();

  const venues = useQuery({
    queryKey: ["venues"],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.from("venues").select("*").order("name");
      if (error) throw error;
      return data as Venue[];
    },
  });

  // How many matches have been logged at each club (matched on the club name).
  const played = useQuery({
    queryKey: ["venue-match-counts"],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("matches")
        .select("venue")
        .not("venue", "is", null)
        .limit(2000);
      const counts = new Map<string, number>();
      for (const r of data ?? []) counts.set(norm(r.venue), (counts.get(norm(r.venue)) ?? 0) + 1);
      return counts;
    },
  });

  const checkinsKey = ["venue-checkins", day];
  const checkins = useQuery({
    queryKey: checkinsKey,
    enabled: !!meId,
    queryFn: async (): Promise<Checkin[]> => {
      const { data, error } = await supabase
        .from("venue_checkins")
        .select("venue_id,user_id,profiles(id,display_name,avatar,avatar_color)")
        .eq("playing_at", day);
      if (error) throw error;
      return (data ?? []) as Checkin[];
    },
  });

  const toggle = useMutation({
    mutationFn: async ({ venueId, on }: { venueId: string; on: boolean }) => {
      const res = on
        ? await supabase
            .from("venue_checkins")
            .delete()
            .eq("venue_id", venueId)
            .eq("user_id", meId!)
            .eq("playing_at", day)
        : await supabase.from("venue_checkins").insert({ venue_id: venueId, user_id: meId! });
      if (res.error) throw res.error;
    },
    onMutate: async ({ venueId, on }) => {
      await qc.cancelQueries({ queryKey: checkinsKey });
      const prev = qc.getQueryData<Checkin[]>(checkinsKey);
      qc.setQueryData<Checkin[]>(checkinsKey, (old = []) =>
        on
          ? old.filter((c) => !(c.venue_id === venueId && c.user_id === meId))
          : [...old, { venue_id: venueId, user_id: meId!, profiles: null }],
      );
      return { prev };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(checkinsKey, ctx.prev);
      toast.error(e.message);
    },
    onSuccess: (_d, { on }) =>
      toast.success(on ? "Check-in removed" : "You're down as playing here today"),
    onSettled: () => qc.invalidateQueries({ queryKey: checkinsKey }),
  });

  const all = useMemo(() => venues.data ?? [], [venues.data]);
  const cities = useMemo(() => {
    const counts = new Map<string, number>();
    for (const v of all) counts.set(v.city, (counts.get(v.city) ?? 0) + 1);
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([c]) => c);
  }, [all]);

  const friendSet = new Set(friends.data ?? []);
  const byVenue = new Map<string, Checkin[]>();
  for (const c of checkins.data ?? [])
    byVenue.set(c.venue_id, [...(byVenue.get(c.venue_id) ?? []), c]);
  const openByName = new Map<string, number>();
  for (const b of beacons.data ?? [])
    if (b.status === "open")
      openByName.set(norm(b.venue), (openByName.get(norm(b.venue)) ?? 0) + 1);

  const term = q.trim().toLowerCase();
  const list = all.filter((v) => {
    if (city === "starred" && !stars.includes(v.id)) return false;
    if (city !== "all" && city !== "starred" && v.city !== city) return false;
    return !term || `${v.name} ${v.city} ${v.postcode ?? ""}`.toLowerCase().includes(term);
  });

  // Starred, checked-in and busy clubs float to the top.
  const score = (v: Venue) => {
    const cs = byVenue.get(v.id) ?? [];
    return (
      (stars.includes(v.id) ? 1000 : 0) +
      (cs.some((c) => c.user_id === meId) ? 500 : 0) +
      cs.filter((c) => friendSet.has(c.user_id)).length * 50 +
      (openByName.get(norm(v.name)) ?? 0) * 20 +
      cs.length * 5 +
      Math.min(played.data?.get(norm(v.name)) ?? 0, 4)
    );
  };
  const sorted = [...list].sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name));
  const onCourtToday = checkins.data?.length ?? 0;
  const openTotal = [...openByName.values()].reduce((a, n) => a + n, 0);

  const chip = (id: string, label: React.ReactNode) => (
    <button
      key={id}
      onClick={() => setCity(id)}
      className={cn(
        "flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold",
        city === id ? "border-primary bg-primary/15 text-primary" : "text-muted-foreground",
      )}
    >
      {label}
    </button>
  );

  return (
    <AppShell>
      <Link
        to="/home"
        className="mb-3 flex items-center gap-1 text-sm font-bold text-muted-foreground"
      >
        <ChevronLeft className="size-4" /> Home
      </Link>
      <h1 className="text-3xl font-black">Clubs</h1>
      <p className="mt-1 text-muted-foreground">Book a court, see who's on and fill your game.</p>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl border bg-card p-2.5">
          <div className="font-display text-xl font-black tabular-nums">{all.length || "—"}</div>
          <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            Clubs
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-2.5">
          <div className="font-display text-xl font-black tabular-nums text-win">
            {meId ? onCourtToday : "—"}
          </div>
          <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            On court today
          </div>
        </div>
        <Link to="/beacons" className="rounded-2xl border bg-card p-2.5">
          <div className="font-display text-xl font-black tabular-nums text-primary">
            {openTotal}
          </div>
          <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            Open matches
          </div>
        </Link>
      </div>

      <div className="mt-4">
        <PageGuide id="venues" />
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search club, city or postcode"
          className="w-full rounded-2xl border bg-card py-3 pl-10 pr-4 outline-none focus:border-primary"
        />
      </div>
      <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
        {chip("all", "All")}
        {stars.length > 0 &&
          chip(
            "starred",
            <>
              <Star className="size-3.5 fill-current" /> My clubs
            </>,
          )}
        {cities.map((c) => chip(c, c))}
      </div>

      <div className="mt-3 space-y-3">
        {venues.isLoading
          ? [0, 1, 2].map((i) => <div key={i} className="h-44 animate-pulse rounded-3xl bg-card" />)
          : sorted.map((v) => {
              const cs = byVenue.get(v.id) ?? [];
              const here = !!meId && cs.some((c) => c.user_id === meId);
              const mates = cs.filter((c) => friendSet.has(c.user_id) && c.profiles);
              const starred = stars.includes(v.id);
              const open = openByName.get(norm(v.name)) ?? 0;
              const logged = played.data?.get(norm(v.name)) ?? 0;
              return (
                <article
                  key={v.id}
                  className={cn("rounded-3xl border bg-card p-4", here && "border-primary/60")}
                >
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-display text-base font-black">{v.name}</div>
                      <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="size-3.5 shrink-0" />
                        <span className="truncate">
                          {v.city}
                          {v.postcode ? ` · ${v.postcode}` : ""} · {v.courts_count} courts ·{" "}
                          <span className={v.court_type === "outdoor" ? "text-fire" : "text-court"}>
                            {v.court_type}
                          </span>
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        haptic();
                        toggleStar(v.id);
                      }}
                      aria-label={starred ? `Unstar ${v.name}` : `Star ${v.name}`}
                      className={cn(
                        "shrink-0 rounded-full border p-2",
                        starred ? "border-primary text-primary" : "text-muted-foreground",
                      )}
                    >
                      <Star className={cn("size-4", starred && "fill-current")} />
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
                    <div className="rounded-xl bg-background/40 px-1 py-1.5">
                      <div className="font-display text-sm font-black tabular-nums text-win">
                        {meId ? cs.length : "—"}
                      </div>
                      <div className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                        Playing today
                      </div>
                    </div>
                    <Link
                      to="/beacons"
                      search={{ venue: v.name }}
                      className={cn(
                        "rounded-xl bg-background/40 px-1 py-1.5",
                        open && "ring-1 ring-primary/50",
                      )}
                    >
                      <div className="font-display text-sm font-black tabular-nums text-primary">
                        {open}
                      </div>
                      <div className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                        Open matches
                      </div>
                    </Link>
                    <div className="rounded-xl bg-background/40 px-1 py-1.5">
                      <div className="font-display text-sm font-black tabular-nums">{logged}</div>
                      <div className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                        Matches logged
                      </div>
                    </div>
                  </div>

                  {mates.length > 0 && (
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {mates.slice(0, 5).map((c) => (
                          <Link
                            key={c.user_id}
                            to="/player/$id"
                            params={{ id: c.user_id }}
                            title={c.profiles!.display_name}
                          >
                            <PlayerAvatar
                              avatar={c.profiles!.avatar}
                              color={c.profiles!.avatar_color}
                              size="sm"
                              className="ring-2 ring-card"
                            />
                          </Link>
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        <span className="font-bold text-win">
                          {mates.length} friend{mates.length > 1 ? "s" : ""}
                        </span>{" "}
                        playing today
                      </span>
                    </div>
                  )}

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      disabled={toggle.isPending}
                      onClick={() => {
                        haptic();
                        if (
                          !gate(
                            "Create a free account to check in and let friends know you're playing.",
                          )
                        )
                          return;
                        toggle.mutate({ venueId: v.id, on: here });
                      }}
                      className={cn(
                        "flex items-center justify-center gap-1.5 rounded-2xl border py-2.5 text-xs font-black uppercase active:scale-95",
                        here ? "border-primary bg-primary/15 text-primary" : "bg-background",
                      )}
                    >
                      <CalendarCheck className="size-4" />
                      {here ? "Playing today" : "I'm playing today"}
                    </button>
                    <a
                      href={bookingLink(v)}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => haptic()}
                      className="flex items-center justify-center gap-1.5 rounded-2xl bg-court py-2.5 text-xs font-black uppercase text-court-foreground active:scale-95"
                    >
                      Book a court <ExternalLink className="size-3.5" />
                    </a>
                    <Link
                      to="/beacons"
                      search={{ post: true, venue: v.name }}
                      onClick={() => haptic()}
                      className="flex items-center justify-center gap-1.5 rounded-2xl border border-primary/50 py-2.5 text-xs font-black uppercase text-primary active:scale-95"
                    >
                      <UsersRound className="size-4" /> Open a match
                    </Link>
                    <Link
                      to="/record"
                      onClick={() => haptic()}
                      className="flex items-center justify-center gap-1.5 rounded-2xl border py-2.5 text-xs font-black uppercase text-muted-foreground active:scale-95"
                    >
                      <Swords className="size-4" /> Log a match
                    </Link>
                  </div>
                </article>
              );
            })}
        {!venues.isLoading && sorted.length === 0 && (
          <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            {city === "starred"
              ? "Tap the star on any club to keep it here."
              : `No clubs match “${q}”.`}
          </div>
        )}
      </div>

      <p className="mt-6 rounded-2xl border border-dashed p-4 text-center text-xs text-muted-foreground">
        Can't see your club? You can still type any club name when you log a match or open a match,
        and we'll add more clubs over time.
      </p>
    </AppShell>
  );
}
