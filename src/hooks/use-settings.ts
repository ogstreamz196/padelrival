import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Pricing = {
  currency: string;
  monthly: number;
  yearly: number;
  promo_enabled: boolean;
  promo_monthly: number;
  promo_yearly: number;
  /** Days after sign-up that a new player can claim the offer price. */
  promo_days: number;
  checkout_enabled: boolean;
};
export type Features = { beacons: boolean; venues: boolean; dossier: boolean; ai_coach: boolean };
export type Announcement = { enabled: boolean; text: string; tone: "info" | "promo" | "warning" };

export type AppSettings = { pricing: Pricing; features: Features; announcement: Announcement };

export const DEFAULT_SETTINGS: AppSettings = {
  pricing: {
    currency: "GBP",
    monthly: 4.99,
    yearly: 39.99,
    promo_enabled: true,
    promo_monthly: 2.99,
    promo_yearly: 24.99,
    promo_days: 15,
    checkout_enabled: false,
  },
  features: { beacons: true, venues: true, dossier: true, ai_coach: true },
  announcement: { enabled: false, text: "", tone: "info" },
};

/** Boss-controlled app settings; falls back to defaults until the table exists or loads. */
export function useAppSettings() {
  const q = useQuery({
    queryKey: ["app-settings"],
    staleTime: 60 * 1000,
    queryFn: async (): Promise<AppSettings> => {
      const { data, error } = await supabase.from("app_settings").select("key,value");
      if (error) throw error;
      const by = Object.fromEntries((data ?? []).map((r) => [r.key, r.value])) as Partial<
        Record<keyof AppSettings, object>
      >;
      return {
        pricing: { ...DEFAULT_SETTINGS.pricing, ...(by.pricing ?? {}) },
        features: { ...DEFAULT_SETTINGS.features, ...(by.features ?? {}) },
        announcement: { ...DEFAULT_SETTINGS.announcement, ...(by.announcement ?? {}) },
      };
    },
  });
  return { settings: q.data ?? DEFAULT_SETTINGS, loading: q.isLoading };
}

export function formatPrice(n: number, currency = "GBP") {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(n);
}

/** The price a player sees right now, and when their launch offer runs out. */
export function proOffer(p: Pricing, signedUpAt?: string | null, now = Date.now()) {
  const endsAt = signedUpAt ? new Date(signedUpAt).getTime() + p.promo_days * 86400000 : null;
  const eligible = p.promo_enabled && (endsAt === null || endsAt > now);
  const msLeft = endsAt ? Math.max(0, endsAt - now) : 0;
  return {
    eligible,
    monthly: eligible ? p.promo_monthly : p.monthly,
    yearly: eligible ? p.promo_yearly : p.yearly,
    fullMonthly: p.monthly,
    fullYearly: p.yearly,
    endsAt,
    daysLeft: Math.floor(msLeft / 86400000),
    hoursLeft: Math.floor((msLeft % 86400000) / 3600000),
    savePct: p.monthly > 0 ? Math.round((1 - p.promo_monthly / p.monthly) * 100) : 0,
  };
}
