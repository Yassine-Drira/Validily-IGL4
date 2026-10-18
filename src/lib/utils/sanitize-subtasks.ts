import type { AcademicSubtask } from "../../types/database";

/**
 * Normalizes and validates subtask array payloads for create and update actions.
 * Enforces max 50 items, title <= 255 chars, boolean done, valid id and order.
 * Pure synchronous function safe for server actions and client usage.
 */
export function sanitizeSubtasks(rawSubtasks: unknown): AcademicSubtask[] {
  if (!Array.isArray(rawSubtasks)) return [];
  return rawSubtasks
    .slice(0, 50)
    .filter((st): st is Record<string, unknown> => Boolean(st && typeof st === "object"))
    .filter((st) => typeof st.title === "string" && st.title.trim().length > 0)
    .map((st, idx) => ({
      id:
        typeof st.id === "string" && st.id.trim().length > 0
          ? st.id.trim()
          : `st-${Date.now()}-${idx}`,
      title: String(st.title).trim().slice(0, 255),
      done: Boolean(st.done),
      order: typeof st.order === "number" && !isNaN(st.order) ? st.order : idx,
    }));
}
