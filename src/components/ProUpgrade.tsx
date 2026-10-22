import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Clock, Crown, Lock, Share2, Sparkles, Swords, X, Zap } from "lucide-react";
import { useMyProfile } from "@/hooks/use-auth";
import { formatPrice, proOffer, useAppSettings } from "@/hooks/use-settings";
import { supabase } from "@/integrations/supabase/client";
import { cn, haptic } from "@/lib/utils";

const PERKS = [
  {
    icon: BarChart3,
    title: "Deep court analytics",
    body: "Left vs right side win rates, form trends and expected win chance before you play.",
  },
  {
    icon: Share2,
    title: "Pro celebration cards",
    body: "Exclusive animated story cards for WhatsApp and Instagram with verified rank borders.",
  },
  {
    icon: Sparkles,
    title: "Show-off profile",
    body: "Animated avatar glow, pro badge and custom titles like Vibora King or Wall Master.",
  },
  {
    icon: Swords,
    title: "Full rival dossiers",
    body: "Match-by-match head-to-head history, trends over time and alerts the moment a rival overtakes you.",
  },
];

function useProStatus(userId: string | undefined) {
  return useQuery({
    queryKey: ["pro", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("pro_members")
        .select("expires_at")
        .eq("user_id", userId!)
        .maybeSingle();
      return !!data && (!data.expires_at || new Date(data.expires_at).getTime() > Date.now());
    },
  });
}

function useOffer() {
  const { profile } = useMyProfile();
  const { settings } = useAppSettings();
  const pro = useProStatus(profile?.id);
  return {
    offer: proOffer(settings.pricing, profile?.created_at),
    pricing: settings.pricing,
    isPro: pro.data === true,
  };
}

function countdownText(o: ReturnType<typeof proOffer>) {
  if (o.endsAt === null) return null;
  return o.daysLeft > 0 ? `${o.daysLeft}d ${o.hoursLeft}h left` : `${o.hoursLeft}h left`;
}

