import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CalendarX, Swords, UserPlus, UsersRound } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { cn, haptic } from "@/lib/utils";

/** Latest notifications for the signed-in player; written by database triggers. */
export function useNotifications(meId: string | null | undefined) {
  return useQuery({
    queryKey: ["notifications", meId],
    enabled: !!meId,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id,kind,title,body,link,read_at,created_at")
        .eq("user_id", meId!)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });
}

const ICONS: Record<string, typeof Bell> = {
  beacon_join: UsersRound,
  beacon_leave: UsersRound,
  beacon_full: UsersRound,
  beacon_cancelled: CalendarX,
  match_logged: Swords,
  follow: UserPlus,
};

function ago(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export function NotificationBell({ meId }: { meId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const list = useNotifications(meId);
  const unread = (list.data ?? []).filter((n) => !n.read_at).length;

  const markRead = useMutation({
    mutationFn: async () => {
      await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", meId)
        .is("read_at", null);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["notifications", meId] }),
  });
  const clear = useMutation({
    mutationFn: async () => {
      await supabase.from("notifications").delete().eq("user_id", meId);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["notifications", meId] }),
  });

  return (
    <>
      <button
        onClick={() => {
          haptic();
          setOpen(true);
          if (unread) markRead.mutate();
        }}
        className="relative grid size-10 place-items-center rounded-full border bg-card text-muted-foreground active:scale-95"
        aria-label={unread ? `${unread} new notifications` : "Notifications"}
      >
        <Bell className="size-5" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-fire px-1 text-[10px] font-black text-primary-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Notifications</DialogTitle>
          </DialogHeader>
          {list.isLoading ? (
            <div className="h-24 animate-pulse rounded-2xl bg-muted" />
          ) : !list.data?.length ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nothing yet. You'll hear here when someone joins your open match, logs a match with
              you or adds you as a friend.
            </p>
          ) : (
            <div className="space-y-2">
              {list.data.map((n) => {
                const Icon = ICONS[n.kind] ?? Bell;
                const body = (
                  <>
                    <span
                      className={cn(
                        "grid size-9 shrink-0 place-items-center rounded-xl",
                        n.read_at ? "bg-muted text-muted-foreground" : "bg-primary/15 text-primary",
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold">{n.title}</span>
                      {n.body && (
                        <span className="block text-xs text-muted-foreground">{n.body}</span>
                      )}
                    </span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {ago(n.created_at)}
                    </span>
                  </>
                );
                const cls = cn(
                  "flex items-start gap-3 rounded-2xl border p-3",
                  n.read_at ? "bg-card" : "border-primary/40 bg-primary/5",
                );
                return n.link ? (
                  <Link key={n.id} to={n.link} onClick={() => setOpen(false)} className={cls}>
                    {body}
                  </Link>
                ) : (
                  <div key={n.id} className={cls}>
                    {body}
                  </div>
                );
              })}
              <button
                onClick={() => clear.mutate()}
                className="w-full py-2 text-xs font-bold text-muted-foreground"
              >
                Clear all
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
