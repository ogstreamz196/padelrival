<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture decisions
- Match recording, Elo/XP math and achievement unlocks run in the `record_match` security-definer SQL function; clients can't write stats directly (only cosmetic profile columns are updatable).
- Rivalries, partner chemistry and the weekly leaderboard are computed on read via SQL functions (`get_rivalries`, `get_partners`, `weekly_leaderboard`), not stored.
- Match mistakes are reversed by the `void_match` security-definer function (creator only, 15 min, blocked if any participant has a newer match); `match_players.streak_before`/`xp_before` exist so the rollback is exact.
- Social reactions live in `match_reactions` (one row per player/match/emoji) and the home feed reads matches directly through RLS, so no feed table is stored.
- All signed-in screens live under `src/routes/_authenticated/` and wrap content in `AppShell` (bottom nav + profile-required redirect to /onboarding).
- PWA is manifest-only (installable, no service worker/offline).
- Native Android/iOS apps are Capacitor shells (`android/`, `ios/`, `capacitor.config.ts`) that load the live site https://padelrival.co.uk via `server.url`; why: TanStack Start is SSR, so no static bundle — web updates reach the apps with no store re-release.
- AI coach insights run via `getMatchInsights` server fn calling external providers directly with a fallback chain (Groq/Grok → Gemini → OpenRouter → Pollinations, user-owned keys); why: no Lovable AI credit use from players. Only user-ticked own matches are sent.
- Privacy toggles are `profiles.show_*` columns; PlayerProfile hides sections for other viewers (display-level, rating/name always public for rankings).
- Friends are one-way follows in `follows` (follower/followee, visible only to the two players involved); friend filters are applied client-side on existing feeds/leaderboards.
- "Open matches" (called beacons in code) live in `beacons`/`beacon_players`; clients can only read them, and all writes go through `create_beacon`/`join_beacon`/`leave_beacon`/`cancel_beacon` (status flips to `filled` when `players_needed` non-host players join).
- Venue directory is `venues` (seeded, read-only) plus `venue_checkins` (one per player/venue/day, insert/delete own for `current_date` only); "friends playing today" filters check-ins client-side.
- The Dossier (`/compare?p1=&p2=`) reads `get_head_to_head` and respects each player's `show_*` toggles.
- Guests can browse without an account: `_authenticated/route.tsx` returns `user: User | null`, personal screens (profile, onboarding, boss, celebrate) add `beforeLoad: requireUser`; Rivals and Record render a guest version, and Record keeps a guest's setup in `sessionStorage` (`src/lib/record-draft.ts`) through sign-up, and save actions call `useAuthGate().gate(reason)` to open the sign-up sheet; anon has read-only RLS on public tables (not `follows` or `venue_checkins`).
- Boss-editable config (Pro pricing/offer, feature switches, announcement) lives in `app_settings` rows, read via `useAppSettings()` and written only through `admin_update_setting`. Pro membership is `pro_members`, written only by boss RPCs (or a future payment webhook with the service role).
- The boss dashboard (`/admin?tab=`) uses `admin_*` security-definer functions plus `admin.functions.ts` server fns (delete/suspend user, health checks) that need the service role; every boss action is written to `admin_log`.
- Database migrations go in `drizzle/migrations/NNNN_name.sql` with a matching `meta/_journal.json` entry and `meta/NNNN_snapshot.json` (Lovable applies these); `supabase/migrations/` holds only the older history.
- SEO: public pages (`/`, `/padel-courts`, `/padel-courts/$city`) are server-rendered outside `_authenticated` and use `seo()`/`jsonLd()` from `src/lib/seo.ts` for title, canonical, social tags and structured data; `/sitemap.xml` is a server route built from the `venues` table; `public/robots.txt`, `public/llms.txt` and `public/og-image.png` round it out. Private screens set `noindex`.
- In-app notifications live in `notifications`, written only by security-definer triggers (open-match join/leave/full/cancel, someone logging a match with you, new follower); clients can read, mark read and delete their own. `NotificationBell` on Home plus a dot on the Home tab show them. No push or email yet.
- Check-in "today" is the UK calendar day via `public.uk_today()`, used by the column default, the RLS policies and the client.
- `src/server.ts` 301-redirects the old domain and www to padelrival.co.uk, except inside native app web views (old app builds only allow the old host).
- Android/iOS package ID is `uk.co.padelrival.app` (fixed forever once uploaded to Play). The Play Store kit (listing text, policy answers, Data safety, monetisation plan, icon, feature graphic, screenshots) lives in `store/play-store/`; `/delete-account` is the public deletion page Google requires.

## Workflow
- The owner wants finished, checked work merged straight into `main` (no pull requests): validate (typecheck + build), push the working branch, then fast-forward or merge into `main` without rewriting history.
- Layout is responsive through the `wide` and `short` Tailwind variants (`src/styles.css`): on tablets, desktops and landscape phones a left `SideRail` replaces the bottom nav, and its width is the `--rail` CSS variable. Custom variants sort after `lg:`/`xl:`, so don't mix them on the same property.
- Simple/Advanced view is `useViewMode()` (`src/hooks/use-view-mode.tsx`), stored per device in localStorage and provided in `_authenticated/route.tsx`; newcomers default to Simple and players with 10+ matches to Advanced until they choose. Advanced shows every stat and the two-column desktop layouts.
- Report and block: `blocks` (own rows only) and `reports` (written only through `report_content`, rate-limited) from migration 0006. `block_player` also drops follows both ways and removes them from your upcoming games; `join_beacon` refuses across a block. Blocked players are hidden client-side via `useHideBlocked()`; boss reviews reports in `/admin?tab=reports`.
- Boss launch tools (migration 0007): `/admin?tab=launch` checklist (`admin_launch_status` + live page checks), `?tab=messages` in-app broadcasts (`admin_broadcast`, kind `broadcast`) and per-player `admin_message`; XP events live in the `xp_event` app setting and `record_match` multiplies XP (never rating) while one is active, returning `xp_multiplier`.
- Weekly challenges on Home are computed client-side from the week's `match_players` (`src/components/WeeklyChallenges.tsx`); nothing is stored.
- `marketing/` holds the launch kit (videos, social images, banners, posting guide); `store/play-store/graphics/` holds Play Store assets. Both are generated from the app with sample data and are not part of the build.
- Special effects live in `src/components/fx.tsx` (Confetti, Reveal, Tilt, CountUp, CourtFx, Spotlight) plus `.fx-*` classes in `src/styles.css`; every animation sits behind `prefers-reduced-motion: no-preference`, and Reveal never hides server-rendered content.
