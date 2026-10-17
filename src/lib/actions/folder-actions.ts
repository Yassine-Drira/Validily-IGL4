"use server";

import { revalidatePath } from "next/cache";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { SubjectFolder } from "@/types/database";
import { getRequesterUser, assertOwnershipOrAdmin } from "@/lib/auth/authorization";
import { invalidateRepositoryCache } from "@/lib/supabase/repository";

import fs from "fs";
import path from "path";
import { getDefaultSubjectFolders } from "@/lib/constants/curriculum-folders";

const FOLDER_REGISTRY_TAG = "system_folder_registry";
const CACHE_DIR = path.join(process.cwd(), ".validily-cache");

function readDiskFolders(subjectId: string): SubjectFolder[] {
  try {
    const file = path.join(CACHE_DIR, `folders_${subjectId}.json`);
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, "utf8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed as SubjectFolder[];
    }
  } catch {}
  return [];
}

function writeDiskFolders(subjectId: string, folders: SubjectFolder[]): void {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    const file = path.join(CACHE_DIR, `folders_${subjectId}.json`);
    fs.writeFileSync(file, JSON.stringify(folders, null, 2), "utf8");
  } catch {}
}

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Outside active Next.js request context
  }
}

function isTableMissingError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || "").toLowerCase();
  return (
    msg.includes("schema cache") ||
    msg.includes("does not exist") ||
    msg.includes("could not find the table") ||
    err.code === "PGRST204" ||
    err.code === "PGRST205" ||
    err.code === "42P01"
  );
}

// In-memory cache & fallback for fast navigation without redundant DB queries
const inMemorySubjectFolders = new Map<string, { folders: SubjectFolder[]; expiry: number }>();

/**
 * Fetch all folders for a specific subject
 */
export async function getSubjectFolders(subjectId: string): Promise<SubjectFolder[]> {
  try {
    const cached = inMemorySubjectFolders.get(subjectId);
    if (cached && Date.now() < cached.expiry) {
      return cached.folders;
    }

    if (isSupabaseConfigured()) {
      try {
        const serviceSupabase = getServiceSupabase();
        const { data, error } = await serviceSupabase
          .from("subject_folders")
          .select("*")
          .eq("subject_id", subjectId)
          .order("sort_order", { ascending: true });

        if (!error && data && data.length > 0) {
          inMemorySubjectFolders.set(subjectId, {
            folders: data as SubjectFolder[],
            expiry: Date.now() + 30000,
          });
          return data as SubjectFolder[];
        }
      } catch {
        // Fall back to disk
      }
    }

    const disk = readDiskFolders(subjectId);
    if (disk.length > 0) {
      inMemorySubjectFolders.set(subjectId, {
        folders: disk,
        expiry: Date.now() + 30000,
      });
      return disk;
    }

    // Auto-heal from canonical curriculum defaults
    const canonical = getDefaultSubjectFolders(subjectId);
    if (canonical.length > 0) {
      writeDiskFolders(subjectId, canonical);
      inMemorySubjectFolders.set(subjectId, {
        folders: canonical,
        expiry: Date.now() + 30000,
      });
      return canonical;
    }

    return cached?.folders || [];
  } catch (err) {
    console.error("Failed to query subject folders:", err);
    return inMemorySubjectFolders.get(subjectId)?.folders || [];
  }
}

/**
 * Internal helper to save folders array without touching the notes table
 */
