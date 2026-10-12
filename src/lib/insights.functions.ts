import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type MP = { team: number; user_id: string | null; guest_name: string | null; rating_before: number; profiles: { display_name: string } | null };
type Row = {
  team: number;
  rating_delta: number;
  matches: {
    id: string;
    created_at: string;
    venue: string | null;
    match_type: string;
    sets: [number, number][];
    winner_team: number;
    match_players: MP[];
  } | null;
};

export const getMatchInsights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ matchIds: z.array(z.string().uuid()).min(1).max(20) }).parse(d))
  .handler(async ({ data, context }) => {
    const uid = context.userId;

    const [{ data: me }, { data: rows, error }] = await Promise.all([
      context.supabase.from("profiles").select("display_name,rating,wins,losses,current_streak,court_side").eq("id", uid).single(),
      context.supabase
        .from("match_players")
        .select("team,rating_delta,matches(id,created_at,venue,match_type,sets,winner_team,match_players(team,user_id,guest_name,rating_before,profiles(display_name)))")
        .eq("user_id", uid)
        .in("match_id", data.matchIds),
    ]);
    if (error) throw new Error(error.message);
    const list = ((rows ?? []) as unknown as Row[]).filter((r) => r.matches);
    if (!list.length) throw new Error("Pick at least one of your matches.");

    const lines = list
      .sort((a, b) => a.matches!.created_at.localeCompare(b.matches!.created_at))
      .map((r) => {
        const m = r.matches!;
        const name = (p: MP) => p.profiles?.display_name ?? p.guest_name ?? "Guest";
        const partner = m.match_players.filter((p) => p.team === r.team && p.user_id !== uid).map(name).join(", ");
        const opps = m.match_players.filter((p) => p.team !== r.team);
        const oppAvg = Math.round(opps.reduce((s, p) => s + (p.rating_before ?? 1000), 0) / Math.max(opps.length, 1));
        const sets = m.sets.map(([a, b]) => (r.team === 1 ? `${a}-${b}` : `${b}-${a}`)).join(", ");
        return `${m.created_at.slice(0, 10)} | ${m.winner_team === r.team ? "WIN" : "LOSS"} ${sets} | partner ${partner || "?"} | vs ${opps.map(name).join(" & ")} (avg ${oppAvg}) | ${m.match_type}${m.venue ? " @ " + m.venue : ""} | Elo ${r.rating_delta >= 0 ? "+" : ""}${r.rating_delta}`;
      });

    const prompt = `Player: ${me?.display_name}, rating ${me?.rating}, record ${me?.wins}-${me?.losses}, current streak ${me?.current_streak}, plays ${me?.court_side} side.
Matches shared (oldest first, scores from the player's side):
${lines.join("\n")}

Write short, personal padel coaching insights in markdown with these sections:
**Form check** (1-2 sentences), **What's working** (2 bullets), **Fix next** (2 bullets), **This week's plan** (3 concrete, actionable drills or tactics). Reference real patterns in the data (partners, set margins, opponent strength, tight sets). Under 220 words. Encouraging, sporty tone. No invented stats.`;

    const system = "You are a sharp, friendly padel coach for amateur 2v2 players.";
    const text = await runCoach(system, prompt);
    return { text, count: list.length };
  });

type Provider = { name: string; url: string; key: string; model: string; extra?: Record<string, string> };

function providers(): Provider[] {
  const env = (k: string) => process.env[k]?.trim() || "";
  const out: Provider[] = [];
  const groq = env("GROQ_API_KEY");
  if (groq) {
    out.push(
      groq.startsWith("xai-")
        ? { name: "grok", url: "https://api.x.ai/v1/chat/completions", key: groq, model: "grok-3-mini" }
        : { name: "groq", url: "https://api.groq.com/openai/v1/chat/completions", key: groq, model: "openai/gpt-oss-120b" },
    );
  }
  const gemini = env("GEMINI_API_KEY");
  if (gemini) out.push({ name: "gemini", url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", key: gemini, model: "gemini-flash-latest" });
  const or = env("OPENROUTER_API_KEY");
  if (or)
    out.push({
      name: "openrouter",
      url: "https://openrouter.ai/api/v1/chat/completions",
      key: or,
      model: "openrouter/free",
      extra: { "HTTP-Referer": "https://padel.ogbot.co.uk", "X-Title": "Padel Rival" },
    });
  const pol = env("POLLINATIONS_API_KEY");
  if (pol) out.push({ name: "pollinations", url: "https://text.pollinations.ai/openai", key: pol, model: "openai" });
  return out;
}

async function runCoach(system: string, prompt: string): Promise<string> {
  const list = providers();
  if (!list.length) throw new Error("AI coach isn't configured yet.");
  for (const p of list) {
    try {
      const res = await fetch(p.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${p.key}`, ...(p.extra ?? {}) },
        body: JSON.stringify({
          model: p.model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: prompt },
          ],
          max_tokens: 1500,
        }),
      });
      if (!res.ok) {
        console.warn(`[coach] ${p.name} ${res.status}: ${(await res.text()).slice(0, 200)}`);
        continue;
      }
      const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const text = j.choices?.[0]?.message?.content?.trim();
      if (text) return text;
      console.warn(`[coach] ${p.name} returned empty`);
    } catch (e) {
      console.warn(`[coach] ${p.name} failed`, e);
    }
  }
  throw new Error("The coach couldn't write insights right now — try again in a minute.");
}
