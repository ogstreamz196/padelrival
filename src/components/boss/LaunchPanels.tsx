import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCircle2, Circle, Loader2, Send, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { activeXpEvent, useAppSettings } from "@/hooks/use-settings";
import { cn } from "@/lib/utils";
import { useHealth } from "./Overview";
import { inputCls, Panel, timeAgo } from "./shared";

type LaunchStatus = {
  players: number;
  players_with_match: number;
  matches: number;
  venues: number;
  venues_with_booking: number;
  open_reports: number;
  oldest_open_report: string | null;
  reviewer_account: boolean;
  admins: number;
  broadcasts: number;
};

type Tab = "reports" | "clubs" | "pricing" | "system" | "messages" | "settings";
type Check = { id: string; label: string; detail: string; state: "ok" | "todo" | "wait"; go?: Tab };

/** Public pages Google and players will open on day one; each must answer 200. */
const PAGES = ["/", "/privacy", "/terms", "/delete-account", "/padel-courts", "/sitemap.xml", "/robots.txt", "/manifest.webmanifest"];

function usePublicPages() {
  return useQuery({
    queryKey: ["launch-pages"],
    staleTime: 5 * 60_000,
    queryFn: async () =>
      Promise.all(
        PAGES.map(async (path) => {
          try {
            const r = await fetch(path, { method: "GET", cache: "no-store" });
            return { path, ok: r.ok, status: r.status };
          } catch {
            return { path, ok: false, status: 0 };
          }
        }),
      ),
  });
}

// Manual steps from store/play-store/README.md, ticked off on this device.
const MANUAL = [
  ["dev", "Google Play developer account verified"],
  ["build", "Release bundle (.aab) built and signed in Android Studio"],
  ["listing", "Store listing, icon, feature graphic and screenshots uploaded"],
  ["content", "App content forms done (privacy, ads, rating, audience, data safety)"],
  ["internal", "Internal test installed on your own phone"],
  ["closed", "Closed test: 12+ testers opted in for 14 days"],
  ["social", "Launch videos and posts scheduled on socials"],
  ["production", "Production release sent for review"],
] as const;
const TICKS_KEY = "boss-launch-ticks";

