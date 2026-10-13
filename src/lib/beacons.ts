export const SITE_URL = "https://padel.ogbot.co.uk";

export type BeaconPlayer = {
  id: string;
  display_name: string;
  avatar: string;
  avatar_color: string;
  rating: number;
};

export type Beacon = {
  id: string;
  created_by: string;
  venue: string;
  scheduled_at: string;
  players_needed: number;
  target_tier: string;
  court_side: string;
  match_type: string;
  notes: string | null;
  status: string;
  host: BeaconPlayer | null;
  beacon_players: { user_id: string; joined_at: string; profiles: BeaconPlayer | null }[];
};

export const BEACON_TIERS = ["open", "bronze", "silver", "gold", "platinum", "diamond"] as const;
export const BEACON_SIDES = ["any", "left", "right"] as const;

/** Players other than the host who have joined. */
export function joiners(b: Beacon) {
  return b.beacon_players.filter((p) => p.user_id !== b.created_by);
}

export function slotsLeft(b: Beacon) {
  return Math.max(0, b.players_needed - joiners(b).length);
}

export function countdown(iso: string, now = Date.now()) {
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return "Starting now";
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `in ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `in ${hours}h ${mins % 60}m`;
  const days = Math.floor(hours / 24);
  return `in ${days}d ${hours % 24}h`;
}

export function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** "tonight", "today", "tomorrow" or "on Sat 14 Oct". */
export function dayWord(iso: string, now = new Date()) {
  const d = new Date(iso);
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(d) - start(now)) / 86400000);
  if (diff === 0) return d.getHours() >= 17 ? "tonight" : "today";
  if (diff === 1) return "tomorrow";
  return `on ${d.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" })}`;
}

export function tierLabel(t: string) {
  return t === "open" ? "Any level" : `${t[0]!.toUpperCase()}${t.slice(1)}+`;
}

export function sideLabel(s: string) {
  return s === "any" ? "Either side" : `${s[0]!.toUpperCase()}${s.slice(1)} side`;
}

export function beaconShareText(b: Beacon) {
  const n = slotsLeft(b) || b.players_needed;
  const lines = [
    `🎾 Open match: ${n} spot${n > 1 ? "s" : ""} free ${dayWord(b.scheduled_at)} at ${b.venue} (${timeLabel(b.scheduled_at)})`,
    "Any player can join. The first to accept get the spots.",
  ];
  const extras = [
    b.target_tier !== "open" ? tierLabel(b.target_tier) : null,
    b.court_side !== "any" ? sideLabel(b.court_side) : null,
    b.match_type,
  ]
    .filter(Boolean)
    .join(" · ");
  if (extras) lines.push(extras);
  if (b.notes) lines.push(b.notes);
  lines.push(`Claim a spot: ${SITE_URL}/beacons`);
  return lines.join("\n");
}
