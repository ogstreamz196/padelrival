export const XP_PER_LEVEL = 250;

export function levelInfo(xp: number) {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const into = xp % XP_PER_LEVEL;
  return { level, into, pct: (into / XP_PER_LEVEL) * 100, needed: XP_PER_LEVEL };
}

export function rankTier(rating: number) {
  if (rating >= 1400) return "Diamond";
  if (rating >= 1250) return "Platinum";
  if (rating >= 1100) return "Gold";
  if (rating >= 950) return "Silver";
  return "Bronze";
}

export const ACHIEVEMENTS: Record<string, { name: string; desc: string; icon: string }> = {
  first_win: { name: "First Win", desc: "Win your first match", icon: "🏆" },
  streak_3: { name: "Heating Up", desc: "Win 3 matches in a row", icon: "🔥" },
  streak_5: { name: "Unstoppable", desc: "Win 5 matches in a row", icon: "⚡" },
  giant_killer: { name: "Giant Killer", desc: "Beat a team rated 100+ higher", icon: "🗡️" },
  rivalry_victor: { name: "Rivalry Victor", desc: "Beat the same rival 3 times", icon: "👑" },
};

export const AVATARS = ["🎾", "🦁", "🐺", "🦅", "🐉", "🦈", "🔥", "⚡", "👑", "🥷", "🤖", "🐯"];
export const AVATAR_COLORS: Record<string, string> = {
  lime: "bg-primary text-primary-foreground",
  court: "bg-court text-court-foreground",
  fire: "bg-fire text-primary-foreground",
  win: "bg-win text-primary-foreground",
  red: "bg-destructive text-destructive-foreground",
};

export type SetScore = [number, number];

export function formatSets(sets: SetScore[], flip = false) {
  return sets.map(([a, b]) => (flip ? `${b}-${a}` : `${a}-${b}`)).join("  ");
}

/** Weekly season: resets Monday 00:00 local time. */
export function weekReset(now = new Date()) {
  const end = new Date(now);
  const day = (end.getDay() + 6) % 7; // 0 = Monday
  end.setDate(end.getDate() + (7 - day));
  end.setHours(0, 0, 0, 0);
  const ms = end.getTime() - now.getTime();
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  return { end, days, hours, label: days > 0 ? `${days}d ${hours}h left` : `${hours}h left` };
}

export const UNDO_WINDOW_MS = 15 * 60 * 1000;

export function undoLeft(createdAt: string) {
  const ms = UNDO_WINDOW_MS - (Date.now() - new Date(createdAt).getTime());
  return ms > 0 ? Math.ceil(ms / 60000) : 0;
}

export function isProvisional(matches: number) {
  return matches < 5;
}
