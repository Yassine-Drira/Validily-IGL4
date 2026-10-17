import type { SubjectFolder } from "@/types/database";

/**
 * Canonical Curriculum Folder Definitions
 * Restores and guarantees resilient folder hierarchy & arborescences for all subjects.
 */
export const DEFAULT_CURRICULUM_FOLDERS: Record<string, SubjectFolder[]> = {
  // Artificial Intelligence
  "b4444444-4444-4444-4444-444444444444": [
    {
      id: "f_1792107314202_xmtn7",
      subject_id: "b4444444-4444-4444-4444-444444444444",
      name: "Cours & Supports",
      parent_id: null,
      color: "blue",
      icon: "book-open",
      sort_order: 1,
      created_at: "2026-10-15T23:35:14.202Z",
      updated_at: "2026-10-15T23:35:14.202Z",
    },
    {
      id: "f_1792108478597_c7co8",
      subject_id: "b4444444-4444-4444-4444-444444444444",
      name: "Travaux Dirigés (TD)",
      parent_id: null,
      color: "emerald",
      icon: "layers",
      sort_order: 2,
      created_at: "2026-10-15T23:54:38.597Z",
      updated_at: "2026-10-15T23:54:38.597Z",
    },
    {
      id: "f_1792107319272_i73dg",
      subject_id: "b4444444-4444-4444-4444-444444444444",
      name: "Devoirs Surveillés (DS)",
      parent_id: null,
      color: "amber",
      icon: "file-text",
      sort_order: 3,
      created_at: "2026-10-15T23:35:19.272Z",
      updated_at: "2026-10-15T23:35:19.272Z",
    },
    {
      id: "f_1792108498621_5ee51",
      subject_id: "b4444444-4444-4444-4444-444444444444",
      name: "Examens Principaux & Évaluations",
      parent_id: null,
      color: "indigo",
      icon: "graduation-cap",
      sort_order: 4,
      created_at: "2026-10-15T23:54:58.621Z",
      updated_at: "2026-10-15T23:54:58.621Z",
    },
  ],

  // Parallel Algorithms
  "b3333333-3333-3333-3333-333333333333": [
    {
      id: "f_1792109142528_1qhbm",
      subject_id: "b3333333-3333-3333-3333-333333333333",
      name: "Cour",
      parent_id: null,
      color: "blue",
      icon: "book-open",
      sort_order: 1,
      created_at: "2026-10-16T00:05:42.528Z",
      updated_at: "2026-10-16T00:05:42.528Z",
    },
    {
      id: "f_1792107259965_zrybv",
      subject_id: "b3333333-3333-3333-3333-333333333333",
      name: "Ds/Exam",
      parent_id: null,
      color: "indigo",
      icon: "graduation-cap",
      sort_order: 2,
      created_at: "2026-10-15T23:34:19.965Z",
      updated_at: "2026-10-16T00:04:14.344Z",
    },
  ],

  // Blockchain
  "b2222222-2222-2222-2222-222222222222": [
    {
      id: "f_1792107876028_ono24",
      subject_id: "b2222222-2222-2222-2222-222222222222",
      name: "Examens (P)",
      parent_id: null,
      color: "indigo",
      icon: "graduation-cap",
      sort_order: 1,
      created_at: "2026-10-15T23:44:36.028Z",
      updated_at: "2026-10-15T23:44:36.028Z",
    },
    {
      id: "f_1792108142382_uu900",
      subject_id: "b2222222-2222-2222-2222-222222222222",
      name: "TP & Ateliers",
      parent_id: null,
      color: "purple",
      icon: "terminal",
      sort_order: 2,
      created_at: "2026-10-15T23:49:02.382Z",
      updated_at: "2026-10-15T23:49:02.382Z",
    },
  ],

  // Cybersecurity
  "b5555555-5555-5555-5555-555555555555": [
    {
      id: "f_1792107375672_91y7j",
      subject_id: "b5555555-5555-5555-5555-555555555555",
      name: "Cours & Chapitres",
      parent_id: null,
      color: "blue",
      icon: "book-open",
      sort_order: 1,
      created_at: "2026-10-15T23:36:15.672Z",
      updated_at: "2026-10-15T23:36:15.672Z",
    },
    {
      id: "f_1792110221022_xxtw4",
      subject_id: "b5555555-5555-5555-5555-555555555555",
      name: "Examens (P)",
      parent_id: null,
      color: "indigo",
      icon: "graduation-cap",
      sort_order: 2,
      created_at: "2026-10-16T00:23:41.022Z",
      updated_at: "2026-10-16T00:23:41.022Z",
    },
  ],

  // Stochastic Processes
  "baaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa": [
    {
      id: "f_1792107404902_iqd94",
      subject_id: "baaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      name: "Devoirs & Examens (DS / P)",
      parent_id: null,
      color: "indigo",
      icon: "graduation-cap",
      sort_order: 1,
      created_at: "2026-10-15T23:36:44.902Z",
      updated_at: "2026-10-15T23:36:44.902Z",
    },
    {
      id: "f_1792109776165_gyau4",
      subject_id: "baaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      name: "TD & Révisions Mixtes",
      parent_id: null,
      color: "emerald",
      icon: "layers",
      sort_order: 2,
      created_at: "2026-10-16T00:16:16.165Z",
      updated_at: "2026-10-16T00:16:16.165Z",
    },
  ],

  // Combinatorial Optimization
  "b9999999-9999-9999-9999-999999999999": [
    {
      id: "f_1792109419462_va2n6",
      subject_id: "b9999999-9999-9999-9999-999999999999",
      name: "Devoirs & Examens (DS / P)",
      parent_id: null,
      color: "indigo",
      icon: "graduation-cap",
      sort_order: 1,
      created_at: "2026-10-16T00:10:19.462Z",
      updated_at: "2026-10-16T00:10:19.462Z",
    },
  ],

  // Project Management
  "b6666666-6666-6666-6666-666666666666": [
    {
      id: "f_1792109983821_pkz79",
      subject_id: "b6666666-6666-6666-6666-666666666666",
      name: "Devoirs & Examens (DS / P)",
      parent_id: null,
      color: "indigo",
      icon: "graduation-cap",
      sort_order: 1,
      created_at: "2026-10-16T00:19:43.821Z",
      updated_at: "2026-10-16T00:19:43.821Z",
    },
    {
      id: "f_1792110022254_yfb1h",
      subject_id: "b6666666-6666-6666-6666-666666666666",
      name: "Révisions Mixtes",
      parent_id: null,
      color: "emerald",
      icon: "layers",
      sort_order: 2,
      created_at: "2026-10-16T00:20:22.254Z",
      updated_at: "2026-10-16T00:20:22.254Z",
    },
  ],

  // Cloud Computing
  "b8888888-8888-8888-8888-888888888888": [
    {
      id: "f_1792110426930_0qvj7",
      subject_id: "b8888888-8888-8888-8888-888888888888",
      name: "Examens (P)",
      parent_id: null,
      color: "indigo",
      icon: "graduation-cap",
      sort_order: 1,
      created_at: "2026-10-16T00:27:06.930Z",
      updated_at: "2026-10-16T00:27:06.930Z",
    },
  ],

  // Enterprise
  "b7777777-7777-7777-7777-777777777777": [
    {
      id: "f_1792110801630_mdecc",
      subject_id: "b7777777-7777-7777-7777-777777777777",
      name: "Cour-complet",
      parent_id: null,
      color: "blue",
      icon: "book-open",
      sort_order: 1,
      created_at: "2026-10-16T00:33:21.630Z",
      updated_at: "2026-10-16T00:33:21.630Z",
    },
    {
      id: "f_1792110756292_1rd3e",
      subject_id: "b7777777-7777-7777-7777-777777777777",
      name: "Examens (P)",
      parent_id: null,
      color: "indigo",
      icon: "graduation-cap",
      sort_order: 2,
      created_at: "2026-10-16T00:32:36.292Z",
      updated_at: "2026-10-16T00:32:36.292Z",
    },
  ],

  // Flutter
  "b1111111-1111-1111-1111-111111111111": [
    {
      id: "f_1792107209540_y5z60",
      subject_id: "b1111111-1111-1111-1111-111111111111",
      name: "Examens (P)",
      parent_id: null,
      color: "indigo",
      icon: "graduation-cap",
      sort_order: 1,
      created_at: "2026-10-15T23:33:29.540Z",
      updated_at: "2026-10-15T23:33:29.540Z",
    },
  ],
};

