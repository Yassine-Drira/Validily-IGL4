/**
 * VALIDILY-IGL4 — Centralized Academic Retrieval Service (RAG)
 *
 * Single authoritative retrieval pipeline shared by:
 * 1. Conversational Validily AI Coach
 * 2. Dynamic RAG Quiz Studio
 *
 * Security & Isolation:
 * - Strictly respects document ownership and visibility (private notes/resources are never leaked).
 * - Extracts real content from `Note.content` and `AcademicResource` descriptions, chapters, and metadata.
 * - Scores and ranks chunks authoritatively.
 * - Validates citations to prevent hallucinated references.
 */

import { getNotes, getResources, getSubjects } from "../supabase/repository.ts";
import { getAcademicTasksAction } from "../actions/planner-actions.ts";
import type { Subject, Note, AcademicResource, AcademicTask } from "@/types/database";

export interface AcademicChunk {
  sourceId: string;
  sourceType: "note" | "resource" | "task" | "mistake";
  title: string;
  subjectId?: string;
  subjectName?: string;
  content: string;
  snippet: string;
  score: number;
  metadata?: Record<string, any>;
}

export interface RetrievalOptions {
  query?: string;
  targetSubjectId?: string;
  targetResourceId?: string;
  targetNoteId?: string;
  maxChunks?: number;
}

export interface GroundedQuizSource {
  sourceId: string;
  sourceType: "note" | "resource" | "subject";
  title: string;
  subjectId: string;
  subjectName: string;
  fullContent: string;
  chunks: string[];
}

// In-memory test mocks support for offline testing
const globalRetrievalState = globalThis as unknown as {
  __testNotes?: Note[];
  __testResources?: AcademicResource[];
};

export function _injectTestNotes(notes: Note[]) {
  globalRetrievalState.__testNotes = notes;
}

export function _injectTestResources(resources: AcademicResource[]) {
  globalRetrievalState.__testResources = resources;
}

/**
 * Tokenize and score relevance between a query and a text string
 */
function scoreRelevance(query: string, title: string, content: string, tags: string[] = []): number {
  if (!query || query.trim().length === 0) return 1.0;

  const qTerms = query
    .toLowerCase()
    .replace(/[^\w\sàâäéèêëîïôöùûüç]/gi, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);

  if (qTerms.length === 0) return 1.0;

  const titleLower = title.toLowerCase();
  const contentLower = content.toLowerCase();
  const tagsLower = tags.map((t) => t.toLowerCase()).join(" ");

  let score = 0;
  for (const term of qTerms) {
    if (titleLower.includes(term)) score += 5;
    if (tagsLower.includes(term)) score += 3;
    if (contentLower.includes(term)) score += 1;
  }

  return score;
}

/**
 * Retrieve authorized academic context from notes, resources, and tasks
 */
