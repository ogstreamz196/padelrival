# Padel Rival to-do list

Tick things off as you go. Sections are in the order to do them.

## 1. Right now: get the latest code live

- [ ] Fix the Lovable ↔ GitHub sync. Lovable stopped picking up commits after 22 October (its last change was "Applied missing notifications SQL"). Check the GitHub connection is still authorised and that it follows `main`.
- [ ] Once `drizzle/migrations/0006_report_and_block.sql` and `0007_boss_tools.sql` show up in Lovable, run 0006 and then 0007.
- [ ] Publish.
- [ ] Check in the live app:
  - [ ] Boss → Launch shows "Database up to date".
  - [ ] Double XP banner appears when switched on.
  - [ ] A test message reaches the bell.
  - [ ] Report and block work.

If you move off Lovable first (section 4), skip the Lovable steps. The migrations then get run on your own database instead.

## 2. Google search (padelrival.co.uk)

Do these after the latest code is live.

- [ ] In Google Search Console, add `padelrival.co.uk` as a **Domain** property. Verify it with the TXT record at your domain registrar. A URL-prefix property for `https://padelrival.co.uk/` also works, because the site already has a verification tag.
- [ ] Sitemaps → submit `sitemap.xml`.
- [ ] URL Inspection → "Request indexing" for:
  - [ ] `/`
  - [ ] `/padel-courts`
  - [ ] `/padel-rating`
  - [ ] `/find-padel-players`
  - [ ] two or three `/padel-courts/<city>` pages
- [ ] If `padel.ogbot.co.uk` was ever in Search Console, use Settings → Change of address to move it to padelrival.co.uk.
- [ ] In Bing Webmaster Tools, choose "Import from Google Search Console". This also covers DuckDuckGo and ChatGPT search.
- [ ] Get links to the site: the Play Store listing, local club websites, padel Facebook groups and r/padel.
- [ ] After two weeks, check Search Console → Pages for anything "Not indexed" that should be.

## 3. Launch

- [ ] Build the signed Android bundle (.aab) in Android Studio (`store/play-store/README.md`, step 2).
- [ ] Create the `@playreview` account and log one match with it.
- [ ] Play Console: upload everything in `store/play-store/` and fill in the forms.
- [ ] Closed test with 12+ testers for 14 days, then apply for production.
- [ ] Schedule the launch week from `marketing/README.md`.
- [ ] Launch morning:
  - [ ] Switch on Double XP for 7 days.
  - [ ] Message every player from Boss → Messages.

## 4. Leaving Lovable: run Padel Rival on your own accounts

After this, Lovable can be cancelled. The app keeps the same domain, the same database design and the same Android app. Nothing changes for players apart from a short maintenance window.

### What depends on Lovable today

