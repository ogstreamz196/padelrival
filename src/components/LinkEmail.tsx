import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const isHidden = (e?: string | null) => !e || e.endsWith("@players.padelrival.app");

/** Lets username-only players attach a real email (for password resets / email sign-in). */
export function LinkEmail() {
  const [current, setCurrent] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrent(data.user?.email ?? null));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ email: email.trim() }, { emailRedirectTo: window.location.origin + "/me" });
    setBusy(false);
    if (error) return toast.error(error.message);
    setEmail("");
    toast.success("Check that inbox and tap the link to confirm");
  }

  const linked = !isHidden(current);
  return (
    <div className="rounded-3xl border bg-card p-4">
      <div className="mb-1 flex items-center gap-2">
        <Mail className="size-4 text-primary" />
        <h3 className="font-display text-sm font-black uppercase tracking-wide">{linked ? "Linked email" : "Link an email"}</h3>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        {linked ? <>Linked to <span className="font-bold text-foreground">{current}</span>. Never shown to other players.</> : "Optional. Add an email so you can reset a forgotten password. Never shown to other players."}
      </p>
      <form onSubmit={save} className="space-y-2">
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder={linked ? "New email" : "you@example.com"} className="w-full rounded-2xl border bg-background px-4 py-3.5 text-base outline-none focus:border-primary" />
        <button disabled={busy || !email} className="w-full rounded-2xl border border-primary py-3 text-sm font-black uppercase tracking-wide text-primary disabled:opacity-40">
          {busy ? "Sending…" : linked ? "Change email" : "Link email"}
        </button>
      </form>
    </div>
  );
}
