-- ==============================================================================
-- VALIDILY-IGL4 — SUPABASE DATA API GRANTS HARDENING
-- Compliance with Supabase October 30 Data API Breaking Change:
-- Explicit table grants and default privileges for anon, authenticated, and service_role.
-- ==============================================================================

-- 1. EXPLICIT GRANTS FOR ALL VALIDILY-IGL4 EXISTING PUBLIC TABLES
DO $$
DECLARE
  tbl text;
  tbls text[] := ARRAY[
    'profiles',
    'semesters',
    'subjects',
    'resource_categories',
    'resources',
    'resource_shares',
    'bookmarks',
    'revision_progress',
    'notes',
    'quizzes',
    'quiz_questions',
    'quiz_options',
    'quiz_attempts',
    'quiz_attempt_answers',
    'subject_folders',
    'notifications',
    'focus_sessions',
    'forest_entries',
    'forest_preferences',
    'forest_cheers',
    'custom_audio_entries',
    'vip_entitlements',
    'audio_catalog',
    'user_presence',
    'analytics_events',
    'user_daily_focus',
    'user_study_goals',
    'resource_votes',
    'academic_tasks',
    'calendar_timeblocks',
    'academic_goals'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      -- Anon permissions: read access (gated by RLS)
      EXECUTE format('GRANT SELECT ON TABLE public.%I TO anon;', tbl);
      
      -- Authenticated permissions: full CRUD access (gated by RLS)
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO authenticated;', tbl);
      
      -- Service role permissions: full administrative bypass
      EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role;', tbl);
    END IF;
  END LOOP;
END $$;

-- 2. SEQUENCES PERMISSIONS
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 3. ROUTINES / FUNCTIONS EXECUTE PRIVILEGES
GRANT EXECUTE ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- 4. ALTER DEFAULT PRIVILEGES FOR ALL FUTURE MIGRATIONS & SCHEMA RESETS
-- Ensures any table, sequence, or function created in schema public automatically
-- receives the correct Data API permissions, safeguarding against future breakage.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON ROUTINES TO anon, authenticated, service_role;
