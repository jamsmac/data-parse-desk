-- Create table and dependent functions/policies from scratch (idempotent)
create extension if not exists pgcrypto;

-- Ensure table exists
create table if not exists public.databases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  description text,
  icon text,
  color text,
  tags text[] default '{}'::text[],
  table_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_databases_user_id on public.databases(user_id);
create index if not exists idx_databases_created_at on public.databases(created_at desc);

alter table public.databases enable row level security;

-- Policies
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'databases' and policyname = 'Users can select their own databases'
  ) then
    create policy "Users can select their own databases"
      on public.databases for select
      using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'databases' and policyname = 'Users can insert their own databases'
  ) then
    create policy "Users can insert their own databases"
      on public.databases for insert
      with check (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'databases' and policyname = 'Users can update their own databases'
  ) then
    create policy "Users can update their own databases"
      on public.databases for update
      using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'databases' and policyname = 'Users can delete their own databases'
  ) then
    create policy "Users can delete their own databases"
      on public.databases for delete
      using (auth.uid() = user_id);
  end if;
end $$;

-- Trigger support
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql set search_path = public;

do $$ begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_databases_updated_at'
  ) then
    create trigger trg_databases_updated_at
    before update on public.databases
    for each row execute function public.update_updated_at_column();
  end if;
end $$;

-- RPC functions
create or replace function public.create_database(
  name text,
  user_id uuid,
  description text default null,
  icon text default null,
  color text default null
) returns public.databases
language plpgsql
security invoker
as $$
declare
  new_db public.databases;
begin
  insert into public.databases(name, description, icon, color, user_id)
  values (name, description, icon, color, user_id)
  returning * into new_db;
  return new_db;
end;
$$;

create or replace function public.get_user_databases(p_user_id uuid)
returns setof public.databases
language sql
security invoker
stable
as $$
  select * from public.databases
  where user_id = p_user_id
  order by created_at desc;
$$;

create or replace function public.get_database(p_id uuid)
returns public.databases
language sql
security invoker
stable
as $$
  select d.* from public.databases d
  where d.id = p_id
  limit 1;
$$;
