import { cn } from "@/lib/utils";
import { AVATAR_COLORS } from "@/lib/game";

export function PlayerAvatar({
  avatar,
  color,
  size = "md",
  className,
}: {
  avatar?: string | null;
  color?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const sizes = { sm: "size-8 text-base", md: "size-11 text-xl", lg: "size-16 text-3xl", xl: "size-24 text-5xl" };
  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center rounded-2xl font-bold",
        avatar ? AVATAR_COLORS[color ?? "lime"] ?? AVATAR_COLORS.lime : "bg-muted text-muted-foreground",
        sizes[size],
        className,
      )}
    >
      {avatar ?? "?"}
    </div>
  );
}
