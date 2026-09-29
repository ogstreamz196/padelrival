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
- Rivalries and weekly leaderboard are computed on read via SQL functions (`get_rivalries`, `weekly_leaderboard`), not stored.
- All signed-in screens live under `src/routes/_authenticated/` and wrap content in `AppShell` (bottom nav + profile-required redirect to /onboarding).
- PWA is manifest-only (installable, no service worker/offline).
