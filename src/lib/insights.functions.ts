import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
    match_players: { team: number; user_id: string | null; guest_name: string | null; rating_before: number; profiles: { display_name: string } | null }[];
  } | null;
};

export const getMatchInsights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ matchIds: z.array(z.string().uuid()).min(1).max(20) }).parse(d))
  .handler(async ({ data, context }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI coach isn't configured yet.");
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
        const name = (p: Row["matches"] extends infer M ? any : never) => p.profiles?.display_name ?? p.guest_name ?? "Guest";
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

    const { createOpenAI } = await import("@ai-sdk/openai");
    const { streamText } = await import("ai");
    const provider = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });
    let failure: unknown;
    const result = streamText({
      model: provider.responses("openai/gpt-6-astra"),
      system: "You are a sharp, friendly padel coach for amateur 2v2 players.",
      prompt,
      onError: ({ error }) => {
        failure = error;
      },
      providerOptions: {
        openai: {
          forceReasoning: true,
          reasoningEffort: "low",
          reasoningSummary: "auto",
          store: false,
          include: ["reasoning.encrypted_content"],
        },
      },
    });
    const text = await result.text;
    if (!text) {
      const status = (failure as { statusCode?: number })?.statusCode;
      if (status === 429) throw new Error("The coach is busy — try again in a minute.");
      if (status === 402) throw new Error("AI credits have run out for now.");
      throw new Error("The coach couldn't write insights right now.");
    }
    return { text, count: list.length };
  });
