import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUser } from "@/hooks/use-auth";

const PromptCtx = createContext<(reason?: string) => void>(() => {});

/** Holds the one "create a free account" sheet that any save action can open. */
export function AuthPromptProvider({ children }: { children: ReactNode }) {
  const [reason, setReason] = useState<string | null>(null);
  const { href } = useLocation();
  const open = useCallback(
    (r?: string) => setReason(r ?? "Create a free account to save your progress."),
    [],
  );
  const redirect = href.startsWith("/auth") ? "/home" : href;

  return (
    <PromptCtx.Provider value={open}>
      {children}
      <Dialog open={reason !== null} onOpenChange={(v) => !v && setReason(null)}>
        <DialogContent>
          <DialogHeader>
            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/15">
              <Sparkles className="size-6 text-primary" />
            </div>
            <DialogTitle className="text-center font-display">Save your progress</DialogTitle>
            <DialogDescription className="text-center">{reason}</DialogDescription>
          </DialogHeader>
          <p className="text-center text-xs text-muted-foreground">
            It's free and takes about 20 seconds. You start at 1000 Elo.
          </p>
          <Link
            to="/auth"
            search={{ mode: "up", redirect }}
            onClick={() => setReason(null)}
            className="block rounded-2xl bg-primary py-4 text-center font-display font-black uppercase text-primary-foreground glow active:scale-[0.98]"
          >
            Create free account
          </Link>
          <Link
            to="/auth"
            search={{ redirect }}
            onClick={() => setReason(null)}
            className="block rounded-2xl border py-3 text-center text-sm font-bold active:scale-[0.98]"
          >
            I already have an account
          </Link>
          <button onClick={() => setReason(null)} className="text-sm text-muted-foreground">
            Keep looking around
          </button>
        </DialogContent>
      </Dialog>
    </PromptCtx.Provider>
  );
}

/**
 * `gate(reason)` returns true when someone is signed in; otherwise it opens the
 * sign-up sheet and returns false, so callers can write `if (!gate("…")) return;`.
 */
export function useAuthGate() {
  const { user, loading } = useUser();
  const prompt = useContext(PromptCtx);
  const gate = useCallback(
    (reason?: string) => {
      if (user) return true;
      if (!loading) prompt(reason);
      return false;
    },
    [user, loading, prompt],
  );
  return { user, loading, gate };
}
