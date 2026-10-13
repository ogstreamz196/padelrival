export const SITE_URL = "https://padel.ogbot.co.uk";
export const SITE_NAME = "Padel Rival";
export const OG_IMAGE = `${SITE_URL}/og-image.png`;

type Seo = { title: string; description: string; path: string; image?: string; noindex?: boolean };

/**
 * Title, description, canonical URL and social-card tags for one page.
 * Spread the result into a route's `head()`: `head: () => seo({...})`.
 */
export function seo({ title, description, path, image = OG_IMAGE, noindex }: Seo) {
  const url = `${SITE_URL}${path}`;
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { property: "og:image", content: image },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: image },
      ...(noindex ? [{ name: "robots", content: "noindex, follow" }] : []),
    ],
    links: [{ rel: "canonical", href: url }],
  };
}

/** A JSON-LD block for `head().scripts`. */
export function jsonLd(data: object) {
  return { type: "application/ld+json", children: JSON.stringify(data) };
}

export function citySlug(city: string) {
  return city
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const FAQ = [
  {
    q: "What is Padel Rival?",
    a: "Padel Rival is a free padel score tracker and rating app. You log your 2v2 matches in about 20 seconds, everyone in the match gets an Elo rating update, and the app keeps your head-to-head record against every rival.",
  },
  {
    q: "How does the padel rating work?",
    a: "Every player starts at 1000. Beat a stronger pair and you gain more points; lose to a weaker pair and you drop more. Your first five matches are provisional while your rating settles. Ratings run from Bronze through Silver, Gold and Platinum up to Diamond.",
  },
  {
    q: "Can I find padel players near me?",
    a: "Yes. Post an open match with your club, time and how many spots are free. Any player on the app can claim a spot, and the first to accept are added to your game automatically. You can also share the invite straight to WhatsApp.",
  },
  {
    q: "Is Padel Rival free?",
    a: "Yes. Recording matches, ratings, rivalries, leaderboards, open matches and the club directory are all free. An optional Pro plan adds deeper stats and extra share cards.",
  },
  {
    q: "Do my friends need the app to play?",
    a: "No. You can add anyone as a guest by typing their name. If they join later, the matches you logged under that name are added to their record.",
  },
  {
    q: "Do I need to download anything?",
    a: "No. Padel Rival works in any phone browser, and you can add it to your home screen so it opens like an app.",
  },
];
