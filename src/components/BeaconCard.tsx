import { Link } from "@tanstack/react-router";
import { Clock, MapPin, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuthGate } from "@/components/AuthPrompt";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { TIER_THEME, type TierName } from "@/components/RankCrest";
import { useBeaconAction, type BeaconAction } from "@/hooks/use-beacons";
import {
  beaconShareText,
  countdown,
  dayWord,
  joiners,
  sideLabel,
  slotsLeft,
  tierLabel,
  timeLabel,
  type Beacon,
} from "@/lib/beacons";
import { whatsappUrl } from "@/lib/share";
import { SafetyMenu } from "@/components/SafetyMenu";
import { cn, haptic } from "@/lib/utils";

export function BeaconCard({
  b,
  meId,
  now,
  compact,
}: {
  b: Beacon;
  meId: string | null;
  now: number;
  compact?: boolean;
}) {
  const { gate } = useAuthGate();
  const act = useBeaconAction();
  const isHost = b.created_by === meId;
  const joined = b.beacon_players.some((p) => p.user_id === meId);
  const left = slotsLeft(b);
  const full = b.status === "filled" || left === 0;
  const others = joiners(b);
  const tierName = `${b.target_tier.charAt(0).toUpperCase()}${b.target_tier.slice(1)}` as TierName;
  const tierTone = TIER_THEME[tierName]?.text ?? "text-muted-foreground";

  function run(action: BeaconAction) {
    haptic();
    if (!gate("Create a free account to join games and get your spot saved.")) return;
    act.mutate(
      { id: b.id, action },
      {
        onSuccess: (status) => {
          if (action === "join")
            toast.success(status === "filled" ? "Spot claimed. The match is now full!" : "Spot claimed. You're in the match!");
          else if (action === "leave") toast.success("You gave up your spot");
          else toast.success("Open match cancelled");
        },
        onError: (e) => toast.error(e.message),
      },
    );
  }

  return (
    <article
      className={cn(
        "rounded-3xl border bg-card p-4",
        full && "opacity-90",
        compact && "w-72 shrink-0 snap-start",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 truncate font-display text-base font-black">
            <MapPin className="size-4 shrink-0 text-court" />
            <span className="truncate">{b.venue}</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground">
            <Clock className="size-3.5" />
            <span className="capitalize">{dayWord(b.scheduled_at)}</span> ·{" "}
            {timeLabel(b.scheduled_at)}
            <span className="font-bold text-fire">{countdown(b.scheduled_at, now)}</span>
          </div>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide",
            full ? "bg-win/15 text-win" : "bg-primary/15 text-primary",
          )}
        >
          {full ? "Full" : `${left} spot${left > 1 ? "s" : ""} open`}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-black uppercase tracking-wide">
        <span className={cn("rounded-full border px-2 py-0.5", tierTone)}>
          {tierLabel(b.target_tier)}
        </span>
        <span className="rounded-full border px-2 py-0.5 text-court">
          {sideLabel(b.court_side)}
        </span>
        <span className="rounded-full border px-2 py-0.5 text-muted-foreground">
          {b.match_type}
        </span>
      </div>

      {b.notes && !compact && <p className="mt-2 text-sm text-muted-foreground">{b.notes}</p>}

      <div className="mt-3 flex items-center gap-2">
        {b.host && (
          <Link
            to="/player/$id"
            params={{ id: b.host.id }}
            className="flex items-center gap-1.5"
            title={`Host: ${b.host.display_name}`}
          >
            <PlayerAvatar
              avatar={b.host.avatar}
              color={b.host.avatar_color}
              size="sm"
              className="ring-2 ring-primary"
            />
          </Link>
        )}
        {others.map((p) =>
          p.profiles ? (
            <Link
              key={p.user_id}
              to="/player/$id"
              params={{ id: p.user_id }}
              title={p.profiles.display_name}
            >
              <PlayerAvatar avatar={p.profiles.avatar} color={p.profiles.avatar_color} size="sm" />
            </Link>
          ) : null,
        )}
        {Array.from({ length: left }).map((_, i) => (
          <div
            key={i}
            className="grid size-8 place-items-center rounded-2xl border border-dashed border-primary/60 text-[10px] font-black text-primary"
          >
            +1
          </div>
        ))}
        {b.host && !compact && (
          <span className="ml-1 min-w-0 truncate text-xs text-muted-foreground">
            Hosted by{" "}
            <span className="font-bold text-foreground">
              {isHost ? "you" : b.host.display_name.split(" ")[0]}
            </span>
          </span>
        )}
        {b.host && !isHost && !compact && (
          <SafetyMenu meId={meId} userId={b.host.id} name={b.host.display_name.split(" ")[0]!} kind="open_match" targetId={b.id} className="ml-auto size-7" />
        )}
      </div>

      <div className="mt-4 flex gap-2">
        {isHost ? (
          <button
            disabled={act.isPending}
            onClick={() => {
              if (confirm("Cancel this open match for everyone who joined?")) run("cancel");
            }}
            className="flex-1 rounded-2xl border py-2.5 text-xs font-black uppercase text-destructive active:scale-95 disabled:opacity-50"
          >
            Cancel
          </button>
        ) : joined ? (
          <button
            disabled={act.isPending}
            onClick={() => run("leave")}
            className="flex-1 rounded-2xl border py-2.5 text-xs font-black uppercase text-muted-foreground active:scale-95 disabled:opacity-50"
          >
            Give up spot
          </button>
        ) : (
          <button
            disabled={act.isPending || full}
            onClick={() => run("join")}
            className="flex-1 rounded-2xl bg-primary py-2.5 text-xs font-black uppercase text-primary-foreground active:scale-95 disabled:opacity-40"
          >
            {full ? "Match full" : "Claim a spot"}
          </button>
        )}
        <a
          href={whatsappUrl(beaconShareText(b))}
          target="_blank"
          rel="noreferrer"
          onClick={() => haptic()}
          className="flex items-center justify-center gap-1.5 rounded-2xl border border-win/50 px-3 py-2.5 text-xs font-black uppercase text-win active:scale-95"
          aria-label="Share to WhatsApp"
        >
          <MessageCircle className="size-4" />
          {!compact && "WhatsApp"}
        </a>
      </div>
    </article>
  );
}
