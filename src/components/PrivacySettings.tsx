import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const PRIVACY_FIELDS = [
  ["show_record", "Win/loss record & streaks"],
  ["show_history", "Match history & recent form"],
  ["show_court_side", "Preferred court side"],
  ["show_achievements", "Badges"],
  ["show_partners", "Best partners"],
  ["show_rivalries", "Rivalries"],
] as const;
export type PrivacyKey = (typeof PRIVACY_FIELDS)[number][0];

export function PrivacySettings({ profile }: { profile: { id: string } & Partial<Record<PrivacyKey, boolean>> }) {
  const qc = useQueryClient();
  const [vals, setVals] = useState(() => Object.fromEntries(PRIVACY_FIELDS.map(([k]) => [k, profile[k] ?? true])) as Record<PrivacyKey, boolean>);

  const flip = async (k: PrivacyKey) => {
    const next = !vals[k];
    setVals((v) => ({ ...v, [k]: next }));
    const { error } = await supabase.from("profiles").update({ [k]: next }).eq("id", profile.id);
    if (error) {
      setVals((v) => ({ ...v, [k]: !next }));
      toast.error(error.message);
    } else qc.invalidateQueries({ queryKey: ["profile"] });
  };

  return (
    <div className="rounded-2xl border p-4">
      <p className="font-display text-xs font-black uppercase tracking-wide">Privacy</p>
      <p className="mt-1 text-xs text-muted-foreground">Choose what other players see on your card. Name, avatar, rating and level always show so rankings work. Your email is never shown.</p>
      <div className="mt-3 space-y-2">
        {PRIVACY_FIELDS.map(([k, label]) => (
          <button key={k} onClick={() => flip(k)} className="flex w-full items-center justify-between rounded-xl bg-background/50 px-3 py-2.5 text-sm">
            <span className="font-semibold">{label}</span>
            <span className={cn("flex items-center gap-1 text-[11px] font-black uppercase", vals[k] ? "text-win" : "text-muted-foreground")}>
              {vals[k] ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
              {vals[k] ? "Public" : "Hidden"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
