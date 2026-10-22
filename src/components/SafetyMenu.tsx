import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { Ban, Flag, MoreHorizontal, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuthGate } from "@/components/AuthPrompt";
import { useBlockedIds, useBlockToggle } from "@/hooks/use-blocks";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn, haptic } from "@/lib/utils";

export type ReportKind = "player" | "match" | "open_match";

const REASONS = [
  { id: "abuse", label: "Abusive or threatening", hint: "Harassment, hate or threats" },
  { id: "fake_result", label: "Fake or wrong result", hint: "A match that didn't happen or has the wrong score" },
  { id: "cheating", label: "Rating manipulation", hint: "Boosting, alt accounts or made-up opponents" },
  { id: "inappropriate", label: "Inappropriate name or picture", hint: "Offensive display name, avatar or note" },
  { id: "spam", label: "Spam or scam", hint: "Adverts, links or fake open matches" },
  { id: "other", label: "Something else", hint: "Tell us below" },
] as const;

/** "…" menu on another player's content: report it, or block / unblock the player. */
export function SafetyMenu({
  meId,
  userId,
  name,
  kind = "player",
  targetId,
  className,
}: {
  meId: string | null;
  userId: string;
  name: string;
  kind?: ReportKind;
  targetId?: string;
  className?: string;
}) {
  const { gate } = useAuthGate();
  const blocked = useBlockedIds().data?.includes(userId) ?? false;
  const toggle = useBlockToggle();
  const [reporting, setReporting] = useState(false);
  if (meId === userId) return null;

  const what = kind === "match" ? "match" : kind === "open_match" ? "open match" : "player";
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Report or block ${name}`}
          className={cn("grid size-8 shrink-0 place-items-center rounded-full border bg-card text-muted-foreground", className)}
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={() => gate("Create a free account to report players or content.") && setReporting(true)}
          >
            <Flag className="size-4" /> Report {what}
          </DropdownMenuItem>
          <DropdownMenuItem
            className={blocked ? "" : "text-destructive focus:text-destructive"}
            onSelect={() => {
              if (!gate("Create a free account to block players.")) return;
              if (!blocked && !confirm(`Block ${name}? You won't see their open matches or their matches in your feed, they can't join your games, and any follow between you is removed.`)) return;
              haptic();
              toggle.mutate({ id: userId, block: !blocked });
            }}
          >
            {blocked ? <ShieldCheck className="size-4" /> : <Ban className="size-4" />}
            {blocked ? `Unblock ${name}` : `Block ${name}`}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ReportDialog
        open={reporting}
        onClose={() => setReporting(false)}
        kind={kind}
        userId={userId}
        targetId={targetId}
        name={name}
        blocked={blocked}
      />
    </>
  );
}

function ReportDialog({
  open,
  onClose,
  kind,
  userId,
  targetId,
  name,
  blocked,
}: {
  open: boolean;
  onClose: () => void;
  kind: ReportKind;
  userId: string;
  targetId?: string | undefined;
  name: string;
  blocked: boolean;
}) {
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [alsoBlock, setAlsoBlock] = useState(false);
  const [busy, setBusy] = useState(false);
  const toggle = useBlockToggle();

  async function send() {
    if (!reason) return;
    setBusy(true);
    const { error } = await supabase.rpc("report_content", {
      _kind: kind,
      _target_user: userId,
      _target_id: targetId ?? "",
      _reason: reason,
      _details: details.trim(),
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (alsoBlock && !blocked) toggle.mutate({ id: userId, block: true });
    toast.success("Thanks. We'll review this, usually within 24 hours.");
    setReason(null);
    setDetails("");
    setAlsoBlock(false);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Report {kind === "player" ? name : `this ${kind === "match" ? "match" : "open match"}`}</DialogTitle>
          <DialogDescription>Reports are private. {name} won't know who sent it.</DialogDescription>
        </DialogHeader>
        <div role="radiogroup" aria-label="Reason" className="space-y-1.5">
          {REASONS.map((r) => (
            <button
              key={r.id}
              type="button"
              role="radio"
              aria-checked={reason === r.id}
              onClick={() => setReason(r.id)}
              className={cn(
                "w-full rounded-2xl border p-3 text-left",
                reason === r.id ? "border-primary bg-primary/10" : "bg-card",
              )}
            >
              <span className="block text-sm font-bold">{r.label}</span>
              <span className="block text-xs text-muted-foreground">{r.hint}</span>
            </button>
          ))}
        </div>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value.slice(0, 500))}
          rows={3}
          placeholder="Anything else we should know? (optional)"
          className="w-full rounded-2xl border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
        />
        {!blocked && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={alsoBlock} onChange={(e) => setAlsoBlock(e.target.checked)} className="size-4 accent-[var(--primary)]" />
            Also block {name}
          </label>
        )}
        <button
          disabled={!reason || busy}
          onClick={send}
          className="w-full rounded-2xl bg-primary py-3.5 font-display font-black uppercase text-primary-foreground disabled:opacity-40"
        >
          {busy ? "Sending…" : "Send report"}
        </button>
      </DialogContent>
    </Dialog>
  );
}

/** Settings list of blocked players with an unblock button each. */
export function BlockedPlayers() {
  const ids = useBlockedIds().data ?? [];
  const toggle = useBlockToggle();
  const people = useQuery({
    queryKey: ["blocked-profiles", ids],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id,display_name,username,avatar,avatar_color").in("id", ids);
      if (error) throw error;
      return data;
    },
  });
  return (
    <section className="rounded-2xl border bg-card p-4">
      <p className="font-display text-xs font-black uppercase tracking-wide text-muted-foreground">Blocked players</p>
      {!ids.length ? (
        <p className="mt-1 text-sm text-muted-foreground">
          Nobody. To block someone, open their player card and tap the ··· button.
        </p>
      ) : (
        <div className="mt-2 space-y-2">
          {(people.data ?? []).map((p) => (
            <div key={p.id} className="flex items-center gap-3">
              <PlayerAvatar avatar={p.avatar} color={p.avatar_color} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold">{p.display_name}</div>
                <div className="text-xs text-muted-foreground">@{p.username}</div>
              </div>
              <button
                onClick={() => toggle.mutate({ id: p.id, block: false })}
                disabled={toggle.isPending}
                className="rounded-full border px-3 py-1.5 text-xs font-bold"
              >
                Unblock
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
