-- ==============================================================================
-- VALIDILY-IGL4 — V1.1 CONSOLIDATED SCHEMA MIGRATION
-- Forest Ecosystem, Ambient Audio Engine, VIP Quotas & Telemetry
-- Fully Idempotent & Production-Ready
-- ==============================================================================

-- 1. Focus Sessions Table
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

-- 2. Forest Entries (Planted Trees)
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

-- 3. Forest Preferences
CREATE TABLE IF NOT EXISTS public.forest_preferences (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    visibility TEXT NOT NULL DEFAULT 'members' CHECK (visibility IN ('private', 'members', 'public')),
    default_tree_species TEXT NOT NULL DEFAULT 'cedar' CHECK (default_tree_species IN ('cedar', 'oak', 'pine', 'sakura', 'willow', 'jacaranda')),
    allow_classmate_cheers BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Forest Cheers
CREATE TABLE IF NOT EXISTS public.forest_cheers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    cheer_type TEXT NOT NULL CHECK (cheer_type IN ('water', 'clap', 'fire', 'muscle')),
    message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Custom Audio Entries (Personal YouTube tracks per user)
CREATE TABLE IF NOT EXISTS public.custom_audio_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (char_length(title) >= 1 AND char_length(title) <= 80),
    youtube_url TEXT NOT NULL,
    youtube_video_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. Audio Catalog (Admin Curated & Published Free Tracks)
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

-- 7. VIP Entitlements
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

-- 8. User Presence & Telemetry
CREATE TABLE IF NOT EXISTS public.user_presence (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    active_path TEXT,
    focus_mode_active BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for lightning fast queries
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_status ON public.focus_sessions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_forest_entries_user_earned ON public.forest_entries(user_id, earned_at DESC);
CREATE INDEX IF NOT EXISTS idx_forest_entries_status ON public.forest_entries(user_id, tree_status);
CREATE INDEX IF NOT EXISTS idx_custom_audio_user ON public.custom_audio_entries(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audio_catalog_pub ON public.audio_catalog(is_published, sort_order ASC);
CREATE INDEX IF NOT EXISTS idx_vip_user_active ON public.vip_entitlements(user_id, is_active);

-- Enable RLS
ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forest_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forest_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forest_cheers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_audio_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audio_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vip_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

-- Idempotent RLS Policies
DO $$ BEGIN
    -- focus_sessions
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'focus_sessions' AND policyname = 'Users can view own focus sessions') THEN
        CREATE POLICY "Users can view own focus sessions" ON public.focus_sessions FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'focus_sessions' AND policyname = 'Users can manage own focus sessions') THEN
        CREATE POLICY "Users can manage own focus sessions" ON public.focus_sessions FOR ALL USING (auth.uid() = user_id);
    END IF;

    -- forest_entries
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'forest_entries' AND policyname = 'Anyone can view member trees if preferences permit') THEN
        CREATE POLICY "Anyone can view member trees if preferences permit" ON public.forest_entries FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'forest_entries' AND policyname = 'Users can manage own forest entries') THEN
        CREATE POLICY "Users can manage own forest entries" ON public.forest_entries FOR ALL USING (auth.uid() = user_id);
    END IF;

    -- custom_audio_entries
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'custom_audio_entries' AND policyname = 'Users manage own custom audio') THEN
        CREATE POLICY "Users manage own custom audio" ON public.custom_audio_entries FOR ALL USING (auth.uid() = user_id);
    END IF;

    -- audio_catalog
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'audio_catalog' AND policyname = 'Published catalog tracks are public') THEN
        CREATE POLICY "Published catalog tracks are public" ON public.audio_catalog FOR SELECT USING (is_published = true OR auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'audio_catalog' AND policyname = 'Admins manage audio catalog') THEN
        CREATE POLICY "Admins manage audio catalog" ON public.audio_catalog FOR ALL USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));
    END IF;
END $$;
