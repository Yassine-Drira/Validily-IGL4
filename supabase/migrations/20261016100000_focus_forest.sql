-- ==============================================================================
-- VALIDILY-IGL4: Focus Forest Feature Migration
-- Migration: 20261016100000_focus_forest.sql
-- Description:
--   1. Create focus_sessions table for server-validated Pomodoro sessions.
--   2. Create forest_entries table for permanent healthy and leafless trees.
--   3. Create forest_preferences table for visibility and custom defaults.
--   4. Enable RLS and deploy strict anti-cheat and privacy policies.
--   5. Deploy atomic complete_focus_session and abandon_focus_session RPCs.
-- ==============================================================================

-- 1. Focus Sessions Table
create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  session_label text,
  target_duration_seconds int not null check (target_duration_seconds >= 300 and target_duration_seconds <= 10800),
  actual_duration_seconds int not null default 0,
  status text not null check (status in ('in_progress', 'completed', 'interrupted', 'cancelled', 'expired_unverified')) default 'in_progress',
  tree_species text not null check (tree_species in ('cedar', 'oak', 'pine', 'willow', 'jacaranda', 'sakura')) default 'cedar',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  interrupted_at timestamptz,
  interruption_reason text,
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Forest Entries Table (Permanent Trees)
create table if not exists public.forest_entries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.focus_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  tree_status text not null check (tree_status in ('healthy', 'leafless')),
  tree_species text not null check (tree_species in ('cedar', 'oak', 'pine', 'willow', 'jacaranda', 'sakura')) default 'cedar',
  position_x float not null,
  position_y float not null,
  scale_factor float not null default 1.0,
  earned_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- 3. Forest Preferences Table
create table if not exists public.forest_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  visibility text not null check (visibility in ('private', 'members', 'public')) default 'members',
  default_tree_species text not null check (default_tree_species in ('cedar', 'oak', 'pine', 'willow', 'jacaranda', 'sakura')) default 'cedar',
  allow_classmate_cheers boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for ultra-fast queries
create index if not exists idx_focus_sessions_user_status on public.focus_sessions(user_id, status);
create index if not exists idx_forest_entries_user_earned on public.forest_entries(user_id, earned_at desc);
create index if not exists idx_forest_entries_status on public.forest_entries(tree_status);
create index if not exists idx_forest_preferences_visibility on public.forest_preferences(visibility);

-- Enable Row Level Security
alter table public.focus_sessions enable row level security;
alter table public.forest_entries enable row level security;
alter table public.forest_preferences enable row level security;

-- 4. RLS Policies: focus_sessions
-- Owners and admins can read their sessions
create policy "Users can view own focus sessions"
  on public.focus_sessions for select
  using (
    (auth.uid() is not null and auth.uid() = user_id)
    or public.is_admin()
  );

-- Users can insert their own in_progress sessions
create policy "Users can create own focus sessions"
  on public.focus_sessions for insert
  with check (
    (auth.uid() is not null and auth.uid() = user_id and status = 'in_progress')
    or public.is_admin()
  );

-- Users can update their own in_progress sessions (e.g. interruption)
create policy "Users can update own active sessions"
  on public.focus_sessions for update
  using (
    (auth.uid() is not null and auth.uid() = user_id)
    or public.is_admin()
  );

-- Direct deletion is denied for ordinary users (auditable history)
create policy "Only admins can delete focus sessions"
  on public.focus_sessions for delete
  using (public.is_admin());

-- 5. RLS Policies: forest_entries
-- Owners can always view their own trees. Authenticated peers can view if visibility is members or public.
create policy "View forest entries based on owner preferences"
  on public.forest_entries for select
  using (
    (auth.uid() is not null and auth.uid() = user_id)
    or exists (
      select 1 from public.forest_preferences fp
      where fp.user_id = public.forest_entries.user_id
      and (
        (fp.visibility = 'public')
        or (fp.visibility = 'members' and auth.uid() is not null)
      )
    )
    or public.is_admin()
  );

-- Direct insertion/mutation by clients is blocked: entries are minted via server validation RPC
create policy "Only service role and admins can insert forest entries"
  on public.forest_entries for insert
  with check (public.is_admin());

create policy "Only admins can update forest entries"
  on public.forest_entries for update
  using (public.is_admin());

create policy "Only admins can delete forest entries"
  on public.forest_entries for delete
  using (public.is_admin());

-- 6. RLS Policies: forest_preferences
create policy "Anyone can read forest visibility preferences"
  on public.forest_preferences for select
  using (true);

create policy "Users can manage own forest preferences"
  on public.forest_preferences for all
  using (
    (auth.uid() is not null and auth.uid() = user_id)
    or public.is_admin()
  )
  with check (
    (auth.uid() is not null and auth.uid() = user_id)
    or public.is_admin()
  );

