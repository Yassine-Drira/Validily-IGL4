-- ==============================================================================
-- VALIDILY-IGL4: Premium Audio Library, VIP Access Management & Admin Analytics
-- Migration: 20261016200000_premium_audio_vip_analytics.sql
-- Description:
--   1. Create custom_audio_entries table for personal YouTube study sound entries.
--   2. Create vip_entitlements table for temporary premium access grants.
--   3. Create audio_catalog table for administrator-curated shared audio library.
--   4. Create user_presence table for real-time online user visibility.
--   5. Create analytics_events table for privacy-conscious website usage telemetry.
--   6. Enforce strict Row-Level Security (RLS) on all new tables.
-- ==============================================================================

-- 1. Custom Audio Entries Table
create table if not exists public.custom_audio_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  youtube_url text not null,
  youtube_video_id text not null check (length(youtube_video_id) = 11),
  source_type text not null default 'youtube',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. VIP Entitlements Table (Server-Authoritative Temporary Premium Access)
create table if not exists public.vip_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  granted_by uuid references auth.users(id) on delete set null,
  reason text,
  status text not null check (status in ('active', 'revoked', 'expired')) default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Shared Audio Catalog Table (Admin Curated)
create table if not exists public.audio_catalog (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text not null check (category in ('ambient', 'binaural', 'nature', 'lofi', 'classical', 'focus')) default 'focus',
  source_type text not null check (source_type in ('synth', 'youtube')) default 'youtube',
  source_key text not null,
  youtube_video_id text,
  is_published boolean not null default true,
  sort_order int not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. User Presence Table (Live Active User Visibility)
create table if not exists public.user_presence (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  device_category text not null check (device_category in ('desktop', 'tablet', 'mobile', 'unknown')) default 'unknown',
  current_route text not null default '/',
  last_seen_at timestamptz not null default now()
);

-- 5. Analytics Events Table (Privacy-Conscious First-Party Telemetry)
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('page_view', 'focus_session_start', 'focus_session_complete', 'quiz_attempt', 'resource_view')) default 'page_view',
  page_route text not null,
  user_id uuid references auth.users(id) on delete set null,
  session_id text not null,
  device_category text not null check (device_category in ('desktop', 'tablet', 'mobile', 'unknown')) default 'unknown',
  browser_family text not null default 'Other',
  os_family text not null default 'Other',
  created_at timestamptz not null default now()
);

-- Indexes for optimal lookup performance
create index if not exists idx_custom_audio_user on public.custom_audio_entries(user_id);
create index if not exists idx_vip_entitlements_user_status on public.vip_entitlements(user_id, status, expires_at);
create index if not exists idx_audio_catalog_published on public.audio_catalog(is_published, sort_order);
create index if not exists idx_user_presence_last_seen on public.user_presence(last_seen_at desc);
create index if not exists idx_analytics_events_created on public.analytics_events(created_at desc);
create index if not exists idx_analytics_events_session on public.analytics_events(session_id);

-- Enable Row-Level Security
alter table public.custom_audio_entries enable row level security;
alter table public.vip_entitlements enable row level security;
alter table public.audio_catalog enable row level security;
alter table public.user_presence enable row level security;
alter table public.analytics_events enable row level security;

-- -----------------------------------------------------------------------------
-- RLS Policies: custom_audio_entries
-- Users can only view, create, edit, and delete their own custom entries.
-- Admins have administrative visibility.
-- -----------------------------------------------------------------------------
create policy "Users can view own custom audio entries"
  on public.custom_audio_entries for select
  using (
    (auth.uid() is not null and auth.uid() = user_id)
    or public.is_admin()
  );

create policy "Users can insert own custom audio entries"
  on public.custom_audio_entries for insert
  with check (
    auth.uid() is not null and auth.uid() = user_id
  );

create policy "Users can update own custom audio entries"
  on public.custom_audio_entries for update
  using (
    (auth.uid() is not null and auth.uid() = user_id)
    or public.is_admin()
  );

create policy "Users can delete own custom audio entries"
  on public.custom_audio_entries for delete
  using (
    (auth.uid() is not null and auth.uid() = user_id)
    or public.is_admin()
  );

-- -----------------------------------------------------------------------------
-- RLS Policies: vip_entitlements
-- Users can view their own VIP status. Admins can view and manage all grants.
-- VIP status DOES NOT confer admin privileges.
-- -----------------------------------------------------------------------------
create policy "Users can view own vip entitlements"
  on public.vip_entitlements for select
  using (
    (auth.uid() is not null and auth.uid() = user_id)
    or public.is_admin()
  );

create policy "Admins can manage vip entitlements"
  on public.vip_entitlements for all
  using (public.is_admin())
  with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- RLS Policies: audio_catalog
-- Published catalog entries are readable by everyone. Admins can manage all.
-- -----------------------------------------------------------------------------
create policy "Anyone can view published audio catalog"
  on public.audio_catalog for select
  using (
    is_published = true or public.is_admin()
  );

create policy "Admins can manage audio catalog"
  on public.audio_catalog for all
  using (public.is_admin())
  with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- RLS Policies: user_presence
-- Admins can view live presence. Users can upsert and remove their own presence.
-- -----------------------------------------------------------------------------
create policy "Admins can view all user presence"
  on public.user_presence for select
  using (public.is_admin());

create policy "Users can manage own presence"
  on public.user_presence for all
  using (auth.uid() is not null and auth.uid() = user_id)
  with check (auth.uid() is not null and auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- RLS Policies: analytics_events
-- Admins can view analytics. Any user/visitor can insert telemetry events.
-- -----------------------------------------------------------------------------
create policy "Admins can view analytics events"
  on public.analytics_events for select
  using (public.is_admin());

create policy "Anyone can insert analytics events"
  on public.analytics_events for insert
  with check (true);
