"use server";

import { revalidatePath } from "next/cache";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getServiceSupabase, getEffectiveUserId } from "@/lib/supabase/admin";
import { SubjectFolder } from "@/types/database";

const FOLDER_REGISTRY_TAG = "system_folder_registry";

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Outside active Next.js request context
  }
}

/**
 * Fetch all folders for a specific subject
 */
export async function getSubjectFolders(subjectId: string): Promise<SubjectFolder[]> {
  try {
    if (!isSupabaseConfigured()) {
      return [];
    }

    const serviceSupabase = getServiceSupabase();
    const { data, error } = await serviceSupabase
      .from("notes")
      .select("id, content")
      .eq("subject_id", subjectId)
      .contains("tags", [FOLDER_REGISTRY_TAG])
      .maybeSingle();

    if (error || !data || !data.content) {
      return [];
    }

    try {
      const parsed = JSON.parse(data.content);
      if (Array.isArray(parsed)) {
        return parsed as SubjectFolder[];
      }
      return [];
    } catch {
      return [];
    }
  } catch (err) {
    console.error("Failed to query subject folders:", err);
    return [];
  }
}

/**
 * Internal helper to save folders array to the subject's folder registry note
 */
async function saveSubjectFolders(
  subjectId: string,
  folders: SubjectFolder[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const serviceSupabase = getServiceSupabase();
    const userId = await getEffectiveUserId();

    const { data: existing } = await serviceSupabase
      .from("notes")
      .select("id")
      .eq("subject_id", subjectId)
      .contains("tags", [FOLDER_REGISTRY_TAG])
      .maybeSingle();

    const jsonContent = JSON.stringify(folders);

    if (existing?.id) {
      const { error } = await serviceSupabase
        .from("notes")
        .update({
          content: jsonContent,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (error) return { success: false, error: error.message };
    } else {
      const { error } = await serviceSupabase.from("notes").insert({
        user_id: userId,
        subject_id: subjectId,
        title: "__folder_registry__",
        content: jsonContent,
        tags: [FOLDER_REGISTRY_TAG],
        visibility: "public",
      });

      if (error) return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to save folders." };
  }
}

/**
 * Create a new folder or subfolder within a subject
 */
export async function createFolderAction(data: {
  subject_id: string;
  name: string;
  parent_id?: string | null;
  color?: string;
}): Promise<{ success: boolean; folder?: SubjectFolder; error?: string }> {
  try {
    if (!data.name?.trim() || !data.subject_id) {
      return { success: false, error: "Le nom du dossier et la matière sont requis." };
    }

    const currentFolders = await getSubjectFolders(data.subject_id);

    // Check for duplicate folder name under same parent
    const targetParentId = data.parent_id || null;
    const nameExists = currentFolders.some(
      (f) =>
        f.parent_id === targetParentId &&
        f.name.trim().toLowerCase() === data.name.trim().toLowerCase()
    );

    if (nameExists) {
      return {
        success: false,
        error: "Un dossier avec ce nom existe déjà à cet emplacement.",
      };
    }

    const newFolder: SubjectFolder = {
      id: `f_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      subject_id: data.subject_id,
      name: data.name.trim(),
      parent_id: targetParentId,
      color: data.color || "blue",
      sort_order: currentFolders.filter((f) => f.parent_id === targetParentId).length + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const updatedFolders = [...currentFolders, newFolder];
    const saveRes = await saveSubjectFolders(data.subject_id, updatedFolders);

    if (!saveRes.success) {
      return { success: false, error: saveRes.error };
    }

    safeRevalidate(`/subjects`);
    return { success: true, folder: newFolder };
  } catch (err: any) {
    return { success: false, error: err.message || "Erreur lors de la création du dossier." };
  }
}

/**
 * Rename an existing folder
 */
export async function renameFolderAction(data: {
  subject_id: string;
  folder_id: string;
  name: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (!data.name?.trim() || !data.folder_id || !data.subject_id) {
      return { success: false, error: "Nom et identifiant de dossier requis." };
    }

    const currentFolders = await getSubjectFolders(data.subject_id);
    const targetIndex = currentFolders.findIndex((f) => f.id === data.folder_id);

    if (targetIndex === -1) {
      return { success: false, error: "Dossier introuvable." };
    }

    const targetParentId = currentFolders[targetIndex].parent_id;
    const duplicate = currentFolders.some(
      (f) =>
        f.id !== data.folder_id &&
        f.parent_id === targetParentId &&
        f.name.trim().toLowerCase() === data.name.trim().toLowerCase()
    );

    if (duplicate) {
      return {
        success: false,
        error: "Un autre dossier porte déjà ce nom dans ce répertoire.",
      };
    }

    const updatedFolders = [...currentFolders];
    updatedFolders[targetIndex] = {
      ...updatedFolders[targetIndex],
      name: data.name.trim(),
      updated_at: new Date().toISOString(),
    };

    const saveRes = await saveSubjectFolders(data.subject_id, updatedFolders);
    if (!saveRes.success) {
      return { success: false, error: saveRes.error };
    }

    safeRevalidate("/subjects");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Échec du renommage du dossier." };
  }
}

/**
 * Move a folder into another parent folder or to root (parent_id = null)
 */
export async function moveFolderAction(data: {
  subject_id: string;
  folder_id: string;
  new_parent_id: string | null;
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (data.folder_id === data.new_parent_id) {
      return { success: false, error: "Un dossier ne peut pas être déplacé dans lui-même." };
    }

    const currentFolders = await getSubjectFolders(data.subject_id);
    const targetFolder = currentFolders.find((f) => f.id === data.folder_id);
    if (!targetFolder) {
      return { success: false, error: "Dossier cible introuvable." };
    }

    // Check circular reference: new_parent cannot be any descendant of folder_id
    if (data.new_parent_id) {
      const isDescendant = (checkId: string, ancestorId: string): boolean => {
        let current = currentFolders.find((f) => f.id === checkId);
        while (current?.parent_id) {
          if (current.parent_id === ancestorId) return true;
          current = currentFolders.find((f) => f.id === current?.parent_id);
        }
        return false;
      };

      if (isDescendant(data.new_parent_id, data.folder_id)) {
        return {
          success: false,
          error: "Impossible de déplacer un dossier à l'intérieur de son propre sous-dossier.",
        };
      }
    }

    const updatedFolders = currentFolders.map((f) => {
      if (f.id === data.folder_id) {
        return {
          ...f,
          parent_id: data.new_parent_id,
          updated_at: new Date().toISOString(),
        };
      }
      return f;
    });

    const saveRes = await saveSubjectFolders(data.subject_id, updatedFolders);
    if (!saveRes.success) {
      return { success: false, error: saveRes.error };
    }

    safeRevalidate("/subjects");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Échec du déplacement du dossier." };
  }
}

/**
 * Delete a folder and handle contained resources and subfolders
 */
export async function deleteFolderAction(data: {
  subject_id: string;
  folder_id: string;
  deleteContents?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const currentFolders = await getSubjectFolders(data.subject_id);
    const targetFolder = currentFolders.find((f) => f.id === data.folder_id);
    if (!targetFolder) {
      return { success: false, error: "Dossier introuvable." };
    }

    // Gather all descendant folder IDs recursively
    const getDescendants = (parentId: string): string[] => {
      const children = currentFolders.filter((f) => f.parent_id === parentId);
      let ids: string[] = [];
      for (const child of children) {
        ids.push(child.id);
        ids = ids.concat(getDescendants(child.id));
      }
      return ids;
    };

    const foldersToDelete = [data.folder_id, ...getDescendants(data.folder_id)];
    const serviceSupabase = getServiceSupabase();

    if (data.deleteContents) {
      // Find all resources inside these folders
      const { data: resourcesToDelete } = await serviceSupabase
        .from("resources")
        .select("id, storage_path")
        .in("chapter", foldersToDelete);

      if (resourcesToDelete && resourcesToDelete.length > 0) {
        // Delete files from storage
        const storagePaths = resourcesToDelete
          .map((r: any) => r.storage_path)
          .filter((p: string) => p && !p.startsWith("http"));

        if (storagePaths.length > 0) {
          await serviceSupabase.storage
            .from("academic-resources")
            .remove(storagePaths);
        }

        const ids = resourcesToDelete.map((r: any) => r.id);
        if (ids.length > 0) {
          await serviceSupabase.from("bookmarks").delete().in("resource_id", ids);
          await serviceSupabase.from("revision_progress").delete().in("resource_id", ids);
          await serviceSupabase.from("resources").delete().in("id", ids);
        }
      }
    } else {
      // Move contained resources to the parent of the deleted folder (or root)
      const targetMoveParentId = targetFolder.parent_id || null;
      await serviceSupabase
        .from("resources")
        .update({ chapter: targetMoveParentId })
        .in("chapter", foldersToDelete);
    }

    // Remove deleted folders from array
    const updatedFolders = currentFolders.filter((f) => !foldersToDelete.includes(f.id));
    const saveRes = await saveSubjectFolders(data.subject_id, updatedFolders);

    if (!saveRes.success) {
      return { success: false, error: saveRes.error };
    }

    safeRevalidate("/subjects");
    safeRevalidate("/library");
    safeRevalidate(`/subjects/${data.subject_id}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Échec de la suppression du dossier." };
  }
}
