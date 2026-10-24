-- Migration: 20261024020000_ai_usage_and_monitoring.sql
-- Description: AI Usage Telemetry, API Consumption Logs, and Centralized Quota Audit for Admin Monitoring

CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL DEFAULT 'unknown',
    model TEXT NOT NULL DEFAULT 'unknown',
    action_type TEXT NOT NULL DEFAULT 'chat' CHECK (action_type IN ('chat', 'plan', 'drill', 'rag_quiz')),
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    latency_ms INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'error', 'quota_exceeded', 'rate_limited')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Performance Indexes for Admin Analytics and Real-time Auditing
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_created ON public.ai_usage_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created ON public.ai_usage_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_provider ON public.ai_usage_logs (provider, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_action ON public.ai_usage_logs (action_type, status);

-- Enable Row Level Security
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Students can read their own consumption logs
DROP POLICY IF EXISTS "Users can read own AI usage logs" ON public.ai_usage_logs;
CREATE POLICY "Users can read own AI usage logs"
    ON public.ai_usage_logs FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- System and Service role can insert logs
DROP POLICY IF EXISTS "Service and users can insert AI usage logs" ON public.ai_usage_logs;
CREATE POLICY "Service and users can insert AI usage logs"
    ON public.ai_usage_logs FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Admins can read all logs across the platform
DROP POLICY IF EXISTS "Admins can view all AI usage logs" ON public.ai_usage_logs;
CREATE POLICY "Admins can view all AI usage logs"
    ON public.ai_usage_logs FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );
