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
  owner_id?: string;
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

export interface ResourceShare {
  id: string;
  resource_id: string;
  grantor_id: string;
  recipient_id: string;
  permission: "viewer" | "editor";
  created_at: string;
}

export type TreeSpecies = "cedar" | "oak" | "pine" | "willow" | "jacaranda" | "sakura";
export type TreeStatus = "healthy" | "leafless";
export type FocusSessionStatus =
  | "in_progress"
  | "paused"
  | "completed"
  | "interrupted"
  | "cancelled"
  | "expired_unverified";
export type ForestVisibility = "private" | "members" | "public";

export interface FocusSession {
  id: string;
  user_id: string;
  subject_id: string | null;
  session_label: string | null;
  target_duration_seconds: number;
  actual_duration_seconds: number;
  status: FocusSessionStatus;
  tree_species: TreeSpecies;
  started_at: string;
  completed_at: string | null;
  interrupted_at: string | null;
  interruption_reason: string | null;
  idempotency_key: string | null;
  paused_at?: string | null;
  total_paused_seconds?: number;
  pause_count?: number;
  created_at: string;
  updated_at: string;
  subject?: Subject | null;
}

export interface ForestEntry {
  id: string;
  session_id: string;
  user_id: string;
  tree_status: TreeStatus;
  tree_species: TreeSpecies;
  position_x: number;
  position_y: number;
  scale_factor: number;
  growth_stage?: number;
  earned_at: string;
  created_at: string;
  session?: FocusSession | null;
}

export interface ForestPreferences {
  user_id: string;
  visibility: ForestVisibility;
  default_tree_species: TreeSpecies;
  allow_classmate_cheers: boolean;
  created_at: string;
  updated_at: string;
}

export interface MemberForestSummary {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  healthyTreeCount: number;
  leaflessTreeCount: number;
  totalFocusedMinutes: number;
  recentSpecies: TreeSpecies[];
  lastFocusedAt: string | null;
  visibility: ForestVisibility;
}

// -----------------------------------------------------------------------------
// Audio Customization & VIP Entitlements
// -----------------------------------------------------------------------------

export interface CustomAudioEntry {
  id: string;
  user_id: string;
  title: string;
  youtube_url: string;
  youtube_video_id: string;
  source_type: "youtube";
  created_at: string;
  updated_at: string;
}

export type AudioCatalogCategory =
  | "ambient"
  | "binaural"
  | "nature"
  | "lofi"
  | "classical"
  | "focus";

export type AudioSourceType = "synth" | "youtube";

export interface AudioCatalogEntry {
  id: string;
  title: string;
  description: string | null;
  category: AudioCatalogCategory;
  source_type: AudioSourceType;
  source_key: string;
  youtube_video_id: string | null;
  is_published: boolean;
  sort_order: number;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface VipEntitlement {
  id: string;
  user_id: string;
  starts_at: string;
  expires_at: string;
  granted_by: string;
  reason: string | null;
  status: "active" | "revoked" | "expired";
  created_at: string;
  updated_at: string;
  user_display_name?: string;
  user_email?: string;
  granter_display_name?: string;
}

// -----------------------------------------------------------------------------
// Live Presence & Website Analytics
// -----------------------------------------------------------------------------

export type DeviceCategory = "desktop" | "tablet" | "mobile" | "unknown";

export interface UserPresence {
  user_id: string;
  display_name: string;
  device_category: DeviceCategory;
  current_route: string;
  last_seen_at: string;
}

export type AnalyticsEventType =
  | "page_view"
  | "focus_session_start"
  | "focus_session_complete"
  | "quiz_attempt"
  | "resource_view";

export interface AnalyticsEvent {
  id: string;
  event_type: AnalyticsEventType;
  page_route: string;
  user_id?: string | null;
  session_id: string;
  device_category: DeviceCategory;
  browser_family: string;
  os_family: string;
  created_at: string;
}

export interface AnalyticsOverview {
  activeUsersEstimate: number;
  activeSessionsCount: number;
  uniqueVisitors24h: number;
  uniqueVisitors7d: number;
  uniqueVisitors30d: number;
  totalPageViews: number;
  pageViewsByDay: Array<{ date: string; views: number }>;
  topPages: Array<{ route: string; count: number }>;
  deviceDistribution: Record<DeviceCategory, number>;
  browserDistribution: Record<string, number>;
  osDistribution: Record<string, number>;
}

export interface UserStudyGoals {
  dailyFocusMinutes: number;
  weeklyQuizzes: number;
  targetScore: number;
  updated_at?: string;
}

// -----------------------------------------------------------------------------
// System Notifications & Social Interaction Types
// -----------------------------------------------------------------------------

export type NotificationType = "cheer" | "system" | "study" | "achievement" | "announcement" | "role_assignment";
export type CheerType = "water" | "clap" | "fire" | "muscle";

export interface SystemNotification {
  id: string;
  recipient_id: string;
  sender_id?: string;
  sender_name?: string;
  sender_avatar_url?: string | null;
  type: NotificationType;
  cheer_type?: CheerType;
  title: string;
  content: string;
  is_read: boolean;
  link?: string;
  created_at: string;
}