| Piece | Today | Replace with |
|---|---|---|
| Database, sign-in, player accounts | Lovable Cloud (a Supabase project, `jppzfwytfbtpupjxuuuz`, under Lovable's account) | Your own Supabase project |
| Hosting of padelrival.co.uk | Lovable publish | Cloudflare Workers (recommended: the build already targets Cloudflare), or Vercel / Netlify |
| Build setup | `@lovable.dev/vite-tanstack-config` in `vite.config.ts` | A plain Vite + TanStack Start config |
| Google sign-in | `@lovable.dev/cloud-auth-js` (`src/integrations/lovable/`) | Supabase's own Google sign-in |
| Error reporting | `src/lib/lovable-error-reporting.ts` | Sentry (free tier) or nothing |
| Preview helpers | `src/integrations/supabase/previewAuthStorage.ts`, `cron-auth.ts` (unused) | Delete |
| Database changes | `drizzle/migrations/` applied by Lovable | Supabase CLI migrations you run yourself |
| Secrets (API keys) | Lovable Cloud → Secrets | Your host's environment variables |

Nothing else in the app calls Lovable. The app stores no uploaded files, so there's no file storage to move.

### Step 1: accounts you'll need (free to start)

- [ ] **Supabase** (supabase.com). Create a project in the **London (eu-west-2)** region.

  The free tier pauses after a week without traffic, so move to **Pro (about $25 a month)** before launch. Pro also gives daily backups.
- [ ] **Cloudflare** (cloudflare.com) for hosting. Workers' free tier is enough to start.
- [ ] **Google Cloud Console**, to create your own Google sign-in (OAuth) client.
- [ ] **Resend** (resend.com) or another email service, to send sign-up and password-reset emails from padelrival.co.uk. Supabase's built-in email is only for testing.
- [ ] Your original **AI keys** (Groq, Gemini, OpenRouter, Pollinations). Lovable's Secrets screen may not show their values, so get them from each provider's dashboard.

### Step 2: get your data out of Lovable Cloud

- [ ] Ask Lovable support for a **full database export (pg_dump), including `auth.users`**.

  That table holds player logins and password hashes. With it, everyone keeps their password. Without it, every player has to reset their password after the move.
- [ ] If a full export isn't possible, export each table to CSV from Lovable Cloud's database view.

  Every player would then need a password reset. Username-only accounts would need you to set new passwords for them, because they have no real email.
- [ ] Note the boss account email used by `claim_boss()`, and any settings you changed in the boss dashboard (pricing, features, announcement).

### Step 3: new repository

- [ ] Create a new private GitHub repo (for example `padelrival-app`).
- [ ] Push this project into it with its full history. Nothing is rewritten, and the old repo can stay as an archive.

Then ask Claude to make these code changes in the new repo:

- [ ] Replace `@lovable.dev/vite-tanstack-config` with a plain `vite.config.ts`: TanStack Start, React, Tailwind, tsconfig paths, and nitro with the Cloudflare preset.
- [ ] Switch Google sign-in to `supabase.auth.signInWithOAuth({ provider: "google" })`, and remove `@lovable.dev/cloud-auth-js` and `src/integrations/lovable/`.
- [ ] Remove the Lovable error reporting, preview storage and cron helpers.
- [ ] Merge `supabase/migrations/` and `drizzle/migrations/` into one Supabase CLI migration history, so a fresh database can be built with `supabase db push`.
- [ ] Regenerate `src/integrations/supabase/types.ts` from the new project.
- [ ] Add a GitHub Action that type-checks, builds and deploys to Cloudflare on every push to `main`.
- [ ] Update `AGENTS.md` and `README.md` so they no longer mention Lovable.

### Step 4: set up the new database

- [ ] Run every migration on the new Supabase project, then check that `record_match`, `void_match`, `join_beacon`, `admin_*` and the row-level security policies are all present.
- [ ] Import the data from step 2, `auth.users` first, so player IDs stay the same and every profile, match and rivalry lines up.
- [ ] **Authentication → URL configuration:**
  - [ ] Site URL: `https://padelrival.co.uk`
  - [ ] Redirect URLs: `https://padelrival.co.uk/**`
- [ ] **Authentication → Providers → Google:** paste the Google OAuth client ID and secret. In Google Cloud Console, add the Supabase callback URL it shows you.
- [ ] **Authentication → SMTP:** connect Resend so emails come from `noreply@padelrival.co.uk`. Verify the domain in Resend first.
- [ ] Check the boss account still has the admin role (`user_roles`).

### Step 5: hosting

- [ ] Create a Cloudflare Worker for the site and add the environment variables:
  - [ ] `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`
  - [ ] `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` (server only, never in the browser)
  - [ ] `GROQ_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, `POLLINATIONS_API_KEY`
  - [ ] `RESEND_API_KEY` and `STRIPE_SECRET_KEY` only if you use them. The boss health check looks for them.
- [ ] Deploy to the Worker's temporary `*.workers.dev` address and test everything there first: sign up, sign in (email, username, Google), record a match, open matches, boss dashboard, AI coach.

### Step 6: switch over (pick a quiet evening)

- [ ] A day before, lower the TTL on padelrival.co.uk's DNS records to 5 minutes.
- [ ] Turn on the boss announcement banner: "Short maintenance tonight, back in 30 minutes".
- [ ] Take a final export from Lovable Cloud and import it, so no matches are lost.
- [ ] Point `padelrival.co.uk` and `www.padelrival.co.uk` at the Cloudflare Worker (Cloudflare → Workers → Custom domains).
- [ ] Remove the custom domain from Lovable.
- [ ] Test on the real domain:
  - [ ] sign in, record a match, open matches, boss dashboard
  - [ ] `/sitemap.xml`, `/robots.txt`
  - [ ] the Android app, which loads padelrival.co.uk, so it needs no new release
- [ ] Turn the banner off.

### Step 7: afterwards

- [ ] Search Console needs nothing new: the domain is the same and the verification tag is in the code. Resubmit the sitemap anyway.
- [ ] Add an uptime monitor (UptimeRobot is free) and error alerts (Sentry).
- [ ] Check that Supabase daily backups are on (Pro plan).
- [ ] Keep the Lovable project untouched for 2 to 4 weeks as a fallback.
- [ ] Then disconnect GitHub in Lovable and cancel the Lovable plan.
- [ ] Archive the old GitHub repo.

### Rough monthly cost after moving

| Item | Cost |
|---|---|
| Supabase Pro | about $25 |
| Cloudflare Workers | free, or $5 once traffic grows |
| Resend | free up to 3,000 emails a month |
| Domain | what you pay now |
