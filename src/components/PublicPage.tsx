import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

/** Server-rendered shell for public, search-indexed pages (no app nav, no sign-in needed). */
export function PublicPage({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto min-h-dvh max-w-md px-5 pb-12 pt-[max(env(safe-area-inset-top),1.25rem)] md:max-w-3xl md:px-8 md:pt-8">
      <header className="mb-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img
            src="/icon-192.png"
            alt="Padel Rival logo"
            width={32}
            height={32}
            className="size-8 rounded-xl"
          />
          <span className="font-display text-base font-black">PADEL RIVAL</span>
        </Link>
        <Link
          to="/home"
          className="rounded-full bg-primary px-4 py-2 text-xs font-black uppercase text-primary-foreground"
        >
          Open app
        </Link>
      </header>
      <main>{children}</main>
      <footer className="mt-12 flex flex-wrap justify-center gap-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Link to="/">Home</Link>
        <Link to="/padel-courts">Padel clubs</Link>
        <Link to="/find-padel-players">Find players</Link>
        <Link to="/padel-rating">Rating calculator</Link>
        <Link to="/privacy">Privacy</Link>
        <Link to="/terms">Terms</Link>
      </footer>
    </div>
  );
}
