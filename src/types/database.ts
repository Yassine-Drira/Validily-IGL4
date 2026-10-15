export type UserRole = "admin" | "student" | "visitor";

export type ResourceVisibility = "public" | "private" | "shared";

export type PublicationStatus = "draft" | "pending_review" | "published" | "archived";

export type RevisionStatus = "not_started" | "in_progress" | "revised";

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url?: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Semester {
  id: string;
  name: string;
  academic_year: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  subject_count?: number;
}

export interface Subject {
  id: string;
  semester_id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  resource_count?: number;
  semester?: Semester;
}

export interface ResourceCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  resource_count?: number;
}

export interface SubjectFolder {
  id: string;
  subject_id: string;
  name: string;
  parent_id: string | null;
  color?: string;
  sort_order?: number;
  created_at: string;
  updated_at?: string;
}

export interface AcademicResource {
  id: string;
  subject_id: string;
  category_id: string;
  owner_id: string;
  title: string;
  description: string | null;
  storage_path: string;
  external_url?: string;
  original_filename: string;
  mime_type: string;
  file_size_bytes: number;
  academic_year: string | null;
  exam_session: string | null;
  instructor: string | null;
  chapter: string | null; // holds folder_id
  tags: string[];
  visibility: ResourceVisibility;
  publication_status: PublicationStatus;
  created_at: string;
  updated_at: string;
  // joined fields
  subject?: Subject;
  category?: ResourceCategory;
  folder?: SubjectFolder;
  owner_profile?: Profile;
  is_bookmarked?: boolean;
  revision_status?: RevisionStatus;
}

export interface Bookmark {
  id: string;
  user_id: string;
  resource_id: string;
  created_at: string;
  resource?: AcademicResource;
}

export interface RevisionProgress {
  id: string;
  user_id: string;
  resource_id: string;
  status: RevisionStatus;
  last_viewed_at: string;
  revised_at: string | null;
  updated_at: string;
}

export interface Note {
  id: string;
  user_id: string;
  semester_id: string | null;
  subject_id: string | null;
  title: string;
  content: string;
  tags: string[];
  visibility: "private" | "public";
  created_at: string;
  updated_at: string;
  subject?: Subject;
}

export interface Quiz {
  id: string;
  owner_id: string;
  subject_id: string;
  title: string;
  description: string | null;
  difficulty: "beginner" | "intermediate" | "advanced";
  publication_status: PublicationStatus;
  created_at: string;
  updated_at: string;
  subject?: Subject;
  question_count?: number;
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  question_text: string;
  question_type: "single_choice" | "multiple_choice";
  explanation: string | null;
  sort_order: number;
  options?: QuizOption[];
}

export interface QuizOption {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
  sort_order: number;
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  user_id: string;
  score: number;
  total_questions: number;
  started_at: string;
  completed_at: string | null;
  quiz?: Quiz;
}

export interface QuizAttemptAnswer {
  id: string;
  attempt_id: string;
  question_id: string;
  selected_option_id: string;
  is_correct: boolean;
}
