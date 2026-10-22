-- No-op placeholder: triggers Drizzle's migrator, which applies the already-journaled
-- 0004_notifications_and_fixes migration (notifications table, trigger functions,
-- weekly_leaderboard ordering, venue_match_counts, UK-time check-ins, admin_overview)
-- before this entry. No schema change of its own.
select 1;