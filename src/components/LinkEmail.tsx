import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { linkEmailToAccount } from "@/lib/username-auth.functions";

const isHidden = (e?: string | null) => !e || e.endsWith("@players.padelrival.app");

/** Lets username-only players attach a real email (for password resets / email sign-in). */
export function LinkEmail({ onLinked }: { onLinked?: () => void }) {
  const [current, setCurrent] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const link = useServerFn(linkEmailToAccount);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrent(data.user?.email ?? null));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await link({ data: { email: email.trim() } });
      setCurrent(res.email);
      setEmail("");
      // Prove the address really reaches them, and warm up the reset flow.
      await supabase.auth.resetPasswordForEmail(res.email, { redirectTo: window.location.origin + "/reset-password" });
      toast.success("Email linked — we sent a test link to check it arrives");
      onLinked?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not link that email");
    } finally {
      setBusy(false);
    }
  }

  const linked = !isHidden(current);
  return (
    <div className="rounded-3xl border bg-card p-4">
      <div className="mb-1 flex items-center gap-2">
        <Mail className="size-4 text-primary" />
        <h3 className="font-display text-sm font-black uppercase tracking-wide">{linked ? "Linked email" : "Link an email"}</h3>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        {linked ? (
          <>
            Linked to <span className="font-bold text-foreground">{current}</span>. Used only for password resets — never shown to other players.
          </>
        ) : (
          "Without an email nobody can reset your password if you forget it. Add one now — it is never shown to other players."
        )}
      </p>
      <form onSubmit={save} className="space-y-2">
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder={linked ? "New email" : "you@example.com"} className="w-full rounded-2xl border bg-background px-4 py-3.5 text-base outline-none focus:border-primary" />
        <button disabled={busy || !email} className="w-full rounded-2xl border border-primary py-3 text-sm font-black uppercase tracking-wide text-primary disabled:opacity-40">
          {busy ? "Saving…" : linked ? "Change email" : "Link email"}
        </button>
      </form>
    </div>
  );
}