export function ProTeaser({ onOpen }: { onOpen: () => void }) {
  const { offer, pricing, isPro } = useOffer();
  return (
    <button
      onClick={onOpen}
      className="mt-5 flex w-full items-center gap-3 rounded-3xl border border-primary/40 bg-primary/5 p-4 text-left"
    >
      <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary">
        {isPro ? <Crown className="size-5" /> : <Zap className="size-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-display text-sm font-black uppercase tracking-wide text-primary">
          Padel Rival PRO
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {isPro
            ? "You're Pro — thanks for backing the app"
            : "Deeper stats, pro share cards, rival alerts"}
        </p>
      </div>
      {!isPro && (
        <span className="shrink-0 text-right">
          {offer.eligible && (
            <span className="block text-[10px] text-muted-foreground line-through">
              {formatPrice(offer.fullMonthly, pricing.currency)}
            </span>
          )}
          <span className="block font-display text-sm font-black text-primary">
            {formatPrice(offer.monthly, pricing.currency)}
          </span>
        </span>
      )}
    </button>
  );
}

/** Home-screen nudge shown only while a player's launch offer is running. */
export function ProOfferBanner() {
  const { offer, pricing, isPro } = useOffer();
  const [open, setOpen] = useState(false);
  if (isPro || !offer.eligible || offer.endsAt === null) return null;
  return (
    <>
      <button
        onClick={() => {
          haptic();
          setOpen(true);
        }}
        className="mt-4 flex w-full items-center gap-3 rounded-3xl border border-fire/50 bg-fire/10 p-4 text-left active:scale-[0.99]"
      >
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-fire/20 text-fire">
          <Clock className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-xs font-black uppercase tracking-wide text-fire">
            New player offer · {countdownText(offer)}
          </p>
          <p className="mt-0.5 text-sm">
            Pro for{" "}
            <span className="font-black">{formatPrice(offer.monthly, pricing.currency)}</span>
            <span className="text-muted-foreground">/mo </span>
            <span className="text-xs text-muted-foreground line-through">
              {formatPrice(offer.fullMonthly, pricing.currency)}
            </span>
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-fire px-2.5 py-1 text-[10px] font-black uppercase text-primary-foreground">
          -{offer.savePct}%
        </span>
      </button>
      {open && <ProModal onClose={() => setOpen(false)} />}
    </>
  );
}

export function ProModal({ onClose }: { onClose: () => void }) {
  const { offer, pricing, isPro } = useOffer();
  const [plan, setPlan] = useState<"monthly" | "yearly">("yearly");
  const price = plan === "monthly" ? offer.monthly : offer.yearly;
  const full = plan === "monthly" ? offer.fullMonthly : offer.fullYearly;
  const perMonth = plan === "yearly" ? offer.yearly / 12 : null;
  const timer = countdownText(offer);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background/95 backdrop-blur-md">
      <div className="mx-auto w-full max-w-md px-4 pb-16 pt-[max(env(safe-area-inset-top),1rem)]">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-black">Padel Rival PRO</h2>
          <button onClick={onClose} className="p-2 text-muted-foreground" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>

        {isPro ? (
          <div className="rounded-3xl border border-primary/50 bg-primary/5 p-5 text-center">
            <Crown className="mx-auto size-8 text-primary" />
            <p className="mt-2 font-display text-lg font-black">You're Pro</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Every Pro feature is unlocked on your account.
            </p>
          </div>
        ) : (
          <div className="rounded-3xl border border-primary/50 bg-primary/5 p-5 text-center">
            {offer.eligible ? (
              <p className="inline-flex items-center gap-1.5 rounded-full bg-fire/15 px-3 py-1 font-display text-[11px] font-black uppercase tracking-widest text-fire">
                <Clock className="size-3.5" /> Launch offer{timer ? ` · ${timer}` : ""}
              </p>
            ) : (
              <p className="font-display text-xs font-black uppercase tracking-widest text-primary">
                Go Pro
              </p>
            )}

            <div className="mt-4 grid grid-cols-2 gap-1 rounded-2xl border bg-card p-1">
              {(["monthly", "yearly"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPlan(p)}
                  className={cn(
                    "rounded-xl py-2 text-xs font-black uppercase",
                    plan === p ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                  )}
                >
                  {p}
                  {p === "yearly" && offer.monthly > 0 && (
                    <span className="ml-1 opacity-70">
                      save{" "}
                      {Math.max(0, Math.round((1 - offer.yearly / (offer.monthly * 12)) * 100))}%
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="mt-4 flex items-end justify-center gap-2">
              {offer.eligible && full > price && (
                <span className="pb-1 text-xl font-black text-muted-foreground line-through decoration-destructive decoration-2">
                  {formatPrice(full, pricing.currency)}
                </span>
              )}
              <span className="font-display text-4xl font-black text-primary">
                {formatPrice(price, pricing.currency)}
              </span>
              <span className="pb-1 text-sm font-bold text-muted-foreground">
                / {plan === "monthly" ? "month" : "year"}
              </span>
            </div>
            {perMonth !== null && (
              <p className="mt-1 text-xs text-muted-foreground">
                That's {formatPrice(perMonth, pricing.currency)} a month
              </p>
            )}
            {offer.eligible && (
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                {pricing.checkout_enabled
                  ? `New players get this price for their first ${pricing.promo_days} days. Join in time and you keep it for as long as you stay subscribed.`
                  : `This launch price is held for you. When payments open you'll have ${pricing.promo_days} days to claim it, and you keep it for as long as you stay subscribed.`}
              </p>
            )}
            {!pricing.checkout_enabled && (
              <p className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-muted-foreground">
                <Lock className="size-3.5" />
                Payments open soon
              </p>
            )}
          </div>
        )}

        <div className="mt-5 space-y-3">
          {PERKS.map((p) => (
            <div key={p.title} className="flex gap-3 rounded-2xl border p-4">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <p.icon className="size-5" />
              </div>
              <div>
                <p className="text-sm font-black">{p.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{p.body}</p>
              </div>
            </div>
          ))}
        </div>

        {!isPro && (
          <button
            disabled={!pricing.checkout_enabled}
            className="mt-6 w-full rounded-2xl bg-primary py-4 font-black uppercase tracking-wide text-primary-foreground glow disabled:cursor-not-allowed disabled:border disabled:border-primary/40 disabled:bg-primary/10 disabled:text-primary/60 disabled:shadow-none"
          >
            {pricing.checkout_enabled
              ? `Get Pro for ${formatPrice(price, pricing.currency)}`
              : "Billing opens soon"}
          </button>
        )}
        <button
          onClick={onClose}
          className="mt-3 w-full py-3 text-xs font-bold uppercase tracking-widest text-muted-foreground"
        >
          Back
        </button>
      </div>
    </div>
  );
}