export async function retrieveAcademicContext(
  userId: string,
  options: RetrievalOptions = {}
): Promise<AcademicChunk[]> {
  const { query = "", targetSubjectId, targetResourceId, targetNoteId, maxChunks = 8 } = options;

  // 1. Fetch subjects, notes, and resources in parallel with strict access control
  const [subjects, allNotes, allResources, tasksRes] = await Promise.all([
    getSubjects(undefined, userId).catch(() => [] as Subject[]),
    globalRetrievalState.__testNotes
      ? Promise.resolve(globalRetrievalState.__testNotes)
      : getNotes(userId, targetSubjectId).catch(() => [] as Note[]),
    globalRetrievalState.__testResources
      ? Promise.resolve(globalRetrievalState.__testResources)
      : getResources({ userId, subjectId: targetSubjectId, includeAll: false }).catch(() => [] as AcademicResource[]),
    getAcademicTasksAction().catch(() => ({ success: false, data: [] as AcademicTask[] })),
  ]);

  const subjectMap = new Map<string, Subject>();
  subjects.forEach((s) => subjectMap.set(s.id, s));

  const chunks: AcademicChunk[] = [];

  // 2. Process Notes (Authorized only: owned by user OR public)
  for (const note of allNotes) {
    if (note.user_id !== userId && note.visibility !== "public") {
      continue; // Strictly enforce isolation
    }
    if (targetNoteId && note.id !== targetNoteId) {
      continue;
    }
    if (targetSubjectId && note.subject_id !== targetSubjectId) {
      continue;
    }

    const noteContent = note.content || "";
    if (!noteContent.trim() && !note.title) continue;

    const subName = (note.subject_id && subjectMap.get(note.subject_id)?.name) || note.subject?.name || "Général";
    const score = scoreRelevance(query, note.title, noteContent, note.tags);

    // If targeted specifically, boost score
    const finalScore = targetNoteId === note.id ? score + 100 : score;

    if (!query || finalScore > 0 || targetNoteId === note.id) {
      chunks.push({
        sourceId: note.id,
        sourceType: "note",
        title: note.title,
        subjectId: note.subject_id || undefined,
        subjectName: subName,
        content: noteContent.slice(0, 2500), // Rich academic body
        snippet: noteContent.slice(0, 200).trim() + (noteContent.length > 200 ? "..." : ""),
        score: finalScore,
        metadata: {
          visibility: note.visibility,
          tags: note.tags,
          updated_at: note.updated_at,
        },
      });
    }
  }

  // 3. Process Academic Resources (Authorized only: public OR owned by user)
  for (const res of allResources) {
    if (res.visibility !== "public" && res.owner_id !== userId) {
      continue; // Strict isolation
    }
    if (targetResourceId && res.id !== targetResourceId) {
      continue;
    }
    if (targetSubjectId && res.subject_id !== targetSubjectId) {
      continue;
    }

    const subName = (res.subject_id && subjectMap.get(res.subject_id)?.name) || res.subject?.name || "Général";
    const bodyText = [
      res.title,
      res.description || "",
      res.chapter ? `Chapitre: ${res.chapter}` : "",
      res.tags && res.tags.length > 0 ? `Mots-clés: ${res.tags.join(", ")}` : "",
      res.original_filename ? `Fichier: ${res.original_filename}` : "",
    ].filter(Boolean).join("\n");

    const score = scoreRelevance(query, res.title, bodyText, res.tags);
    const finalScore = targetResourceId === res.id ? score + 100 : score;

    if (!query || finalScore > 0 || targetResourceId === res.id) {
      chunks.push({
        sourceId: res.id,
        sourceType: "resource",
        title: res.title,
        subjectId: res.subject_id,
        subjectName: subName,
        content: bodyText,
        snippet: (res.description || res.title).slice(0, 200),
        score: finalScore,
        metadata: {
          mimeType: res.mime_type,
          storagePath: res.storage_path,
          tags: res.tags,
          chapter: res.chapter,
        },
      });
    }
  }

  // 4. Process Academic Tasks
  const tasks = tasksRes.success && Array.isArray(tasksRes.data) ? tasksRes.data : [];
  for (const t of tasks) {
    if (t.user_id && t.user_id !== userId) continue;
    if (t.is_completed) continue;

    const subName = (t.subject_id && subjectMap.get(t.subject_id)?.name) || "Général";
    const taskText = `${t.title} ${t.description || ""} Priorité: ${t.priority} Échéance: ${t.due_date || "N/A"}`;
    const score = scoreRelevance(query, t.title, taskText);

    if (!query || score > 0) {
      chunks.push({
        sourceId: t.id,
        sourceType: "task",
        title: t.title,
        subjectId: t.subject_id || undefined,
        subjectName: subName,
        content: taskText,
        snippet: `Échéance: ${t.due_date || "Non définie"} (Priorité: ${t.priority})`,
        score,
        metadata: {
          dueDate: t.due_date,
          priority: t.priority,
          estimatedMinutes: t.estimated_minutes,
        },
      });
    }
  }

  // 5. Rank chunks by score descending
  chunks.sort((a, b) => b.score - a.score);

  return chunks.slice(0, maxChunks);
}

/**
 * Retrieve a specific document or note with strict authorization for grounded quiz generation
 */
