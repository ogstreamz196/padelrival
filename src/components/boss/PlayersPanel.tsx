import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Ban, ChevronDown, Crown, Search, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { supabase } from "@/integrations/supabase/client";
import { adminDeleteUser, adminSuspendUser } from "@/lib/admin.functions";
import { cn } from "@/lib/utils";
import { inputCls, timeAgo } from "./shared";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "new", label: "New 7d" },
  { id: "pro", label: "Pro" },
  { id: "boss", label: "Bosses" },
  { id: "suspended", label: "Suspended" },
] as const;
type Filter = (typeof FILTERS)[number]["id"];

export function PlayersPanel({ meId }: { meId: string }) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<string | null>(null);

  const roster = useQuery({
    queryKey: ["admin-roster"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_roster");
      if (error) throw error;
      return data ?? [];
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-roster"] });
    qc.invalidateQueries({ queryKey: ["admin-overview"] });
    qc.invalidateQueries({ queryKey: ["admin-log"] });
  };
  const fail = (e: Error) => toast.error(e.message);

  const setRating = useMutation({
    mutationFn: async ({ id, rating }: { id: string; rating: number }) => {
      const { error } = await supabase.rpc("admin_set_rating", { _user: id, _rating: rating });
      if (error) throw error;
    },
    onSuccess: () => (toast.success("Rating updated"), refresh()),
    onError: fail,
  });
  const setPro = useMutation({
    mutationFn: async ({ id, on, days }: { id: string; on: boolean; days?: number }) => {
      const { error } = await supabase.rpc("admin_set_pro", {
        _user: id,
        _on: on,
        ...(days ? { _days: days } : {}),
      });
      if (error) throw error;
    },
    onSuccess: (_d, v) => (toast.success(v.on ? "Pro gifted" : "Pro removed"), refresh()),
    onError: fail,
  });
  const setBoss = useMutation({
    mutationFn: async ({ id, on }: { id: string; on: boolean }) => {
      const { error } = await supabase.rpc("admin_set_admin", { _user: id, _on: on });
      if (error) throw error;
    },
    onSuccess: (_d, v) => (
      toast.success(v.on ? "Boss access granted" : "Boss access removed"),
      refresh()
    ),
    onError: fail,
  });
  const suspendFn = useServerFn(adminSuspendUser);
  const suspend = useMutation({
    mutationFn: (v: { userId: string; suspend: boolean }) => suspendFn({ data: v }),
    onSuccess: (_d, v) => (
      toast.success(v.suspend ? "Account suspended" : "Account restored"),
      refresh()
    ),
    onError: fail,
  });
  const deleteFn = useServerFn(adminDeleteUser);
  const remove = useMutation({
    mutationFn: (userId: string) => deleteFn({ data: { userId } }),
    onSuccess: () => {
      toast.success("Player deleted — their past matches stay as a guest name");
      setOpen(null);
      refresh();
      qc.invalidateQueries();
    },
    onError: fail,
  });

  const term = q.trim().toLowerCase();
  const now = Date.now();
  const list = (roster.data ?? []).filter((p) => {
    if (term && !`${p.display_name} ${p.username} ${p.email ?? ""}`.toLowerCase().includes(term))
      return false;
    if (filter === "new") return now - new Date(p.created_at).getTime() < 7 * 86400000;
    if (filter === "pro") return p.is_pro;
    if (filter === "boss") return p.is_admin;
    if (filter === "suspended") return !!p.banned_until && new Date(p.banned_until).getTime() > now;
    return true;
  });

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, @username or email"
          className={cn(inputCls, "pl-9")}
        />
      </div>
      <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold",
              filter === f.id
                ? "border-primary bg-primary/15 text-primary"
                : "text-muted-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {roster.isLoading
          ? "Loading players…"
          : `${list.length} of ${roster.data?.length ?? 0} players`}
      </p>
      {roster.error && <p className="mt-2 text-sm text-destructive">{roster.error.message}</p>}

      <div className="mt-2 space-y-2">
        {list.map((p) => {
          const suspended = !!p.banned_until && new Date(p.banned_until).getTime() > now;
          const expanded = open === p.id;
          const isMe = p.id === meId;
          return (
            <div
              key={p.id}
              className={cn("rounded-2xl border bg-card", suspended && "border-destructive/50")}
            >
              <button
                onClick={() => setOpen(expanded ? null : p.id)}
                className="flex w-full items-center gap-3 p-3 text-left"
              >
                <PlayerAvatar avatar={p.avatar} color={p.avatar_color} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm font-bold">
                    <span className="truncate">{p.display_name}</span>
                    {p.is_admin && <Crown className="size-3.5 shrink-0 text-primary" />}
                    {p.is_pro && <Sparkles className="size-3.5 shrink-0 text-fire" />}
                    {suspended && <Ban className="size-3.5 shrink-0 text-destructive" />}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    @{p.username} · {Number(p.matches)} matches · seen {timeAgo(p.last_sign_in_at)}
                  </p>
                </div>
                <span className="font-display text-lg font-black tabular-nums">{p.rating}</span>
                <ChevronDown
                  className={cn(
                    "size-4 shrink-0 text-muted-foreground transition-transform",
                    expanded && "rotate-180",
                  )}
                />
              </button>

              {expanded && (
                <div className="space-y-3 border-t p-3">
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    <dt className="text-muted-foreground">Email</dt>
                    <dd className="truncate text-right">
                      {p.email?.endsWith("@players.padelrival.app")
                        ? "username only"
                        : (p.email ?? "—")}
                    </dd>
                    <dt className="text-muted-foreground">Joined</dt>
                    <dd className="text-right">{new Date(p.created_at).toLocaleDateString()}</dd>
                    <dt className="text-muted-foreground">Record</dt>
                    <dd className="text-right tabular-nums">
                      {p.wins}W {p.losses}L · {p.xp} XP
                    </dd>
                    <dt className="text-muted-foreground">Pro</dt>
                    <dd className="text-right">
                      {p.is_pro
                        ? p.pro_expires_at
                          ? `until ${new Date(p.pro_expires_at).toLocaleDateString()}`
                          : "forever"
                        : "no"}
                    </dd>
                  </dl>

                  <RatingEditor
                    current={p.rating}
                    onSave={(rating) => setRating.mutate({ id: p.id, rating })}
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      to="/player/$id"
                      params={{ id: p.id }}
                      className="rounded-xl border py-2 text-center text-xs font-bold"
                    >
                      View card
                    </Link>
                    {p.is_pro ? (
                      <button
                        onClick={() => setPro.mutate({ id: p.id, on: false })}
                        className="rounded-xl border py-2 text-xs font-bold text-fire"
                      >
                        Remove Pro
                      </button>
                    ) : (
                      <select
                        defaultValue=""
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v)
                            setPro.mutate({
                              id: p.id,
                              on: true,
                              ...(v === "forever" ? {} : { days: Number(v) }),
                            });
                          e.target.value = "";
                        }}
                        className="rounded-xl border bg-background py-2 text-center text-xs font-bold text-fire"
                      >
                        <option value="">Gift Pro…</option>
                        <option value="30">30 days</option>
                        <option value="90">90 days</option>
                        <option value="365">1 year</option>
                        <option value="forever">Forever</option>
                      </select>
                    )}
                    <button
                      disabled={isMe}
                      onClick={() => {
                        const on = !p.is_admin;
                        if (
                          confirm(
                            on
                              ? `Give ${p.display_name} full boss access?`
                              : `Remove boss access from ${p.display_name}?`,
                          )
                        )
                          setBoss.mutate({ id: p.id, on });
                      }}
                      className="rounded-xl border py-2 text-xs font-bold text-primary disabled:opacity-40"
                    >
                      {p.is_admin ? "Remove boss" : "Make boss"}
                    </button>
                    <button
                      disabled={isMe || suspend.isPending}
                      onClick={() => {
                        if (
                          confirm(
                            suspended
                              ? `Let ${p.display_name} sign in again?`
                              : `Suspend ${p.display_name}? They won't be able to sign in.`,
                          )
                        )
                          suspend.mutate({ userId: p.id, suspend: !suspended });
                      }}
                      className="rounded-xl border py-2 text-xs font-bold text-muted-foreground disabled:opacity-40"
                    >
                      {suspended ? "Unsuspend" : "Suspend"}
                    </button>
                  </div>

                  <button
                    disabled={isMe || p.is_admin || remove.isPending}
                    onClick={() => {
                      const typed = prompt(
                        `This permanently deletes ${p.display_name}'s account and profile.\nTheir past matches stay, shown as a guest.\n\nType ${p.username} to confirm:`,
                      );
                      if (typed?.trim().replace(/^@/, "") === p.username) remove.mutate(p.id);
                      else if (typed !== null)
                        toast.error("Username didn't match — nothing deleted");
                    }}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-destructive/50 py-2.5 text-xs font-black uppercase text-destructive disabled:opacity-40"
                  >
                    <Trash2 className="size-3.5" />{" "}
                    {remove.isPending ? "Deleting…" : "Delete player"}
                  </button>
                  {p.is_admin && !isMe && (
                    <p className="text-center text-[11px] text-muted-foreground">
                      Remove boss access before deleting.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RatingEditor({ current, onSave }: { current: number; onSave: (rating: number) => void }) {
  const [value, setValue] = useState(String(current));
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Elo</span>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value.replace(/\D/g, "").slice(0, 4))}
        inputMode="numeric"
        className={cn(inputCls, "w-24")}
        aria-label="Rating"
      />
      <button
        onClick={() => onSave(Number(value))}
        disabled={value === String(current) || value === ""}
        className="rounded-xl border px-3 py-2.5 text-xs font-bold disabled:opacity-40"
      >
        Set
      </button>
    </div>
  );
}
