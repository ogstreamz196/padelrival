import { useEffect, useState } from "react";
import { Share, X, Smartphone } from "lucide-react";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const KEY = "installDismissed";

export function InstallBanner() {
  const [show, setShow] = useState(false);
  const [ios, setIos] = useState(false);
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);

  useEffect(() => {
    if (localStorage.getItem(KEY)) return;
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return;
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIos(isIos);
    if (isIos) {
      setShow(true);
      return;
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!show) return null;

  function dismiss() {
    localStorage.setItem(KEY, "1");
    setShow(false);
  }

  return (
    <div className="mt-4 flex items-start gap-3 rounded-2xl border border-primary/40 bg-primary/5 p-3">
      <Smartphone className="mt-0.5 size-5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-black">Add Padel Rival to your home screen</div>
        {ios ? (
          <p className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            Tap <Share className="inline size-3.5" /> Share, then “Add to Home Screen”.
          </p>
        ) : (
          <button
            onClick={async () => {
              await deferred?.prompt();
              dismiss();
            }}
            className="mt-1.5 rounded-full bg-primary px-3 py-1 text-[11px] font-black uppercase text-primary-foreground"
          >
            Install app
          </button>
        )}
      </div>
      <button onClick={dismiss} className="p-1 text-muted-foreground" aria-label="Dismiss">
        <X className="size-4" />
      </button>
    </div>
  );
}
