-- Migration: 20261024010000_coach_conversations.sql
-- Description: Persistent AI Coach conversation history, messages, and indexes with strict RLS

CREATE TABLE IF NOT EXISTS public.coach_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Nouvelle discussion',
    title_source TEXT NOT NULL DEFAULT 'auto' CHECK (title_source IN ('auto', 'user')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.coach_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.coach_conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    structured_payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Compound indexes for high-speed listing and cursor pagination
CREATE INDEX IF NOT EXISTS idx_coach_conversations_user_updated
    ON public.coach_conversations (user_id, updated_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_coach_messages_convo_created
    ON public.coach_messages (conversation_id, created_at ASC, id ASC);

CREATE INDEX IF NOT EXISTS idx_coach_messages_user_created
    ON public.coach_messages (user_id, created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.coach_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_messages ENABLE ROW LEVEL SECURITY;

-- Conversations RLS policies
DROP POLICY IF EXISTS "Users can read own coach conversations" ON public.coach_conversations;
CREATE POLICY "Users can read own coach conversations"
    ON public.coach_conversations FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own coach conversations" ON public.coach_conversations;
CREATE POLICY "Users can insert own coach conversations"
    ON public.coach_conversations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own coach conversations" ON public.coach_conversations;
CREATE POLICY "Users can update own coach conversations"
    ON public.coach_conversations FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own coach conversations" ON public.coach_conversations;
CREATE POLICY "Users can delete own coach conversations"
    ON public.coach_conversations FOR DELETE
    USING (auth.uid() = user_id);

-- Messages RLS policies
DROP POLICY IF EXISTS "Users can read own coach messages" ON public.coach_messages;
CREATE POLICY "Users can read own coach messages"
    ON public.coach_messages FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own coach messages" ON public.coach_messages;
CREATE POLICY "Users can insert own coach messages"
    ON public.coach_messages FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own coach messages" ON public.coach_messages;
CREATE POLICY "Users can update own coach messages"
    ON public.coach_messages FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own coach messages" ON public.coach_messages;
CREATE POLICY "Users can delete own coach messages"
    ON public.coach_messages FOR DELETE
    USING (auth.uid() = user_id);
