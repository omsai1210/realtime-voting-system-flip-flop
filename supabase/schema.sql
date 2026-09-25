-- ABHIVRIDDHI LIVE VOTING DATABASE
-- Run this entire file in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.debates (
  id uuid primary key default gen_random_uuid(),
  round_name text not null,
  topic text not null,
  participant_a text not null,
  participant_b text not null,
  status text not null default 'pending' check (status in ('pending', 'live', 'completed')),
  voting_open boolean not null default false,
  created_at timestamptz not null default now(),
  ended_at timestamptz
);

create table if not exists public.approved_emails (
  email text primary key,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'audience' check(role in ('admin','audience')),
  created_at timestamptz not null default now()
);

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  debate_id uuid not null references public.debates(id) on delete cascade,
  voter_email text not null references public.approved_emails(email) on delete cascade,
  voted_for text not null check (voted_for in ('A', 'B')),
  created_at timestamptz not null default now(),
  unique(debate_id, voter_email)
);

create or replace function public.check_allowed_email(p_email text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.approved_emails
    where lower(email)=lower(trim(p_email)) and active=true
  );
$$;

grant execute on function public.check_allowed_email(text) to anon, authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.profiles
    where id=auth.uid() and role='admin'
  );
$$;

create or replace view public.public_vote_counts as
select 
  d.id as debate_id,
  count(v.id) filter (where v.voted_for = 'A')::bigint as votes_a,
  count(v.id) filter (where v.voted_for = 'B')::bigint as votes_b
from public.debates d
left join public.votes v on v.debate_id=d.id
group by d.id;

grant select on public.public_vote_counts to anon, authenticated;

alter table public.debates enable row level security;
alter table public.approved_emails enable row level security;
alter table public.profiles enable row level security;
alter table public.votes enable row level security;

drop policy if exists debate_public_read on public.debates;
create policy debate_public_read on public.debates for select using (true);

drop policy if exists debate_admin_all on public.debates;
create policy debate_admin_all on public.debates for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists approved_admin_all on public.approved_emails;
create policy approved_admin_all on public.approved_emails for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles for select using (id=auth.uid() or public.is_admin());

drop policy if exists votes_public_insert on public.votes;
create policy votes_public_insert on public.votes for insert
with check (
  exists(select 1 from public.debates d where d.id=debate_id and d.status='live' and d.voting_open=true)
);

drop policy if exists votes_public_read on public.votes;
create policy votes_public_read on public.votes for select using (true);

-- Enable realtime for vote/debate changes.
alter publication supabase_realtime add table public.votes;
alter publication supabase_realtime add table public.debates;
