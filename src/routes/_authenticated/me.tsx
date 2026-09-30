import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronDown, ChevronUp, Crown, Settings, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMyProfile } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-admin";
import { AppShell } from "@/components/AppShell";
import { ProfileForm } from "@/components/ProfileForm";
import { PlayerProfile } from "@/components/PlayerProfile";
import { ClaimGuestMatches } from "@/components/ClaimGuestMatches";
import { BossPulse, BossTools } from "@/components/BossControls";
import { PageGuide, resetGuides } from "@/components/PageGuide";


export const Route = createFileRoute("/_authenticated/me")({
  head: () => ({
    meta: [
      { title: "Your player card — Padel Rival" },
      { name: "description", content: "Your rating, level, streaks, achievements, best partners and match history." },
      { property: "og:title", content: "Your player card — Padel Rival" },
      { property: "og:description", content: "Rating, level, streaks, achievements and match history." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Me,
});

function Me() {
  const { profile } = useMyProfile();
  const { isAdmin } = useIsAdmin();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [boss, setBoss] = useState(false);


  return (
    <AppShell>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-3xl font-black">Player card</h1>
        <div className="flex items-center gap-2">
        {isAdmin && (
          <Link
            to="/admin"
            className="flex items-center gap-1.5 rounded-full border border-primary px-3 py-2 text-xs font-black uppercase tracking-wide text-primary"
          >
            <Crown className="size-4" />
            Boss
          </Link>
        )}
        <button
          onClick={() => setEditing(true)}
          className="flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-black uppercase tracking-wide text-muted-foreground"
        >
          <Settings className="size-4" />
          Edit
        </button>
        </div>
      </div>

      {isAdmin && (
        <section className="mb-5 rounded-3xl border border-primary/50 bg-primary/5 p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Crown className="size-5 text-primary" />
              <h2 className="font-display text-lg font-black uppercase tracking-wide text-primary">Boss controls</h2>
            </div>
            <button
              onClick={() => setBoss((b) => !b)}
              className="flex items-center gap-1 rounded-full border border-primary px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-primary"
            >
              {boss ? "Hide" : "Open"}
              {boss ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            </button>
          </div>

          {boss && (
            <div className="mt-4">
              <BossPulse />
              <div className="mt-4">
                <BossTools />
              </div>
              <Link to="/admin" className="mt-4 block rounded-2xl border py-3 text-center text-xs font-black uppercase tracking-wide text-muted-foreground">
                Open full screen panel
              </Link>
            </div>
          )}
        </section>
      )}

      <PageGuide id="me" />

      {profile && <PlayerProfile userId={profile.id} isMe />}


      {editing && profile && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-background/95 backdrop-blur-md">
          <div className="mx-auto w-full max-w-md px-4 pb-16 pt-[max(env(safe-area-inset-top),1rem)]">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-black">Settings</h2>
              <button onClick={() => setEditing(false)} className="p-2 text-muted-foreground" aria-label="Close">
                <X className="size-5" />
              </button>
            </div>

            <ProfileForm
              initial={profile}
              submitLabel="Save changes"
              onSubmit={async (v) => {
                const { error } = await supabase.from("profiles").update(v).eq("id", profile.id);
                if (error) toast.error(error.code === "23505" ? "That username is taken" : error.message);
                else {
                  toast.success("Saved");
                  qc.invalidateQueries();
                  setEditing(false);
                }
              }}
            />

            <div className="mt-6">
              <ClaimGuestMatches defaultName={profile.display_name} />
            </div>

            <button
              onClick={() => {
                resetGuides();
                toast.success("Page tips will show again");
                setEditing(false);
              }}
              className="mt-6 w-full rounded-2xl border py-4 font-bold text-muted-foreground"
            >
              Show page tips again
            </button>

            <button
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/" });
              }}
              className="mt-6 w-full rounded-2xl border py-4 font-bold text-destructive"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
