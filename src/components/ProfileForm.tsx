import { useState } from "react";
import { AVATAR_GROUPS, AVATAR_COLORS } from "@/lib/game";
import { PlayerAvatar, isImageAvatar } from "./PlayerAvatar";
import { cn, haptic } from "@/lib/utils";

export type ProfileValues = { display_name: string; username: string; avatar: string; avatar_color: string; court_side: string };

export function ProfileForm({ initial, submitLabel, onSubmit }: { initial?: Partial<ProfileValues>; submitLabel: string; onSubmit: (v: ProfileValues) => Promise<void> }) {
  const [v, setV] = useState<ProfileValues>({
    display_name: initial?.display_name ?? "",
    username: initial?.username ?? "",
    avatar: initial?.avatar ?? "🎾",
    avatar_color: initial?.avatar_color ?? "lime",
    court_side: initial?.court_side ?? "both",
  });
  const ownPic = isImageAvatar(initial?.avatar) && !initial!.avatar!.startsWith("http");
  const tabs = [...(ownPic ? ["Yours"] : []), ...AVATAR_GROUPS.map((g) => g.label)];
  const [tab, setTab] = useState(tabs[0]!);
  const [busy, setBusy] = useState(false);
  const input = "w-full rounded-2xl border bg-card px-4 py-4 text-base outline-none focus:border-primary";

  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        await onSubmit({ ...v, username: v.username.toLowerCase() });
        setBusy(false);
      }}
    >
      <div className="flex justify-center">
        <PlayerAvatar avatar={v.avatar} color={v.avatar_color} size="xl" className="animate-pop" />
      </div>

      <div className="rounded-3xl border bg-card p-4">
        <div className="mb-3 flex gap-2 overflow-x-auto">
          {tabs.map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-wider",
                tab === t ? "border-primary bg-primary/15 text-primary" : "text-muted-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-6 gap-2">
          {tab === "Yours" && isImageAvatar(initial?.avatar) && (
            <button
              type="button"
              onClick={() => setV({ ...v, avatar: initial!.avatar! })}
              aria-label="Use your picture"
              className={cn("aspect-square overflow-hidden rounded-xl border", v.avatar === initial?.avatar && "border-primary ring-2 ring-primary")}
            >
              <img src={initial!.avatar!} alt="" className="size-full object-cover" />
            </button>
          )}
          {(AVATAR_GROUPS.find((g) => g.label === tab)?.icons ?? []).map((a) => (
            <button
              type="button"
              key={a}
              onClick={() => {
                haptic();
                setV({ ...v, avatar: a });
              }}
              className={cn("grid aspect-square place-items-center rounded-xl border text-2xl transition active:scale-90", v.avatar === a && "border-primary bg-primary/15 ring-2 ring-primary")}
            >
              {isImageAvatar(a) ? <img src={a} alt="" loading="lazy" className="size-4/5 object-contain" /> : a}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-3 border-t pt-4">
          {Object.entries(AVATAR_COLORS).map(([k, cls]) => (
            <button
              type="button"
              key={k}
              onClick={() => {
                haptic();
                setV({ ...v, avatar_color: k });
              }}
              aria-label={k}
              className={cn("size-9 rounded-full", cls, v.avatar_color === k && "ring-4 ring-foreground/60")}
            />
          ))}
        </div>
      </div>
      <input className={input} required maxLength={40} placeholder="Display name" value={v.display_name} onChange={(e) => setV({ ...v, display_name: e.target.value })} />
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
        <input className={cn(input, "pl-9")} required pattern="[a-zA-Z0-9_]{3,20}" title="3–20 letters, numbers or _" placeholder="username" value={v.username} onChange={(e) => setV({ ...v, username: e.target.value })} />
      </div>
      <div>
        <div className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Preferred court side</div>
        <div className="grid grid-cols-3 gap-2">
          {["left", "right", "both"].map((s) => (
            <button type="button" key={s} onClick={() => setV({ ...v, court_side: s })} className={cn("rounded-2xl border py-3 font-bold capitalize", v.court_side === s ? "border-primary bg-primary text-primary-foreground" : "bg-card")}>
              {s}
            </button>
          ))}
        </div>
      </div>
      <button disabled={busy} className="w-full rounded-2xl bg-primary py-4 font-display font-black uppercase text-primary-foreground glow disabled:opacity-60">
        {busy ? "…" : submitLabel}
      </button>
    </form>
  );
}
