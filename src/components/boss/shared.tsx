import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function Panel({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-3xl border bg-card p-4", className)}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && (
            <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
              {title}
            </h2>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  tone = "text-foreground",
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: string;
}) {
  return (
    <div className="rounded-2xl border bg-background/40 p-3">
      <Icon className="size-4 text-muted-foreground" />
      <p className={cn("mt-1.5 font-display text-2xl font-black tabular-nums", tone)}>
        {value ?? "—"}
      </p>
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      {hint && <p className="mt-0.5 text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Toggle({
  on,
  onChange,
  label,
  hint,
  disabled,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <label className={cn("flex items-center justify-between gap-3 py-2", disabled && "opacity-50")}>
      <span className="min-w-0">
        <span className="block text-sm font-bold">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        disabled={disabled}
        onClick={() => onChange(!on)}
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full border transition-colors",
          on ? "border-primary bg-primary" : "bg-muted",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-5 rounded-full bg-background transition-all",
            on ? "left-6" : "left-0.5",
          )}
        />
      </button>
    </label>
  );
}

export const inputCls =
  "w-full rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

export function timeAgo(iso: string | null | undefined) {
  if (!iso) return "never";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}
