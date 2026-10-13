import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, ChevronLeft, ExternalLink, MapPin, Search } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { useFriendIds } from "@/hooks/use-friends";
import { supabase } from "@/integrations/supabase/client";
import { cn, haptic } from "@/lib/utils";
import { useAuthGate } from "@/components/AuthPrompt";
import { FeatureGate } from "@/components/FeatureGate";

export const Route = createFileRoute("/_authenticated/venues")({
  head: () => ({
    meta: [
      { title: "Clubs — Padel Rival" },
      {
        name: "description",
        content: "Find padel clubs, book a court and see which friends are playing today.",
      },
    ],
  }),
  component: Venues,
});

type Checkin = {
  venue_id: string;
  user_id: string;
  profiles: { id: string; display_name: string; avatar: string; avatar_color: string } | null;
};

/** Check-ins are keyed by the database's date (UTC), matching `current_date` in the RLS policy. */
function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function bookingLink(v: { name: string; city: string; booking_url: string | null }) {
  return (
    v.booking_url ||
    `https://www.google.com/search?q=${encodeURIComponent(`${v.name} ${v.city} padel court booking`)}`
  );
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
  const friends = useFriendIds(meId);
  const day = todayKey();

  const venues = useQuery({
    queryKey: ["venues"],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.from("venues").select("*").order("name");
      if (error) throw error;
      return data;
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

  const term = q.trim().toLowerCase();
  const list = (venues.data ?? []).filter(
    (v) =>
      !term ||
      v.name.toLowerCase().includes(term) ||
      v.city.toLowerCase().includes(term) ||
      (v.postcode ?? "").toLowerCase().includes(term),
  );
  const friendSet = new Set(friends.data ?? []);
  const byVenue = new Map<string, Checkin[]>();
  for (const c of checkins.data ?? [])
    byVenue.set(c.venue_id, [...(byVenue.get(c.venue_id) ?? []), c]);

  // Clubs where I'm checked in or friends are playing float to the top.
  const score = (id: string) => {
    const cs = byVenue.get(id) ?? [];
    return (
      (cs.some((c) => c.user_id === meId) ? 100 : 0) +
      cs.filter((c) => friendSet.has(c.user_id)).length * 10 +
      cs.length
    );
  };
  const sorted = [...list].sort((a, b) => score(b.id) - score(a.id));

  return (
    <AppShell>
      <Link
        to="/home"
        className="mb-3 flex items-center gap-1 text-sm font-bold text-muted-foreground"
      >
        <ChevronLeft className="size-4" /> Home
      </Link>
      <h1 className="text-3xl font-black">Clubs</h1>
      <p className="mt-1 text-muted-foreground">Book a court and see who's on today.</p>

      <div className="relative mt-4">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search club, city or postcode"
          className="w-full rounded-2xl border bg-card py-3 pl-10 pr-4 outline-none focus:border-primary"
        />
      </div>

      <div className="mt-4 space-y-3">
        {venues.isLoading
          ? [0, 1, 2].map((i) => <div key={i} className="h-36 animate-pulse rounded-3xl bg-card" />)
          : sorted.map((v) => {
              const cs = byVenue.get(v.id) ?? [];
              const here = !!meId && cs.some((c) => c.user_id === meId);
              const mates = cs.filter((c) => friendSet.has(c.user_id) && c.profiles);
              return (
                <article
                  key={v.id}
                  className={cn("rounded-3xl border bg-card p-4", here && "border-primary/60")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-display text-base font-black">{v.name}</div>
                      <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="size-3.5" />
                        {v.city}
                        {v.postcode ? ` · ${v.postcode}` : ""}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1.5 text-[10px] font-black uppercase tracking-wide">
                      <span className="rounded-full border px-2 py-0.5 text-muted-foreground">
                        {v.courts_count} courts
                      </span>
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5",
                          v.court_type === "outdoor" ? "text-fire" : "text-court",
                        )}
                      >
                        {v.court_type}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex min-h-8 items-center gap-2">
                    {mates.length > 0 ? (
                      <>
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
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {cs.length > 0
                          ? `${cs.length} player${cs.length > 1 ? "s" : ""} on today`
                          : "No one checked in yet today"}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      disabled={toggle.isPending}
                      onClick={() => {
                        haptic();
                        if (!gate("Create a free account to check in and let friends know you're playing.")) return;
                        toggle.mutate({ venueId: v.id, on: here });
                      }}
                      className={cn(
                        "flex flex-1 items-center justify-center gap-1.5 rounded-2xl border py-2.5 text-xs font-black uppercase active:scale-95",
                        here
                          ? "border-primary bg-primary/15 text-primary"
                          : "bg-background text-foreground",
                      )}
                    >
                      <CalendarCheck className="size-4" />
                      {here ? "Playing here today" : "I'm playing here today"}
                    </button>
                    <a
                      href={bookingLink(v)}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => haptic()}
                      className="flex items-center justify-center gap-1.5 rounded-2xl bg-court px-3 py-2.5 text-xs font-black uppercase text-court-foreground active:scale-95"
                    >
                      Book <ExternalLink className="size-3.5" />
                    </a>
                  </div>
                </article>
              );
            })}
        {!venues.isLoading && sorted.length === 0 && (
          <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            No clubs match “{q}”.
          </div>
        )}
      </div>
    </AppShell>
  );
}
