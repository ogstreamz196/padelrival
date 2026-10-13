import { useEffect, useState } from "react";
import { HelpCircle, Sparkles, X } from "lucide-react";

export type GuideId =
  "home" | "rivals" | "record" | "leaderboard" | "me" | "beacons" | "venues" | "compare";

const GUIDES: Record<GuideId, { title: string; body: string; points: string[] }> = {
  home: {
    title: "This is your clubhouse",
    body: "Everything happening in your padel circle, in one place.",
    points: [
      "Your weekly division resets every Monday — play to climb it.",
      "“Provisional” means your rating is still settling: 5 matches calibrates it.",
      "Fist-bump 🤜🤛 recent matches from friends in the activity feed.",
    ],
  },
  rivals: {
    title: "Rivalries build themselves",
    body: "Play the same opponent twice and a head-to-head record unlocks.",
    points: [
      "“Unfinished business” shows anyone who is beating you.",
      "Tap Rematch on a rivalry card to start recording the revenge match.",
      "Every win or loss against them updates the head-to-head instantly.",
    ],
  },
  record: {
    title: "Log a match in 20 seconds",
    body: "Pick your team, tap the scores, done.",
    points: [
      "Friends not on the app? Type their name to add them as a guest.",
      "Tap a score chip like 6-4, or use +/– and the swap arrow.",
      "Turn on Super tie-break when the third set was a race to 10.",
    ],
  },
  leaderboard: {
    title: "Two ways to be top",
    body: "All-time skill, or pure form this week.",
    points: [
      "Global ranks everyone by Elo rating since day one.",
      "This week only counts rating and XP won since Monday.",
      "Switch to XP / Activity to reward whoever plays the most.",
    ],
  },
  beacons: {
    title: "Fill your game with anyone",
    body: "An open match puts your spare spots in front of every player on the app.",
    points: [
      "Tap Invite, pick the club and time, and say how many spots are free.",
      "Any player can claim a spot. The first to accept are added automatically.",
      "Share the invite to WhatsApp too. Your group taps the link and joins in one go.",
    ],
  },
  venues: {
    title: "Your clubs, in one place",
    body: "Find a club, book a court and see who is playing today.",
    points: [
      "Star the clubs you play at and they stay at the top.",
      "Tap “I’m playing today” so friends know where to find you.",
      "Short of players? Open a match at any club straight from its card.",
    ],
  },
  compare: {
    title: "Put two players side by side",
    body: "Rating, head-to-head, form and court side, all in one place.",
    points: [
      "Tap either card to swap in any player.",
      "Head to head shows their record against each other and as partners.",
      "Share the comparison to settle the argument in the group chat.",
    ],
  },
  me: {
    title: "Your player card",
    body: "The card you show off — and where you tune everything.",
    points: [
      "Every 250 XP is a new level; badges unlock as you hit milestones.",
      "Best partners shows who you actually win with.",
      "Edit lets you change your look and claim matches logged under your name as a guest.",
    ],
  },
};

const key = (id: GuideId) => `guide:${id}:v1`;

// Storage can be blocked (private mode); the guide then simply shows every visit.
function seen(id: GuideId) {
  try {
    return localStorage.getItem(key(id)) === "1";
  } catch {
    return false;
  }
}
function markSeen(id: GuideId) {
  try {
    localStorage.setItem(key(id), "1");
  } catch {
    /* ignore */
  }
}

export function resetGuides() {
  try {
    (Object.keys(GUIDES) as GuideId[]).forEach((id) => localStorage.removeItem(key(id)));
  } catch {
    /* ignore */
  }
}

export function PageGuide({ id }: { id: GuideId }) {
  const g = GUIDES[id];
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(!seen(id));
    setReady(true);
  }, [id]);

  if (!ready) return null;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mb-4 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-muted-foreground active:scale-95"
      >
        <HelpCircle className="size-3.5" />
        What&apos;s this page?
      </button>
    );
  }

  return (
    <section className="animate-rise mb-5 rounded-3xl border border-primary/40 bg-primary/5 p-4">
      <div className="flex items-start gap-2">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-base font-black uppercase tracking-wide text-primary">
            {g.title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{g.body}</p>
        </div>
        <button
          onClick={() => {
            markSeen(id);
            setOpen(false);
          }}
          className="-mr-1 -mt-1 p-1 text-muted-foreground"
          aria-label="Hide guide"
        >
          <X className="size-4" />
        </button>
      </div>
      <ul className="mt-3 space-y-1.5">
        {g.points.map((p) => (
          <li key={p} className="flex gap-2 text-sm text-muted-foreground">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
            <span>{p}</span>
          </li>
        ))}
      </ul>
      <button
        onClick={() => {
          localStorage.setItem(key(id), "1");
          setOpen(false);
        }}
        className="mt-4 w-full rounded-2xl bg-primary py-3 text-sm font-black uppercase tracking-wide text-primary-foreground active:scale-[0.98]"
      >
        Got it
      </button>
    </section>
  );
}