export function LaunchPanel({ onOpen }: { onOpen: (t: Tab) => void }) {
  const status = useQuery({
    queryKey: ["admin-launch"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_launch_status");
      if (error) throw error;
      return data as unknown as LaunchStatus;
    },
  });
  const health = useHealth();
  const pages = usePublicPages();
  const { settings } = useAppSettings();
  const [ticks, setTicks] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try {
      setTicks(JSON.parse(localStorage.getItem(TICKS_KEY) ?? "{}"));
    } catch {
      /* private mode: start empty */
    }
  }, []);
  const tick = (id: string) => {
    const next = { ...ticks, [id]: !ticks[id] };
    setTicks(next);
    try {
      localStorage.setItem(TICKS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const s = status.data;
  const down = (health.data ?? []).filter((h) => h.status === "down");
  const badPages = (pages.data ?? []).filter((p) => !p.ok);
  const wait = (q: { isLoading: boolean }) => (q.isLoading ? "wait" : null);
  const checks: Check[] = [
    {
      id: "db",
      label: "Database up to date",
      detail: status.error ? "Run migrations 0006 and 0007 (report/block and boss tools)" : "All launch functions are installed",
      state: wait(status) ?? (status.error ? "todo" : "ok"),
    },
    {
      id: "systems",
      label: "Systems running",
      detail: down.length ? `Down: ${down.map((d) => d.name).join(", ")}` : "Database, sign-in and integrations answer",
      state: wait(health) ?? (down.length ? "todo" : "ok"),
      go: "system",
    },
    {
      id: "pages",
      label: "Public pages online",
      detail: badPages.length ? `Not loading: ${badPages.map((p) => p.path).join(", ")}` : "Home, privacy, terms, account deletion, sitemap, robots, manifest",
      state: wait(pages) ?? (badPages.length ? "todo" : "ok"),
    },
    {
      id: "clubs",
      label: "Clubs listed",
      detail: s ? `${s.venues} clubs, ${s.venues_with_booking} with a booking link` : "",
      state: wait(status) ?? ((s?.venues ?? 0) >= 5 ? "ok" : "todo"),
      go: "clubs",
    },
    {
      id: "reports",
      label: "No reports waiting",
      detail: s?.open_reports
        ? `${s.open_reports} to review, oldest ${timeAgo(s.oldest_open_report)}`
        : "Google expects reports to be handled promptly",
      state: wait(status) ?? (s?.open_reports ? "todo" : "ok"),
      go: "reports",
    },
    {
      id: "reviewer",
      label: "Play reviewer account",
      detail: s?.reviewer_account ? "@playreview exists" : "Sign up as @playreview and log one match (see the Play Store kit)",
      state: wait(status) ?? (s?.reviewer_account ? "ok" : "todo"),
    },
    {
      id: "payments",
      label: "Payments off for release 1",
      detail: settings.pricing.checkout_enabled ? "Turn off until Google Play Billing is built" : "Pro shows “opens soon”, nothing can be bought",
      state: settings.pricing.checkout_enabled ? "todo" : "ok",
      go: "pricing",
    },
  ];
  const done = checks.filter((c) => c.state === "ok").length + MANUAL.filter(([id]) => ticks[id]).length;
  const total = checks.length + MANUAL.length;
  const xp = activeXpEvent(settings.xp_event);

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-primary/50 bg-primary/5 p-4">
        <div className="flex items-baseline justify-between">
          <p className="font-display text-lg font-black uppercase">Launch readiness</p>
          <p className="font-display text-2xl font-black tabular-nums text-primary">
            {done}/{total}
          </p>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-background/60">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(done / total) * 100}%` }} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {s ? `${s.players} players · ${s.players_with_match} have logged a match · ${s.matches} matches` : "Loading…"}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Checked automatically">
          <div className="divide-y divide-border">
            {checks.map((c) => (
              <button
                key={c.id}
                disabled={!c.go}
                onClick={() => c.go && onOpen(c.go)}
                className="flex w-full items-start gap-3 py-2.5 text-left disabled:cursor-default"
              >
                {c.state === "wait" ? (
                  <Loader2 className="mt-0.5 size-5 shrink-0 animate-spin text-muted-foreground" />
                ) : c.state === "ok" ? (
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-win" />
                ) : (
                  <XCircle className="mt-0.5 size-5 shrink-0 text-fire" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">{c.label}</span>
                  <span className="block text-xs text-muted-foreground">{c.detail}</span>
                </span>
                {c.go && c.state === "todo" && <span className="text-xs font-bold text-primary">Fix</span>}
              </button>
            ))}
          </div>
        </Panel>

        <Panel title="Your steps">
          <div className="divide-y divide-border">
            {MANUAL.map(([id, label]) => (
              <button key={id} onClick={() => tick(id)} className="flex w-full items-center gap-3 py-2.5 text-left">
                {ticks[id] ? (
                  <CheckCircle2 className="size-5 shrink-0 text-win" />
                ) : (
                  <Circle className="size-5 shrink-0 text-muted-foreground" />
                )}
                <span className={cn("text-sm", ticks[id] && "text-muted-foreground line-through")}>{label}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Full instructions are in store/play-store/README.md. Ticks are saved on this device.
          </p>
        </Panel>
      </div>

      <Panel title="Launch day moves">
        <div className="grid gap-2 sm:grid-cols-3">
          <button onClick={() => onOpen("settings")} className="rounded-2xl border bg-background/40 p-3 text-left">
            <p className="text-sm font-black">⚡ {xp ? `${xp.label} is live` : "Start Double XP"}</p>
            <p className="text-xs text-muted-foreground">Give launch week a buzz. XP only, ratings stay fair.</p>
          </button>
          <button onClick={() => onOpen("messages")} className="rounded-2xl border bg-background/40 p-3 text-left">
            <p className="text-sm font-black">📣 Message every player</p>
            <p className="text-xs text-muted-foreground">In-app notification with a link to any screen.</p>
          </button>
          <button onClick={() => onOpen("settings")} className="rounded-2xl border bg-background/40 p-3 text-left">
            <p className="text-sm font-black">📌 Announcement banner</p>
            <p className="text-xs text-muted-foreground">A line at the top of every screen.</p>
          </button>
        </div>
      </Panel>
    </div>
  );
}

const LINKS = [
  ["", "No link"],
  ["/record", "Record a match"],
  ["/beacons", "Open matches"],
  ["/venues", "Clubs"],
  ["/leaderboard", "Ranks"],
  ["/rivals", "Rivals"],
  ["/me", "Their player card"],
  ["/home", "Home"],
] as const;
const AUDIENCE = [
  ["all", "Everyone"],
  ["active", "Played in the last 14 days"],
  ["inactive", "Not played for 14 days"],
] as const;

/** In-app messages to every player (or a slice of them), with a live preview and history. */
export function MessagesPanel() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState<string>("/record");
  const [audience, setAudience] = useState<(typeof AUDIENCE)[number][0]>("all");
  const history = useQuery({
    queryKey: ["admin-log", "broadcast"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_log")
        .select("id,target,detail,created_at")
        .eq("action", "broadcast")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });
  const send = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("admin_broadcast", {
        _title: title.trim(),
        _body: body.trim(),
        _link: link,
        _audience: audience,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (n) => {
      toast.success(`Sent to ${n} player${n === 1 ? "" : "s"}`);
      setTitle("");
      setBody("");
      qc.invalidateQueries({ queryKey: ["admin-log"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="New message">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, 80))}
          placeholder="Title, e.g. Double XP starts now ⚡"
          className={inputCls}
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, 240))}
          rows={3}
          placeholder="Message (optional)"
          className={cn(inputCls, "mt-2 resize-none")}
        />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <select value={link} onChange={(e) => setLink(e.target.value)} className={inputCls} aria-label="Opens">
            {LINKS.map(([v, l]) => (
              <option key={v} value={v}>
                Opens: {l}
              </option>
            ))}
          </select>
          <select
            value={audience}
            onChange={(e) => setAudience(e.target.value as typeof audience)}
            className={inputCls}
            aria-label="Who gets it"
          >
            {AUDIENCE.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Preview</p>
        <div className="mt-1 flex items-start gap-3 rounded-2xl border bg-background/40 p-3">
          <Bell className="mt-0.5 size-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="text-sm font-bold">{title || "Your title"}</p>
            {body && <p className="text-xs text-muted-foreground">{body}</p>}
            <p className="text-[10px] text-muted-foreground">just now</p>
          </div>
        </div>
        <button
          disabled={!title.trim() || send.isPending}
          onClick={() => {
            const who = AUDIENCE.find(([v]) => v === audience)![1].toLowerCase();
            if (confirm(`Send “${title.trim()}” to ${who}? It shows in their notifications straight away.`)) send.mutate();
          }}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-xs font-black uppercase text-primary-foreground disabled:opacity-40"
        >
          <Send className="size-4" /> {send.isPending ? "Sending…" : "Send message"}
        </button>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Messages appear in the bell on Home. There are no push or email notifications yet.
        </p>
      </Panel>

      <Panel title="Sent">
        {!history.data?.length ? (
          <p className="text-sm text-muted-foreground">Nothing sent yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {history.data.map((h) => {
              const d = (h.detail ?? {}) as { title?: string; sent?: number };
              return (
                <div key={h.id} className="py-2.5">
                  <p className="text-sm font-bold">{d.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.sent ?? "?"} players · {AUDIENCE.find(([v]) => v === h.target)?.[1] ?? h.target} · {timeAgo(h.created_at)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}
