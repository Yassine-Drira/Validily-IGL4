/**
 * audit-logger.ts
 * Enterprise-grade, non-sensitive audit logging for academic resource operations.
 * Records actor, action, target entity, timestamp, and safe metadata.
 */

// Dynamic lazy loader for Supabase admin to avoid static module resolution issues in tests
async function getAdminClient() {
  try {
    const mod = await import("../supabase/admin");
    return mod.getServiceSupabase();
  } catch {
    return null;
  }
}

export type AuditAction =
  | "RESOURCE_UPLOAD"
  | "RESOURCE_DELETE"
  | "RESOURCE_RENAME"
  | "RESOURCE_MOVE"
  | "RESOURCE_VISIBILITY_CHANGE"
  | "RESOURCE_SHARED"
  | "RESOURCE_SHARE_REVOKED"
  | "FOLDER_CREATE"
  | "FOLDER_RENAME"
  | "FOLDER_MOVE"
  | "FOLDER_DELETE"
  | "QUIZ_CREATE"
  | "QUIZ_DELETE"
  | "NOTE_CREATE"
  | "NOTE_DELETE"
  | "SUBJECT_CREATE"
  | "SUBJECT_DELETE"
  | "USER_SIGN_IN"
  | "USER_SIGN_OUT";

export interface AuditEvent {
  actor_id: string; // user ID or "guest" or "system"
  action: AuditAction;
  target_id: string; // resource ID, quiz ID, etc.
  target_type: "resource" | "folder" | "quiz" | "note" | "subject" | "auth";
  metadata?: Record<string, any>;
  ip_address?: string;
}

// In-memory buffer for fast local auditing or fallback
const auditMemoryTrail: Array<AuditEvent & { timestamp: string }> = [];

export async function logAuditEvent(event: AuditEvent): Promise<void> {
  const timestamp = new Date().toISOString();
  
  // Clean non-sensitive metadata (no passwords, tokens, full files)
  const safeMetadata: Record<string, any> = {};
  if (event.metadata) {
    for (const [key, value] of Object.entries(event.metadata)) {
      if (
        key.toLowerCase().includes("password") ||
        key.toLowerCase().includes("token") ||
        key.toLowerCase().includes("secret") ||
        key.toLowerCase().includes("content")
      ) {
        continue;
      }
      safeMetadata[key] = typeof value === "object" ? JSON.stringify(value).slice(0, 500) : value;
    }
  }

  const record = {
    ...event,
    metadata: safeMetadata,
    timestamp,
  };

  // Keep in memory buffer (latest 100 events)
  auditMemoryTrail.unshift(record);
  if (auditMemoryTrail.length > 100) {
    auditMemoryTrail.pop();
  }

  try {
    const admin = await getAdminClient();
    if (admin) {
      // Try writing to audit_logs table if present
      await admin.from("audit_logs").insert([
        {
          actor_id: event.actor_id,
          action: event.action,
          target_id: event.target_id,
          target_type: event.target_type,
          metadata: safeMetadata,
          created_at: timestamp,
        },
      ]);
    }
  } catch {
    // Graceful fallback to in-memory trail without throwing to preserve critical path
  }
}

export function getRecentAuditLogs(limit: number = 20) {
  return auditMemoryTrail.slice(0, limit);
}
