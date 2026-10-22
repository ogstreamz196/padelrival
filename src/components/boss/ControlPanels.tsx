import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  KeyRound,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import {
  formatPrice,
  proOffer,
  useAppSettings,
  type Announcement,
  type AppSettings,
  type Features,
  type Pricing,
} from "@/hooks/use-settings";
import type { HealthCheck } from "@/lib/admin.functions";
import { cn } from "@/lib/utils";
import { useHealth } from "./Overview";
import { Field, inputCls, Panel, timeAgo, Toggle } from "./shared";

function useSaveSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: keyof AppSettings; value: object }) => {
      const { error } = await supabase.rpc("admin_update_setting", {
        _key: key,
        _value: value as Json,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Saved — live for everyone now");
      qc.invalidateQueries({ queryKey: ["app-settings"] });
      qc.invalidateQueries({ queryKey: ["admin-log"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/** Local draft of one settings object, reset whenever the saved copy changes. */
function useDraft<T>(saved: T) {
  const [draft, setDraft] = useState(saved);
  const key = JSON.stringify(saved);
  useEffect(() => setDraft(saved), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return [draft, setDraft, JSON.stringify(draft) !== key] as const;
}

const money = (v: string) =>
  Math.max(0, Math.round(Number(v.replace(/[^\d.]/g, "")) * 100) / 100 || 0);

export function PricingPanel() {
  const { settings } = useAppSettings();
  const [p, setP, dirty] = useDraft<Pricing>(settings.pricing);
  const save = useSaveSetting();
  const fresh = proOffer(p, new Date().toISOString());
  const priceInput = (k: "monthly" | "yearly" | "promo_monthly" | "promo_yearly") => (
    <input
      key={`${k}-${settings.pricing[k]}`}
      defaultValue={p[k].toFixed(2)}
      inputMode="decimal"
      onBlur={(e) => setP({ ...p, [k]: money(e.target.value) })}
      className={inputCls}
    />
  );
  const warn =
    p.promo_enabled && (p.promo_monthly >= p.monthly || p.promo_yearly >= p.yearly)
      ? "The offer price should be lower than the standard price, or there's nothing to cross out."
      : null;

  return (
    <div className="space-y-4">
      <Panel title="Standard price">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Monthly (£)">{priceInput("monthly")}</Field>
          <Field label="Yearly (£)">{priceInput("yearly")}</Field>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          For comparison, Padel Mates charges $5.99 a month or $49.99 a year for Pro.
        </p>
      </Panel>

      <Panel title="New player offer">
        <Toggle
          on={p.promo_enabled}
          onChange={(v) => setP({ ...p, promo_enabled: v })}
          label="Offer running"
          hint="Turn off to end the promotion for everyone"
        />
        <div className={cn("mt-2 grid grid-cols-2 gap-2", !p.promo_enabled && "opacity-50")}>
          <Field label="Offer monthly (£)">{priceInput("promo_monthly")}</Field>
          <Field label="Offer yearly (£)">{priceInput("promo_yearly")}</Field>
          <Field label="Days after sign-up">
            <input
              value={p.promo_days}
              inputMode="numeric"
              onChange={(e) =>
                setP({
                  ...p,
                  promo_days: Math.max(
                    1,
                    Math.min(365, Number(e.target.value.replace(/\D/g, "")) || 1),
                  ),
                })
              }
              className={inputCls}
            />
          </Field>
        </div>
        {warn && (
          <p className="mt-2 flex items-start gap-1.5 text-xs text-fire">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            {warn}
          </p>
        )}
      </Panel>

      <Panel title="Payments">
        <Toggle
          on={p.checkout_enabled}
          onChange={(v) =>
            setP({
              ...p,
              checkout_enabled: v,
              // Starts every player's offer clock from today rather than their sign-up date.
              checkout_opened_at: v ? (p.checkout_opened_at ?? new Date().toISOString()) : null,
            })
          }
          label="Accept payments"
          hint="Leave off until Stripe is connected — the button shows “Billing opens soon”"
        />
      </Panel>

      <Panel title="What a new player sees">
        <div className="rounded-2xl border border-primary/40 bg-primary/5 p-4 text-center">
          {fresh.eligible && (
            <p className="text-[10px] font-black uppercase tracking-widest text-fire">
              Launch offer · {p.promo_days} days left
            </p>
          )}
          <div className="mt-1 flex items-end justify-center gap-2">
            {fresh.eligible && p.monthly > fresh.monthly && (
              <span className="pb-0.5 text-base font-black text-muted-foreground line-through">
                {formatPrice(p.monthly)}
              </span>
            )}
            <span className="font-display text-3xl font-black text-primary">
              {formatPrice(fresh.monthly)}
            </span>
            <span className="pb-1 text-xs text-muted-foreground">/ month</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            or {formatPrice(fresh.yearly)} a year
            {fresh.eligible && p.yearly > fresh.yearly ? ` (was ${formatPrice(p.yearly)})` : ""}
          </p>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Players who joined more than {p.promo_days} days ago see the standard price.
        </p>
      </Panel>

      <button
        disabled={!dirty || save.isPending}
        onClick={() => save.mutate({ key: "pricing", value: p })}
        className="w-full rounded-2xl bg-primary py-3.5 font-black uppercase text-primary-foreground disabled:opacity-40"
      >
        {save.isPending ? "Saving…" : dirty ? "Save pricing" : "Saved"}
      </button>
    </div>
  );
}

const FEATURE_LABELS: Record<keyof Features, [string, string]> = {
  beacons: ["Open matches", "Posting open invites and claiming spots"],
  venues: ["Club directory", "Club list, booking links and check-ins"],
  dossier: ["The Dossier", "Side-by-side player comparison"],
  ai_coach: ["AI coach", "Match insights on the profile page"],
};

export function SettingsPanel() {
  const { settings } = useAppSettings();
  const [f, setF, fDirty] = useDraft<Features>(settings.features);
  const [a, setA, aDirty] = useDraft<Announcement>(settings.announcement);
  const save = useSaveSetting();

  return (
    <div className="space-y-4">
      <Panel title="Features">
        <div className="divide-y divide-border">
          {(Object.keys(FEATURE_LABELS) as (keyof Features)[]).map((k) => (
            <Toggle
              key={k}
              on={f[k]}
              onChange={(v) => setF({ ...f, [k]: v })}
              label={FEATURE_LABELS[k][0]}
              hint={FEATURE_LABELS[k][1]}
            />
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Switched-off features are hidden from players and show a “paused” screen. You can still
          open them.
        </p>
        <button
          disabled={!fDirty || save.isPending}
          onClick={() => save.mutate({ key: "features", value: f })}
          className="mt-3 w-full rounded-xl bg-primary py-2.5 text-xs font-black uppercase text-primary-foreground disabled:opacity-40"
        >
          {fDirty ? "Save features" : "Saved"}
        </button>
      </Panel>

      <Panel title="Announcement banner">
        <Toggle
          on={a.enabled}
          onChange={(v) => setA({ ...a, enabled: v })}
          label="Show banner"
          hint="Appears at the top of every screen"
        />
        <textarea
          value={a.text}
          onChange={(e) => setA({ ...a, text: e.target.value.slice(0, 200) })}
          rows={3}
          placeholder="e.g. Summer ladder starts Monday — 2x XP all week!"
          className={cn(inputCls, "mt-2 resize-none")}
        />
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {(["info", "promo", "warning"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setA({ ...a, tone: t })}
              className={cn(
                "rounded-xl border py-2 text-xs font-bold capitalize",
                a.tone === t
                  ? t === "warning"
                    ? "border-destructive text-destructive"
                    : t === "promo"
                      ? "border-fire text-fire"
                      : "border-court text-court"
                  : "text-muted-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <button
          disabled={!aDirty || save.isPending}
          onClick={() => save.mutate({ key: "announcement", value: a })}
          className="mt-3 w-full rounded-xl bg-primary py-2.5 text-xs font-black uppercase text-primary-foreground disabled:opacity-40"
        >
          {aDirty ? "Save banner" : "Saved"}
        </button>
      </Panel>
    </div>
  );
}

const STATUS: Record<
  HealthCheck["status"],
  { icon: typeof CheckCircle2; tone: string; label: string }
> = {
  live: { icon: CheckCircle2, tone: "text-win", label: "Live" },
  down: { icon: XCircle, tone: "text-destructive", label: "Down" },
  missing: { icon: KeyRound, tone: "text-fire", label: "No key" },
  planned: { icon: CircleDashed, tone: "text-muted-foreground", label: "Not set up" },
};

export function SystemPanel() {
  const health = useHealth();
  const groups = ["Core", "AI coach", "Integrations"] as const;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {health.dataUpdatedAt
            ? `Checked ${timeAgo(new Date(health.dataUpdatedAt).toISOString())}`
            : "Running checks…"}
        </p>
        <button
          onClick={() => health.refetch()}
          disabled={health.isFetching}
          className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold disabled:opacity-50"
        >
          <RefreshCw className={cn("size-3.5", health.isFetching && "animate-spin")} /> Re-check
        </button>
      </div>
      {health.error && (
        <p className="rounded-2xl border border-destructive/50 bg-destructive/10 p-3 text-sm">
          {health.error.message}
        </p>
      )}
      {groups.map((g) => {
        const rows = (health.data ?? []).filter((h) => h.group === g);
        if (!rows.length && !health.isLoading) return null;
        return (
          <Panel key={g} title={g}>
            {health.isLoading ? (
              <div className="h-20 animate-pulse rounded-xl bg-muted" />
            ) : (
              <div className="divide-y divide-border">
                {rows.map((h) => {
                  const st = STATUS[h.status];
                  return (
                    <div key={h.id} className="flex items-start gap-3 py-2.5">
                      <st.icon className={cn("mt-0.5 size-5 shrink-0", st.tone)} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold">{h.name}</p>
                        <p className="text-xs text-muted-foreground">{h.detail}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={cn("text-[10px] font-black uppercase", st.tone)}>
                          {st.label}
                        </p>
                        {h.ms !== undefined && (
                          <p className="text-[10px] tabular-nums text-muted-foreground">
                            {h.ms} ms
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        );
      })}
      <p className="text-xs text-muted-foreground">
        API keys live in Lovable Cloud → Secrets. These checks only confirm each key is accepted; no
        player data is sent.
      </p>
    </div>
  );
}

const ACTION_LABEL: Record<string, string> = {
  update_setting: "Changed settings",
  gift_pro: "Gifted Pro",
  remove_pro: "Removed Pro",
  grant_admin: "Made boss",
  revoke_admin: "Removed boss",
  save_venue: "Saved club",
  delete_venue: "Removed club",
  cancel_beacon: "Cancelled open match",
  void_match: "Deleted match",
  set_rating: "Set Elo",
  delete_user: "Deleted player",
  suspend_user: "Suspended player",
  unsuspend_user: "Restored player",
};

export function LogPanel() {
  const log = useQuery({
    queryKey: ["admin-log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });
  const names = useQuery({
    queryKey: ["admin-roster"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_roster");
      if (error) throw error;
      return data ?? [];
    },
  });
  const who = new Map((names.data ?? []).map((p) => [p.id, p.display_name]));
  const describe = (target: string | null, detail: unknown) => {
    const d = (detail ?? {}) as Record<string, unknown>;
    if (typeof d["name"] === "string") return d["name"];
    if (target && who.has(target)) return who.get(target);
    if (typeof d["rating"] === "number") return `${d["rating"]}`;
    return target && target.length > 20 ? `${target.slice(0, 8)}…` : target;
  };

  if (log.isLoading) return <p className="text-sm text-muted-foreground">Loading log…</p>;
  if (!log.data?.length)
    return (
      <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        No boss actions yet. Everything you change here gets recorded.
      </p>
    );
  return (
    <div className="space-y-1.5">
      {log.data.map((r) => (
        <div
          key={r.id}
          className="flex items-baseline justify-between gap-3 rounded-xl border bg-card px-3 py-2 text-xs"
        >
          <span className="min-w-0 truncate">
            <span className="font-bold">{ACTION_LABEL[r.action] ?? r.action}</span>
            {describe(r.target, r.detail) ? (
              <span className="text-muted-foreground"> · {describe(r.target, r.detail)}</span>
            ) : null}
            <span className="text-muted-foreground">
              {" "}
              · by {(r.actor && who.get(r.actor)) ?? "boss"}
            </span>
          </span>
          <span className="shrink-0 text-muted-foreground">{timeAgo(r.created_at)}</span>
        </div>
      ))}
    </div>
  );
}
