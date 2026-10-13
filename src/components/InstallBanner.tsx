import { useEffect, useState } from "react";
import { Share, X, Smartphone, SquarePlus } from "lucide-react";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

// Set only once we know the app is installed; "Not now" hides it for this visit only.
const INSTALLED_KEY = "appInstalled";
const SESSION_KEY = "installPopupHidden";

function isInstalledNow() {
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return (
    !!cap?.isNativePlatform?.() ||
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/** Install pop-up, mounted once at the root. Shows every visit until the app is installed. */
export function InstallBanner() {
  const [show, setShow] = useState(false);
  const [ios, setIos] = useState(false);
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);

  useEffect(() => {
    if (isInstalledNow()) {
      localStorage.setItem(INSTALLED_KEY, "1");
      return;
    }
    if (localStorage.getItem(INSTALLED_KEY) || sessionStorage.getItem(SESSION_KEY)) return;

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIos(isIos);
    const t = isIos ? window.setTimeout(() => setShow(true), 1500) : undefined;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setShow(true);
    };
    const onInstalled = () => {
      localStorage.setItem(INSTALLED_KEY, "1");
      setShow(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      if (t) clearTimeout(t);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!show) return null;

  function later() {
    sessionStorage.setItem(SESSION_KEY, "1");
    setShow(false);
  }
  function markInstalled() {
    localStorage.setItem(INSTALLED_KEY, "1");
    setShow(false);
  }
  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    if (outcome === "accepted") markInstalled();
    else later();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-background/70 p-4 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-labelledby="install-title">
      <div className="relative w-full max-w-sm animate-rise rounded-3xl border border-primary/40 bg-card p-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] shadow-2xl">
        <button onClick={later} className="absolute right-3 top-3 p-2 text-muted-foreground" aria-label="Close">
          <X className="size-5" />
        </button>
        <div className="flex items-center gap-3">
          <img src="/icon-192.png" alt="" className="size-14 rounded-2xl" />
          <div>
            <h2 id="install-title" className="font-display text-lg font-black leading-tight">Add a home screen shortcut</h2>
            <p className="text-xs text-muted-foreground">Free · one tap · opens Padel Rival straight from your home screen</p>
          </div>
        </div>

        {ios ? (
          <ol className="mt-4 space-y-2 text-sm">
            <li className="flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-2">
              <span className="font-black text-primary">1</span> Tap <Share className="size-4 text-primary" /> <b>Share</b> at the bottom of Safari
            </li>
            <li className="flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-2">
              <span className="font-black text-primary">2</span> Choose <SquarePlus className="size-4 text-primary" /> <b>Add to Home Screen</b>
            </li>
            <li className="flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-2">
              <span className="font-black text-primary">3</span> Tap <b>Add</b> — the shortcut lands on your home screen
            </li>
          </ol>
        ) : (
          <button onClick={install} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-display font-black uppercase text-primary-foreground glow active:scale-[0.98]">
            <Smartphone className="size-5" /> Add shortcut
          </button>
        )}

        <div className="mt-3 flex justify-between text-xs font-bold text-muted-foreground">
          <button onClick={later} className="py-2">Not now</button>
          {ios && <button onClick={markInstalled} className="py-2">I've already added it</button>}
        </div>
      </div>
    </div>
  );
}
