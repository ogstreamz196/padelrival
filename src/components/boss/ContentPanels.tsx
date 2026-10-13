import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Pencil, Plus, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useBeacons } from "@/hooks/use-beacons";
import { joiners, slotsLeft, timeLabel } from "@/lib/beacons";
import { cn } from "@/lib/utils";
import { Field, inputCls, Panel } from "./shared";

/** Upcoming open matches, with a cancel button for spam or mistakes. */
export function GamesPanel() {
  const qc = useQueryClient();
  const beacons = useBeacons(100);
  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("admin_cancel_beacon", { _id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Game cancelled");
      qc.invalidateQueries({ queryKey: ["beacons"] });
      qc.invalidateQueries({ queryKey: ["admin-log"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (beacons.isLoading) return <p className="text-sm text-muted-foreground">Loading games…</p>;
  if (!beacons.data?.length)
    return (
      <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        No upcoming games posted.
      </p>
    );

  return (
    <div className="space-y-2">
      {beacons.data.map((b) => (
        <div key={b.id} className="flex items-start gap-3 rounded-2xl border bg-card p-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{b.venue}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(b.scheduled_at).toLocaleDateString([], {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}{" "}
              · {timeLabel(b.scheduled_at)} · host {b.host?.display_name ?? "?"}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {joiners(b).length} joined ·{" "}
              {b.status === "filled" ? "full" : `${slotsLeft(b)} needed`}
              {b.notes ? ` · “${b.notes}”` : ""}
            </p>
          </div>
          <button
            onClick={() =>
              confirm(`Cancel the game at ${b.venue} for everyone?`) && cancel.mutate(b.id)
            }
            className="shrink-0 rounded-xl border border-destructive/40 p-2 text-destructive"
            aria-label="Cancel game"
          >
            <XCircle className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

type Venue = {
  id: string;
  name: string;
  city: string;
  postcode: string | null;
  courts_count: number;
  court_type: string;
  booking_url: string | null;
};

const EMPTY: Omit<Venue, "id"> & { id: string | null } = {
  id: null,
  name: "",
  city: "",
  postcode: "",
  courts_count: 4,
  court_type: "indoor",
  booking_url: "",
};

/** Club directory editor: fix names, add real booking links, add or remove clubs. */
export function ClubsPanel() {
  const qc = useQueryClient();
  const [edit, setEdit] = useState<typeof EMPTY | null>(null);
  const [q, setQ] = useState("");

  const venues = useQuery({
    queryKey: ["venues"],
    queryFn: async () => {
      const { data, error } = await supabase.from("venues").select("*").order("name");
      if (error) throw error;
      return data as Venue[];
    },
  });

  const done = (msg: string) => {
    toast.success(msg);
    setEdit(null);
    qc.invalidateQueries({ queryKey: ["venues"] });
    qc.invalidateQueries({ queryKey: ["admin-log"] });
  };
  const save = useMutation({
    mutationFn: async (v: typeof EMPTY) => {
      const { error } = await supabase.rpc("admin_upsert_venue", {
        // null creates a new club; generated types don't mark the arg nullable.
        _id: v.id as string,
        _name: v.name,
        _city: v.city,
        _postcode: v.postcode ?? "",
        _courts: v.courts_count,
        _court_type: v.court_type,
        _booking_url: v.booking_url ?? "",
      });
      if (error) throw error;
    },
    onSuccess: () => done("Club saved"),
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("admin_delete_venue", { _id: id });
      if (error) throw error;
    },
    onSuccess: () => done("Club removed"),
    onError: (e: Error) => toast.error(e.message),
  });

  const term = q.trim().toLowerCase();
  const list = (venues.data ?? []).filter(
    (v) => !term || `${v.name} ${v.city}`.toLowerCase().includes(term),
  );
  const noLink = (venues.data ?? []).filter((v) => !v.booking_url).length;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search clubs"
          className={inputCls}
        />
        <button
          onClick={() => setEdit({ ...EMPTY })}
          className="flex shrink-0 items-center gap-1 rounded-xl bg-primary px-3 text-xs font-black uppercase text-primary-foreground"
        >
          <Plus className="size-4" /> Add
        </button>
      </div>
      {noLink > 0 && (
        <p className="rounded-xl border border-fire/40 bg-fire/10 px-3 py-2 text-xs">
          {noLink} club{noLink > 1 ? "s" : ""} still {noLink > 1 ? "have" : "has"} no booking link —
          players get a Google search instead.
        </p>
      )}

      {edit && (
        <Panel title={edit.id ? "Edit club" : "New club"}>
          <div className="space-y-2.5">
            <Field label="Name">
              <input
                value={edit.name}
                onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                className={inputCls}
                maxLength={120}
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="City">
                <input
                  value={edit.city}
                  onChange={(e) => setEdit({ ...edit, city: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Postcode">
                <input
                  value={edit.postcode ?? ""}
                  onChange={(e) => setEdit({ ...edit, postcode: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Courts">
                <input
                  value={edit.courts_count}
                  inputMode="numeric"
                  onChange={(e) =>
                    setEdit({
                      ...edit,
                      courts_count: Math.max(
                        1,
                        Math.min(60, Number(e.target.value.replace(/\D/g, "")) || 1),
                      ),
                    })
                  }
                  className={inputCls}
                />
              </Field>
              <Field label="Type">
                <select
                  value={edit.court_type}
                  onChange={(e) => setEdit({ ...edit, court_type: e.target.value })}
                  className={inputCls}
                >
                  <option value="indoor">Indoor</option>
                  <option value="outdoor">Outdoor</option>
                  <option value="covered">Covered</option>
                </select>
              </Field>
            </div>
            <Field label="Booking link">
              <input
                value={edit.booking_url ?? ""}
                onChange={(e) => setEdit({ ...edit, booking_url: e.target.value })}
                placeholder="https://playtomic.io/…"
                className={inputCls}
                inputMode="url"
              />
            </Field>
            <div className="flex gap-2 pt-1">
              <button
                disabled={save.isPending || !edit.name.trim() || !edit.city.trim()}
                onClick={() => save.mutate(edit)}
                className="flex-1 rounded-xl bg-primary py-2.5 text-xs font-black uppercase text-primary-foreground disabled:opacity-40"
              >
                {save.isPending ? "Saving…" : "Save club"}
              </button>
              <button
                onClick={() => setEdit(null)}
                className="rounded-xl border px-4 text-xs font-bold"
              >
                Cancel
              </button>
            </div>
          </div>
        </Panel>
      )}

      <div className="space-y-2">
        {list.map((v) => (
          <div key={v.id} className="flex items-center gap-3 rounded-2xl border bg-card p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{v.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {v.city}
                {v.postcode ? ` · ${v.postcode}` : ""} · {v.courts_count} {v.court_type}
              </p>
              {v.booking_url ? (
                <a
                  href={v.booking_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-0.5 inline-flex max-w-full items-center gap-1 truncate text-xs text-court"
                >
                  <ExternalLink className="size-3 shrink-0" />
                  <span className="truncate">{v.booking_url.replace(/^https?:\/\//, "")}</span>
                </a>
              ) : (
                <p className={cn("mt-0.5 text-xs text-fire")}>No booking link</p>
              )}
            </div>
            <button
              onClick={() => setEdit({ ...v })}
              className="shrink-0 rounded-xl border p-2 text-muted-foreground"
              aria-label={`Edit ${v.name}`}
            >
              <Pencil className="size-4" />
            </button>
            <button
              onClick={() =>
                confirm(`Remove ${v.name}? Today's check-ins there are removed too.`) &&
                del.mutate(v.id)
              }
              className="shrink-0 rounded-xl border border-destructive/40 p-2 text-destructive"
              aria-label={`Remove ${v.name}`}
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
