import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const uid = context.userId;
    const { data: p } = await supabaseAdmin.from("profiles").select("display_name").eq("id", uid).maybeSingle();
    // Keep opponents' match history intact: past appearances become a guest name.
    await supabaseAdmin
      .from("match_players")
      .update({ guest_name: p?.display_name ?? "Former player", user_id: null })
      .eq("user_id", uid);
    const { error: pe } = await supabaseAdmin.from("profiles").delete().eq("id", uid);
    if (pe) throw new Error(pe.message);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(uid);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
