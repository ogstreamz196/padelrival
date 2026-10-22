import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ChevronLeft, ExternalLink, MapPin, UsersRound } from "lucide-react";
import { PublicPage } from "@/components/PublicPage";
import { bookingLink, fetchClubs, groupByCity } from "@/lib/clubs";
import { jsonLd, seo, SITE_URL } from "@/lib/seo";

export const Route = createFileRoute("/padel-courts/$city")({
  // City pages are added to the sitemap by /sitemap.xml from the club list.
  staticData: { sitemap: false },
  loader: async ({ params }) => {
    const groups = groupByCity(await fetchClubs());
    const here = groups.find((g) => g.slug === params.city);
    if (!here) throw notFound();
    return { ...here, others: groups.filter((g) => g.slug !== params.city).slice(0, 8) };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData)
      return seo({
        title: "Padel courts | Padel Rival",
        description: "",
        path: `/padel-courts/${params.city}`,
        noindex: true,
      });
    const { city, clubs } = loaderData;
    const n = clubs.length;
    const title = `Padel courts in ${city} — ${n} club${n > 1 ? "s" : ""} to book | Padel Rival`;
    const description = `Find padel courts in ${city}: ${clubs
      .slice(0, 3)
      .map((c) => c.name)
      .join(
        ", ",
      )}${n > 3 ? " and more" : ""}. Compare indoor and outdoor courts, book a court and find players for your next match.`;
    return {
      ...seo({ title, description, path: `/padel-courts/${loaderData.slug}` }),
      scripts: [
        jsonLd({
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: `Padel courts in ${city}`,
          itemListElement: clubs.map((c, i) => ({
            "@type": "ListItem",
            position: i + 1,
            item: {
              "@type": "SportsActivityLocation",
              name: c.name,
              sport: "Padel",
              address: {
                "@type": "PostalAddress",
                addressLocality: c.city,
                addressCountry: "GB",
                ...(c.postcode ? { postalCode: c.postcode } : {}),
              },
              ...(c.booking_url ? { url: c.booking_url } : {}),
            },
          })),
        }),
        jsonLd({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Padel Rival", item: SITE_URL },
            {
              "@type": "ListItem",
              position: 2,
              name: "Padel courts",
              item: `${SITE_URL}/padel-courts`,
            },
            {
              "@type": "ListItem",
              position: 3,
              name: city,
              item: `${SITE_URL}/padel-courts/${loaderData.slug}`,
            },
          ],
        }),
      ],
    };
  },
  notFoundComponent: () => (
    <PublicPage>
      <h1 className="text-2xl font-black">We don't list that city yet</h1>
      <Link to="/padel-courts" className="mt-4 inline-block font-bold text-primary">
        See all padel clubs
      </Link>
    </PublicPage>
  ),
  component: CityPage,
});

function CityPage() {
  const { city, clubs, others } = Route.useLoaderData();
  const indoor = clubs.filter((c) => c.court_type !== "outdoor").length;
  const courts = clubs.reduce((n, c) => n + c.courts_count, 0);

  return (
    <PublicPage>
      <Link
        to="/padel-courts"
        className="mb-3 flex items-center gap-1 text-sm font-bold text-muted-foreground"
      >
        <ChevronLeft className="size-4" /> All cities
      </Link>
      <h1 className="text-3xl font-black leading-tight">Padel courts in {city}</h1>
      <p className="mt-3 text-muted-foreground">
        {clubs.length} padel club{clubs.length > 1 ? "s" : ""} in {city} with around {courts} courts
        {indoor ? `, ${indoor} of them indoor or covered for year-round play` : ""}. Book a court
        below, then log your match on Padel Rival to get a rating and track your rivals.
      </p>

      <ul className="mt-6 grid gap-3 md:grid-cols-2">
        {clubs.map((c) => (
          <li key={c.id} className="rounded-3xl border bg-card p-4">
            <h2 className="font-display text-base font-black">{c.name}</h2>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3.5" />
              {c.city}
              {c.postcode ? ` · ${c.postcode}` : ""} · {c.courts_count} courts · {c.court_type}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <a
                href={bookingLink(c)}
                target="_blank"
                rel="noopener nofollow"
                className="flex items-center justify-center gap-1.5 rounded-2xl bg-court py-2.5 text-xs font-black uppercase text-court-foreground"
              >
                Book a court <ExternalLink className="size-3.5" />
              </a>
              <Link
                to="/beacons"
                search={{ post: true, venue: c.name }}
                className="flex items-center justify-center gap-1.5 rounded-2xl border border-primary/50 py-2.5 text-xs font-black uppercase text-primary"
              >
                <UsersRound className="size-4" /> Find players
              </Link>
            </div>
          </li>
        ))}
      </ul>

      <section className="mt-10">
        <h2 className="text-xl font-black">Play padel in {city} with Padel Rival</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Log every match in about 20 seconds and get an Elo-style padel rating. Your head-to-head
          record against every rival builds itself, and when you're short of a fourth you can open
          your spare spots to any player in {city}.
        </p>
        <Link
          to="/home"
          className="mt-4 block rounded-2xl bg-primary py-3.5 text-center font-black uppercase text-primary-foreground"
        >
          Start for free
        </Link>
      </section>

      {others.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-black">Padel courts in other cities</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {others.map((g) => (
              <Link
                key={g.slug}
                to="/padel-courts/$city"
                params={{ city: g.slug }}
                className="rounded-full border px-3 py-1.5 text-xs font-bold text-muted-foreground"
              >
                {g.city}
              </Link>
            ))}
          </div>
        </section>
      )}
    </PublicPage>
  );
}
