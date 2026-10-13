import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertBoss(context: { supabase: SupabaseClient<Database>; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!data) throw new Error("Boss access only");
}

export type HealthCheck = {
  id: string;
  name: string;
  group: "Core" | "AI coach" | "Integrations";
  /** live = reachable and working, down = configured but failing, missing = no key set, planned = not built yet */
  status: "live" | "down" | "missing" | "planned";
  ms?: number;
  detail: string;
};

async function timed<T>(fn: () => Promise<T>) {
  const t = Date.now();
  const value = await fn();
  return { value, ms: Date.now() - t };
}

/** GETs a cheap endpoint with a key; never sends player data. */
async function ping(
  url: string,
  headers: Record<string, string>,
): Promise<{ ok: boolean; status: number; ms: number }> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 8000);
  try {
    const { value, ms } = await timed(() => fetch(url, { headers, signal: ctl.signal }));
    return { ok: value.ok, status: value.status, ms };
  } catch {
    return { ok: false, status: 0, ms: 8000 };
  } finally {
    clearTimeout(timer);
  }
}

const REQUIRED_TABLES = [
  "profiles",
  "matches",
  "beacons",
  "venues",
  "venue_checkins",
  "app_settings",
  "pro_members",
  "admin_log",
] as const;

export const adminHealth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<HealthCheck[]> => {
    await assertBoss(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const env = (k: string) => process.env[k]?.trim() || "";
    const out: HealthCheck[] = [];

    // Database round trip
    try {
      const { value, ms } = await timed(async () =>
        supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      );
      out.push(
        value.error
          ? {
              id: "db",
              name: "Database",
              group: "Core",
              status: "down",
              ms,
              detail: value.error.message,
            }
          : {
              id: "db",
              name: "Database",
              group: "Core",
              status: "live",
              ms,
              detail: `${value.count ?? 0} player profiles`,
            },
      );
    } catch (e) {
      out.push({
        id: "db",
        name: "Database",
        group: "Core",
        status: "down",
        detail: e instanceof Error ? e.message : "Unreachable",
      });
    }

    // Every table the app expects — catches a migration that hasn't been run yet
    const missing: string[] = [];
    for (const t of REQUIRED_TABLES) {
      const { error } = await supabaseAdmin.from(t).select("*", { count: "exact", head: true });
      if (error) missing.push(t);
    }
    out.push({
      id: "schema",
      name: "Database migrations",
      group: "Core",
      status: missing.length ? "down" : "live",
      detail: missing.length
        ? `Missing: ${missing.join(", ")} — run the latest SQL migration`
        : `All ${REQUIRED_TABLES.length} tables present`,
    });

    try {
      const { value, ms } = await timed(() =>
        supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 }),
      );
      out.push({
        id: "auth",
        name: "Sign-in service",
        group: "Core",
        status: value.error ? "down" : "live",
        ms,
        detail: value.error ? value.error.message : "Accounts and admin actions working",
      });
    } catch (e) {
      out.push({
        id: "auth",
        name: "Sign-in service",
        group: "Core",
        status: "down",
        detail: e instanceof Error ? e.message : "Unreachable",
      });
    }

    // AI coach providers, in the order the coach tries them
    const groq = env("GROQ_API_KEY");
    const ai: {
      id: string;
      name: string;
      key: string;
      url: string;
      headers?: Record<string, string>;
    }[] = [
      groq.startsWith("xai-")
        ? { id: "grok", name: "Grok (xAI)", key: groq, url: "https://api.x.ai/v1/models" }
        : { id: "groq", name: "Groq", key: groq, url: "https://api.groq.com/openai/v1/models" },
      {
        id: "gemini",
        name: "Google Gemini",
        key: env("GEMINI_API_KEY"),
        url: "https://generativelanguage.googleapis.com/v1beta/openai/models",
      },
      {
        id: "openrouter",
        name: "OpenRouter",
        key: env("OPENROUTER_API_KEY"),
        url: "https://openrouter.ai/api/v1/key",
      },
      {
        id: "pollinations",
        name: "Pollinations",
        key: env("POLLINATIONS_API_KEY"),
        url: "https://text.pollinations.ai/models",
      },
    ];
    const keyName = (id: string) =>
      ({
        grok: "GROQ_API_KEY",
        groq: "GROQ_API_KEY",
        gemini: "GEMINI_API_KEY",
        openrouter: "OPENROUTER_API_KEY",
        pollinations: "POLLINATIONS_API_KEY",
      })[id];
    await Promise.all(
      ai.map(async (p) => {
        if (!p.key) {
          out.push({
            id: p.id,
            name: p.name,
            group: "AI coach",
            status: "missing",
            detail: `No ${keyName(p.id)} set`,
          });
          return;
        }
        const r = await ping(p.url, { Authorization: `Bearer ${p.key}` });
        out.push({
          id: p.id,
          name: p.name,
          group: "AI coach",
          status: r.ok ? "live" : "down",
          ms: r.ms,
          detail: r.ok
            ? "Key accepted"
            : r.status
              ? `Provider replied ${r.status}${r.status === 401 || r.status === 403 ? " — key rejected" : ""}`
              : "No response (timeout)",
        });
      }),
    );

    // Integrations: live when a key is present and accepted, otherwise planned/missing
    const stripe = env("STRIPE_SECRET_KEY");
    if (stripe) {
      const r = await ping("https://api.stripe.com/v1/balance", {
        Authorization: `Bearer ${stripe}`,
      });
      out.push({
        id: "stripe",
        name: "Stripe payments",
        group: "Integrations",
        status: r.ok ? "live" : "down",
        ms: r.ms,
        detail: r.ok ? "Key accepted" : `Stripe replied ${r.status}`,
      });
    } else {
      out.push({
        id: "stripe",
        name: "Stripe payments",
        group: "Integrations",
        status: "planned",
        detail: "Add STRIPE_SECRET_KEY when Pro billing goes live",
      });
    }
    const resend = env("RESEND_API_KEY");
    if (resend) {
      const r = await ping("https://api.resend.com/domains", { Authorization: `Bearer ${resend}` });
      out.push({
        id: "email",
        name: "Email (Resend)",
        group: "Integrations",
        status: r.ok ? "live" : "down",
        ms: r.ms,
        detail: r.ok ? "Key accepted" : `Resend replied ${r.status}`,
      });
    } else {
      out.push({
        id: "email",
        name: "Email (Resend)",
        group: "Integrations",
        status: "planned",
        detail: "Add RESEND_API_KEY for match and beacon emails",
      });
    }
    out.push({
      id: "push",
      name: "Push notifications",
      group: "Integrations",
      status: "planned",
      detail: "Not built yet",
    });

    const order = ["Core", "AI coach", "Integrations"];
    return out.sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group));
  });

