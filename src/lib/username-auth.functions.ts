import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Username = z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,20}$/, "Username must be 3–20 letters, numbers or _");
const Password = z.string().min(6, "Password needs at least 6 characters").max(72);

/** Hidden login address for username-only accounts (never shown, can't receive mail). */
const syntheticEmail = (u: string) => `${u}@players.padelrival.app`;

async function publicClient() {
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(process.env["SUPABASE_URL"]!, process.env["SUPABASE_PUBLISHABLE_KEY"]!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

async function signIn(email: string, password: string) {
  const sb = await publicClient();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error("Wrong username or password");
  return { access_token: data.session.access_token, refresh_token: data.session.refresh_token };
}

export const signUpWithUsername = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ username: Username, password: Password }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: taken } = await supabaseAdmin.from("profiles").select("id").eq("username", data.username).maybeSingle();
    if (taken) throw new Error("That username is taken");
    const { error } = await supabaseAdmin.auth.admin.createUser({
      email: syntheticEmail(data.username),
      password: data.password,
      email_confirm: true,
      user_metadata: { username: data.username },
    });
    if (error) throw new Error(/already/i.test(error.message) ? "That username is taken" : error.message);
    return signIn(syntheticEmail(data.username), data.password);
  });

export const signInWithUsername = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ username: Username, password: z.string().min(1).max(72) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Username may belong to an account whose email was later linked/changed.
    let email = syntheticEmail(data.username);
    const { data: p } = await supabaseAdmin.from("profiles").select("id").eq("username", data.username).maybeSingle();
    if (p) {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(p.id);
      if (u.user?.email) email = u.user.email;
    }
    return signIn(email, data.password);
  });

/**
 * Attaches a real email to the signed-in account (username-only players start
 * with an undeliverable synthetic address, so the normal change-email
 * confirmation mail can never be answered). Ownership is proved afterwards by
 * the reset link the client sends to the new address.
 */
export const linkEmailToAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ email: z.string().trim().toLowerCase().email("Enter a valid email") }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const clash = list?.users?.find((u) => u.email?.toLowerCase() === data.email && u.id !== context.userId);
    if (clash) throw new Error("That email is already used by another account");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(context.userId, { email: data.email, email_confirm: true });
    if (error) throw new Error(error.message);
    return { email: data.email };
  });
