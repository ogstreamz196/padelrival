import { useEffect, useState } from "react";

/** True only inside the Capacitor Android/iOS shells (never during SSR or on the web). */
export function useIsNative() {
  const [native, setNative] = useState(false);
  useEffect(() => {
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean; platform?: string } }).Capacitor;
    const isNative = cap?.isNativePlatform?.() ?? (cap?.platform ? cap.platform !== "web" : false);
    setNative(Boolean(isNative));
  }, []);
  return native;
}
