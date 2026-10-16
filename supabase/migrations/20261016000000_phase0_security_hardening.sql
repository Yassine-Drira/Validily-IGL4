-- ==============================================================================
-- VALIDILY-IGL4: Phase 0 Security Hardening Migration
-- Migration: 20261016000000_phase0_security_hardening.sql
-- Description:
--   1. Create resource_shares table for explicit peer sharing with granular roles.
--   2. Enforce Row-Level Security on resource_shares.
--   3. Tighten resources RLS to enforce private, explicitly shared, and public states.
--   4. Close quiz questions and options unauthenticated enumeration vulnerability.
-- ==============================================================================

-- 1. Create Explicit Resource Sharing Table
create table if not exists public.resource_shares (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  grantor_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  permission text not null check (permission in ('viewer', 'editor')) default 'viewer',
  created_at timestamptz not null default now(),
  unique (resource_id, recipient_id)
);

-- Indexes for ultra-fast permission lookups
create index if not exists idx_resource_shares_recipient on public.resource_shares(recipient_id);
create index if not exists idx_resource_shares_resource on public.resource_shares(resource_id);
create index if not exists idx_resource_shares_grantor on public.resource_shares(grantor_id);

-- Enable RLS on resource_shares
alter table public.resource_shares enable row level security;

-- Policies on resource_shares
create policy "Users can view shares they granted or received"
  on public.resource_shares for select
  using (
    (auth.uid() is not null and (auth.uid() = grantor_id or auth.uid() = recipient_id))
    or public.is_admin()
  );

create policy "Resource owners and admins can create shares"
  on public.resource_shares for insert
  with check (
    (auth.uid() is not null and auth.uid() = grantor_id)
    or public.is_admin()
  );

create policy "Resource owners and admins can update or revoke shares"
  on public.resource_shares for update
  using (
    (auth.uid() is not null and auth.uid() = grantor_id)
    or public.is_admin()
  );

create policy "Resource owners and admins can delete shares"
  on public.resource_shares for delete
  using (
    (auth.uid() is not null and auth.uid() = grantor_id)
    or public.is_admin()
  );

-- 2. Tighten Resources Table Visibility & Mutation Policies
drop policy if exists "Published public resources are readable by all" on public.resources;
drop policy if exists "Resources visibility policy" on public.resources;

create policy "Resources visibility policy"
  on public.resources for select
  using (
    (publication_status = 'published' and visibility = 'public') or
    (auth.uid() is not null and owner_id = auth.uid()) or
    (visibility = 'shared' and auth.uid() is not null and exists (
      select 1 from public.resource_shares rs
      where rs.resource_id = public.resources.id
      and rs.recipient_id = auth.uid()
    )) or
    public.is_admin()
  );

drop policy if exists "Users can update their own resources" on public.resources;
drop policy if exists "Users can update own or editor-shared resources" on public.resources;

create policy "Users can update own or editor-shared resources"
  on public.resources for update
  using (
    (auth.uid() is not null and auth.uid() = owner_id) or
    (visibility = 'shared' and auth.uid() is not null and exists (
      select 1 from public.resource_shares rs
      where rs.resource_id = public.resources.id
      and rs.recipient_id = auth.uid()
      and rs.permission = 'editor'
    )) or
    public.is_admin()
  );

drop policy if exists "Users can delete their own resources" on public.resources;
drop policy if exists "Only owners and admins can delete resources" on public.resources;

create policy "Only owners and admins can delete resources"
  on public.resources for delete
  using (
    (auth.uid() is not null and auth.uid() = owner_id) or
    public.is_admin()
  );

-- 3. Close Quiz Questions and Options Enumeration Hole
drop policy if exists "Questions viewable with quiz" on public.quiz_questions;
drop policy if exists "Questions viewable with authorized quiz" on public.quiz_questions;

create policy "Questions viewable with authorized quiz"
  on public.quiz_questions for select
  using (
    exists (
      select 1 from public.quizzes q
      where q.id = quiz_questions.quiz_id
      and (
        q.publication_status = 'published'
        or (auth.uid() is not null and q.owner_id = auth.uid())
        or public.is_admin()
      )
    )
  );

drop policy if exists "Options viewable with question" on public.quiz_options;
drop policy if exists "Options viewable with authorized question" on public.quiz_options;

create policy "Options viewable with authorized question"
  on public.quiz_options for select
  using (
    exists (
      select 1 from public.quiz_questions qq
      join public.quizzes q on q.id = qq.quiz_id
      where qq.id = quiz_options.question_id
      and (
        q.publication_status = 'published'
        or (auth.uid() is not null and q.owner_id = auth.uid())
        or public.is_admin()
      )
    )
  );
