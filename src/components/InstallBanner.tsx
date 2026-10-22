import { useEffect, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { Share, X, Smartphone, SquarePlus } from "lucide-react";
import { useUser } from "@/hooks/use-auth";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

// Set only once we know the app is installed; "Not now" hides it for this visit only.
const INSTALLED_KEY = "appInstalled";
const SESSION_KEY = "installPopupHidden";
const VISITS_KEY = "installVisits";
const VISIT_COUNTED = "installVisitCounted";
// iPhone users see the prompt at most twice per 7 days.
const IOS_SHOWN_KEY = "installPopupIosShown";
const IOS_MAX_PER_WEEK = 2;
// Guests see it from their third visit; signed-in players straight away.
const GUEST_MIN_VISITS = 3;

// Public pages people land on from search or a shared link: never cover them
// (Google treats intrusive mobile pop-ups on landing pages as a ranking negative).
const QUIET_PATHS = [
  "/padel-courts",
  "/privacy",
  "/terms",
  "/auth",
  "/reset-password",
  "/onboarding",
];

const store = {
  get(s: Storage, k: string) {
    try {
      return s.getItem(k);
    } catch {
      return null;
    }
  },
  set(s: Storage, k: string, v: string) {
    try {
      s.setItem(k, v);
    } catch {
      /* storage blocked */
    }
  },
};

function iosAllowanceLeft() {
  try {
    const raw = localStorage.getItem(IOS_SHOWN_KEY);
    const stamps: number[] = raw ? JSON.parse(raw) : [];
    const recent = stamps.filter((t) => Date.now() - t < 7 * 24 * 60 * 60 * 1000);
    if (recent.length >= IOS_MAX_PER_WEEK) return false;
    recent.push(Date.now());
    localStorage.setItem(IOS_SHOWN_KEY, JSON.stringify(recent));
    return true;
  } catch {
    return true;
  }
}

/** Counts one visit per browser session and returns the running total. */
function countVisit() {
  const n = Number(store.get(localStorage, VISITS_KEY) ?? "0");
  if (store.get(sessionStorage, VISIT_COUNTED)) return n;
  store.set(sessionStorage, VISIT_COUNTED, "1");
  store.set(localStorage, VISITS_KEY, String(n + 1));
  return n + 1;
}

function isInstalledNow() {
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return (
    !!cap?.isNativePlatform?.() ||
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/** "Add to Home Screen" only exists in real Safari, not in in-app browsers like WhatsApp or Instagram. */
function isIosSafari(ua: string) {
  const ios =
    /iphone|ipad|ipod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return (
    ios &&
    /Safari\//.test(ua) &&
    !/CriOS|FxiOS|EdgiOS|FBAN|FBAV|Instagram|WhatsApp|Line\/|Snapchat|GSA\//.test(ua)
  );
}

/** Small install card above the bottom nav, mounted once at the root. */
export function InstallBanner() {
  const { pathname } = useLocation();
  const { user, loading } = useUser();
  const [eligible, setEligible] = useState(false);
  const [show, setShow] = useState(false);
  const [ios, setIos] = useState(false);
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);

  const quiet = pathname === "/" || QUIET_PATHS.some((p) => pathname.startsWith(p));

  // Decide once per page load whether this visitor should be asked at all.
  useEffect(() => {
    if (loading) return;
    if (isInstalledNow()) {
      store.set(localStorage, INSTALLED_KEY, "1");
      return;
    }
    const visits = countVisit();
    if (store.get(localStorage, INSTALLED_KEY) || store.get(sessionStorage, SESSION_KEY)) return;
    if (!user && visits < GUEST_MIN_VISITS) return;
    setEligible(true);
  }, [loading, user]);

  useEffect(() => {
    if (!eligible) return;
    const iosSafari = isIosSafari(navigator.userAgent);
    setIos(iosSafari);
    const t = iosSafari
      ? window.setTimeout(() => {
          if (iosAllowanceLeft()) setShow(true);
        }, 4000)
      : undefined;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setShow(true);
    };
    const onInstalled = () => {
      store.set(localStorage, INSTALLED_KEY, "1");
      setShow(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      if (t) clearTimeout(t);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [eligible]);

  if (!show || quiet) return null;

  function later() {
    store.set(sessionStorage, SESSION_KEY, "1");
    setShow(false);
  }
  function markInstalled() {
    store.set(localStorage, INSTALLED_KEY, "1");
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
    <div
      className="fixed inset-x-0 bottom-[calc(max(env(safe-area-inset-bottom),0.75rem)+5.5rem)] z-50 mx-auto max-w-md px-3 wide:bottom-4 wide:left-auto wide:right-4 wide:mx-0 wide:w-96 wide:px-0"
      role="region"
      aria-labelledby="install-title"
    >
      <div className="relative animate-rise rounded-3xl border border-primary/40 bg-card/95 p-4 shadow-2xl backdrop-blur-xl">
        <button
          onClick={later}
          className="absolute right-2 top-2 p-2 text-muted-foreground"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>
        <div className="flex items-center gap-3 pr-6">
          <img src="/icon-192.png" alt="" className="size-11 rounded-2xl" />
          <div className="min-w-0">
            <h2 id="install-title" className="font-display text-sm font-black leading-tight">
              Add Padel Rival to your home screen
            </h2>
            <p className="text-xs text-muted-foreground">Free · opens in one tap like an app</p>
          </div>
        </div>

        {ios ? (
          <ol className="mt-3 space-y-1.5 text-xs">
            <li className="flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-1.5">
              <span className="font-black text-primary">1</span> Tap{" "}
              <Share className="size-3.5 text-primary" /> <b>Share</b> at the bottom of Safari
            </li>
            <li className="flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-1.5">
              <span className="font-black text-primary">2</span> Choose{" "}
              <SquarePlus className="size-3.5 text-primary" /> <b>Add to Home Screen</b>, then{" "}
              <b>Add</b>
            </li>
          </ol>
        ) : (
          <button
            onClick={install}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 font-display text-sm font-black uppercase text-primary-foreground active:scale-[0.98]"
          >
            <Smartphone className="size-4" /> Add shortcut
          </button>
        )}

        <div className="mt-2 flex justify-between text-xs font-bold text-muted-foreground">
          <button onClick={later} className="py-1.5">
            Not now
          </button>
          {ios && (
            <button onClick={markInstalled} className="py-1.5">
              I've already added it
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
