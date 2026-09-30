import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Minus, Plus, Repeat, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { PageGuide } from "@/components/PageGuide";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { useMyProfile } from "@/hooks/use-auth";
import { SET_PRESETS, STB_PRESETS, validateSet, type SetScore } from "@/lib/game";
import { cn, haptic } from "@/lib/utils";


export const Route = createFileRoute("/_authenticated/record")({
  validateSearch: z.object({ opp: z.string().optional() }),
  head: () => ({ meta: [{ title: "Record match — Padel Rival" }, { name: "description", content: "Log a 2v2 padel match." }] }),
  component: RecordMatch,
});

type Slot = { user_id?: string; guest_name?: string; display_name: string; avatar?: string; avatar_color?: string; rating?: number } | null;

function RecordMatch() {
  const { opp } = Route.useSearch();
  const { profile } = useMyProfile();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [partner, setPartner] = useState<Slot>(null);
  const [opp1, setOpp1] = useState<Slot>(null);
  const [opp2, setOpp2] = useState<Slot>(null);
  const [picking, setPicking] = useState<null | "partner" | "opp1" | "opp2">(null);
  const [sets, setSets] = useState<[number, number][]>([[6, 4], [6, 4]]);
  const [superTb, setSuperTb] = useState(false);
  const [venue, setVenue] = useState("");
  const [type, setType] = useState("friendly");
  const [mySide, setMySide] = useState<"left" | "right" | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!opp) return;
    supabase.from("profiles").select("*").eq("id", opp).single().then(({ data }) => {
      if (data) setOpp1({ user_id: data.id, display_name: data.display_name, avatar: data.avatar, avatar_color: data.avatar_color, rating: data.rating });
    });
  }, [opp]);

  const lastLineup = useQuery({
    queryKey: ["last-lineup", profile?.id],
    enabled: !!profile?.id,
    queryFn: async (): Promise<{ partner: NonNullable<Slot>; opps: NonNullable<Slot>[] } | null> => {
      const { data: mine } = await supabase
        .from("match_players")
        .select("match_id,team,created_at")
        .eq("user_id", profile!.id)
        .order("created_at", { ascending: false })
        .limit(1);
      const row = mine?.[0];
      if (!row) return null;
      const { data: all } = await supabase
        .from("match_players")
        .select("team,user_id,guest_name,profiles(id,display_name,avatar,avatar_color,rating)")
        .eq("match_id", row.match_id);
      if (!all) return null;
      const toSlot = (r: (typeof all)[number]): NonNullable<Slot> => {
        const pr = r.profiles as { id: string; display_name: string; avatar: string; avatar_color: string; rating: number } | null;
        return pr
          ? { user_id: pr.id, display_name: pr.display_name, avatar: pr.avatar, avatar_color: pr.avatar_color, rating: pr.rating }
          : { guest_name: r.guest_name ?? "Guest", display_name: r.guest_name ?? "Guest" };
      };
      const partnerRow = all.find((r) => r.team === row.team && r.user_id !== profile!.id);
      const oppRows = all.filter((r) => r.team !== row.team);
      if (!partnerRow || oppRows.length < 2) return null;
      return { partner: toSlot(partnerRow), opps: oppRows.slice(0, 2).map(toSlot) };
    },
  });

  const venues = useQuery({
    queryKey: ["my-venues", profile?.id],
    enabled: !!profile?.id,
    queryFn: async (): Promise<string[]> => {
      const { data } = await supabase
        .from("matches")
        .select("venue")
        .eq("created_by", profile!.id)
        .not("venue", "is", null)
        .order("created_at", { ascending: false })
        .limit(30);
      const counts = new Map<string, number>();
      for (const r of data ?? []) {
        const v = (r.venue ?? "").trim();
        if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
      }
      return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([v]) => v);
    },
  });

  const empty = !partner && !opp1 && !opp2;
  function rematch() {
    const d = lastLineup.data;
    if (!d) return;
    haptic();
    setPartner(d.partner);
    setOpp1(d.opps[0] ?? null);
    setOpp2(d.opps[1] ?? null);
  }

  const taken = [profile?.id, partner?.user_id, opp1?.user_id, opp2?.user_id].filter(Boolean) as string[];
  const setters = { partner: setPartner, opp1: setOpp1, opp2: setOpp2 };


  const isDecider = (i: number) => superTb && i === 2;

  function bump(i: number, side: 0 | 1, d: number) {
    const max = isDecider(i) ? 20 : 7;
    haptic();
    setSets((s) => s.map((x, j) => (j === i ? (x.map((v, k) => (k === side ? Math.max(0, Math.min(max, v + d)) : v)) as [number, number]) : x)));
  }

  function setOne(i: number, score: SetScore) {
    haptic();
    setSets((s) => s.map((x, j) => (j === i ? score : x)));
  }


  const t1 = sets.filter(([a, b]) => a > b).length;
  const t2 = sets.filter(([a, b]) => b > a).length;
  const setErrors = sets.map((s, i) => validateSet(s, isDecider(i)));
  const firstError = setErrors.find(Boolean) ?? null;
  const ready = partner && opp1 && opp2 && t1 !== t2 && !firstError;


  async function submit() {
    if (!partner || !opp1 || !opp2 || !profile || t1 === t2) return;
    if (firstError) {
      toast.error(firstError);
      return;
    }

    setBusy(true);
    const otherSide = mySide === "left" ? "right" : mySide === "right" ? "left" : null;
    const toP = (s: NonNullable<Slot>, team: number, side: string | null) => ({
      team,
      ...(s.user_id ? { user_id: s.user_id } : { guest_name: s.guest_name }),
      ...(side ? { court_side: side } : {}),
    });
    const players = [
      { team: 1, user_id: profile.id, ...(mySide ? { court_side: mySide } : {}) },
      toP(partner, 1, otherSide),
      toP(opp1, 2, null),
      toP(opp2, 2, null),
    ];
    const { data, error } = await supabase.rpc("record_match", {
      _players: players,
      _sets: sets,
      _venue: venue,
      _match_type: type,
      _notes: notes.trim() || undefined,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    sessionStorage.setItem(
      "lastMatch",
      JSON.stringify({ ...(data as object), sets, opponents: [opp1, opp2].map((o) => ({ user_id: o.user_id, display_name: o.display_name })), partner: partner.display_name }),
    );
    qc.invalidateQueries();
    navigate({ to: "/celebrate" });
  }

  return (
    <AppShell>
      <h1 className="text-3xl font-black">Record match</h1>
      <p className="mb-4 mt-1 text-muted-foreground">2v2 · takes 20 seconds</p>
      <PageGuide id="record" />

      {empty && lastLineup.data && (
        <button
          onClick={rematch}
          className="mb-4 flex w-full items-center gap-3 rounded-2xl border border-primary/50 bg-primary/10 p-3 text-left active:scale-[0.98]"
        >
          <Repeat className="size-5 shrink-0 text-primary" />
          <div className="min-w-0">
            <div className="text-sm font-black">Rematch last 4</div>
            <div className="truncate text-xs text-muted-foreground">
              w/ {lastLineup.data.partner.display_name} vs {lastLineup.data.opps.map((o) => o.display_name).join(" & ")}
            </div>
          </div>
        </button>
      )}



      <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-2">
        <div className="space-y-2 rounded-3xl border-2 border-primary/50 bg-primary/5 p-2">
          <div className="text-center text-[11px] font-black uppercase tracking-widest text-primary">Your team</div>
          <SlotBtn slot={profile ? { display_name: "You", avatar: profile.avatar, avatar_color: profile.avatar_color, rating: profile.rating } : null} fixed />
          <SlotBtn slot={partner} label="Partner" onClick={() => setPicking("partner")} onClear={() => setPartner(null)} />
        </div>
        <div className="grid place-items-center font-display text-lg font-black text-muted-foreground">VS</div>
        <div className="space-y-2 rounded-3xl border-2 border-court/60 bg-court/10 p-2">
          <div className="text-center text-[11px] font-black uppercase tracking-widest text-court">Opponents</div>
          <SlotBtn slot={opp1} label="Opponent" onClick={() => setPicking("opp1")} onClear={() => setOpp1(null)} />
          <SlotBtn slot={opp2} label="Opponent" onClick={() => setPicking("opp2")} onClear={() => setOpp2(null)} />
        </div>
      </div>

      <div className="mt-4 rounded-2xl border bg-card p-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Which side did you play?</span>
          {mySide && (
            <button onClick={() => { haptic(); setMySide(null); }} className="text-[11px] font-bold text-muted-foreground">
              Clear
            </button>
          )}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(["left", "right"] as const).map((s) => (
            <button
              key={s}
              onClick={() => { haptic(); setMySide(mySide === s ? null : s); }}
              className={cn("rounded-2xl border py-3 text-sm font-black capitalize", mySide === s ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground")}
            >
              {s}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {mySide && partner
            ? `${partner.display_name} is logged on the ${mySide === "left" ? "right" : "left"}.`
            : "Optional — tag your position to unlock left/right win rates."}
        </p>
      </div>



      <div className="mb-3 mt-8 flex items-center justify-between">
        <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Set scores</h2>
        <button
          onClick={() => {
            const next = !superTb;
            setSuperTb(next);
            setSets((s) => (s.length === 3 ? [s[0]!, s[1]!, next ? [10, 8] : [6, 4]] : s));
          }}
          className={cn("rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-wide", superTb ? "border-primary bg-primary/15 text-primary" : "text-muted-foreground")}
        >
          Super tie-break
        </button>
      </div>
      <div className="space-y-2">
        {sets.map(([a, b], i) => (
          <div key={i} className="rounded-2xl border bg-card p-2">
            <div className="flex items-center gap-2">
              <span className="w-10 text-center text-[10px] font-black uppercase text-muted-foreground">{isDecider(i) ? "STB" : `S${i + 1}`}</span>
              <Stepper value={a!} win={a! > b!} onDec={() => bump(i, 0, -1)} onInc={() => bump(i, 0, 1)} tone="primary" />
              <button onClick={() => setOne(i, [b!, a!])} className="p-1 text-muted-foreground active:scale-90" aria-label="Swap score">
                <Repeat className="size-4" />
              </button>
              <Stepper value={b!} win={b! > a!} onDec={() => bump(i, 1, -1)} onInc={() => bump(i, 1, 1)} tone="court" />
              {sets.length > 1 && (
                <button onClick={() => setSets(sets.filter((_, j) => j !== i))} className="ml-auto p-2 text-muted-foreground" aria-label="Remove set">
                  <X className="size-4" />
                </button>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5 pl-1">
              {(isDecider(i) ? STB_PRESETS : SET_PRESETS).map(([x, y]) => {
                const active = a === x && b === y;
                return (
                  <button
                    key={`${x}-${y}`}
                    onClick={() => setOne(i, [x, y])}
                    className={cn("rounded-full border px-2.5 py-1 text-[11px] font-black tabular-nums", active ? "border-primary bg-primary/15 text-primary" : "text-muted-foreground")}
                  >
                    {x}-{y}
                  </button>
                );
              })}
            </div>
            {setErrors[i] && <p className="mt-2 pl-1 text-[11px] font-bold text-destructive">{setErrors[i]}</p>}
          </div>
        ))}
        {sets.length < 3 && (
          <button onClick={() => setSets([...sets, superTb ? [10, 8] : [6, 4]])} className="w-full rounded-2xl border border-dashed py-3 text-sm font-bold text-muted-foreground">
            + Add {superTb ? "super tie-break" : "set"}
          </button>
        )}
        <p className="px-1 text-xs text-muted-foreground">Tap a score, or use +/–. The arrows swap who won. Deciding super tie-break goes to 10, win by 2.</p>
      </div>


      <div className="mt-6 grid grid-cols-3 gap-2">
        {["friendly", "competitive", "tournament"].map((t) => (
          <button key={t} onClick={() => setType(t)} className={cn("rounded-2xl border py-3 text-sm font-bold capitalize", type === t ? "border-primary bg-primary text-primary-foreground" : "bg-card")}>
            {t}
          </button>
        ))}
      </div>
      <input value={venue} onChange={(e) => setVenue(e.target.value)} maxLength={120} placeholder="Venue (optional)" className="mt-3 w-full rounded-2xl border bg-card px-4 py-4 outline-none focus:border-primary" />
      {(venues.data?.length ?? 0) > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {venues.data!.map((v) => (
            <button
              key={v}
              onClick={() => {
                haptic();
                setVenue(venue === v ? "" : v);
              }}
              className={cn("max-w-full truncate rounded-full border px-3 py-1.5 text-xs font-bold", venue === v ? "border-primary bg-primary/15 text-primary" : "text-muted-foreground")}
            >
              {v}
            </button>
          ))}
        </div>
      )}

      <input
        value={notes}
        onChange={(e) => setNotes(e.target.value.slice(0, 140))}
        maxLength={140}
        placeholder="Add a note (optional)"
        className="mt-3 w-full rounded-2xl border bg-card px-4 py-4 outline-none focus:border-primary"
      />
      <div className="mt-2 flex flex-wrap gap-1.5">
        {["Golden point decider", "Comeback win", "Grudge match", "Brutal conditions"].map((n) => (
          <button
            key={n}
            onClick={() => {
              haptic();
              setNotes(notes === n ? "" : n);
            }}
            className={cn("rounded-full border px-3 py-1.5 text-xs font-bold", notes === n ? "border-primary bg-primary/15 text-primary" : "text-muted-foreground")}
          >
            {n}
          </button>
        ))}
      </div>




      <button
        disabled={!ready || busy}
        onClick={submit}
        className="mt-6 w-full rounded-2xl bg-primary py-5 font-display text-lg font-black uppercase text-primary-foreground glow transition-opacity disabled:opacity-40 disabled:shadow-none"
      >
        {busy
          ? "Calculating…"
          : !partner || !opp1 || !opp2
            ? "Pick partner & opponents"
            : firstError
              ? "Check the scores"
              : t1 === t2
                ? "Need a winner"
                : t1 > t2
                  ? `Log victory ${t1}-${t2}`
                  : `Log defeat ${t1}-${t2}`}
      </button>

      {picking && (
        <PlayerPicker
          exclude={taken}
          meId={profile?.id}
          onClose={() => setPicking(null)}
          onPick={(s) => {
            setters[picking](s);
            setPicking(null);
          }}
        />
      )}
    </AppShell>
  );
}

function Stepper({ value, win, onDec, onInc, tone }: { value: number; win: boolean; onDec: () => void; onInc: () => void; tone: "primary" | "court" }) {
  return (
    <div className="flex items-center">
      <button onClick={onDec} className="grid size-9 place-items-center rounded-xl bg-muted active:scale-90" aria-label="Decrease"><Minus className="size-4" /></button>
      <span className={cn("w-10 text-center font-display text-2xl font-black tabular-nums", win && (tone === "primary" ? "text-primary" : "text-court"))}>{value}</span>
      <button onClick={onInc} className="grid size-9 place-items-center rounded-xl bg-muted active:scale-90" aria-label="Increase"><Plus className="size-4" /></button>
    </div>
  );
}

function SlotBtn({ slot, label, fixed, onClick, onClear }: { slot: Slot; label?: string; fixed?: boolean; onClick?: () => void; onClear?: () => void }) {
  if (!slot)
    return (
      <button onClick={onClick} className="flex h-24 w-full flex-col items-center justify-center gap-1 rounded-2xl border border-dashed text-muted-foreground active:scale-95">
        <UserPlus className="size-5" />
        <span className="text-xs font-bold">{label}</span>
      </button>
    );
  return (
    <div className="relative flex h-24 w-full flex-col items-center justify-center gap-1 rounded-2xl bg-card">
      <PlayerAvatar avatar={slot.avatar ?? (slot.guest_name ? "👤" : null)} color={slot.avatar_color ?? "court"} size="sm" />
      <span className="max-w-full truncate px-1 text-xs font-bold">{slot.display_name}</span>
      <span className="text-[10px] text-muted-foreground">{slot.rating ?? "Guest"}</span>
      {!fixed && (
        <button onClick={onClear} className="absolute right-1 top-1 p-1 text-muted-foreground" aria-label="Remove">
          <X className="size-3" />
        </button>
      )}
    </div>
  );
}

type PickerPlayer = { id: string; username: string; display_name: string; avatar: string; avatar_color: string; rating: number };

function PlayerPicker({ exclude, meId, onPick, onClose }: { exclude: string[]; meId?: string | undefined; onPick: (s: NonNullable<Slot>) => void; onClose: () => void }) {
  const [term, setTerm] = useState("");
  const q = useQuery({
    queryKey: ["search", term],
    queryFn: async () => {
      let req = supabase.from("profiles").select("id,username,display_name,avatar,avatar_color,rating").limit(20);
      const t = term.trim().replace(/[%,()]/g, "");
      if (t) req = req.or(`username.ilike.%${t}%,display_name.ilike.%${t}%`);
      else req = req.order("created_at", { ascending: false });
      const { data } = await req;
      return (data ?? []) as PickerPlayer[];
    },
  });

  const recent = useQuery({
    queryKey: ["recent-players", meId],
    enabled: !!meId,
    queryFn: async (): Promise<PickerPlayer[]> => {
      const { data: mine } = await supabase.from("match_players").select("match_id").eq("user_id", meId!).order("id", { ascending: false }).limit(30);
      const ids = (mine ?? []).map((m) => m.match_id);
      if (!ids.length) return [];
      const { data: others } = await supabase
        .from("match_players")
        .select("user_id, profiles(id,username,display_name,avatar,avatar_color,rating)")
        .in("match_id", ids)
        .not("user_id", "is", null);
      const seen = new Set<string>();
      const out: PickerPlayer[] = [];
      for (const row of others ?? []) {
        const p = row.profiles as PickerPlayer | null;
        if (!p || p.id === meId || seen.has(p.id)) continue;
        seen.add(p.id);
        out.push(p);
      }
      return out.slice(0, 8);
    },
  });

  const results = (q.data ?? []).filter((p) => !exclude.includes(p.id));
  const recents = (recent.data ?? []).filter((p) => !exclude.includes(p.id));

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-[max(env(safe-area-inset-top),1rem)]">
        <div className="flex items-center gap-2">
          <input autoFocus value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search players or type a guest name" className="flex-1 rounded-2xl border bg-card px-4 py-4 outline-none focus:border-primary" />
          <button onClick={onClose} className="p-3 font-bold text-muted-foreground">Cancel</button>
        </div>
        {term.trim() && (
          <button
            onClick={() => onPick({ guest_name: term.trim().slice(0, 40), display_name: term.trim().slice(0, 40) })}
            className="mt-3 flex items-center gap-3 rounded-2xl border border-dashed border-primary/60 p-3 text-left"
          >
            <PlayerAvatar avatar="👤" color="court" size="sm" />
            <div>
              <div className="font-bold">Add “{term.trim()}” as guest</div>
              <div className="text-xs text-muted-foreground">Not on Padel Rival yet — no rating change</div>
            </div>
          </button>
        )}
        {!term.trim() && recents.length > 0 && (
          <div className="mt-4">
            <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Recently played with</div>
            <div className="flex flex-wrap gap-2">
              {recents.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onPick({ user_id: p.id, display_name: p.display_name, avatar: p.avatar, avatar_color: p.avatar_color, rating: p.rating })}
                  className="flex items-center gap-2 rounded-full border bg-card py-1.5 pl-1.5 pr-3 text-left active:scale-95"
                >
                  <PlayerAvatar avatar={p.avatar} color={p.avatar_color} size="sm" />
                  <span className="max-w-28 truncate text-xs font-bold">{p.display_name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="mt-3 flex-1 space-y-2 overflow-y-auto pb-10">
          {results.map((p) => (
            <button
              key={p.id}
              onClick={() => onPick({ user_id: p.id, display_name: p.display_name, avatar: p.avatar, avatar_color: p.avatar_color, rating: p.rating })}
              className="flex w-full items-center gap-3 rounded-2xl border bg-card p-3 text-left active:scale-[0.98]"
            >
              <PlayerAvatar avatar={p.avatar} color={p.avatar_color} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-bold">{p.display_name}</div>
                <div className="text-xs text-muted-foreground">@{p.username}</div>
              </div>
              <div className="font-display font-black tabular-nums">{p.rating}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
