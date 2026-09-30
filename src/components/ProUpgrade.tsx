import { useState } from "react";
import { BarChart3, Lock, Share2, Sparkles, Swords, X, Zap } from "lucide-react";

const PERKS = [
  {
    icon: BarChart3,
    title: "Deep court analytics",
    body: "Left vs right side win rates, form trends and expected win chance before you play.",
  },
  {
    icon: Share2,
    title: "Pro celebration cards",
    body: "Exclusive animated story cards for WhatsApp and Instagram with verified rank borders.",
  },
  {
    icon: Sparkles,
    title: "Show-off profile",
    body: "Animated avatar glow, pro badge and custom titles like Vibora King or Wall Master.",
  },
  {
    icon: Swords,
    title: "Rival dossiers",
    body: "Full head-to-head breakdowns and alerts the moment a rival overtakes you.",
  },
];

export function ProTeaser({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="mt-5 flex w-full items-center gap-3 rounded-3xl border border-primary/40 bg-primary/5 p-4 text-left"
    >
      <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary">
        <Zap className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-display text-sm font-black uppercase tracking-wide text-primary">Padel Rival PRO</p>
        <p className="truncate text-xs text-muted-foreground">Deeper stats, pro share cards, rival alerts</p>
      </div>
      <span className="shrink-0 rounded-full border border-border px-2 py-1 text-[10px] font-black uppercase tracking-wide text-muted-foreground">
        Soon
      </span>
    </button>
  );
}

export function ProModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background/95 backdrop-blur-md">
      <div className="mx-auto w-full max-w-md px-4 pb-16 pt-[max(env(safe-area-inset-top),1rem)]">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-black">Padel Rival PRO</h2>
          <button onClick={onClose} className="p-2 text-muted-foreground" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>

        <div className="rounded-3xl border border-primary/50 bg-primary/5 p-5 text-center">
          <p className="font-display text-xs font-black uppercase tracking-widest text-primary">Early preview</p>
          <div className="mt-3 flex items-end justify-center gap-2">
            <span className="text-4xl font-black text-muted-foreground line-through decoration-destructive decoration-2">
              £5.99
            </span>
            <span className="pb-1 text-sm font-bold text-muted-foreground">/ month</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground line-through">£49.99 / year</p>
          <p className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-destructive/50 bg-destructive/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-destructive">
            <Lock className="size-3.5" />
            Unavailable — coming soon
          </p>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            Payments aren&apos;t switched on yet. Every player keeps full access to all current features in the meantime.
          </p>
        </div>

        <div className="mt-5 space-y-3">
          {PERKS.map((p) => (
            <div key={p.title} className="flex gap-3 rounded-2xl border p-4">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <p.icon className="size-5" />
              </div>
              <div>
                <p className="text-sm font-black">{p.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{p.body}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          disabled
          className="mt-6 w-full cursor-not-allowed rounded-2xl border border-primary/40 bg-primary/10 py-4 font-black uppercase tracking-wide text-primary/60"
        >
          Billing opens soon
        </button>
        <button onClick={onClose} className="mt-3 w-full py-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Back to my card
        </button>
      </div>
    </div>
  );
}