async function saveSubjectFolders(
  subjectId: string,
  folders: SubjectFolder[],
  actorUserId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    inMemorySubjectFolders.set(subjectId, {
      folders: [...folders],
      expiry: Date.now() + 30000,
    });
    writeDiskFolders(subjectId, folders);

    if (isSupabaseConfigured()) {
      try {
        const serviceSupabase = getServiceSupabase();
        if (folders.length > 0) {
          await serviceSupabase.from("subject_folders").upsert(
            folders.map((f) => ({
              id: f.id,
              subject_id: f.subject_id,
              name: f.name,
              parent_id: f.parent_id || null,
              color: f.color || "blue",
              icon: f.icon || "folder",
              description: f.description || null,
              sort_order: f.sort_order || 0,
              owner_id: f.owner_id || null,
              created_at: f.created_at,
              updated_at: new Date().toISOString(),
            }))
          );
        }
      } catch {
        // Graceful fallback to disk/memory
      }
    }

    invalidateRepositoryCache();
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
  icon?: string;
  description?: string;
}): Promise<{ success: boolean; folder?: SubjectFolder; error?: string }> {
  try {
    if (!data.name?.trim() || !data.subject_id) {
      return { success: false, error: "Le nom du dossier et la matière sont requis." };
    }

    const requester = await getRequesterUser();
    if (!requester) {
      return { success: false, error: "Authentification requise pour créer un dossier." };
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
      icon: data.icon || "folder",
      description: data.description?.trim() || undefined,
      sort_order: currentFolders.filter((f) => f.parent_id === targetParentId).length + 1,
      owner_id: requester.id,
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
 * Update comprehensive folder settings: name, color, icon, description, parent_id
 */
export async function updateFolderSettingsAction(data: {
  subject_id: string;
  folder_id: string;
  name: string;
  color?: string;
  icon?: string;
  description?: string;
  parent_id?: string | null;
}): Promise<{ success: boolean; folder?: SubjectFolder; error?: string }> {
  try {
    if (!data.name?.trim() || !data.folder_id || !data.subject_id) {
      return { success: false, error: "Nom et identifiant de dossier requis." };
    }

    const requester = await getRequesterUser();
    if (!requester) {
      return { success: false, error: "Authentification requise pour modifier les paramètres du dossier." };
    }

    const currentFolders = await getSubjectFolders(data.subject_id);
    const targetIndex = currentFolders.findIndex((f) => f.id === data.folder_id);

    if (targetIndex === -1) {
      return { success: false, error: "Dossier introuvable." };
    }

    const targetFolder = currentFolders[targetIndex];
    const authCheck = await assertOwnershipOrAdmin(targetFolder.owner_id, "ce dossier");
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error };
    }

    // Determine target parent
    const targetParentId = data.parent_id !== undefined ? data.parent_id : targetFolder.parent_id;

    // Cannot nest within self
    if (targetParentId === data.folder_id) {
      return { success: false, error: "Un dossier ne peut pas être son propre sous-dossier." };
    }

    // Circular reference check: targetParentId cannot be a descendant of folder_id
    if (targetParentId) {
      const isDescendant = (checkId: string, ancestorId: string): boolean => {
        let current = currentFolders.find((f) => f.id === checkId);
        while (current?.parent_id) {
          if (current.parent_id === ancestorId) return true;
          current = currentFolders.find((f) => f.id === current?.parent_id);
        }
        return false;
      };

      if (isDescendant(targetParentId, data.folder_id)) {
        return {
          success: false,
          error: "Impossible de placer un dossier à l'intérieur de son propre sous-dossier.",
        };
      }
    }

    // Check duplicate folder name under destination parent
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

    const updatedFolder: SubjectFolder = {
      ...targetFolder,
      name: data.name.trim(),
      parent_id: targetParentId,
      color: data.color !== undefined ? data.color : targetFolder.color,
      icon: data.icon !== undefined ? data.icon : targetFolder.icon,
      description: data.description !== undefined ? data.description.trim() : targetFolder.description,
      updated_at: new Date().toISOString(),
    };

    const updatedFolders = [...currentFolders];
    updatedFolders[targetIndex] = updatedFolder;

    const saveRes = await saveSubjectFolders(data.subject_id, updatedFolders);
    if (!saveRes.success) {
      return { success: false, error: saveRes.error };
    }

    safeRevalidate("/subjects");
    return { success: true, folder: updatedFolder };
  } catch (err: any) {
    return { success: false, error: err.message || "Échec de l'enregistrement des paramètres du dossier." };
  }
}

/**
 * Rename an existing folder (Legacy shorthand delegating to updateFolderSettingsAction)
 */
export async function renameFolderAction(data: {
  subject_id: string;
  folder_id: string;
  name: string;
}): Promise<{ success: boolean; error?: string }> {
  const res = await updateFolderSettingsAction({
    subject_id: data.subject_id,
    folder_id: data.folder_id,
    name: data.name,
  });
  return { success: res.success, error: res.error };
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

    const requester = await getRequesterUser();
    if (!requester) {
      return { success: false, error: "Authentification requise pour déplacer un dossier." };
    }

    const currentFolders = await getSubjectFolders(data.subject_id);
    const targetFolder = currentFolders.find((f) => f.id === data.folder_id);
    if (!targetFolder) {
      return { success: false, error: "Dossier cible introuvable." };
    }

    const authCheck = await assertOwnershipOrAdmin(targetFolder.owner_id, "ce dossier");
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error };
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
    const requester = await getRequesterUser();
    if (!requester) {
      return { success: false, error: "Authentification requise pour supprimer un dossier." };
    }

    const currentFolders = await getSubjectFolders(data.subject_id);
    const targetFolder = currentFolders.find((f) => f.id === data.folder_id);
    if (!targetFolder) {
      return { success: false, error: "Dossier introuvable." };
    }

    const authCheck = await assertOwnershipOrAdmin(targetFolder.owner_id, "ce dossier");
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error };
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
        .select("id, owner_id, storage_path")
        .in("chapter", foldersToDelete);

      if (resourcesToDelete && resourcesToDelete.length > 0) {
        // Enforce ownership check on ALL affected descendant resources
        const isAdmin = authCheck.isAdmin;
        const unauthorizedResource = resourcesToDelete.find(
          (r: any) => r.owner_id && r.owner_id !== requester.id && !isAdmin
        );

        if (unauthorizedResource) {
          return {
            success: false,
            error: "Accès refusé. Certains éléments contenus dans ce dossier appartiennent à un autre utilisateur.",
          };
        }

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

    if (isSupabaseConfigured()) {
      try {
        await serviceSupabase.from("subject_folders").delete().in("id", foldersToDelete);
      } catch {
        // Fallback if table not present in DB
      }
    }

    safeRevalidate("/subjects");
    safeRevalidate("/library");
    safeRevalidate(`/subjects/${data.subject_id}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Échec de la suppression du dossier." };
  }
}
