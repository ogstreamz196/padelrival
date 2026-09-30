import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — Padel Rival" },
      { name: "description", content: "Choose a new password for your Padel Rival account." },
      { property: "og:title", content: "Reset password — Padel Rival" },
      { property: "og:description", content: "Choose a new password for your Padel Rival account." },
    ],
  }),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((e, s) => {
      if (e === "PASSWORD_RECOVERY" || s) setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => data.session && setReady(true));
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    navigate({ to: "/home" });
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-10">
      <h1 className="text-4xl font-black">New password.</h1>
      {ready ? (
        <form onSubmit={submit} className="mt-8 space-y-3">
          <input className="w-full rounded-2xl border bg-card px-4 py-4 text-base outline-none focus:border-primary" type="password" required minLength={6} placeholder="New password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
          <button disabled={busy} className="w-full rounded-2xl bg-primary py-4 font-display font-black uppercase text-primary-foreground glow disabled:opacity-60">
            {busy ? "…" : "Save password"}
          </button>
        </form>
      ) : (
        <p className="mt-2 text-muted-foreground">Open this page from the reset link in your email.</p>
      )}
    </div>
  );
}