-- ==============================================================================
-- 7. Atomic PostgreSQL RPC: complete_focus_session
-- Validates elapsed time server-side, idempotently marks completed, plants tree
-- ==============================================================================
create or replace function public.complete_focus_session(
  p_session_id uuid,
  p_idempotency_key text default null
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_session record;
  v_tree record;
  v_now timestamptz := now();
  v_count int;
  v_angle float;
  v_radius float;
begin
  -- 1. Fetch & lock session
  select * into v_session from public.focus_sessions
  where id = p_session_id and user_id = auth.uid()
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Session introuvable ou accès non autorisé.');
  end if;

  -- 2. Idempotency check: if already completed, return existing tree without duplicating
  if v_session.status = 'completed' then
    select * into v_tree from public.forest_entries where session_id = p_session_id;
    return jsonb_build_object('success', true, 'already_completed', true, 'tree', row_to_json(v_tree));
  end if;

  if v_session.status != 'in_progress' then
    return jsonb_build_object('success', false, 'error', 'La session n''est plus active.');
  end if;

  -- 3. Strict Server Clock Verification (Allowing 30s grace window for network lag)
  if v_now < (v_session.started_at + (v_session.target_duration_seconds - 30) * interval '1 second') then
    return jsonb_build_object(
      'success', false,
      'error', 'Temps de concentration insuffisant. La session ne peut pas être validée prématurément.'
    );
  end if;

  -- 4. Calculate deterministic spiral coordinates (Golden Angle distribution)
  select count(*) into v_count from public.forest_entries where user_id = auth.uid();
  v_angle := v_count * 2.3999632; -- Golden angle in radians
  v_radius := 18.0 * sqrt(v_count + 1);

  -- 5. Atomic state update
  update public.focus_sessions set
    status = 'completed',
    actual_duration_seconds = extract(epoch from (v_now - started_at))::int,
    completed_at = v_now,
    idempotency_key = coalesce(p_idempotency_key, idempotency_key),
    updated_at = v_now
  where id = p_session_id;

  -- 6. Insert healthy tree into forest
  insert into public.forest_entries (
    session_id,
    user_id,
    tree_status,
    tree_species,
    position_x,
    position_y,
    scale_factor,
    earned_at
  ) values (
    p_session_id,
    auth.uid(),
    'healthy',
    v_session.tree_species,
    round((cos(v_angle) * v_radius)::numeric, 2),
    round((sin(v_angle) * v_radius)::numeric, 2),
    round((0.92 + (random() * 0.16))::numeric, 2),
    v_now
  ) returning * into v_tree;

  return jsonb_build_object('success', true, 'tree', row_to_json(v_tree));
end;
$$;

-- ==============================================================================
-- 8. Atomic PostgreSQL RPC: abandon_focus_session
-- Applies the 2-minute grace policy: cancels if <= 120s, plants leafless tree if > 120s
-- ==============================================================================
create or replace function public.abandon_focus_session(
  p_session_id uuid,
  p_reason text default null
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_session record;
  v_tree record;
  v_now timestamptz := now();
  v_elapsed int;
  v_count int;
  v_angle float;
  v_radius float;
begin
  select * into v_session from public.focus_sessions
  where id = p_session_id and user_id = auth.uid()
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Session introuvable.');
  end if;

  if v_session.status != 'in_progress' then
    return jsonb_build_object('success', false, 'error', 'La session n''est plus active.');
  end if;

  v_elapsed := extract(epoch from (v_now - v_session.started_at))::int;

  -- Grace period rule: if abandoned within 120s, cancel without planting dead tree
  if v_elapsed <= 120 then
    update public.focus_sessions set
      status = 'cancelled',
      actual_duration_seconds = v_elapsed,
      interrupted_at = v_now,
      interruption_reason = coalesce(p_reason, 'Annulation précoce (Période de grâce 2 min)'),
      updated_at = v_now
    where id = p_session_id;

    return jsonb_build_object('success', true, 'status', 'cancelled', 'tree', null);
  end if;

  -- Beyond 2 minutes: record interruption and plant leafless tree
  select count(*) into v_count from public.forest_entries where user_id = auth.uid();
  v_angle := v_count * 2.3999632;
  v_radius := 18.0 * sqrt(v_count + 1);

  update public.focus_sessions set
    status = 'interrupted',
    actual_duration_seconds = v_elapsed,
    interrupted_at = v_now,
    interruption_reason = coalesce(p_reason, 'Abandon volontaire de la session'),
    updated_at = v_now
  where id = p_session_id;

  insert into public.forest_entries (
    session_id,
    user_id,
    tree_status,
    tree_species,
    position_x,
    position_y,
    scale_factor,
    earned_at
  ) values (
    p_session_id,
    auth.uid(),
    'leafless',
    v_session.tree_species,
    round((cos(v_angle) * v_radius)::numeric, 2),
    round((sin(v_angle) * v_radius)::numeric, 2),
    round((0.88 + (random() * 0.14))::numeric, 2),
    v_now
  ) returning * into v_tree;

  return jsonb_build_object('success', true, 'status', 'interrupted', 'tree', row_to_json(v_tree));
end;
$$;
