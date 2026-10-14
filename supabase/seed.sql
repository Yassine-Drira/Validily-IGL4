-- 1. Insert Semesters
insert into public.semesters (id, name, academic_year, sort_order, is_active)
values
  ('11111111-1111-1111-1111-111111111111', 'Semester 1', '2024-2025', 1, true),
  ('22222222-2222-2222-2222-222222222222', 'Semester 2', '2024-2025', 2, true)
on conflict (id) do nothing;

-- 2. Insert the 9 Resource Categories
insert into public.resource_categories (id, name, slug, description, sort_order, is_active)
values
  ('a1111111-1111-1111-1111-111111111111', 'Courses and lecture notes', 'courses-notes', 'Official lecture slides, comprehensive syllabus notes, and instructor handouts.', 1, true),
  ('a2222222-2222-2222-2222-222222222222', 'TP / Practical Work', 'tp-practical', 'Lab sessions, hands-on workshop guidelines, starter code, and practical exercises.', 2, true),
  ('a3333333-3333-3333-3333-333333333333', 'DS / Continuous Assessment', 'ds-assessments', 'Midterm examinations, graded assignments, and in-semester evaluations.', 3, true),
  ('a4444444-4444-4444-4444-444444444444', 'Exams', 'exams', 'Past final exam papers across principal and resit examination sessions.', 4, true),
  ('a5555555-5555-5555-5555-555555555555', 'Cheat Sheets', 'cheat-sheets', 'High-density revision summaries, formula sheets, and quick-reference guides.', 5, true),
  ('a6666666-6666-6666-6666-666666666666', 'Quizzes', 'quizzes', 'Self-assessment question sets, multiple-choice drills, and concept checks.', 6, true),
  ('a7777777-7777-7777-7777-777777777777', 'Exercises and Solutions', 'exercises-solutions', 'Directed work sheets (TD) with step-by-step corrections and explanations.', 7, true),
  ('a8888888-8888-8888-8888-888888888888', 'Summaries', 'summaries', 'Condensed chapter syntheses and high-yield key takeaways for rapid review.', 8, true),
  ('a9999999-9999-9999-9999-999999999999', 'Other Resources', 'other', 'Supplementary references, textbook extracts, and recommended toolchain guides.', 9, true)
on conflict (id) do nothing;

-- 3. Insert the 10 Initial Semester 1 Subjects
insert into public.subjects (id, semester_id, name, slug, description, icon, sort_order, is_active)
values
  ('b1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Flutter', 'flutter', 'Cross-platform mobile engineering with Dart, state management, widget trees, and native integration.', 'Smartphone', 1, true),
  ('b2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Blockchain', 'blockchain', 'Distributed ledgers, consensus mechanisms, smart contract development, and cryptographic primitives.', 'Link', 2, true),
  ('b3333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Parallel Algorithms', 'parallel-algorithms', 'Multi-core synchronization, OpenMP, MPI paradigms, Amdahl''s law, and high-performance computation.', 'Cpu', 3, true),
  ('b4444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'Artificial Intelligence', 'artificial-intelligence', 'Heuristic search, knowledge representation, probabilistic inference, and machine learning fundamentals.', 'Brain', 4, true),
  ('b5555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'Cybersecurity', 'cybersecurity', 'Network defense architectures, applied cryptography, vulnerability assessment, and threat modeling.', 'ShieldCheck', 5, true),
  ('b6666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', 'Project Management', 'project-management', 'Agile methodologies, Scrum lifecycle, estimation, risk mitigation, and software delivery engineering.', 'Kanban', 6, true),
  ('b7777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', 'Enterprise', 'enterprise', 'Corporate organizational models, financial analysis, software product economics, and technology strategy.', 'Building2', 7, true),
  ('b8888888-8888-8888-8888-888888888888', '11111111-1111-1111-1111-111111111111', 'Cloud Computing', 'cloud-computing', 'Cloud architectures, serverless runtimes, microservices, container orchestration, and storage scaling.', 'Cloud', 8, true),
  ('b9999999-9999-9999-9999-999999999999', '11111111-1111-1111-1111-111111111111', 'Combinatorial Optimization', 'combinatorial-optimization', 'Linear programming, duality theory, graph algorithms, simplex method, and NP-hard heuristics.', 'Network', 9, true),
  ('baaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Stochastic Processes', 'stochastic-processes', 'Markov chains, Poisson processes, queuing theory, transition matrices, and steady-state probabilities.', 'TrendingUp', 10, true)
on conflict (id) do nothing;

-- 4. Storage Bucket Setup (Run in Supabase SQL editor or automated storage migration)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'academic-resources',
  'academic-resources',
  false,
  52428800, -- 50 MB limit
  array['application/pdf']
)
on conflict (id) do nothing;

-- Storage RLS:
-- 1. Read access: users can read files if the resource is public/published or if user is owner
create policy "Allow read access to authorized academic files"
  on storage.objects for select
  using (
    bucket_id = 'academic-resources' and
    (
      auth.role() = 'authenticated' or
      exists (
        select 1 from public.resources
        where storage_path = storage.objects.name
        and publication_status = 'published'
        and visibility = 'public'
      )
    )
  );

-- 2. Insert access: authenticated users can upload to their own user directory
create policy "Allow upload to authenticated users"
  on storage.objects for insert
  with check (
    bucket_id = 'academic-resources' and
    auth.role() = 'authenticated'
  );

-- 3. Delete access: users can delete their own uploaded files
create policy "Allow delete by owner or admin"
  on storage.objects for delete
  using (
    bucket_id = 'academic-resources' and
    (auth.uid() = owner or public.is_admin())
  );