// Also map by slug for direct lookups
export const SLUG_TO_SUBJECT_ID: Record<string, string> = {
  "artificial-intelligence": "b4444444-4444-4444-4444-444444444444",
  "parallel-algorithms": "b3333333-3333-3333-3333-333333333333",
  "blockchain": "b2222222-2222-2222-2222-222222222222",
  "cybersecurity": "b5555555-5555-5555-5555-555555555555",
  "stochastic-processes": "baaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  "combinatorial-optimization": "b9999999-9999-9999-9999-999999999999",
  "project-management": "b6666666-6666-6666-6666-666666666666",
  "cloud-computing": "b8888888-8888-8888-8888-888888888888",
  "enterprise": "b7777777-7777-7777-7777-777777777777",
  "flutter": "b1111111-1111-1111-1111-111111111111",
  "pr-paration-aws-certifs": "3916e1c3-cb65-4c35-bf1b-c9e9d066ca82",
};

/**
 * Retrieve canonical default folders for a given subject (by ID or slug)
 */
export function getDefaultSubjectFolders(subjectIdOrSlug: string): SubjectFolder[] {
  const resolvedId = SLUG_TO_SUBJECT_ID[subjectIdOrSlug] || subjectIdOrSlug;
  const canonical = DEFAULT_CURRICULUM_FOLDERS[resolvedId];
  if (canonical && Array.isArray(canonical)) {
    return canonical.map((f) => ({ ...f }));
  }
  return [];
}
