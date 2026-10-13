import { Link } from "@tanstack/react-router";
import { Radio } from "lucide-react";
import { BeaconCard } from "@/components/BeaconCard";
import { SectionTitle } from "@/components/PlayerProfile";
import { useBeacons, useNow } from "@/hooks/use-beacons";
import { useAppSettings } from "@/hooks/use-settings";

/** Home-screen carousel of games that still need players. */
export function OpenBeacons({ meId }: { meId: string | null }) {
  const beacons = useBeacons(12);
  const now = useNow();
  const { settings } = useAppSettings();
  const list = (beacons.data ?? [])
    .filter((b) => b.status === "open" || b.beacon_players.some((p) => p.user_id === meId))
    .slice(0, 6);

  if (beacons.isLoading || !settings.features.beacons) return null;

  return (
    <section className="mt-7">
      <div className="flex items-center justify-between">
        <SectionTitle>Open beacons</SectionTitle>
        <Link to="/beacons" className="mb-3 text-xs font-bold text-primary">
          {list.length ? "See all" : "Post one"}
        </Link>
      </div>
      {list.length === 0 ? (
        <Link
          to="/beacons"
          className="flex items-center gap-3 rounded-3xl border border-dashed p-4 active:scale-[0.99]"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary/15">
            <Radio className="size-5 text-primary" />
          </span>
          <span className="text-sm text-muted-foreground">
            <span className="font-bold text-foreground">Short of a player?</span> Light a beacon and
            share it to your group.
          </span>
        </Link>
      ) : (
        <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
          {list.map((b) => (
            <BeaconCard key={b.id} b={b} meId={meId} now={now} compact />
          ))}
        </div>
      )}
    </section>
  );
}
