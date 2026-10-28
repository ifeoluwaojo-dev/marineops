-- MarineOps — run ONCE in Supabase SQL Editor after creating a project.
-- User ownership and RLS apply to every table. Only public/anon keys belong in the frontend.
create extension if not exists pgcrypto;

create table if not exists public.vessels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check(char_length(name) between 2 and 120),
  code text not null check(char_length(code) between 2 and 45),
  type text not null,
  status text not null check(status in ('At sea','In port','Maintenance')),
  location text default '',
  year integer check(year between 1900 and 2100),
  capacity text default '',
  manager text default '',
  notes text default '',
  created_at timestamptz not null default now(),
  unique(user_id,code),
  unique(id,user_id)
);

create table if not exists public.maintenance_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vessel_id uuid not null,
  title text not null check(char_length(title) between 2 and 160),
  system text not null default 'General',
  priority text not null check(priority in ('Critical','High','Medium','Low')),
  status text not null check(status in ('Open','In progress','Completed')),
  due_date date not null,
  assignee text default '',
  notes text default '',
  completed_at date,
  created_at timestamptz not null default now(),
  foreign key(vessel_id,user_id) references public.vessels(id,user_id) on delete cascade
);

create table if not exists public.fuel_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vessel_id uuid not null,
  log_date date not null,
  fuel_type text not null check(fuel_type in ('MGO','VLSFO','HFO','Other')),
  liters numeric(14,2) not null check(liters > 0),
  distance_nm numeric(14,2) not null check(distance_nm >= 0),
  engine_hours numeric(14,2) not null check(engine_hours >= 0),
  notes text default '',
  created_at timestamptz not null default now(),
  foreign key(vessel_id,user_id) references public.vessels(id,user_id) on delete cascade
);

create index if not exists vessels_user_idx on public.vessels(user_id);
create index if not exists tasks_user_due_idx on public.maintenance_tasks(user_id,due_date);
create index if not exists fuel_user_date_idx on public.fuel_logs(user_id,log_date);

alter table public.vessels enable row level security;
alter table public.maintenance_tasks enable row level security;
alter table public.fuel_logs enable row level security;

-- Restrict table privileges to signed-in users, then enforce row ownership.
-- The frontend never uses a secret/service-role key.
revoke all on public.vessels from anon, authenticated;
revoke all on public.maintenance_tasks from anon, authenticated;
revoke all on public.fuel_logs from anon, authenticated;
grant select, insert, update, delete on public.vessels to authenticated;
grant select, insert, update, delete on public.maintenance_tasks to authenticated;
grant select, insert, update, delete on public.fuel_logs to authenticated;

-- Vessel permissions
drop policy if exists vessels_owner on public.vessels;
drop policy if exists vessels_select on public.vessels;
drop policy if exists vessels_insert on public.vessels;
drop policy if exists vessels_update on public.vessels;
drop policy if exists vessels_delete on public.vessels;
create policy vessels_select on public.vessels for select to authenticated
  using ((select auth.uid()) = user_id);
create policy vessels_insert on public.vessels for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy vessels_update on public.vessels for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy vessels_delete on public.vessels for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Maintenance permissions
drop policy if exists tasks_owner on public.maintenance_tasks;
drop policy if exists tasks_select on public.maintenance_tasks;
drop policy if exists tasks_insert on public.maintenance_tasks;
drop policy if exists tasks_update on public.maintenance_tasks;
drop policy if exists tasks_delete on public.maintenance_tasks;
create policy tasks_select on public.maintenance_tasks for select to authenticated
  using ((select auth.uid()) = user_id);
create policy tasks_insert on public.maintenance_tasks for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy tasks_update on public.maintenance_tasks for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy tasks_delete on public.maintenance_tasks for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Fuel log permissions
drop policy if exists fuel_owner on public.fuel_logs;
drop policy if exists fuel_select on public.fuel_logs;
drop policy if exists fuel_insert on public.fuel_logs;
drop policy if exists fuel_update on public.fuel_logs;
drop policy if exists fuel_delete on public.fuel_logs;
create policy fuel_select on public.fuel_logs for select to authenticated
  using ((select auth.uid()) = user_id);
create policy fuel_insert on public.fuel_logs for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy fuel_update on public.fuel_logs for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy fuel_delete on public.fuel_logs for delete to authenticated
  using ((select auth.uid()) = user_id);
