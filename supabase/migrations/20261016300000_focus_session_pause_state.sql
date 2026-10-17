-- ==============================================================================
-- VALIDILY-IGL4: Focus Session Pause State & Time-Accounting Migration
-- Migration: 20261016300000_focus_session_pause_state.sql
-- Description:
--   1. Extend focus_sessions table with explicit pause tracking columns.
--   2. Support 'paused' state in session lifecycle.
--   3. Ensure pause time is never counted as eligible focus time.
--   4. Deploy atomic pause and resume RPCs with concurrency safeguards.
-- ==============================================================================

-- 1. Add pause accounting columns to focus_sessions if not existing
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'focus_sessions' and column_name = 'paused_at'
  ) then
    alter table public.focus_sessions add column paused_at timestamptz;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'focus_sessions' and column_name = 'total_paused_seconds'
  ) then
    alter table public.focus_sessions add column total_paused_seconds int not null default 0;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'focus_sessions' and column_name = 'pause_count'
  ) then
    alter table public.focus_sessions add column pause_count int not null default 0;
  end if;
end $$;

-- 2. Update status constraint to include 'paused'
alter table public.focus_sessions drop constraint if exists focus_sessions_status_check;
alter table public.focus_sessions add constraint focus_sessions_status_check
  check (status in ('in_progress', 'paused', 'completed', 'interrupted', 'cancelled', 'expired_unverified'));

-- 3. Atomic RPC to pause session
create or replace function public.pause_focus_session(
  p_session_id uuid
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_session record;
  v_now timestamptz := now();
begin
  select * into v_session from public.focus_sessions
  where id = p_session_id and user_id = auth.uid()
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Session introuvable ou accès non autorisé.');
  end if;

  if v_session.status != 'in_progress' then
    return jsonb_build_object('success', false, 'error', 'Seule une session active peut être mise en pause.');
  end if;

  update public.focus_sessions set
    status = 'paused',
    paused_at = v_now,
    updated_at = v_now
  where id = p_session_id;

  return jsonb_build_object('success', true, 'status', 'paused', 'paused_at', v_now);
end;
$$;

-- 4. Atomic RPC to resume session
create or replace function public.resume_focus_session(
  p_session_id uuid
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_session record;
  v_now timestamptz := now();
  v_pause_delta int;
begin
  select * into v_session from public.focus_sessions
  where id = p_session_id and user_id = auth.uid()
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Session introuvable ou accès non autorisé.');
  end if;

  if v_session.status != 'paused' then
    return jsonb_build_object('success', false, 'error', 'La session n''est pas en pause.');
  end if;

  v_pause_delta := extract(epoch from (v_now - coalesce(v_session.paused_at, v_now)))::int;

  update public.focus_sessions set
    status = 'in_progress',
    paused_at = null,
    total_paused_seconds = v_session.total_paused_seconds + greatest(0, v_pause_delta),
    pause_count = v_session.pause_count + 1,
    updated_at = v_now
  where id = p_session_id;

  return jsonb_build_object(
    'success', true,
    'status', 'in_progress',
    'total_paused_seconds', v_session.total_paused_seconds + greatest(0, v_pause_delta),
    'pause_count', v_session.pause_count + 1
  );
end;
$$;
