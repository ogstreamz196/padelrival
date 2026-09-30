import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useIsNative } from "@/hooks/use-native";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Padel Rival" },
      { name: "description", content: "Sign in or create your Padel Rival player account." },
      { property: "og:title", content: "Sign in — Padel Rival" },
      { property: "og:description", content: "Sign in or create your Padel Rival player account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const native = useIsNative();

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s) navigate({ to: "/home" });
    });
    supabase.auth.getSession().then(({ data }) => data.session && navigate({ to: "/home" }));
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (mode === "up") {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + "/home" } });
      if (error) toast.error(error.message);
      else if (!data.session) toast.success("Check your email to confirm your account.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error(error.message);
    }
    setBusy(false);
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (r.error) toast.error(r.error.message ?? "Google sign-in failed");
  }

  const input = "w-full rounded-2xl border bg-card px-4 py-4 text-base outline-none focus:border-primary";

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-10">
      <h1 className="text-4xl font-black">{mode === "in" ? "Welcome back." : "Join the ladder."}</h1>
      <p className="mt-2 text-muted-foreground">{mode === "in" ? "Your rivals have been busy." : "Start at 1000 Elo. Go up from there."}</p>

      {!native && (
        <>
          <button onClick={google} className="mt-8 flex items-center justify-center gap-3 rounded-2xl border bg-card py-4 font-bold active:scale-[0.98]">
            <svg viewBox="0 0 24 24" className="size-5"><path fill="currentColor" d="M21.35 11.1H12v2.98h5.35c-.23 1.4-1.66 4.1-5.35 4.1-3.22 0-5.85-2.67-5.85-5.96S8.78 6.26 12 6.26c1.83 0 3.06.78 3.76 1.45l2.57-2.47C16.69 3.7 14.55 2.75 12 2.75 6.9 2.75 2.75 6.9 2.75 12S6.9 21.25 12 21.25c5.33 0 8.87-3.75 8.87-9.02 0-.6-.07-1.06-.15-1.13z"/></svg>
            Continue with Google
          </button>

          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
          </div>
        </>
      )}

      <form onSubmit={submit} className={native ? "mt-8 space-y-3" : "space-y-3"}>
        <input className={input} type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        <input className={input} type="password" required minLength={6} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "in" ? "current-password" : "new-password"} />
        <button disabled={busy} className="w-full rounded-2xl bg-primary py-4 font-display font-black uppercase text-primary-foreground glow disabled:opacity-60">
          {busy ? "…" : mode === "in" ? "Sign in" : "Create account"}
        </button>
      </form>

      {mode === "in" && (
        <button
          onClick={async () => {
            if (!email) { toast.error("Type your email above first"); return; }
            const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/reset-password" });
            if (error) toast.error(error.message);
            else toast.success("Check your email for a reset link");
          }}
          className="mt-4 text-sm font-bold text-muted-foreground underline-offset-4 hover:underline"
        >
          Forgot password?
        </button>
      )}

      <button onClick={() => setMode(mode === "in" ? "up" : "in")} className="mt-6 text-sm text-muted-foreground">
        {mode === "in" ? "New here? " : "Already a player? "}
        <span className="font-bold text-primary">{mode === "in" ? "Create an account" : "Sign in"}</span>
      </button>

      <div className="mt-8 flex justify-center gap-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Link to="/privacy">Privacy</Link>
        <Link to="/terms">Terms</Link>
      </div>

    </div>
  );
}
