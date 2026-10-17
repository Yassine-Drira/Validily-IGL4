-- ==============================================================================
-- VALIDILY-IGL4 — PRODUCTION PERSISTENCE CONSOLIDATION BUNDLE
-- Run this in Supabase Dashboard > SQL Editor to enable all database persistence.
-- Fully idempotent (safe to run multiple times without deleting existing data).
-- ==============================================================================

-- 1. FOCUS SESSIONS
CREATE TABLE IF NOT EXISTS public.focus_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    session_label TEXT,
    target_duration_seconds INTEGER NOT NULL CHECK (target_duration_seconds >= 300 AND target_duration_seconds <= 10800),
    actual_duration_seconds INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('in_progress', 'paused', 'completed', 'interrupted')),
    tree_species TEXT NOT NULL DEFAULT 'cedar' CHECK (tree_species IN ('cedar', 'oak', 'pine', 'sakura', 'willow', 'jacaranda')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    paused_at TIMESTAMPTZ,
    total_paused_seconds INTEGER NOT NULL DEFAULT 0,
    pause_count INTEGER NOT NULL DEFAULT 0,
    completed_at TIMESTAMPTZ,
    interrupted_at TIMESTAMPTZ,
    interruption_reason TEXT,
    idempotency_key TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_status ON public.focus_sessions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_completed ON public.focus_sessions(user_id, completed_at DESC);

-- 2. FOREST ENTRIES (BOSQUET / PLANTED TREES)
CREATE TABLE IF NOT EXISTS public.forest_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.focus_sessions(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    tree_status TEXT NOT NULL CHECK (tree_status IN ('healthy', 'leafless')),
    tree_species TEXT NOT NULL CHECK (tree_species IN ('cedar', 'oak', 'pine', 'sakura', 'willow', 'jacaranda')),
    growth_stage INTEGER NOT NULL DEFAULT 4 CHECK (growth_stage BETWEEN 1 AND 4),
    position_x NUMERIC NOT NULL DEFAULT 0,
    position_y NUMERIC NOT NULL DEFAULT 0,
    scale_factor NUMERIC NOT NULL DEFAULT 1.0,
    earned_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_forest_entries_user_earned ON public.forest_entries(user_id, earned_at DESC);
CREATE INDEX IF NOT EXISTS idx_forest_entries_status ON public.forest_entries(user_id, tree_status);

-- 3. FOREST PREFERENCES & CHEERS
CREATE TABLE IF NOT EXISTS public.forest_preferences (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    visibility TEXT NOT NULL DEFAULT 'members' CHECK (visibility IN ('private', 'members', 'public')),
    default_tree_species TEXT NOT NULL DEFAULT 'cedar' CHECK (default_tree_species IN ('cedar', 'oak', 'pine', 'sakura', 'willow', 'jacaranda')),
    allow_classmate_cheers BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.forest_cheers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    cheer_type TEXT NOT NULL CHECK (cheer_type IN ('water', 'clap', 'fire', 'muscle')),
    message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_forest_cheers_recipient ON public.forest_cheers(recipient_id, created_at DESC);

-- 4. USER DAILY FOCUS METRICS & GOALS (INSIGHTS PERSISTENCE)
CREATE TABLE IF NOT EXISTS public.user_daily_focus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    focus_date DATE NOT NULL,
    total_seconds INTEGER NOT NULL DEFAULT 0,
    completed_pomodoros INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_user_daily_focus UNIQUE (user_id, focus_date)
);
CREATE INDEX IF NOT EXISTS idx_user_daily_focus_user_date ON public.user_daily_focus(user_id, focus_date DESC);

CREATE TABLE IF NOT EXISTS public.user_study_goals (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    daily_focus_minutes INTEGER NOT NULL DEFAULT 45,
    weekly_quizzes INTEGER NOT NULL DEFAULT 5,
    target_score INTEGER NOT NULL DEFAULT 80,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. RESOURCE VOTING ECOSYSTEM
CREATE TABLE IF NOT EXISTS public.resource_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    vote_value SMALLINT NOT NULL CHECK (vote_value IN (-1, 1)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_user_resource_vote UNIQUE (user_id, resource_id)
);
CREATE INDEX IF NOT EXISTS idx_resource_votes_resource ON public.resource_votes(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_votes_user ON public.resource_votes(user_id);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resources' AND column_name = 'usefulness_score') THEN
        ALTER TABLE public.resources ADD COLUMN usefulness_score INTEGER NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resources' AND column_name = 'upvotes_count') THEN
        ALTER TABLE public.resources ADD COLUMN upvotes_count INTEGER NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resources' AND column_name = 'downvotes_count') THEN
        ALTER TABLE public.resources ADD COLUMN downvotes_count INTEGER NOT NULL DEFAULT 0;
    END IF;
END $$;

-- 6. CUSTOM AUDIO & AUDIO CATALOG
CREATE TABLE IF NOT EXISTS public.custom_audio_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (char_length(title) >= 1 AND char_length(title) <= 80),
    youtube_url TEXT NOT NULL,
    youtube_video_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_custom_audio_user ON public.custom_audio_entries(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.audio_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL CHECK (char_length(title) >= 2 AND char_length(title) <= 90),
    description TEXT,
    category TEXT NOT NULL CHECK (category IN ('lofi', 'ambient', 'classical', 'nature', 'focus', 'electronic', 'binaural')),
    source_type TEXT NOT NULL CHECK (source_type IN ('youtube', 'synthetic', 'external_stream')),
    source_key TEXT NOT NULL,
    youtube_video_id TEXT,
    is_published BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. VIP & PRESENCE
CREATE TABLE IF NOT EXISTS public.vip_entitlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    granted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    tier TEXT NOT NULL DEFAULT 'vip' CHECK (tier IN ('vip', 'lifetime')),
    reason TEXT,
    starts_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.user_presence (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    active_path TEXT,
    focus_mode_active BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forest_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forest_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forest_cheers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_daily_focus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_study_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_audio_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audio_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vip_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

-- focus_sessions
DROP POLICY IF EXISTS "Users can view own focus sessions" ON public.focus_sessions;
CREATE POLICY "Users can view own focus sessions" ON public.focus_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own focus sessions" ON public.focus_sessions;
CREATE POLICY "Users can manage own focus sessions" ON public.focus_sessions FOR ALL TO authenticated USING (auth.uid() = user_id);

-- forest_entries
DROP POLICY IF EXISTS "Public can view member trees" ON public.forest_entries;
CREATE POLICY "Public can view member trees" ON public.forest_entries FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users manage own trees" ON public.forest_entries;
CREATE POLICY "Users manage own trees" ON public.forest_entries FOR ALL TO authenticated USING (auth.uid() = user_id);

-- user_daily_focus
DROP POLICY IF EXISTS "Users view own daily focus" ON public.user_daily_focus;
CREATE POLICY "Users view own daily focus" ON public.user_daily_focus FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own daily focus" ON public.user_daily_focus;
CREATE POLICY "Users manage own daily focus" ON public.user_daily_focus FOR ALL TO authenticated USING (auth.uid() = user_id);

-- user_study_goals
DROP POLICY IF EXISTS "Users view own study goals" ON public.user_study_goals;
CREATE POLICY "Users view own study goals" ON public.user_study_goals FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own study goals" ON public.user_study_goals;
CREATE POLICY "Users manage own study goals" ON public.user_study_goals FOR ALL TO authenticated USING (auth.uid() = user_id);

-- resource_votes
DROP POLICY IF EXISTS "Anyone can view resource votes" ON public.resource_votes;
CREATE POLICY "Anyone can view resource votes" ON public.resource_votes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users manage own resource votes" ON public.resource_votes;
CREATE POLICY "Users manage own resource votes" ON public.resource_votes FOR ALL TO authenticated USING (auth.uid() = user_id);

-- audio_catalog
DROP POLICY IF EXISTS "Anyone can view published audio" ON public.audio_catalog;
CREATE POLICY "Anyone can view published audio" ON public.audio_catalog FOR SELECT USING (is_published = true);

-- custom_audio
DROP POLICY IF EXISTS "Users manage own custom audio" ON public.custom_audio_entries;
CREATE POLICY "Users manage own custom audio" ON public.custom_audio_entries FOR ALL TO authenticated USING (auth.uid() = user_id);
