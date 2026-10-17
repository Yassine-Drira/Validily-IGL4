-- Migration: Update academic years for Semesters 1 and 2 to 2026-2027
UPDATE public.semesters
SET academic_year = '2026-2027', updated_at = NOW()
WHERE id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222'
);

-- Update default constraint for future semester insertions
ALTER TABLE public.semesters
  ALTER COLUMN academic_year SET DEFAULT '2026-2027';
