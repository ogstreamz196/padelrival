import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronRight, Crown, LogOut, RefreshCw, Settings, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMyProfile } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-admin";
import { AppShell } from "@/components/AppShell";
import { ProfileForm } from "@/components/ProfileForm";
import { PlayerProfile } from "@/components/PlayerProfile";
import { ClaimGuestMatches } from "@/components/ClaimGuestMatches";
import { AiCoach } from "@/components/AiCoach";
import { PrivacySettings } from "@/components/PrivacySettings";
import { AppPassword } from "@/components/AppPassword";
import { LinkEmail } from "@/components/LinkEmail";
import { PageGuide, resetGuides } from "@/components/PageGuide";
import { ProModal, ProTeaser } from "@/components/ProUpgrade";
import { useServerFn } from "@tanstack/react-start";
import { deleteMyAccount } from "@/lib/account.functions";
import { requireUser } from "./route";
import { useAppSettings } from "@/hooks/use-settings";


export const Route = createFileRoute("/_authenticated/me")({
  staticData: { sitemap: false },
  beforeLoad: requireUser,
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
  const { settings } = useAppSettings();
  const { isAdmin } = useIsAdmin();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const deleteAccount = useServerFn(deleteMyAccount);
  const [editing, setEditing] = useState(false);
  const [pro, setPro] = useState(false);

  const handleSignOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };


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
        <button
          onClick={handleSignOut}
          aria-label="Sign out"
          title="Sign out"
          className="grid size-9 place-items-center rounded-full border text-muted-foreground transition-colors active:text-destructive"
        >
          <LogOut className="size-4" />
        </button>
        </div>
      </div>

      {isAdmin && (
        <Link
          to="/admin"
          className="mb-5 flex items-center gap-3 rounded-3xl border border-primary/50 bg-primary/5 p-4 active:scale-[0.99]"
        >
          <Crown className="size-6 shrink-0 text-primary" />
          <span className="min-w-0 flex-1">
            <span className="block font-display text-sm font-black uppercase tracking-wide text-primary">Boss dashboard</span>
            <span className="block text-xs text-muted-foreground">Players, pricing, clubs, settings and system health</span>
          </span>
          <ChevronRight className="size-5 text-primary" />
        </Link>
      )}

      <PageGuide id="me" />

      {profile && <PlayerProfile userId={profile.id} isMe />}

      {profile && settings.features.ai_coach && <AiCoach userId={profile.id} />}

      <ProTeaser onOpen={() => setPro(true)} />

      {pro && <ProModal onClose={() => setPro(false)} />}


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
              <PrivacySettings profile={profile} />
            </div>

            <div className="mt-6">
              <LinkEmail />
            </div>

            <div className="mt-6">
              <AppPassword />
            </div>

            <div className="mt-6">
              <ClaimGuestMatches defaultName={profile.display_name} />
            </div>

            <div className="mt-6 rounded-2xl border border-primary/40 bg-primary/5 p-4">
              <p className="font-display text-xs font-black uppercase tracking-wide text-primary">Membership</p>
              <p className="mt-1 text-sm font-bold">Free — PRO coming soon</p>
              <button
                onClick={() => {
                  setEditing(false);
                  setPro(true);
                }}
                className="mt-3 w-full rounded-xl border border-primary/40 py-3 text-xs font-black uppercase tracking-wide text-primary"
              >
                See PRO perks
              </button>
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

            <div className="mt-6 flex justify-center gap-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Link to="/privacy">Privacy policy</Link>
              <Link to="/terms">Terms of service</Link>
            </div>


            <button
              onClick={handleSignOut}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border py-4 font-bold text-destructive"
            >
              <LogOut className="size-4" />
              Sign out
            </button>

            <button
              onClick={handleSignOut}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border py-4 font-bold text-muted-foreground"
            >
              <RefreshCw className="size-4" />
              Switch account
            </button>

            <button
              onClick={async () => {
                if (!confirm("Delete your account permanently? Your stats, badges and profile will be erased. This can't be undone.")) return;
                try {
                  await deleteAccount();
                  await supabase.auth.signOut();
                  toast.success("Account deleted");
                  navigate({ to: "/" });
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Couldn't delete account");
                }
              }}
              className="mt-3 w-full py-3 text-xs font-bold uppercase tracking-widest text-destructive/80"
            >
              Delete my account
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