const userInput = (d: unknown) => z.object({ userId: z.string().uuid() }).parse(d);

export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(userInput)
  .handler(async ({ data, context }) => {
    await assertBoss(context);
    if (data.userId === context.userId)
      throw new Error("You can't delete your own boss account from here");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: data.userId,
      _role: "admin",
    });
    if (isAdmin) throw new Error("Remove their boss access first");
    const { data: p } = await supabaseAdmin
      .from("profiles")
      .select("display_name,username")
      .eq("id", data.userId)
      .maybeSingle();
    // Keep opponents' match history intact: past appearances become a guest name.
    await supabaseAdmin
      .from("match_players")
      .update({ guest_name: p?.display_name ?? "Former player", user_id: null })
      .eq("user_id", data.userId);
    const { error: pe } = await supabaseAdmin.from("profiles").delete().eq("id", data.userId);
    if (pe) throw new Error(pe.message);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    await supabaseAdmin.rpc("admin_log_external", {
      _actor: context.userId,
      _action: "delete_user",
      _target: data.userId,
      _detail: { name: p?.display_name ?? null, username: p?.username ?? null },
    });
    return { ok: true };
  });

export const adminSuspendUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ userId: z.string().uuid(), suspend: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertBoss(context);
    if (data.userId === context.userId) throw new Error("You can't suspend yourself");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      ban_duration: data.suspend ? "876000h" : "none",
    });
    if (error) throw new Error(error.message);
    await supabaseAdmin.rpc("admin_log_external", {
      _actor: context.userId,
      _action: data.suspend ? "suspend_user" : "unsuspend_user",
      _target: data.userId,
    });
    return { ok: true };
  });
