import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMyProfile } from "@/hooks/use-auth";
import { ProfileForm } from "@/components/ProfileForm";
import { LinkEmail } from "@/components/LinkEmail";
import { requireUser } from "./route";
import { hasRecordDraft } from "@/lib/record-draft";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/onboarding")({
  beforeLoad: requireUser,
  head: () =>
    seo({
      title: "Create your player — Padel Rival",
      description: "Set up your Padel Rival player card.",
      path: "/onboarding",
      noindex: true,
    }),
  component: Onboarding,
});

function Onboarding() {
  const { user, profile, loading } = useMyProfile();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [askEmail, setAskEmail] = useState(false);
  if (loading) return null;
  if (profile && !askEmail) return <Navigate to="/home" />;

  if (askEmail) {
    return (
      <div className="mx-auto max-w-md px-5 py-10">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-primary">Last step</p>
        <h1 className="mb-4 mt-2 text-3xl font-black">Secure your account</h1>
        <div className="mb-5 flex gap-3 rounded-3xl border border-destructive/40 bg-destructive/10 p-4">
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-destructive" />
          <p className="text-sm text-foreground">
            You signed up with a username only. If you forget your password there is <span className="font-black">no way to get back in</span> — your rating, badges and match history would be lost. Add an email and you can always reset it.
          </p>
        </div>
        <LinkEmail onLinked={() => navigate({ to: hasRecordDraft() ? "/record" : "/home" })} />
        <button onClick={() => navigate({ to: hasRecordDraft() ? "/record" : "/home" })} className="mt-4 w-full py-3 text-sm font-bold text-muted-foreground">
          Skip for now
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-5 py-10">
      <p className="text-sm font-bold uppercase tracking-[0.3em] text-primary">Player setup</p>
      <h1 className="mb-8 mt-2 text-3xl font-black">Build your player card</h1>
      <ProfileForm
        initial={{ display_name: (user?.user_metadata?.["full_name"] as string) ?? "", username: (user?.user_metadata?.["username"] as string) ?? "" }}
        submitLabel="Start at 1000 Elo"
        onSubmit={async (v) => {
          const { error } = await supabase.from("profiles").insert({ id: user!.id, ...v });
          if (error) {
            toast.error(error.code === "23505" ? "That username is taken" : error.message);
            return;
          }
          // Quietly adopt any matches friends logged under this name as a guest.
          const { data: claim } = await supabase.rpc("claim_guest_matches", { _alias: v.display_name.trim() });
          const claimed = (claim as { claimed?: number } | null)?.claimed ?? 0;
          if (claimed > 0) toast.success(`${claimed} past match${claimed > 1 ? "es" : ""} added to your record`);
          await qc.invalidateQueries();
          const needsEmail = !user?.email || user.email.endsWith("@players.padelrival.app");
          if (needsEmail) setAskEmail(true);
          else navigate({ to: hasRecordDraft() ? "/record" : "/home" });
        }}
      />
    </div>
  );
}
