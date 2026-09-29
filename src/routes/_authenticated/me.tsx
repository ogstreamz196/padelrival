import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMyProfile } from "@/hooks/use-auth";
import { AppShell } from "@/components/AppShell";
import { ProfileForm } from "@/components/ProfileForm";

export const Route = createFileRoute("/_authenticated/me")({
  head: () => ({ meta: [{ title: "Profile — Padel Rival" }, { name: "description", content: "Edit your player card." }] }),
  component: Me,
});

function Me() {
  const { profile } = useMyProfile();
  const qc = useQueryClient();
  const navigate = useNavigate();
  return (
    <AppShell>
      <h1 className="mb-6 text-3xl font-black">Edit player</h1>
      {profile && (
        <ProfileForm
          initial={profile}
          submitLabel="Save changes"
          onSubmit={async (v) => {
            const { error } = await supabase.from("profiles").update(v).eq("id", profile.id);
            if (error) toast.error(error.code === "23505" ? "That username is taken" : error.message);
            else {
              toast.success("Saved");
              qc.invalidateQueries();
            }
          }}
        />
      )}
      <button
        onClick={async () => {
          await supabase.auth.signOut();
          navigate({ to: "/" });
        }}
        className="mt-6 w-full rounded-2xl border py-4 font-bold text-destructive"
      >
        Sign out
      </button>
    </AppShell>
  );
}
