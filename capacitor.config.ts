import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "uk.co.ogbot.padelrival",
  appName: "Padel Rival",
  webDir: "cap-shell",
  backgroundColor: "#0b1020",
  server: {
    // The native apps load the live web app, so every web update ships to Android/iOS instantly.
    url: "https://padelrival.co.uk/home",
    cleartext: false,
    allowNavigation: ["padelrival.co.uk", "www.padelrival.co.uk", "*.lovable.app", "*.supabase.co", "accounts.google.com"],
  },
  android: { allowMixedContent: false },
  ios: { contentInset: "always" },
};

export default config;
