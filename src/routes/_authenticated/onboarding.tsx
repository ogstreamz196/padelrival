import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMyProfile } from "@/hooks/use-auth";
import { ProfileForm } from "@/components/ProfileForm";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Create your player — Padel Rival" }, { name: "description", content: "Set up your Padel Rival player card." }] }),
  component: Onboarding,
});

function Onboarding() {
  const { user, profile, loading } = useMyProfile();
  const navigate = useNavigate();
  const qc = useQueryClient();
  if (loading) return null;
  if (profile) return <Navigate to="/home" />;

  return (
    <div className="mx-auto max-w-md px-5 py-10">
      <p className="text-sm font-bold uppercase tracking-[0.3em] text-primary">Player setup</p>
      <h1 className="mb-8 mt-2 text-3xl font-black">Build your player card</h1>
      <ProfileForm
        initial={{ display_name: (user?.user_metadata?.["full_name"] as string) ?? "" }}
        submitLabel="Start at 1000 Elo"
        onSubmit={async (v) => {
          const { error } = await supabase.from("profiles").insert({ id: user!.id, ...v });
          if (error) {
            toast.error(error.code === "23505" ? "That username is taken" : error.message);
            return;
          }
          await qc.invalidateQueries({ queryKey: ["me"] });
          navigate({ to: "/home" });
        }}
      />
    </div>
  );
}
