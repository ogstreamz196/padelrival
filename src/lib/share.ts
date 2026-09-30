import type { SetScore } from "./game";

export type ShareData = {
  won: boolean;
  me: string;
  partner: string;
  opponents: string[];
  sets: SetScore[];
  ratingDelta: number;
  ratingAfter: number;
  xp: number;
  streak: number;
};

export function buildShareText(d: ShareData) {
  const score = d.sets.map(([a, b]) => `${a}-${b}`).join(", ");
  const winners = d.won ? `${d.me} & ${d.partner}` : d.opponents.join(" & ");
  const losers = d.won ? d.opponents.join(" & ") : `${d.me} & ${d.partner}`;
  const lines = [
    "🎾 PADEL RIVAL — MATCH RESULT",
    `🏆 ${winners} def. ${losers}`,
    `📊 ${score}`,
    `📈 ${d.me}: ${d.ratingDelta >= 0 ? "+" : ""}${d.ratingDelta} rating (${d.ratingAfter}) · +${d.xp} XP`,
  ];
  if (d.streak >= 3) lines.push(`🔥 ${d.me} is on a ${d.streak}-match win streak!`);
  return lines.join("\n");
}

export function whatsappUrl(text: string) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Draws a 1080x1350 story card and returns it as a PNG blob. */
export async function renderMatchCard(d: ShareData): Promise<Blob | null> {
  const W = 1080;
  const H = 1350;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d");
  if (!g) return null;

  const accent = d.won ? "#d7ff3e" : "#ff5470";
  g.fillStyle = "#0b1020";
  g.fillRect(0, 0, W, H);

  const glow = g.createRadialGradient(W / 2, 120, 40, W / 2, 120, 780);
  glow.addColorStop(0, d.won ? "rgba(215,255,62,0.30)" : "rgba(255,84,112,0.28)");
  glow.addColorStop(1, "rgba(11,16,32,0)");
  g.fillStyle = glow;
  g.fillRect(0, 0, W, H);

  g.strokeStyle = "rgba(255,255,255,0.10)";
  g.lineWidth = 4;
  g.strokeRect(60, 60, W - 120, H - 120);
  g.beginPath();
  g.moveTo(60, H / 2);
  g.lineTo(W - 60, H / 2);
  g.stroke();

  const center = (text: string, y: number, size: number, color: string, weight = "900") => {
    g.fillStyle = color;
    g.font = `${weight} ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    g.textAlign = "center";
    g.fillText(text, W / 2, y);
  };

  center("PADEL RIVAL", 170, 34, "rgba(255,255,255,0.55)");
  center(d.won ? "VICTORY" : "DEFEAT", 320, 130, accent);
  center(`${d.me} & ${d.partner}`, 430, 44, "#ffffff");
  center("vs", 490, 32, "rgba(255,255,255,0.45)");
  center(d.opponents.join(" & "), 550, 44, "#ffffff");

  const score = d.sets.map(([a, b]) => `${a}-${b}`).join("   ");
  center(score, 760, 104, "#ffffff");

  center(`${d.ratingDelta >= 0 ? "+" : ""}${d.ratingDelta}`, 990, 96, d.ratingDelta >= 0 ? "#43e08a" : "#ff5470");
  center("RATING", 1035, 28, "rgba(255,255,255,0.5)");
  center(`${d.ratingAfter} · +${d.xp} XP${d.streak >= 3 ? ` · 🔥 ${d.streak}` : ""}`, 1120, 40, "rgba(255,255,255,0.8)");
  center("padelrival", 1240, 30, "rgba(255,255,255,0.35)");

  return await new Promise((resolve) => c.toBlob((b) => resolve(b), "image/png"));
}

export async function shareMatchCard(d: ShareData) {
  const text = buildShareText(d);
  const blob = await renderMatchCard(d);
  const file = blob ? new File([blob], "padel-rival.png", { type: "image/png" }) : null;
  const nav = navigator as Navigator & { canShare?: (data: ShareData_) => boolean };
  type ShareData_ = { files?: File[]; text?: string; title?: string };
  if (file && nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], text, title: "Padel Rival" });
      return "shared";
    } catch {
      return "cancelled";
    }
  }
  if (blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "padel-rival.png";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return "downloaded";
  }
  return "failed";
}

// ---------------- Collectible player card (9:16 story) ----------------

export type PlayerCardData = {
  name: string;
  username: string;
  avatar: string;
  rating: number;
  tier: string;
  level: number;
  wins: number;
  losses: number;
  streak: number;
  best: number;
  badge?: string | undefined;
  left?: { wins: number; losses: number } | undefined;
  right?: { wins: number; losses: number } | undefined;
};

const TIER_HEX: Record<string, string> = {
  Bronze: "#c98b5a",
  Silver: "#cfd8e3",
  Gold: "#ffd45e",
  Platinum: "#7fd4ff",
  Diamond: "#b58cff",
};

export function buildPlayerText(d: PlayerCardData) {
  const total = d.wins + d.losses;
  const pct = total ? Math.round((d.wins / total) * 100) : 0;
  const lines = [
    "🎾 PADEL RIVAL — PLAYER CARD",
    `${d.name} (@${d.username})`,
    `${d.tier} · ${d.rating} rating · Lv ${d.level}`,
    `${d.wins}W-${d.losses}L · ${pct}% win rate`,
  ];
  if (d.streak >= 3) lines.push(`🔥 On a ${d.streak}-match win streak`);
  return lines.join("\n");
}

/** Draws a 1080x1920 collectible player card and returns it as a PNG blob. */
export async function renderPlayerCard(d: PlayerCardData): Promise<Blob | null> {
  const W = 1080;
  const H = 1920;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d");
  if (!g) return null;

  const accent = TIER_HEX[d.tier] ?? "#d7ff3e";
  const total = d.wins + d.losses;
  const pct = total ? Math.round((d.wins / total) * 100) : 0;

  g.fillStyle = "#0b1020";
  g.fillRect(0, 0, W, H);

  const glow = g.createRadialGradient(W / 2, 420, 60, W / 2, 420, 900);
  glow.addColorStop(0, `${accent}40`);
  glow.addColorStop(1, "rgba(11,16,32,0)");
  g.fillStyle = glow;
  g.fillRect(0, 0, W, H);

  // card frame
  const round = (x: number, y: number, w: number, h: number, r: number) => {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  };
  round(70, 140, W - 140, H - 280, 56);
  g.strokeStyle = accent;
  g.lineWidth = 6;
  g.stroke();
  g.fillStyle = "rgba(255,255,255,0.03)";
  g.fill();

  const center = (text: string, y: number, size: number, color: string, weight = "900") => {
    g.fillStyle = color;
    g.font = `${weight} ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    g.textAlign = "center";
    g.fillText(text, W / 2, y);
  };

  center("PADEL RIVAL", 240, 34, "rgba(255,255,255,0.55)");
  center(d.tier.toUpperCase(), 320, 52, accent);

  // avatar disc
  g.beginPath();
  g.arc(W / 2, 500, 120, 0, Math.PI * 2);
  g.fillStyle = "rgba(255,255,255,0.07)";
  g.fill();
  g.strokeStyle = accent;
  g.lineWidth = 8;
  g.stroke();
  const emoji = /^[/h]/.test(d.avatar) ? "🎾" : d.avatar;
  center(emoji, 548, 120, "#ffffff");

  center(d.name, 700, 66, "#ffffff");
  center(`@${d.username}`, 752, 34, "rgba(255,255,255,0.5)");
  if (d.badge) center(d.badge, 812, 34, accent);

  center(String(d.rating), 990, 150, accent);
  center("RATING", 1040, 30, "rgba(255,255,255,0.5)");

  // stat row
  const stats: [string, string][] = [
    [`${d.wins}-${d.losses}`, "RECORD"],
    [`${pct}%`, "WIN RATE"],
    [`Lv ${d.level}`, "LEVEL"],
  ];
  stats.forEach(([v, l], i) => {
    const x = W / 2 + (i - 1) * 300;
    g.textAlign = "center";
    g.fillStyle = "#ffffff";
    g.font = `900 64px system-ui, -apple-system, sans-serif`;
    g.fillText(v, x, 1220);
    g.fillStyle = "rgba(255,255,255,0.45)";
    g.font = `700 26px system-ui, -apple-system, sans-serif`;
    g.fillText(l, x, 1264);
  });

  let y = 1400;
  if (d.left || d.right) {
    const fmt = (s?: { wins: number; losses: number }) => {
      if (!s || s.wins + s.losses === 0) return "—";
      return `${Math.round((s.wins / (s.wins + s.losses)) * 100)}% (${s.wins}-${s.losses})`;
    };
    center(`LEFT ${fmt(d.left)}    ·    RIGHT ${fmt(d.right)}`, y, 36, "rgba(255,255,255,0.8)");
    y += 90;
  }
  if (d.streak >= 1) {
    center(`🔥 ${d.streak} win streak · best ${d.best}`, y, 40, "#ffffff");
    y += 90;
  }

  center("padel.ogbot.co.uk", 1790, 32, "rgba(255,255,255,0.35)");

  return await new Promise((resolve) => c.toBlob((b) => resolve(b), "image/png"));
}

export async function sharePlayerCard(d: PlayerCardData) {
  const text = buildPlayerText(d);
  const blob = await renderPlayerCard(d);
  const file = blob ? new File([blob], "padel-rival-card.png", { type: "image/png" }) : null;
  const nav = navigator as Navigator & { canShare?: (data: { files?: File[] }) => boolean };
  if (file && nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], text, title: "Padel Rival" });
      return "shared";
    } catch {
      return "cancelled";
    }
  }
  if (blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "padel-rival-card.png";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return "downloaded";
  }
  return "failed";
}
