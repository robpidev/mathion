-- Mathion: salas multijugador (rooms / players / answers).
-- Ejecutar UNA vez en el SQL Editor del proyecto Supabase.
-- Modelo de acceso: aula sin login; el PIN de sala actúa como secreto
-- compartido. Políticas abiertas al rol anon + RLS activado.

-- ============ TABLAS ============
create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  pin text unique not null,
  quiz_id text not null,
  estado text not null default 'lobby'
    check (estado in ('lobby', 'pregunta', 'revelado', 'podio')),
  indice int not null default 0,
  pregunta_inicio timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms (id) on delete cascade,
  nombre text not null,
  avatar_estilo text not null default 'adventurer',
  avatar_seed text not null default '',
  puntos int not null default 0,
  racha int not null default 0,
  aciertos int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists answers (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms (id) on delete cascade,
  pregunta int not null,
  player_id uuid not null references players (id) on delete cascade,
  eleccion int not null,
  ms int not null,
  puntos int not null default 0,
  created_at timestamptz not null default now(),
  unique (room_id, pregunta, player_id)
);

create index if not exists answers_room_pregunta_idx
  on answers (room_id, pregunta);
create index if not exists players_room_idx on players (room_id);

-- ============ RLS + POLÍTICAS (aula: anon total) ============
alter table rooms enable row level security;
alter table players enable row level security;
alter table answers enable row level security;

drop policy if exists "aula rooms" on rooms;
create policy "aula rooms" on rooms for all to anon using (true) with check (true);

drop policy if exists "aula players" on players;
create policy "aula players" on players for all to anon using (true) with check (true);

drop policy if exists "aula answers" on answers;
create policy "aula answers" on answers for all to anon using (true) with check (true);

-- ============ DATA API (roles explícitos) ============
grant select, insert, update, delete on rooms to anon;
grant select, insert, update, delete on players to anon;
grant select, insert, update, delete on answers to anon;

-- ============ REALTIME ============
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'rooms'
  ) then
    alter publication supabase_realtime add table rooms;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'players'
  ) then
    alter publication supabase_realtime add table players;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'answers'
  ) then
    alter publication supabase_realtime add table answers;
  end if;
end $$;
