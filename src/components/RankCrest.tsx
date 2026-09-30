import { cn } from "@/lib/utils";
import { rankTier } from "@/lib/game";

export type TierName = "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond";

/** Visual identity per rank tier — card frame, crest metal and accent text. */
export const TIER_THEME: Record<
  TierName,
  { from: string; to: string; ring: string; text: string; card: string; glow: string }
> = {
  Bronze: {
    from: "oklch(0.62 0.11 55)",
    to: "oklch(0.38 0.07 45)",
    ring: "ring-[oklch(0.62_0.11_55_/_0.55)]",
    text: "text-[oklch(0.78_0.12_60)]",
    card: "from-[oklch(0.62_0.11_55_/_0.22)]",
    glow: "0 18px 50px -24px oklch(0.62 0.11 55 / 0.9)",
  },
  Silver: {
    from: "oklch(0.88 0.02 250)",
    to: "oklch(0.55 0.03 255)",
    ring: "ring-[oklch(0.88_0.02_250_/_0.5)]",
    text: "text-[oklch(0.9_0.02_250)]",
    card: "from-[oklch(0.88_0.02_250_/_0.18)]",
    glow: "0 18px 50px -24px oklch(0.88 0.02 250 / 0.7)",
  },
  Gold: {
    from: "oklch(0.88 0.17 92)",
    to: "oklch(0.6 0.14 72)",
    ring: "ring-[oklch(0.88_0.17_92_/_0.6)]",
    text: "text-[oklch(0.88_0.17_92)]",
    card: "from-[oklch(0.88_0.17_92_/_0.22)]",
    glow: "0 20px 55px -22px oklch(0.88 0.17 92 / 0.85)",
  },
  Platinum: {
    from: "oklch(0.85 0.09 205)",
    to: "oklch(0.52 0.11 245)",
    ring: "ring-[oklch(0.85_0.09_205_/_0.6)]",
    text: "text-[oklch(0.85_0.09_205)]",
    card: "from-[oklch(0.85_0.09_205_/_0.22)]",
    glow: "0 20px 55px -22px oklch(0.75 0.12 225 / 0.85)",
  },
  Diamond: {
    from: "oklch(0.9 0.15 195)",
    to: "oklch(0.62 0.22 300)",
    ring: "ring-[oklch(0.9_0.15_195_/_0.65)]",
    text: "text-[oklch(0.9_0.15_195)]",
    card: "from-[oklch(0.8_0.18_250_/_0.28)]",
    glow: "0 22px 60px -20px oklch(0.75 0.2 280 / 0.9)",
  },
};

export function tierTheme(rating: number) {
  return TIER_THEME[rankTier(rating) as TierName];
}

const SIZES = { sm: 20, md: 30, lg: 56 } as const;

/** Metallic crest emblem for a rank tier. */
export function RankCrest({
  rating,
  size = "md",
  className,
}: {
  rating: number;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const tier = rankTier(rating) as TierName;
  const t = TIER_THEME[tier];
  const px = SIZES[size];
  const id = `crest-${tier}`;

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 64 64"
      aria-label={`${tier} rank`}
      role="img"
      className={cn("shrink-0 drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]", className)}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor={t.from} />
          <stop offset="48%" stopColor={t.from} stopOpacity="0.85" />
          <stop offset="100%" stopColor={t.to} />
        </linearGradient>
        <linearGradient id={`${id}-shine`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="55%" stopColor="#fff" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* shield body */}
      <path
        d="M32 3 58 12v22c0 14-11 23-26 27C17 57 6 48 6 34V12L32 3Z"
        fill={`url(#${id})`}
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="1.5"
      />
      <path d="M32 3 58 12v22c0 14-11 23-26 27V3Z" fill="rgba(0,0,0,0.12)" />
      <path d="M32 6 55 14v20c0 12-9.5 20-23 23.6Z" fill={`url(#${id}-shine)`} opacity="0.5" />

      {tier === "Bronze" && (
        <g stroke="rgba(0,0,0,0.35)" strokeWidth="3" strokeLinecap="round">
          <path d="M20 28h24" />
          <path d="M20 38h24" />
        </g>
      )}
      {tier === "Silver" && (
        <g fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 32l12-10 12 10" />
          <path d="M20 44l12-10 12 10" />
        </g>
      )}
      {tier === "Gold" && (
        <g fill="rgba(255,255,255,0.9)">
          <path d="M18 24l7 8 7-12 7 12 7-8v18H18Z" />
          <circle cx="32" cy="48" r="3" />
        </g>
      )}
      {tier === "Platinum" && (
        <g fill="rgba(255,255,255,0.92)">
          <path d="M32 18l5.6 11.6L50 31.4l-9 8.8 2.2 12.4L32 46.8 20.8 52.6 23 40.2l-9-8.8 12.4-1.8Z" />
        </g>
      )}
      {tier === "Diamond" && (
        <g>
          <path d="M32 17l13 11-13 20-13-20Z" fill="rgba(255,255,255,0.92)" />
          <path d="M32 17l13 11H19Z" fill="rgba(255,255,255,0.6)" />
          <path d="M32 17v31l-13-20Z" fill="rgba(255,255,255,0.35)" />
        </g>
      )}
    </svg>
  );
}

/** Small pill: crest + tier name, for headers and lists. */
export function TierPill({ rating, className }: { rating: number; className?: string }) {
  const tier = rankTier(rating) as TierName;
  const t = TIER_THEME[tier];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/50 py-1 pl-1 pr-2.5 text-[10px] font-black uppercase tracking-widest",
        t.text,
        className,
      )}
    >
      <RankCrest rating={rating} size="sm" />
      {tier}
    </span>
  );
}
