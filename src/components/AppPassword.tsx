import { useState } from "react";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/**
 * Lets a player set (or change) a password on their account.
 * Google-only accounts have no password, which blocks sign-in inside the
 * Android / iOS apps where the Google button is hidden.
 */
export function AppPassword() {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 6) {
      toast.error("Use at least 6 characters");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPw("");
    toast.success("Password saved — you can now sign in on the phone app");
  }

  return (
    <div className="rounded-3xl border bg-card p-4">
      <div className="mb-1 flex items-center gap-2">
        <KeyRound className="size-4 text-primary" />
        <h3 className="font-display text-sm font-black uppercase tracking-wide">App sign-in password</h3>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Signed in with Google? Set a password here so you can sign in with your email inside the Android and iPhone apps. Same account, same stats.
      </p>
      <form onSubmit={save} className="space-y-2">
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          minLength={6}
          autoComplete="new-password"
          placeholder="New password"
          className="w-full rounded-2xl border bg-background px-4 py-3.5 text-base outline-none focus:border-primary"
        />
        <button
          disabled={busy || pw.length < 6}
          className="w-full rounded-2xl border border-primary py-3 text-sm font-black uppercase tracking-wide text-primary disabled:opacity-40"
        >
          {busy ? "Saving…" : "Save password"}
        </button>
      </form>
    </div>
  );
}
