import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function ClaimGuestMatches({ defaultName }: { defaultName: string }) {
  const qc = useQueryClient();
  const [name, setName] = useState(defaultName);
  const [found, setFound] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  async function check() {
    setBusy(true);
    const { data, error } = await supabase.rpc("count_guest_matches", { _alias: name.trim() });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setFound(data ?? 0);
  }


  async function claim() {
    setBusy(true);
    const { data, error } = await supabase.rpc("claim_guest_matches", { _alias: name.trim() });
    setBusy(false);
    if (error) return toast.error(error.message);
    const n = (data as { claimed: number } | null)?.claimed ?? 0;
    setFound(0);
    qc.invalidateQueries();
    toast.success(n ? `${n} match${n > 1 ? "es" : ""} added to your profile` : "Nothing to claim");
  }

  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="text-sm font-black">Played before you joined?</div>
      <p className="mt-1 text-xs text-muted-foreground">
        If friends logged matches with you as a guest, type the name they used and add those matches to your record. Your rating stays the same.
      </p>
      <div className="mt-3 flex gap-2">
        <input
          value={name}
          maxLength={40}
          onChange={(e) => {
            setName(e.target.value);
            setFound(null);
          }}
          placeholder="Name used"
          className="min-w-0 flex-1 rounded-xl border bg-background px-3 py-3 text-sm outline-none focus:border-primary"
        />
        <button onClick={check} disabled={busy || !name.trim()} className="rounded-xl border px-4 text-sm font-bold disabled:opacity-40">
          Check
        </button>
      </div>
      {found !== null && (
        <div className="mt-3 text-sm">
          {found === 0 ? (
            <span className="text-muted-foreground">No guest matches found under “{name.trim()}”.</span>
          ) : (
            <button onClick={claim} disabled={busy} className="w-full rounded-xl bg-primary py-3 text-sm font-black uppercase text-primary-foreground disabled:opacity-40">
              Claim {found} match{found > 1 ? "es" : ""}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
