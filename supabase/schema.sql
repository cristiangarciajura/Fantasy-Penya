-- Fantasy Penya: base de datos para Supabase (PostgreSQL)
-- El registro se realiza mediante Supabase Auth; nunca se almacenan contraseñas aquí.
create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 username text not null unique check (username ~ '^[a-zA-Z0-9_]{3,24}$'),
 display_name text,
 created_at timestamptz not null default now()
);
create table if not exists public.matchdays (
 id bigint generated always as identity primary key,
 number int not null unique check (number > 0),
 lock_at timestamptz not null,
 status text not null default 'open' check (status in ('open','locked','scored'))
);
create table if not exists public.lineups (
 user_id uuid not null references public.profiles(id) on delete cascade,
 matchday_id bigint not null references public.matchdays(id) on delete cascade,
 player_ids text[] not null check (cardinality(player_ids) = 11),
 coach_id text not null,
 submitted_at timestamptz not null default now(),
 primary key(user_id,matchday_id)
);
create table if not exists public.player_scores (
 matchday_id bigint not null references public.matchdays(id) on delete cascade,
 person_id text not null,
 points integer not null default 0,
 primary key(matchday_id,person_id)
);
alter table public.profiles enable row level security;
alter table public.matchdays enable row level security;
alter table public.lineups enable row level security;
alter table public.player_scores enable row level security;
create policy "Profiles readable by authenticated members" on public.profiles for select to authenticated using (true);
create policy "Users create own profile" on public.profiles for insert to authenticated with check (id=auth.uid());
create policy "Users update own profile" on public.profiles for update to authenticated using (id=auth.uid()) with check (id=auth.uid());
create policy "Members read matchdays" on public.matchdays for select to authenticated using (true);
create policy "Users read own lineups" on public.lineups for select to authenticated using (user_id=auth.uid());
create policy "Users insert own open lineup" on public.lineups for insert to authenticated with check (
 user_id=auth.uid() and exists(select 1 from public.matchdays m where m.id=matchday_id and m.status='open' and now()<m.lock_at)
);
create policy "Users update own open lineup" on public.lineups for update to authenticated using (
 user_id=auth.uid() and exists(select 1 from public.matchdays m where m.id=matchday_id and m.status='open' and now()<m.lock_at)
) with check (
 user_id=auth.uid() and exists(select 1 from public.matchdays m where m.id=matchday_id and m.status='open' and now()<m.lock_at)
);
create policy "Members read scores" on public.player_scores for select to authenticated using (true);
-- No client-side write policies for scores or matchdays. Admin changes require trusted server role.
-- Important: validate player/coach IDs against authoritative rosters on a trusted server before production.
