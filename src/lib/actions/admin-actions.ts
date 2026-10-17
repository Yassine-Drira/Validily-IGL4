"use server";

import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { Subject, Semester } from "@/types/database";
import { invalidateRepositoryCache } from "@/lib/supabase/repository";
import { assertAdmin } from "@/lib/auth/authorization";

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
    invalidateRepositoryCache();
  } catch {
    // Outside active Next.js request context
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveSemesterId(idOrCode: string, serviceSupabase?: any): Promise<string> {
  if (UUID_REGEX.test(idOrCode)) {
    return idOrCode;
  }
  if (serviceSupabase) {
    const isSem1 = idOrCode === "sem-1" || idOrCode.includes("1");
    const isSem2 = idOrCode === "sem-2" || idOrCode.includes("2");
    if (isSem1 || isSem2) {
      const order = isSem1 ? 1 : 2;
      const { data: sem } = await serviceSupabase
        .from("semesters")
        .select("id")
        .eq("sort_order", order)
        .maybeSingle();
      if (sem?.id) return sem.id;
    }
  }
  if (idOrCode === "sem-1" || idOrCode.includes("1")) {
    return "11111111-1111-1111-1111-111111111111";
  }
  if (idOrCode === "sem-2" || idOrCode.includes("2")) {
    return "22222222-2222-2222-2222-222222222222";
  }
  return idOrCode;
}

export async function createSubject(data: {
  semester_id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  sort_order?: number;
}): Promise<{ success?: boolean; error?: string; subject?: Subject }> {
  try {
    const adminCheck = await assertAdmin();
    if (!adminCheck.authorized) {
      return { error: adminCheck.error || "Accès refusé. Privilèges administrateur requis." };
    }

    const cleanName = data.name?.trim() || "";
    if (!cleanName) {
      return { error: "Subject name is required." };
    }

    let cleanSlug = (data.slug || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (!cleanSlug) {
      cleanSlug = cleanName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    }

    if (!isSupabaseConfigured()) {
      return {
        success: true,
        subject: {
          id: `sub-${cleanSlug}`,
          semester_id: data.semester_id,
          name: cleanName,
          slug: cleanSlug,
          description: data.description || null,
          icon: data.icon || "Folder",
          sort_order: data.sort_order || 0,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      };
    }

    const serviceSupabase = getServiceSupabase();
    const resolvedSemId = await resolveSemesterId(data.semester_id, serviceSupabase);

    // Check duplicate slug
    const { data: existing } = await serviceSupabase
      .from("subjects")
      .select("id")
      .eq("slug", cleanSlug)
      .maybeSingle();

    if (existing) {
      cleanSlug = `${cleanSlug}-${Date.now().toString().slice(-4)}`;
    }

    const { data: subject, error } = await serviceSupabase
      .from("subjects")
      .insert({
        semester_id: resolvedSemId,
        name: cleanName,
        slug: cleanSlug,
        description: data.description?.trim() || null,
        icon: data.icon || "Folder",
        sort_order: data.sort_order || 0,
        is_active: true,
      })
      .select("*, semester:semesters(*)")
      .single();

    if (error) {
      console.error("Database insert error [createSubject]:", error);
      return { error: error.message };
    }

    safeRevalidate("/admin");
    safeRevalidate("/subjects");
    safeRevalidate("/semesters");
    safeRevalidate(`/semesters/${resolvedSemId}`);
    safeRevalidate("/");
    return { success: true, subject };
  } catch (err: any) {
    console.error("Error creating subject:", err);
    return { error: err.message || "Failed to create subject in database." };
  }
}

export async function updateSubject(
  subjectId: string,
  data: {
    name?: string;
    description?: string;
    icon?: string;
    semester_id?: string;
  }
): Promise<{ success?: boolean; error?: string; subject?: Subject }> {
  try {
    const adminCheck = await assertAdmin();
    if (!adminCheck.authorized) {
      return { error: adminCheck.error || "Accès refusé. Privilèges administrateur requis." };
    }

    if (!isSupabaseConfigured()) {
      return { error: "Database is not configured." };
    }

    const serviceSupabase = getServiceSupabase();
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (data.name !== undefined) updatePayload.name = data.name.trim();
    if (data.description !== undefined) updatePayload.description = data.description.trim() || null;
    if (data.icon !== undefined) updatePayload.icon = data.icon;
    if (data.semester_id !== undefined) updatePayload.semester_id = resolveSemesterId(data.semester_id);

    const { data: subject, error } = await serviceSupabase
      .from("subjects")
      .update(updatePayload)
      .eq("id", subjectId)
      .select("*, semester:semesters(*)")
      .single();

    if (error) {
      return { error: error.message };
    }

    safeRevalidate("/admin");
    safeRevalidate("/subjects");
    safeRevalidate(`/subjects/${subject.slug}`);
    safeRevalidate("/");
    return { success: true, subject };
  } catch (err: any) {
    return { error: err.message || "Failed to update subject." };
  }
}

export async function deleteSubject(subjectId: string): Promise<{ success?: boolean; error?: string }> {
  try {
    const adminCheck = await assertAdmin();
    if (!adminCheck.authorized) {
      return { error: adminCheck.error || "Accès refusé. Privilèges administrateur requis." };
    }

    if (adminCheck.isTemporary || adminCheck.user?.isTemporaryAdmin) {
      return { error: "Action restreinte : la suppression des modules académiques configurés par l'administrateur principal est réservée aux administrateurs permanents." };
    }

    if (!isSupabaseConfigured()) {
      return { success: true };
    }

    const serviceSupabase = getServiceSupabase();

    // 1. Fetch and clean up all resources belonging to this subject
    const { data: resources } = await serviceSupabase
      .from("resources")
      .select("id, storage_path")
      .eq("subject_id", subjectId);

    if (resources && resources.length > 0) {
      const resourceIds = resources.map((r: any) => r.id);

      // Clean up bookmarks & revision progress
      await serviceSupabase.from("bookmarks").delete().in("resource_id", resourceIds);
      await serviceSupabase.from("revision_progress").delete().in("resource_id", resourceIds);

      // Clean up local storage files
      const storagePaths = resources
        .map((r: any) => r.storage_path)
        .filter((p: string) => p && !p.startsWith("http"));

      if (storagePaths.length > 0) {
        await serviceSupabase.storage
          .from("academic-resources")
          .remove(storagePaths);
      }

      // Delete resources
      await serviceSupabase.from("resources").delete().eq("subject_id", subjectId);
    }

    // 2. Fetch and clean up all quizzes belonging to this subject
    const { data: quizzes } = await serviceSupabase
      .from("quizzes")
      .select("id")
      .eq("subject_id", subjectId);

    if (quizzes && quizzes.length > 0) {
      const quizIds = quizzes.map((q: any) => q.id);

      // Delete quiz attempt answers and attempts
      const { data: attempts } = await serviceSupabase
        .from("quiz_attempts")
        .select("id")
        .in("quiz_id", quizIds);

      if (attempts && attempts.length > 0) {
        const attemptIds = attempts.map((a: any) => a.id);
        await serviceSupabase.from("quiz_attempt_answers").delete().in("attempt_id", attemptIds);
      }
      await serviceSupabase.from("quiz_attempts").delete().in("quiz_id", quizIds);

      // Delete questions and options
      const { data: questions } = await serviceSupabase
        .from("quiz_questions")
        .select("id")
        .in("quiz_id", quizIds);

      if (questions && questions.length > 0) {
        const questionIds = questions.map((q: any) => q.id);
        await serviceSupabase.from("quiz_options").delete().in("question_id", questionIds);
        await serviceSupabase.from("quiz_questions").delete().in("id", questionIds);
      }

      // Delete quizzes
      await serviceSupabase.from("quizzes").delete().eq("subject_id", subjectId);
    }

    // 3. Delete notes belonging to this subject
    await serviceSupabase.from("notes").delete().eq("subject_id", subjectId);

    // 4. Delete subject folders
    try {
      await serviceSupabase.from("subject_folders").delete().eq("subject_id", subjectId);
    } catch {
      // Handled if folders registry was stored in notes
    }

    // 5. Delete the subject itself
    const { error } = await serviceSupabase
      .from("subjects")
      .delete()
      .eq("id", subjectId);

    if (error) {
      console.error("Delete subject error:", error);
      return { error: error.message };
    }

    safeRevalidate("/admin");
    safeRevalidate("/subjects");
    safeRevalidate("/semesters");
    safeRevalidate("/library");
    safeRevalidate("/bookmarks");
    safeRevalidate("/quizzes");
    safeRevalidate("/notes");
    safeRevalidate("/");
    return { success: true };
  } catch (err: any) {
    console.error("deleteSubject uncaught exception:", err);
    return { error: err.message || "Failed to delete subject." };
  }
}

export async function createSemester(data: {
  name: string;
  academic_year: string;
  sort_order?: number;
}): Promise<{ success?: boolean; error?: string; semester?: Semester }> {
  try {
    const adminCheck = await assertAdmin();
    if (!adminCheck.authorized) {
      return { error: adminCheck.error || "Accès refusé. Privilèges administrateur requis." };
    }

    if (adminCheck.isTemporary || adminCheck.user?.isTemporaryAdmin) {
      return { error: "Action restreinte : la création de semestres académiques est réservée à l'administrateur principal." };
    }

    if (!isSupabaseConfigured()) {
      return {
        success: true,
        semester: {
          id: `sem-${Date.now()}`,
          name: data.name.trim(),
          academic_year: data.academic_year.trim(),
          sort_order: data.sort_order || 0,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      };
    }

    const serviceSupabase = getServiceSupabase();
    const { data: sem, error } = await serviceSupabase
      .from("semesters")
      .insert({
        name: data.name.trim(),
        academic_year: data.academic_year.trim(),
        sort_order: data.sort_order || 0,
        is_active: true,
      })
      .select("*")
      .single();

    if (error) {
      return { error: error.message };
    }

    safeRevalidate("/admin");
    safeRevalidate("/semesters");
    safeRevalidate("/");
    return { success: true, semester: sem };
  } catch (err: any) {
    return { error: err.message || "Failed to create semester." };
  }
}

export interface ManagedUser {
  id: string;
  email: string;
  displayName: string;
  role: "admin" | "student";
  isPermanentAdmin: boolean;
  isTemporaryAdmin: boolean;
  expiresAt: string | null;
  isExpired: boolean;
  created_at: string;
}

export async function listManagedUsers(): Promise<{
  success?: boolean;
  error?: string;
  users?: ManagedUser[];
}> {
  try {
    const adminCheck = await assertAdmin();
    if (!adminCheck.authorized) {
      return { error: adminCheck.error || "Privilèges administrateur requis." };
    }

    if (!isSupabaseConfigured()) {
      return { success: true, users: [] };
    }

    const serviceSupabase = getServiceSupabase();

    // 1. Fetch profiles
    const { data: profiles, error: profError } = await serviceSupabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (profError) {
      return { error: profError.message };
    }

    // 2. Fetch auth users for email and temporary expiration metadata
    const { data: authData, error: authError } = await serviceSupabase.auth.admin.listUsers();
    const authUsers = authData?.users || [];
    const authMap = new Map<string, any>(authUsers.map((u: any) => [u.id, u]));

    const now = Date.now();
    const managedUsers: ManagedUser[] = (profiles || []).map((p: any) => {
      const authUser = authMap.get(p.id);
      const email = authUser?.email || "etudiant@university.tn";
      const expiresAt = authUser?.user_metadata?.temporary_admin_expires_at || null;
      const isTemporaryAdmin = p.role === "admin" && Boolean(expiresAt);
      const isExpired = isTemporaryAdmin && new Date(expiresAt).getTime() < now;
      const isPermanentAdmin = p.role === "admin" && !expiresAt;

      return {
        id: p.id,
        email,
        displayName:
          p.display_name || authUser?.user_metadata?.full_name || email.split("@")[0] || "Utilisateur",
        role: (isExpired ? "student" : p.role) as "admin" | "student",
        isPermanentAdmin,
        isTemporaryAdmin: isTemporaryAdmin && !isExpired,
        expiresAt,
        isExpired,
        created_at: p.created_at,
      };
    });

    return { success: true, users: managedUsers };
  } catch (err: any) {
    return { error: err.message || "Impossible de récupérer les utilisateurs." };
  }
}

export async function grantTemporaryAdminRole(params: {
  userId: string;
  durationDays?: number;
  customExpiresAt?: string;
}): Promise<{
  success?: boolean;
  error?: string;
  expiresAt?: string;
}> {
  try {
    const adminCheck = await assertAdmin();
    if (!adminCheck.authorized) {
      return { error: adminCheck.error || "Privilèges administrateur requis." };
    }

    // 1. Strict hierarchy: Temporary/delegated admins CANNOT modify or assign roles
    if (adminCheck.isTemporary || adminCheck.user?.isTemporaryAdmin) {
      return { error: "Action non autorisée : les administrateurs temporaires ne peuvent ni déléguer ni modifier les rôles." };
    }

    if (!params.userId) {
      return { error: "Identifiant utilisateur requis." };
    }

    // 2. Strict anti-extension: Caller cannot modify or extend their own role parameters
    if (params.userId === adminCheck.user?.id) {
      return { error: "Vous ne pouvez pas modifier ou prolonger vos propres prérogatives administratives." };
    }

    let expiresDate: Date;
    if (params.customExpiresAt) {
      expiresDate = new Date(params.customExpiresAt);
    } else {
      const days = params.durationDays && params.durationDays > 0 ? params.durationDays : 30;
      expiresDate = new Date(Date.now() + days * 24 * 3600 * 1000);
    }

    if (isNaN(expiresDate.getTime()) || expiresDate.getTime() <= Date.now()) {
      return { error: "La date d'expiration doit être dans le futur." };
    }

    const expiresAtIso = expiresDate.toISOString();

    if (!isSupabaseConfigured()) {
      // In offline/test mode, dispatch announcement notification and return
      try {
        const { createNotification } = await import("@/lib/actions/notification-actions");
        await createNotification({
          recipientId: params.userId,
          senderId: adminCheck.user?.id,
          senderName: adminCheck.user?.name || "Administrateur Principal",
          type: "role_assignment",
          title: "👑 Rôle Administrateur Délégué attribué",
          content: `Félicitations ! Vous avez été nommé administrateur temporaire jusqu'au ${expiresDate.toLocaleDateString("fr-FR")}. Vous pouvez désormais gérer le catalogue de cours et les ressources.`,
          link: "/admin",
        });
      } catch {}
      return { success: true, expiresAt: expiresAtIso };
    }

    const serviceSupabase = getServiceSupabase();

    // 3. Update user_metadata with temporary admin expiration
    const { data: userAuth, error: fetchErr } = await serviceSupabase.auth.admin.getUserById(params.userId);
    if (fetchErr || !userAuth?.user) {
      return { error: "Utilisateur introuvable." };
    }

    // Protect master admin from being altered by delegation
    if (userAuth.user.email === "yassinedrira3@gmail.com") {
      return { error: "Impossible de modifier les prérogatives de l'administrateur principal." };
    }

    const updatedMetadata = {
      ...(userAuth.user.user_metadata || {}),
      temporary_admin_expires_at: expiresAtIso,
      temporary_admin_granted_by: adminCheck.user?.email || "admin",
      temporary_admin_granted_at: new Date().toISOString(),
    };

    const { error: authUpdateErr } = await serviceSupabase.auth.admin.updateUserById(params.userId, {
      user_metadata: updatedMetadata,
    });

    if (authUpdateErr) {
      return { error: authUpdateErr.message };
    }

    // 4. Update profile role to admin
    const { error: profileErr } = await serviceSupabase
      .from("profiles")
      .update({ role: "admin", updated_at: new Date().toISOString() })
      .eq("id", params.userId);

    if (profileErr) {
      return { error: profileErr.message };
    }

    // 5. Dispatch official announcement notification
    try {
      const { createNotification } = await import("@/lib/actions/notification-actions");
      await createNotification({
        recipientId: params.userId,
        senderId: adminCheck.user?.id,
        senderName: adminCheck.user?.name || "Administrateur Principal",
        type: "role_assignment",
        title: "👑 Rôle Administrateur Délégué attribué",
        content: `Félicitations ! Vous avez été nommé administrateur temporaire jusqu'au ${expiresDate.toLocaleDateString("fr-FR")}. Vous pouvez désormais gérer le catalogue de cours et les ressources.`,
        link: "/admin",
      });
    } catch {}

    safeRevalidate("/admin");
    return { success: true, expiresAt: expiresAtIso };
  } catch (err: any) {
    return { error: err.message || "Échec de l'octroi du rôle administrateur temporaire." };
  }
}

export async function revokeAdminRole(userId: string): Promise<{
  success?: boolean;
  error?: string;
}> {
  try {
    const adminCheck = await assertAdmin();
    if (!adminCheck.authorized) {
      return { error: adminCheck.error || "Privilèges administrateur requis." };
    }

    // 1. Strict hierarchy: Temporary/delegated admins CANNOT revoke roles
    if (adminCheck.isTemporary || adminCheck.user?.isTemporaryAdmin) {
      return { error: "Action non autorisée : les administrateurs temporaires ne peuvent pas révoquer de rôles." };
    }

    // 2. Protect caller from self-revocation
    if (userId === adminCheck.user?.id) {
      return { error: "Impossible de révoquer vos propres prérogatives administratives." };
    }

    if (!isSupabaseConfigured()) {
      try {
        const { createNotification } = await import("@/lib/actions/notification-actions");
        await createNotification({
          recipientId: userId,
          senderId: adminCheck.user?.id,
          senderName: adminCheck.user?.name || "Administrateur Principal",
          type: "role_assignment",
          title: "🛡️ Fin de mandat Administrateur",
          content: "Votre mandat d'administrateur délégué est arrivé à son terme. Votre compte étudiant reste actif.",
          link: "/my-space",
        });
      } catch {}
      return { success: true };
    }

    // 3. Protect master admin from demotion
    const serviceSupabase = getServiceSupabase();
    const { data: userAuth } = await serviceSupabase.auth.admin.getUserById(userId);
    if (userAuth?.user?.email === "yassinedrira3@gmail.com") {
      return { error: "Impossible de révoquer le compte de l'administrateur principal." };
    }

    // Clear temporary admin metadata
    if (userAuth?.user) {
      const updatedMetadata = {
        ...(userAuth.user.user_metadata || {}),
        temporary_admin_expires_at: null,
      };
      await serviceSupabase.auth.admin.updateUserById(userId, {
        user_metadata: updatedMetadata,
      });
    }

    // Demote role in profiles
    const { error: profileErr } = await serviceSupabase
      .from("profiles")
      .update({ role: "student", updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (profileErr) {
      return { error: profileErr.message };
    }

    // 4. Dispatch revocation announcement notification
    try {
      const { createNotification } = await import("@/lib/actions/notification-actions");
      await createNotification({
        recipientId: userId,
        senderId: adminCheck.user?.id,
        senderName: adminCheck.user?.name || "Administrateur Principal",
        type: "role_assignment",
        title: "🛡️ Fin de mandat Administrateur",
        content: "Votre mandat d'administrateur délégué est arrivé à son terme. Votre compte étudiant reste actif.",
        link: "/my-space",
      });
    } catch {}

    safeRevalidate("/admin");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Échec de la révocation du rôle." };
  }
}
