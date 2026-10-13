import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, MapPin } from "lucide-react";
import { fetchClubs, groupByCity } from "@/lib/clubs";
import { jsonLd, seo, SITE_URL } from "@/lib/seo";
import { PublicPage } from "@/components/PublicPage";

const TITLE = "Padel courts in the UK — find a padel club near you | Padel Rival";
const DESCRIPTION =
  "Find padel courts and clubs across the UK. See indoor and outdoor courts, book a court and find players for your next padel match.";

export const Route = createFileRoute("/padel-courts/")({
  // A database blip shouldn't take the hub page down; it falls back to a short message.
  loader: async () => groupByCity(await fetchClubs().catch(() => [])),
  head: ({ loaderData }) => ({
    ...seo({ title: TITLE, description: DESCRIPTION, path: "/padel-courts" }),
    scripts: [
      jsonLd({
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "Padel courts by city",
        itemListElement: (loaderData ?? []).map((g, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: `Padel courts in ${g.city}`,
          url: `${SITE_URL}/padel-courts/${g.slug}`,
        })),
      }),
    ],
  }),
  component: ClubsHub,
});

function ClubsHub() {
  const cities = Route.useLoaderData();
  const total = cities.reduce((n, g) => n + g.clubs.length, 0);
  return (
    <PublicPage>
      <h1 className="text-3xl font-black leading-tight">Padel courts in the UK</h1>
      <p className="mt-3 text-muted-foreground">
        {total > 0
          ? `${total} padel clubs across ${cities.length} cities, with`
          : "Padel clubs across the UK, with"}{" "}
        indoor, outdoor and covered courts. Pick a city to see its clubs, book a court and find
        players for your next match.
      </p>

      {cities.length === 0 && (
        <p className="mt-6 rounded-2xl border border-dashed p-5 text-sm text-muted-foreground">
          The club list is taking a moment to load. Open the app to browse clubs, book a court and
          find players.
        </p>
      )}

      <ul className="mt-6 space-y-2">
        {cities.map((g) => (
          <li key={g.slug}>
            <Link
              to="/padel-courts/$city"
              params={{ city: g.slug }}
              className="flex items-center gap-3 rounded-2xl border bg-card p-4 active:scale-[0.99]"
            >
              <MapPin className="size-5 shrink-0 text-court" />
              <span className="min-w-0 flex-1">
                <span className="block font-bold">Padel courts in {g.city}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {g.clubs.length} club{g.clubs.length > 1 ? "s" : ""} ·{" "}
                  {g.clubs.map((c) => c.name).join(", ")}
                </span>
              </span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>

      <section className="mt-10">
        <h2 className="text-xl font-black">Short of players?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Post an open match on Padel Rival and any player can claim your spare spots. The first to
          accept are added to your game automatically.
        </p>
        <Link
          to="/beacons"
          className="mt-4 block rounded-2xl bg-primary py-3.5 text-center font-black uppercase text-primary-foreground"
        >
          See open matches
        </Link>
      </section>
    </PublicPage>
  );
}