export async function retrieveDocumentForQuiz(
  userId: string,
  target: {
    resourceId?: string;
    noteId?: string;
    subjectId?: string;
  }
): Promise<{ success: boolean; data?: GroundedQuizSource; error?: string }> {
  const { resourceId, noteId, subjectId } = target;

  if (!resourceId && !noteId && !subjectId) {
    return { success: false, error: "Veuillez sélectionner un document, une note de cours ou une matière." };
  }

  const subjects = await getSubjects(undefined, userId).catch(() => [] as Subject[]);
  const subjectMap = new Map<string, Subject>();
  subjects.forEach((s) => subjectMap.set(s.id, s));

  // Case A: Specific Note
  if (noteId) {
    const notes = globalRetrievalState.__testNotes || (await getNotes(userId).catch(() => [] as Note[]));
    const note = notes.find((n) => n.id === noteId);

    if (!note) {
      return { success: false, error: "Note introuvable ou non autorisée." };
    }
    if (note.user_id !== userId && note.visibility !== "public") {
      return { success: false, error: "Accès refusé : cette note est privée." };
    }

    const content = note.content || "";
    if (content.trim().length < 40) {
      return {
        success: false,
        error: "Le contenu de cette note est trop court (< 40 caractères) pour générer des questions fiables.",
      };
    }

    const subName = (note.subject_id && subjectMap.get(note.subject_id)?.name) || note.subject?.name || "Matière générale";
    return {
      success: true,
      data: {
        sourceId: note.id,
        sourceType: "note",
        title: note.title,
        subjectId: note.subject_id || "general",
        subjectName: subName,
        fullContent: content,
        chunks: [content.slice(0, 3000)],
      },
    };
  }

  // Case B: Specific Academic Resource
  if (resourceId) {
    const resources =
      globalRetrievalState.__testResources ||
      (await getResources({ userId, includeAll: false }).catch(() => [] as AcademicResource[]));
    const res = resources.find((r) => r.id === resourceId);

    if (!res) {
      return { success: false, error: "Ressource académique introuvable ou non autorisée." };
    }
    if (res.visibility !== "public" && res.owner_id !== userId) {
      return { success: false, error: "Accès refusé : ce document est restreint." };
    }

    const textPayload = [
      res.title,
      res.description ? `Description du cours: ${res.description}` : "",
      res.chapter ? `Chapitre ou Section: ${res.chapter}` : "",
      res.tags && res.tags.length > 0 ? `Concepts clés: ${res.tags.join(", ")}` : "",
    ].filter(Boolean).join("\n\n");

    if (textPayload.trim().length < 30) {
      return {
        success: false,
        error: "Le document sélectionné ne contient pas assez de texte ou de description pour générer un quiz.",
      };
    }

    const subName = (res.subject_id && subjectMap.get(res.subject_id)?.name) || res.subject?.name || "Matière générale";
    return {
      success: true,
      data: {
        sourceId: res.id,
        sourceType: "resource",
        title: res.title,
        subjectId: res.subject_id || "general",
        subjectName: subName,
        fullContent: textPayload,
        chunks: [textPayload],
      },
    };
  }

  // Case C: Target Subject Syllabus / General
  if (subjectId) {
    const subject = subjectMap.get(subjectId);
    if (!subject) {
      return { success: false, error: "Matière spécifiée non reconnue." };
    }

    // Retrieve notes and resources for this subject to build authoritative grounding
    const chunks = await retrieveAcademicContext(userId, { targetSubjectId: subjectId, maxChunks: 5 });
    const aggregated = chunks.map((c) => `### ${c.title}\n${c.content}`).join("\n\n");

    const contentToUse = aggregated.trim().length >= 40 ? aggregated : `Syllabus officiel IGL4 : ${subject.name}. ${subject.description || ""}`;

    return {
      success: true,
      data: {
        sourceId: subject.id,
        sourceType: "subject",
        title: subject.name,
        subjectId: subject.id,
        subjectName: subject.name,
        fullContent: contentToUse,
        chunks: [contentToUse.slice(0, 3000)],
      },
    };
  }

  return { success: false, error: "Paramètres de génération invalides." };
}

/**
 * Filter and verify citations in LLM responses against the retrieved authoritative chunks.
 * Rejects or strips any hallucinated citations.
 */
export function verifyCitationsAgainstRetrieved(
  citations: Array<{ type: string; id: string; label?: string; detail?: string }>,
  retrievedChunks: AcademicChunk[]
): Array<{ type: string; id: string; label: string; detail?: string }> {
  if (!Array.isArray(citations) || citations.length === 0) return [];

  const validSourceIds = new Set(retrievedChunks.map((c) => c.sourceId));
  const validChunkTitles = new Map(retrievedChunks.map((c) => [c.sourceId, c.title]));

  const verified: Array<{ type: string; id: string; label: string; detail?: string }> = [];

  for (const cit of citations) {
    if (!cit || !cit.id) continue;

    // Check if citation matches an exact retrieved chunk ID
    if (validSourceIds.has(cit.id)) {
      verified.push({
        type: cit.type || "academic_document",
        id: cit.id,
        label: cit.label || validChunkTitles.get(cit.id) || "Document Vérifié",
        detail: cit.detail || "Source académique autorisée",
      });
      continue;
    }

    // Fuzzy check by label against chunk titles
    const matchedChunk = retrievedChunks.find(
      (c) => cit.label && c.title.toLowerCase().includes(cit.label.toLowerCase())
    );
    if (matchedChunk) {
      verified.push({
        type: cit.type || "academic_document",
        id: matchedChunk.sourceId,
        label: matchedChunk.title,
        detail: cit.detail || "Source académique autorisée",
      });
    }
  }

  return verified;
}
