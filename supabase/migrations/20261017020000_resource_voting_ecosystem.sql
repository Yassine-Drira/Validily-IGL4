-- ==============================================================================
-- VALIDILY-IGL4 — RESOURCE ECOSYSTEM: VOTING & CONTRIBUTION SCHEMA
-- Normalized Reddit-Style Usefulness Voting & Resource Metadata Extensions
-- Fully Idempotent & Production-Ready
-- ==============================================================================

-- 1. Resource Votes Table (Normalized (user_id, resource_id) vote state)
CREATE TABLE IF NOT EXISTS public.resource_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    vote_value SMALLINT NOT NULL CHECK (vote_value IN (-1, 1)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_user_resource_vote UNIQUE (user_id, resource_id)
);

-- 2. Indexes for High-Performance Score Aggregation & User Lookups
CREATE INDEX IF NOT EXISTS idx_resource_votes_resource ON public.resource_votes(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_votes_user ON public.resource_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_resource_votes_composite ON public.resource_votes(resource_id, vote_value);

-- 3. Extend Resources Table with Cached Fast-Lookup Counters (Optional Denormalization)
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
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resources' AND column_name = 'resource_type') THEN
        ALTER TABLE public.resources ADD COLUMN resource_type TEXT NOT NULL DEFAULT 'document';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_resources_usefulness ON public.resources(usefulness_score DESC);
CREATE INDEX IF NOT EXISTS idx_resources_chapter ON public.resources(chapter);

-- 4. Row Level Security Policies for Resource Votes
ALTER TABLE public.resource_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Resource votes are viewable by everyone who can view the resource" ON public.resource_votes;
CREATE POLICY "Resource votes are viewable by everyone who can view the resource"
ON public.resource_votes FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.resources r
        WHERE r.id = resource_votes.resource_id
        AND (r.visibility = 'public' OR r.owner_id = auth.uid())
    )
);

DROP POLICY IF EXISTS "Authenticated users can insert/update their own vote" ON public.resource_votes;
CREATE POLICY "Authenticated users can insert/update their own vote"
ON public.resource_votes FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can update their own vote" ON public.resource_votes;
CREATE POLICY "Authenticated users can update their own vote"
ON public.resource_votes FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can delete their own vote" ON public.resource_votes;
CREATE POLICY "Authenticated users can delete their own vote"
ON public.resource_votes FOR DELETE
USING (auth.uid() = user_id);
