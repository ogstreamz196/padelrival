export const XP_PER_LEVEL = 250;

export function levelInfo(xp: number) {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const into = xp % XP_PER_LEVEL;
  return { level, into, pct: (into / XP_PER_LEVEL) * 100, needed: XP_PER_LEVEL };
}

export const TIERS = [
  { name: "Bronze", min: 0 },
  { name: "Silver", min: 950 },
  { name: "Gold", min: 1100 },
  { name: "Platinum", min: 1250 },
  { name: "Diamond", min: 1400 },
] as const;

export function rankTier(rating: number) {
  if (rating >= 1400) return "Diamond";
  if (rating >= 1250) return "Platinum";
  if (rating >= 1100) return "Gold";
  if (rating >= 950) return "Silver";
  return "Bronze";
}

/** Progress toward the next rank tier. `next` is null at the top tier. */
export function tierProgress(rating: number) {
  const i = TIERS.reduce((acc, t, j) => (rating >= t.min ? j : acc), 0);
  const cur = TIERS[i]!;
  const next = TIERS[i + 1] ?? null;
  if (!next) return { current: cur.name, next: null, toGo: 0, pct: 100 };
  const span = next.min - cur.min;
  const done = rating - cur.min;
  return {
    current: cur.name,
    next: next.name,
    toGo: next.min - rating,
    pct: Math.max(0, Math.min(100, (done / span) * 100)),
  };
}


export const ACHIEVEMENTS: Record<string, { name: string; desc: string; icon: string; lore: string }> = {
  first_win: { name: "First Win", desc: "Win your first match", icon: "🏆", lore: "Everyone remembers their first one. The ladder starts here." },
  streak_3: { name: "Heating Up", desc: "Win 3 matches in a row", icon: "🔥", lore: "Three on the bounce. The court is starting to feel yours." },
  streak_5: { name: "Unstoppable", desc: "Win 5 matches in a row", icon: "⚡", lore: "Five straight. Opponents are checking your rating before they book." },
  giant_killer: { name: "Giant Killer", desc: "Beat a team rated 100+ higher", icon: "🗡️", lore: "You took down a team you weren't supposed to beat." },
  rivalry_victor: { name: "Rivalry Victor", desc: "Beat the same rival 3 times", icon: "👑", lore: "Three wins over one rival. That head-to-head belongs to you." },
};

export const AVATARS = ["🎾", "🦁", "🐺", "🦅", "🐉", "🦈", "🔥", "⚡", "👑", "🥷", "🤖", "🐯"];

/** Curated avatar collections for the avatar studio. */
/** 3D avatars from Microsoft Fluent Emoji (MIT). */
const f3d = (name: string) =>
  `https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/${encodeURIComponent(name)}/3D/${name.toLowerCase().replace(/[ -]/g, "_")}_3d.png`;
const many3d = (names: string) => names.split(",").map((n) => f3d(n.trim()));

export const AVATAR_GROUPS: { label: string; icons: string[] }[] = [
  { label: "3D Power", icons: many3d("Tennis, Trophy, Fire, High voltage, Crown, Gem stone, Rocket, 1st place medal, Sports medal, Bullseye, Glowing star, Comet, Collision, Boomerang, Flying saucer, Hundred points, Bomb, Crossed swords, Shield, Magic wand, Crystal ball, Cloud with lightning, Volcano, Rainbow, Video game, Joystick, Headphone, Sunglasses, Hot pepper, Pizza, Avocado, Doughnut, Watermelon, Banana, Popcorn, Dizzy") },
  { label: "3D Faces", icons: many3d("Smiling face with sunglasses, Smiling face with horns, Exploding head, Hot face, Cold face, Nerd face, Cowboy hat face, Clown face, Robot, Alien, Alien monster, Ghost, Skull, Ogre, Goblin, Joker, Sun with face, Full moon face, Monkey face, Cat face, Dog face, Pig face, Rabbit face") },
  { label: "3D Beasts", icons: many3d("Lion, Tiger face, Wolf, Fox, Dragon, Shark, Eagle, Gorilla, Unicorn, Panda, Owl, Octopus, Bear, Koala, Penguin, Frog, Hamster, Butterfly") },
  { label: "Padel", icons: ["🎾", "🏓", "🥇", "🥈", "🥉", "🏆", "🏅", "🧱", "🪃", "🎯", "🧤", "🏟️", "👟", "🧢", "💪", "🏃", "🤸", "⛹️", "🙌", "🤜", "✊", "🥵", "💦", "🌴"] },
  { label: "Beasts", icons: ["🦁", "🐺", "🦅", "🐉", "🦈", "🐯", "🐍", "🦂", "🦍", "🐆", "🦏", "🐊", "🦖", "🦬", "🐗", "🦊", "🐻", "🐼", "🦉", "🐙", "🦄", "🐝", "🦋", "🐧"] },
  { label: "Icons", icons: ["🔥", "⚡", "👑", "🥷", "🤖", "💎", "☠️", "🚀", "👽", "👻", "😈", "🤡", "😎", "🤠", "🥶", "🧙", "🦸", "🦹", "🧛", "🧟", "💀", "🌪️", "☄️", "🌈"] },
];

