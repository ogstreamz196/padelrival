import { Link } from "@tanstack/react-router";
import { MapPin, Radio, Swords } from "lucide-react";
import { cn, haptic } from "@/lib/utils";

const LINKS = [
  { to: "/beacons", label: "Need a 4th", icon: Radio, tone: "text-primary" },
  { to: "/venues", label: "Clubs", icon: MapPin, tone: "text-court" },
  { to: "/compare", label: "Dossier", icon: Swords, tone: "text-fire" },
] as const;

/** Pills linking to the screens that sit outside the bottom nav. */
export function QuickLinks({ className }: { className?: string }) {
  return (
    <div className={cn("flex gap-2 overflow-x-auto pb-1", className)}>
      {LINKS.map(({ to, label, icon: Icon, tone }) => (
        <Link
          key={to}
          to={to}
          onClick={() => haptic()}
          className="flex shrink-0 items-center gap-1.5 rounded-full border bg-card px-3.5 py-2 text-xs font-black uppercase tracking-wide active:scale-95"
        >
          <Icon className={cn("size-4", tone)} />
          {label}
        </Link>
      ))}
    </div>
  );
}
