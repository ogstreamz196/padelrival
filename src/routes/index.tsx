import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Padel Rival — Compete, rank up, settle rivalries" },
      { name: "description", content: "Record 2v2 padel matches, earn Elo and XP, unlock badges and track head-to-head rivalries with your crew." },
      { property: "og:title", content: "Padel Rival — Compete, rank up, settle rivalries" },
      { property: "og:description", content: "Record 2v2 padel matches, earn Elo and XP, unlock badges and track rivalries." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/home" });
    });
  }, [navigate]);

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-between px-6 py-10">
      <div className="flex items-center gap-2">
        <img src="/icon-192.png" alt="" className="size-9 rounded-xl" />
        <span className="font-display text-lg font-black">PADEL RIVAL</span>
      </div>

      <div className="animate-rise">
        <p className="mb-4 text-sm font-bold uppercase tracking-[0.3em] text-primary">Season 1 is live</p>
        <h1 className="text-[2.5rem] font-black leading-[0.95]">
          Every match
          <br />
          counts.
          <br />
          <span className="text-primary">Every rival</span>
          <br />
          remembered.
        </h1>
        <p className="mt-6 text-lg text-muted-foreground">
          Log your 2v2 games in seconds. Climb the Elo ladder, stack XP, keep the streak on fire and never let a rival forget who won last.
        </p>
        <div className="mt-8 grid grid-cols-3 gap-2 text-center">
          {[
            ["1000", "Starting Elo"],
            ["+100", "XP per win"],
            ["H2H", "Rivalries"],
          ].map(([a, b]) => (
            <div key={b} className="rounded-2xl border bg-card p-3">
              <div className="font-display text-xl font-black text-primary">{a}</div>
              <div className="text-[11px] font-bold uppercase text-muted-foreground">{b}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Link to="/auth" className="block rounded-2xl bg-primary py-4 text-center font-display text-lg font-black uppercase text-primary-foreground glow active:scale-[0.98]">
          Enter the court
        </Link>
        <div className="mt-4 flex justify-center gap-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
        </div>
      </div>

    </div>
  );
}
