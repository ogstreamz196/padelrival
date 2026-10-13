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
- Native Android/iOS apps are Capacitor shells (`android/`, `ios/`, `capacitor.config.ts`) that load the live site https://padel.ogbot.co.uk via `server.url`; why: TanStack Start is SSR, so no static bundle — web updates reach the apps with no store re-release.
- AI coach insights run via `getMatchInsights` server fn calling external providers directly with a fallback chain (Groq/Grok → Gemini → OpenRouter → Pollinations, user-owned keys); why: no Lovable AI credit use from players. Only user-ticked own matches are sent.
- Privacy toggles are `profiles.show_*` columns; PlayerProfile hides sections for other viewers (display-level, rating/name always public for rankings).
- Friends are one-way follows in `follows` (follower/followee, visible only to the two players involved); friend filters are applied client-side on existing feeds/leaderboards.
- "Need a 4th" beacons live in `beacons`/`beacon_players`; clients can only read them, and all writes go through `create_beacon`/`join_beacon`/`leave_beacon`/`cancel_beacon` (status flips to `filled` when `players_needed` non-host players join).
- Venue directory is `venues` (seeded, read-only) plus `venue_checkins` (one per player/venue/day, insert/delete own for `current_date` only); "friends playing today" filters check-ins client-side.
- The Dossier (`/compare?p1=&p2=`) reads `get_head_to_head` and respects each player's `show_*` toggles.
- Guests can browse without an account: `_authenticated/route.tsx` returns `user: User | null`, personal screens add `beforeLoad: requireUser`, and save actions call `useAuthGate().gate(reason)` to open the sign-up sheet; anon has read-only RLS on public tables (not `follows` or `venue_checkins`).
- Boss-editable config (Pro pricing/offer, feature switches, announcement) lives in `app_settings` rows, read via `useAppSettings()` and written only through `admin_update_setting`. Pro membership is `pro_members`, written only by boss RPCs (or a future payment webhook with the service role).
- The boss dashboard (`/admin?tab=`) uses `admin_*` security-definer functions plus `admin.functions.ts` server fns (delete/suspend user, health checks) that need the service role; every boss action is written to `admin_log`.
