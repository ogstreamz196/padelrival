import { cn } from "@/lib/utils";
import { AVATAR_COLORS } from "@/lib/game";
import { tierTheme } from "./RankCrest";

/** Emoji avatars are plain characters; image avatars are stored as a URL/path. */
export function isImageAvatar(avatar?: string | null) {
  return !!avatar && (avatar.startsWith("/") || avatar.startsWith("http"));
}

export function PlayerAvatar({
  avatar,
  color,
  size = "md",
  className,
  rating,
}: {
  avatar?: string | null;
  color?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  /** When given, the avatar gets a prestige ring in the player's rank-tier metal. */
  rating?: number | null;
}) {
  const sizes = { sm: "size-8 text-base", md: "size-11 text-xl", lg: "size-16 text-3xl", xl: "size-24 text-5xl" };

  const inner = isImageAvatar(avatar) ? (
    <img
      src={avatar!}
      alt=""
      className={cn("shrink-0 rounded-2xl border border-border object-cover", sizes[size], className)}
    />
  ) : (
    <div
      className={cn(
        "grid shrink-0 place-items-center rounded-2xl font-bold",
        avatar ? AVATAR_COLORS[color ?? "lime"] ?? AVATAR_COLORS["lime"] : "bg-muted text-muted-foreground",
        sizes[size],
        className,
      )}
    >
      {avatar ?? "?"}
    </div>
  );

  if (rating == null) return inner;

  const t = tierTheme(rating);
  return (
    <span
      className="inline-grid shrink-0 place-items-center rounded-[1.35rem] p-[2.5px]"
      style={{ background: `linear-gradient(140deg, ${t.from}, ${t.to})`, boxShadow: t.glow }}
    >
      <span className="grid place-items-center rounded-[1.15rem] bg-background p-[2px]">{inner}</span>
    </span>
  );
}
