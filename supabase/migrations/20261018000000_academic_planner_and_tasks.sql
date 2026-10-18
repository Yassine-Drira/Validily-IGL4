-- ==============================================================================
-- VALIDILY-IGL4 — ACADEMIC PLANNER & TASK MANAGEMENT SCHEMA
-- Safe Integration of Personal Calendar & To-Do List
-- Idempotent, RLS-enforced, Per-user isolated
-- ==============================================================================

-- 1. ENUMS / TYPES (IDEMPOTENT CREATION)
DO $$ BEGIN
  CREATE TYPE academic_task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE academic_task_category AS ENUM ('td_tp', 'project', 'exam', 'revision', 'reading', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE academic_recurrence_pattern AS ENUM ('daily', 'weekly', 'biweekly', 'monthly');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. ACADEMIC TASKS (TO-DO LIST)
CREATE TABLE IF NOT EXISTS public.academic_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category academic_task_category NOT NULL DEFAULT 'other',
  priority academic_task_priority NOT NULL DEFAULT 'medium',
  due_date DATE NOT NULL,
  due_time TIME,
  estimated_minutes INTEGER NOT NULL DEFAULT 30 CHECK (estimated_minutes >= 0 AND estimated_minutes <= 1440),
  actual_minutes INTEGER NOT NULL DEFAULT 0 CHECK (actual_minutes >= 0),
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  subtasks JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
  recurrence_pattern academic_recurrence_pattern,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_academic_tasks_user_date ON public.academic_tasks(user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_academic_tasks_subject ON public.academic_tasks(subject_id);
CREATE INDEX IF NOT EXISTS idx_academic_tasks_completed ON public.academic_tasks(user_id, is_completed);

-- 3. CALENDAR TIMEBLOCKS (INTERACTIVE DAY/WEEK/MONTH SCHEDULE)
CREATE TABLE IF NOT EXISTS public.calendar_timeblocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.academic_tasks(id) ON DELETE SET NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  block_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes >= 5 AND duration_minutes <= 1440),
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_calendar_timeblocks_user_date ON public.calendar_timeblocks(user_id, block_date);
CREATE INDEX IF NOT EXISTS idx_calendar_timeblocks_task ON public.calendar_timeblocks(task_id);
CREATE INDEX IF NOT EXISTS idx_calendar_timeblocks_subject ON public.calendar_timeblocks(subject_id);

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.academic_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_timeblocks ENABLE ROW LEVEL SECURITY;

-- Academic Tasks RLS
DROP POLICY IF EXISTS "Users can manage their own tasks" ON public.academic_tasks;
CREATE POLICY "Users can manage their own tasks"
  ON public.academic_tasks
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Calendar Timeblocks RLS
DROP POLICY IF EXISTS "Users can manage their own calendar blocks" ON public.calendar_timeblocks;
CREATE POLICY "Users can manage their own calendar blocks"
  ON public.calendar_timeblocks
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. ACADEMIC GOALS (DAILY, WEEKLY, MONTHLY TARGETS)
CREATE TABLE IF NOT EXISTS public.academic_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  description TEXT,
  period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'custom')),
  period_key VARCHAR(50) NOT NULL,
  metric_type VARCHAR(30) NOT NULL CHECK (metric_type IN ('study_minutes', 'tasks_completed', 'study_sessions', 'exercises', 'chapters', 'custom')),
  target_value INTEGER NOT NULL CHECK (target_value > 0),
  unit VARCHAR(30) DEFAULT 'minutes',
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  manual_progress INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'archived')),
  deadline DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_academic_goals_user_period ON public.academic_goals(user_id, period_type, period_key);
CREATE INDEX IF NOT EXISTS idx_academic_goals_subject ON public.academic_goals(subject_id);

-- Academic Goals RLS
ALTER TABLE public.academic_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own academic goals" ON public.academic_goals;
CREATE POLICY "Users can manage their own academic goals"
  ON public.academic_goals
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

