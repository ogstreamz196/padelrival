import { createFileRoute } from "@tanstack/react-router";
import { fetchClubs, groupByCity } from "@/lib/clubs";
import { SITE_URL } from "@/lib/seo";

// Public pages search engines should index. App screens that need data from the
// browser are reachable from these, so they don't need listing here.
const STATIC = [
  { path: "/", priority: "1.0", changefreq: "weekly" },
  { path: "/padel-courts", priority: "0.9", changefreq: "weekly" },
  { path: "/leaderboard", priority: "0.6", changefreq: "daily" },
  { path: "/beacons", priority: "0.6", changefreq: "daily" },
  { path: "/privacy", priority: "0.2", changefreq: "yearly" },
  { path: "/terms", priority: "0.2", changefreq: "yearly" },
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        let cities: { slug: string }[] = [];
        try {
          cities = groupByCity(await fetchClubs());
        } catch {
          // Still serve the static pages if the club list can't load.
        }
        const urls = [
          ...STATIC,
          ...cities.map((c) => ({
            path: `/padel-courts/${c.slug}`,
            priority: "0.8",
            changefreq: "weekly",
          })),
        ];
        const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url><loc>${SITE_URL}${u.path}</loc><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`,
  )
  .join("\n")}
</urlset>
`;
        return new Response(body, {
          headers: {
            "content-type": "application/xml; charset=utf-8",
            "cache-control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
