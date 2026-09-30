import { useEffect, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { WifiOff } from "lucide-react";

/** Android hardware back button + weak-signal banner. */
export function NativeAndNetwork() {
  const router = useRouter();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    setOffline(!navigator.onLine);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => {
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    if (!cap?.isNativePlatform?.()) return;
    let remove: (() => void) | undefined;
    import("@capacitor/app")
      .then(({ App }) =>
        App.addListener("backButton", ({ canGoBack }) => {
          const root = ["/home", "/", "/auth"].includes(window.location.pathname);
          if (canGoBack && !root) router.history.back();
          else App.minimizeApp();
        }),
      )
      .then((h) => (remove = () => h.remove()))
      .catch(() => {});
    return () => remove?.();
  }, [router]);

  if (!offline) return null;
  return (
    <div className="fixed inset-x-0 top-0 z-[60] mx-auto flex max-w-md items-center justify-center gap-2 bg-destructive px-3 pb-2 pt-[max(env(safe-area-inset-top),0.5rem)] text-xs font-bold text-destructive-foreground">
      <WifiOff className="size-4" /> No signal — reconnecting…
    </div>
  );
}
