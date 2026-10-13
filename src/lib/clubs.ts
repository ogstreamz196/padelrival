import { supabase } from "@/integrations/supabase/client";
import { citySlug } from "@/lib/seo";

export type Club = {
  id: string;
  name: string;
  city: string;
  postcode: string | null;
  courts_count: number;
  court_type: string;
  booking_url: string | null;
};

/** The public club directory, used by the SEO pages and the sitemap. */
export async function fetchClubs(): Promise<Club[]> {
  const { data, error } = await supabase
    .from("venues")
    .select("id,name,city,postcode,courts_count,court_type,booking_url")
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export function groupByCity(clubs: Club[]) {
  const map = new Map<string, { city: string; slug: string; clubs: Club[] }>();
  for (const c of clubs) {
    const slug = citySlug(c.city);
    if (!slug) continue;
    const g = map.get(slug) ?? { city: c.city, slug, clubs: [] };
    g.clubs.push(c);
    map.set(slug, g);
  }
  return [...map.values()].sort(
    (a, b) => b.clubs.length - a.clubs.length || a.city.localeCompare(b.city),
  );
}

export function bookingLink(c: Club) {
  return (
    c.booking_url ||
    `https://www.google.com/search?q=${encodeURIComponent(`${c.name} ${c.city} padel court booking`)}`
  );
}
