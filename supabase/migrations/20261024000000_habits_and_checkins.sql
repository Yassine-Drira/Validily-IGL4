-- ==============================================================================
-- VALIDILY-IGL4 — HABIT TRACKER & PERSONAL CONSISTENCY SYSTEM
-- Production Schema for Habits, Check-ins, and Behavioral Diagnostics
-- Idempotent, RLS-enforced, Per-user isolated
-- ==============================================================================

-- 1. ENUMS / TYPES (IDEMPOTENT CREATION)
DO $$ BEGIN
  CREATE TYPE habit_type_enum AS ENUM ('binary', 'quantitative');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE habit_frequency_enum AS ENUM ('daily', 'specific_days', 'weekly_count');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE habit_status_enum AS ENUM ('active', 'paused', 'archived');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE habit_checkin_status_enum AS ENUM ('completed', 'partial', 'skipped');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. HABITS TABLE
CREATE TABLE IF NOT EXISTS public.habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES public.academic_goals(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(50) NOT NULL DEFAULT 'Sparkles',
  category VARCHAR(50) NOT NULL DEFAULT 'study',
  habit_type habit_type_enum NOT NULL DEFAULT 'binary',
  target_value NUMERIC NOT NULL DEFAULT 1 CHECK (target_value > 0),
  unit VARCHAR(30) DEFAULT 'fois',
  frequency_type habit_frequency_enum NOT NULL DEFAULT 'daily',
  scheduled_days JSONB NOT NULL DEFAULT '[1,2,3,4,5,6,0]'::jsonb,
  target_days_per_week INTEGER DEFAULT 7 CHECK (target_days_per_week >= 1 AND target_days_per_week <= 7),
  preferred_time VARCHAR(20) NOT NULL DEFAULT 'morning' CHECK (preferred_time IN ('morning', 'afternoon', 'evening', 'anytime')),
  reminder_time TIME,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status habit_status_enum NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  archived_at TIMESTAMPTZ
);

-- Performance Indexes for Habits
CREATE INDEX IF NOT EXISTS idx_habits_user_status ON public.habits(user_id, status);
CREATE INDEX IF NOT EXISTS idx_habits_user_goal ON public.habits(user_id, goal_id);
CREATE INDEX IF NOT EXISTS idx_habits_user_created ON public.habits(user_id, created_at DESC);

-- 3. HABIT CHECK-INS TABLE
CREATE TABLE IF NOT EXISTS public.habit_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  value NUMERIC NOT NULL DEFAULT 1 CHECK (value >= 0),
  status habit_checkin_status_enum NOT NULL DEFAULT 'completed',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_habit_checkin_per_day UNIQUE (habit_id, date)
);

-- Performance Indexes for Check-ins
CREATE INDEX IF NOT EXISTS idx_habit_checkins_user_date ON public.habit_checkins(user_id, date);
CREATE INDEX IF NOT EXISTS idx_habit_checkins_habit_date ON public.habit_checkins(habit_id, date);
CREATE INDEX IF NOT EXISTS idx_habit_checkins_status ON public.habit_checkins(habit_id, status);

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_checkins ENABLE ROW LEVEL SECURITY;

-- Habits RLS
DROP POLICY IF EXISTS "Users can manage their own habits" ON public.habits;
CREATE POLICY "Users can manage their own habits"
  ON public.habits
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Check-ins RLS
DROP POLICY IF EXISTS "Users can manage their own habit check-ins" ON public.habit_checkins;
CREATE POLICY "Users can manage their own habit check-ins"
  ON public.habit_checkins
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
