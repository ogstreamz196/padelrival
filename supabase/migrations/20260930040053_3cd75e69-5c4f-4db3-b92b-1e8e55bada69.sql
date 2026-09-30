alter table public.profiles
  add column show_court_side boolean not null default true,
  add column show_record boolean not null default true,
  add column show_history boolean not null default true,
  add column show_partners boolean not null default true,
  add column show_rivalries boolean not null default true,
  add column show_achievements boolean not null default true;
grant update (show_court_side, show_record, show_history, show_partners, show_rivalries, show_achievements) on public.profiles to authenticated;