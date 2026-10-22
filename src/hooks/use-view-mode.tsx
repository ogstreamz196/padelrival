import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import { BarChart3, Sparkles } from "lucide-react";
import { cn, haptic } from "@/lib/utils";

/**
 * Simple vs Advanced view. Simple trims the screens down to the essentials
 * (rating, record, recent matches); Advanced shows every stat and uses the
 * multi-column layouts on big screens. Kept per device in localStorage.
 */
export type ViewMode = "simple" | "advanced";

const KEY = "pr-view-mode";
const listeners = new Set<() => void>();

function read(): ViewMode | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === "simple" || v === "advanced" ? v : null;
  } catch {
    return null;
  }
}

export function setViewMode(mode: ViewMode) {
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    // Private mode: the choice just won't survive a reload.
  }
  memory = mode;
  listeners.forEach((l) => l());
}

let memory: ViewMode | null = null;

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => e.key === KEY && l();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

const Ctx = createContext<ViewMode>("simple");

/** Until a player picks, newcomers get Simple and regulars (10+ matches) get Advanced. */
export function ViewModeProvider({ played, children }: { played: number; children: ReactNode }) {
  const chosen = useSyncExternalStore(subscribe, () => memory ?? read(), () => null);
  return <Ctx.Provider value={chosen ?? (played >= 10 ? "advanced" : "simple")}>{children}</Ctx.Provider>;
}

export function useViewMode() {
  const mode = useContext(Ctx);
  return { mode, simple: mode === "simple", advanced: mode === "advanced" };
}

export function ViewModeToggle({ className, compact }: { className?: string; compact?: boolean }) {
  const { mode } = useViewMode();
  const opt = (m: ViewMode, label: string, Icon: typeof Sparkles) => (
    <button
      type="button"
      role="radio"
      aria-checked={mode === m}
      title={m === "simple" ? "Just the essentials" : "Every stat and chart"}
      onClick={() => {
        if (mode === m) return;
        haptic();
        setViewMode(m);
      }}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-wide transition-colors",
        mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="size-3.5" />
      {!compact && label}
    </button>
  );
  return (
    <div role="radiogroup" aria-label="How much detail to show" className={cn("flex rounded-full border bg-card p-0.5", className)}>
      {opt("simple", "Simple", Sparkles)}
      {opt("advanced", "Advanced", BarChart3)}
    </div>
  );
}
