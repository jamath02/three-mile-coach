-- Garmin sync status, readable only by the account owner.
create table if not exists public.garmin_sync_status (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_attempt_at timestamptz,
  last_success_at timestamptz,
  last_result text check (last_result in ('success','error')),
  last_processed_count integer not null default 0,
  last_fetched_count integer not null default 0,
  last_trigger text check (last_trigger in ('manual','scheduled')),
  last_error text,
  updated_at timestamptz not null default now()
);
alter table public.garmin_sync_status enable row level security;
drop policy if exists "Read own Garmin sync status" on public.garmin_sync_status;
create policy "Read own Garmin sync status" on public.garmin_sync_status
  for select to authenticated using (auth.uid() = user_id);
grant select on public.garmin_sync_status to authenticated;
grant select, insert, update on public.garmin_sync_status to service_role;
revoke all on public.garmin_sync_status from anon;