export const AVATAR_COLORS: Record<string, string> = {
  lime: "bg-primary text-primary-foreground",
  court: "bg-court text-court-foreground",
  fire: "bg-fire text-primary-foreground",
  win: "bg-win text-primary-foreground",
  red: "bg-destructive text-destructive-foreground",
  sunset: "bg-gradient-to-br from-fire to-destructive text-primary-foreground",
  electric: "bg-gradient-to-br from-primary to-court text-primary-foreground",
  carbon: "bg-gradient-to-br from-muted to-background text-foreground",
  solar: "bg-gradient-to-br from-primary to-fire text-primary-foreground",
  prism: "bg-gradient-to-br from-court via-primary to-fire text-primary-foreground",
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

/** Common padel set endings, tapped as quick presets. */
export const SET_PRESETS: SetScore[] = [
  [6, 0],
  [6, 1],
  [6, 2],
  [6, 3],
  [6, 4],
  [7, 5],
  [7, 6],
];

export const STB_PRESETS: SetScore[] = [
  [10, 4],
  [10, 6],
  [10, 8],
  [11, 9],
  [12, 10],
];

/** Returns an error message when a set score can't happen in padel, otherwise null. */
export function validateSet([a, b]: SetScore, decider = false): string | null {
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  if (a === b) return "A set can't end level";
  if (decider) {
    if (hi < 10) return "Super tie-break goes to at least 10";
    if (hi > 10 && hi - lo !== 2) return "Past 10-8 you win the tie-break by exactly 2";
    if (hi === 10 && lo > 8) return "10-9 isn't possible — win by 2";
    return null;
  }
  if (hi < 6) return "A set is won with 6 games";
  if (hi === 6 && lo > 4) return "6-5 isn't a finished set";
  if (hi === 7 && lo < 5) return "7 games only happens as 7-5 or 7-6";
  if (hi > 7) return "A padel set stops at 7 games";
  return null;
}


/** Same Elo maths as the record_match SQL function (K = 32, guests count as 1000). */
export const ELO_K = 32;

export function winChance(team: (number | null | undefined)[], opponents: (number | null | undefined)[]) {
  const avg = (xs: (number | null | undefined)[]) => xs.reduce<number>((s, r) => s + (r ?? 1000), 0) / Math.max(xs.length, 1);
  return 1 / (1 + Math.pow(10, (avg(opponents) - avg(team)) / 400));
}

/** Rating change for a win and a loss at a given win chance. */
export function ratingSwing(chance: number) {
  // Postgres round() goes half away from zero; Math.round doesn't for negatives.
  const round = (x: number) => Math.sign(x) * Math.round(Math.abs(x));
  return { win: round(ELO_K * (1 - chance)), loss: round(ELO_K * (0 - chance)) };
}

/**
 * Approximate padel level on the familiar 1–7 club scale, from Elo.
 * 700 ≈ 1.0, a new player (1000) ≈ 2.8, 1700+ ≈ 7.0. A guide, not an official grading.
 */
export function padelLevel(rating: number) {
  const lvl = 1 + ((rating - 700) / 1000) * 6;
  return Math.round(Math.max(0.5, Math.min(7, lvl)) * 10) / 10;
}
