export type Slot = {
  user_id?: string;
  guest_name?: string;
  display_name: string;
  avatar?: string;
  avatar_color?: string;
  rating?: number;
  /** Small line under the name, e.g. "Not signed in". */
  note?: string;
} | null;

// Guests can set a match up; it's kept here while they sign up so nothing is lost.
export const DRAFT_KEY = "recordDraft";
export type Draft = {
  at: number;
  partner: Slot;
  opp1: Slot;
  opp2: Slot;
  sets: [number, number][];
  superTb: boolean;
  venue: string;
  type: string;
  mySide: "left" | "right" | null;
  notes: string;
};

export function loadDraft(): Draft | null {
  try {
    const d = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? "null") as Draft | null;
    return d && Date.now() - d.at < 2 * 3600 * 1000 ? d : null;
  } catch {
    return null;
  }
}
export function hasRecordDraft() {
  return loadDraft() !== null;
}
