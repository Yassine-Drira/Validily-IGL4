-- Enable required extensions
create extension if not exists "uuid-ossp";

-- 1. Profiles Table (linked to Supabase Auth)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  role text not null check (role in ('admin', 'student', 'visitor')) default 'student',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Semesters Table
create table if not exists public.semesters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  academic_year text not null default '2024-2025',
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Subjects Table
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  semester_id uuid not null references public.semesters(id) on delete cascade,
  name text not null,
  slug text not null unique,
  description text,
  icon text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Resource Categories Table
create table if not exists public.resource_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  sort_order int not null default 0,
  is_active boolean not null default true
);

-- 5. Academic Resources Table
create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  category_id uuid not null references public.resource_categories(id) on delete restrict,
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  storage_path text not null,
  original_filename text not null,
  mime_type text not null default 'application/pdf',
  file_size_bytes bigint not null default 0,
  academic_year text,
  exam_session text,
  instructor text,
  chapter text,
  tags text[] default '{}',
  visibility text not null check (visibility in ('public', 'private', 'shared')) default 'private',
  publication_status text not null check (publication_status in ('draft', 'pending_review', 'published', 'archived')) default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 6. Bookmarks Table
create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resource_id uuid not null references public.resources(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, resource_id)
);

-- 7. Revision Progress Table
create table if not exists public.revision_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resource_id uuid not null references public.resources(id) on delete cascade,
  status text not null check (status in ('not_started', 'in_progress', 'revised')) default 'not_started',
  last_viewed_at timestamptz not null default now(),
  revised_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, resource_id)
);

-- 8. Notes & Cheat Sheets Table
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  semester_id uuid references public.semesters(id) on delete set null,
  subject_id uuid references public.subjects(id) on delete set null,
  title text not null,
  content text not null default '',
  tags text[] default '{}',
  visibility text not null check (visibility in ('private', 'public')) default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 9. Quizzes Tables
create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  title text not null,
  description text,
  difficulty text not null check (difficulty in ('beginner', 'intermediate', 'advanced')) default 'intermediate',
  publication_status text not null check (publication_status in ('draft', 'pending_review', 'published', 'archived')) default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  question_text text not null,
  question_type text not null default 'single_choice',
  explanation text,
  sort_order int not null default 0
);

create table if not exists public.quiz_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  option_text text not null,
  is_correct boolean not null default false,
  sort_order int not null default 0
);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  score int not null default 0,
  total_questions int not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.quiz_attempt_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.quiz_attempts(id) on delete cascade,
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  selected_option_id uuid not null references public.quiz_options(id) on delete cascade,
  is_correct boolean not null default false
);

-- Performance Indexes
create index if not exists idx_subjects_semester on public.subjects(semester_id);
create index if not exists idx_resources_subject on public.resources(subject_id);
create index if not exists idx_resources_category on public.resources(category_id);
create index if not exists idx_resources_owner on public.resources(owner_id);
create index if not exists idx_resources_status on public.resources(publication_status, visibility);
create index if not exists idx_bookmarks_user on public.bookmarks(user_id);
create index if not exists idx_progress_user on public.revision_progress(user_id);
create index if not exists idx_notes_user on public.notes(user_id);
create index if not exists idx_quizzes_subject on public.quizzes(subject_id);

-- Profile trigger on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    'student'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.semesters enable row level security;
alter table public.subjects enable row level security;
alter table public.resource_categories enable row level security;
alter table public.resources enable row level security;
alter table public.bookmarks enable row level security;
alter table public.revision_progress enable row level security;
alter table public.notes enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_options enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.quiz_attempt_answers enable row level security;

-- Admin helper function
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
end;
$$ language plpgsql security definer;

-- RLS Policies: Semesters & Categories & Subjects (Public Read, Admin Write)
create policy "Anyone can read semesters" on public.semesters for select using (true);
create policy "Admins can manage semesters" on public.semesters for all using (public.is_admin());

create policy "Anyone can read subjects" on public.subjects for select using (true);
create policy "Admins can manage subjects" on public.subjects for all using (public.is_admin());

create policy "Anyone can read categories" on public.resource_categories for select using (true);
create policy "Admins can manage categories" on public.resource_categories for all using (public.is_admin());

-- RLS Policies: Profiles
create policy "Profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- RLS Policies: Resources
create policy "Published public resources are readable by all"
  on public.resources for select
  using (
    (publication_status = 'published' and visibility = 'public') or
    (owner_id = auth.uid()) or
    public.is_admin()
  );

create policy "Users can insert their own resources"
  on public.resources for insert
  with check (auth.uid() = owner_id);

create policy "Users can update their own resources"
  on public.resources for update
  using (auth.uid() = owner_id or public.is_admin());

create policy "Users can delete their own resources"
  on public.resources for delete
  using (auth.uid() = owner_id or public.is_admin());

-- RLS Policies: Bookmarks
create policy "Users manage own bookmarks"
  on public.bookmarks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- RLS Policies: Revision Progress
create policy "Users manage own progress"
  on public.revision_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- RLS Policies: Notes
create policy "Users view own notes or public notes"
  on public.notes for select
  using (auth.uid() = user_id or visibility = 'public' or public.is_admin());

create policy "Users manage own notes"
  on public.notes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- RLS Policies: Quizzes
create policy "Quizzes viewable if published or owned"
  on public.quizzes for select
  using (publication_status = 'published' or auth.uid() = owner_id or public.is_admin());

create policy "Questions viewable with quiz"
  on public.quiz_questions for select
  using (true);

create policy "Options viewable with question"
  on public.quiz_options for select
  using (true);

create policy "Users manage own attempts"
  on public.quiz_attempts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own attempt answers"
  on public.quiz_attempt_answers for all
  using (
    exists (
      select 1 from public.quiz_attempts
      where id = quiz_attempt_answers.attempt_id and user_id = auth.uid()
    )
  );
