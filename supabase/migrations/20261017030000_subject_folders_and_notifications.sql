-- ==============================================================================
-- VALIDILY-IGL4 — SCHEMA MIGRATION: Subject Folders & Persistent Notifications
-- Migration: 20261017030000_subject_folders_and_notifications.sql
-- Status: LOCAL MIGRATION ONLY — Do not execute on production database
-- Purpose: Provide durable, cross-serverless persistence for curriculum folders
--          and user notification feeds, resolving ARCH-CRIT-004.
-- Repeatability: Fully idempotent (CREATE TABLE IF NOT EXISTS, DROP POLICY IF EXISTS,
--                CREATE POLICY, CREATE INDEX IF NOT EXISTS).
-- ==============================================================================

-- 1. Subject Folders Table
CREATE TABLE IF NOT EXISTS public.subject_folders (
    id TEXT PRIMARY KEY,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (char_length(name) >= 1 AND char_length(name) <= 100),
    parent_id TEXT REFERENCES public.subject_folders(id) ON DELETE CASCADE,
    color TEXT NOT NULL DEFAULT 'blue',
    icon TEXT NOT NULL DEFAULT 'folder',
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for high-performance folder tree lookup by subject
CREATE INDEX IF NOT EXISTS idx_subject_folders_subject_id 
    ON public.subject_folders(subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_folders_parent_id 
    ON public.subject_folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_subject_folders_owner_id 
    ON public.subject_folders(owner_id);

-- RLS: Enable security on subject_folders
ALTER TABLE public.subject_folders ENABLE ROW LEVEL SECURITY;

-- Idempotent Policy Refresh: DROP IF EXISTS then CREATE to prevent outdated definitions
DROP POLICY IF EXISTS "Subject folders are viewable by all authenticated users" ON public.subject_folders;
CREATE POLICY "Subject folders are viewable by all authenticated users"
    ON public.subject_folders FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Subject folders are viewable by public/guests" ON public.subject_folders;
CREATE POLICY "Subject folders are viewable by public/guests"
    ON public.subject_folders FOR SELECT
    TO anon
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can create folders in subjects" ON public.subject_folders;
CREATE POLICY "Authenticated users can create folders in subjects"
    ON public.subject_folders FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Folder owners and admins can update their folders" ON public.subject_folders;
CREATE POLICY "Folder owners and admins can update their folders"
    ON public.subject_folders FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = owner_id 
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Folder owners and admins can delete their folders" ON public.subject_folders;
CREATE POLICY "Folder owners and admins can delete their folders"
    ON public.subject_folders FOR DELETE
    TO authenticated
    USING (
        auth.uid() = owner_id 
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- 2. System Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id TEXT PRIMARY KEY,
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    sender_id TEXT,
    sender_name TEXT,
    sender_avatar_url TEXT,
    type TEXT NOT NULL CHECK (type IN ('cheer', 'system', 'study', 'achievement', 'announcement', 'role_assignment')),
    cheer_type TEXT CHECK (cheer_type IN ('water', 'clap', 'fire', 'muscle')),
    title TEXT NOT NULL CHECK (char_length(title) >= 1),
    content TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    link TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for high-performance recipient notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id_created_at 
    ON public.notifications(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_is_read 
    ON public.notifications(recipient_id, is_read);

-- RLS: Enable security on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Idempotent Policy Refresh: DROP IF EXISTS then CREATE
DROP POLICY IF EXISTS "Users can only view their own notifications" ON public.notifications;
CREATE POLICY "Users can only view their own notifications"
    ON public.notifications FOR SELECT
    TO authenticated
    USING (auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Users can update read status of their own notifications" ON public.notifications;
CREATE POLICY "Users can update read status of their own notifications"
    ON public.notifications FOR UPDATE
    TO authenticated
    USING (auth.uid() = recipient_id)
    WITH CHECK (auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
CREATE POLICY "Users can delete their own notifications"
    ON public.notifications FOR DELETE
    TO authenticated
    USING (auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Authenticated users can insert notifications for recipients" ON public.notifications;
CREATE POLICY "Authenticated users can insert notifications for recipients"
    ON public.notifications FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);
