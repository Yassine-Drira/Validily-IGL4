"use server";

import fs from "fs";
import path from "path";
import { revalidatePath } from "next/cache";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { ResourceVote, ResourceVoteSummary, ResourceVoteValue } from "@/types/database";
import { getRequesterUser, checkResourceAccess } from "@/lib/auth/authorization";
import { getResourceById, getResourceVotes, invalidateRepositoryCache } from "@/lib/supabase/repository";

// Global in-memory cache surviving Next.js HMR
const globalVoteState = globalThis as unknown as {
  __localVotesStore?: Map<string, ResourceVote>;
};
if (!globalVoteState.__localVotesStore) {
  globalVoteState.__localVotesStore = new Map();
}
const localVotesStore = globalVoteState.__localVotesStore;

// Local file resilience directory
const CACHE_DIR = path.join(process.cwd(), ".validily-cache");
const VOTES_CACHE_FILE = path.join(CACHE_DIR, "resource_votes.json");

function readDiskVotesCache(): ResourceVote[] {
  try {
    if (fs.existsSync(VOTES_CACHE_FILE)) {
      const raw = fs.readFileSync(VOTES_CACHE_FILE, "utf8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

function writeDiskVotesCache(votes: ResourceVote[]): void {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    fs.writeFileSync(VOTES_CACHE_FILE, JSON.stringify(votes, null, 2), "utf8");
  } catch {}
}

async function getValidSystemUserId(serviceSupabase: any): Promise<string> {
  try {
    const { data: users } = await serviceSupabase
      .from("profiles")
      .select("id")
      .limit(1);
    if (users && users.length > 0 && users[0].id) {
      return users[0].id;
    }
  } catch {}
  try {
    const { data: authData } = await serviceSupabase.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (authData?.users?.[0]?.id) {
      return authData.users[0].id;
    }
  } catch {}
  return "d0000000-0000-0000-0000-000000000001";
}

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Outside active Next.js request context
  }
  try {
    invalidateRepositoryCache("resources");
  } catch {}
}

/**
 * Fallback loader from disk cache and DB notes
 */
export async function getDbVotesFallback(): Promise<ResourceVote[]> {
  // 1. Try disk cache first
  const diskVotes = readDiskVotesCache();
  if (diskVotes.length > 0) {
    diskVotes.forEach((v) => localVotesStore.set(`${v.user_id}:${v.resource_id}`, v));
  }

  return Array.from(localVotesStore.values());
}

export async function saveDbVotesFallback(votes: ResourceVote[]): Promise<void> {
  // 1. Update in-memory
  localVotesStore.clear();
  votes.forEach((v) => localVotesStore.set(`${v.user_id}:${v.resource_id}`, v));

  // 2. Write to disk cache
  writeDiskVotesCache(votes);

  // Compute aggregated per-resource breakdown (how many clicked up and down)
  const countsMap: Record<string, { upvotes: number; downvotes: number; score: number }> = {};
  votes.forEach((v) => {
    if (!countsMap[v.resource_id]) {
      countsMap[v.resource_id] = { upvotes: 0, downvotes: 0, score: 0 };
    }
    if (v.vote_value === 1) countsMap[v.resource_id].upvotes++;
    else if (v.vote_value === -1) countsMap[v.resource_id].downvotes++;
    countsMap[v.resource_id].score =
      countsMap[v.resource_id].upvotes - countsMap[v.resource_id].downvotes;
  });

  try {
    const countsFile = path.join(CACHE_DIR, "resource_vote_counts.json");
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    fs.writeFileSync(countsFile, JSON.stringify(countsMap, null, 2), "utf8");
  } catch {}
}

/**
 * Cast, toggle, or remove a vote on an academic resource (Reddit-style mechanism).
 * Value: 1 (Upvote), -1 (Downvote), 0 (Remove Vote / Unvote).
 *
 * Behavior:
 * - Public resources share score and aggregate votes across all users.
 * - Changing resource visibility (public <-> private) preserves all votes intact in the database.
 * - Clicking the same direction again toggles off (value: 0).
 */
export async function voteResourceAction(input: {
  resourceId: string;
  value: ResourceVoteValue;
}): Promise<{
  success: boolean;
  score: number;
  upvotes: number;
  downvotes: number;
  userVote: ResourceVoteValue;
  error?: string;
}> {
  try {
    const { resourceId, value } = input;
    if (!resourceId) {
      return { success: false, score: 0, upvotes: 0, downvotes: 0, userVote: 0, error: "Identifiant de ressource manquant." };
    }

    if (value !== 1 && value !== -1 && value !== 0) {
      return { success: false, score: 0, upvotes: 0, downvotes: 0, userVote: 0, error: "Valeur de vote invalide (-1, 0 ou 1)." };
    }

    const requester = await getRequesterUser();
    if (!requester?.id) {
      return { success: false, score: 0, upvotes: 0, downvotes: 0, userVote: 0, error: "Authentification requise pour voter." };
    }

    // 1. Authoritative access control: user must have permission to access the resource
    const resource = await getResourceById(resourceId, requester.id);
    if (!resource) {
      return { success: false, score: 0, upvotes: 0, downvotes: 0, userVote: 0, error: "Ressource introuvable." };
    }

    const access = await checkResourceAccess(resource, requester.id, "view");
    if (!access.allowed) {
      return { success: false, score: 0, upvotes: 0, downvotes: 0, userVote: 0, error: "Accès non autorisé à cette ressource." };
    }

    const serviceSupabase = getServiceSupabase();
    const isConfigured = isSupabaseConfigured() && !!serviceSupabase;

    let dbTableSuccess = false;
    let upvotes = 0;
    let downvotes = 0;
    let score = 0;

    if (isConfigured) {
      try {
        if (value === 0) {
          const { error } = await serviceSupabase
            .from("resource_votes")
            .delete()
            .eq("resource_id", resourceId)
            .eq("user_id", requester.id);
          if (error) throw error;
        } else {
          const { error } = await serviceSupabase
            .from("resource_votes")
            .upsert(
              {
                resource_id: resourceId,
                user_id: requester.id,
                vote_value: value,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "user_id,resource_id" }
            );
          if (error) throw error;
        }

        const { data: allVotes, error: selectErr } = await serviceSupabase
          .from("resource_votes")
          .select("vote_value")
          .eq("resource_id", resourceId);

        if (selectErr) throw selectErr;

        if (allVotes) {
          allVotes.forEach((v: { vote_value: number }) => {
            if (v.vote_value === 1) upvotes++;
            else if (v.vote_value === -1) downvotes++;
          });
        }
        score = upvotes - downvotes;
        dbTableSuccess = true;
      } catch {
        // Direct table unavailable or missing columns: fall back to resilient multi-tier registry
      }
    }

    if (!dbTableSuccess) {
      // Resilient Multi-tier Store
      const existingList = await getDbVotesFallback();
      const filtered = existingList.filter(
        (v) => !(v.user_id === requester.id && v.resource_id === resourceId)
      );

      if (value !== 0) {
        const newVote: ResourceVote = {
          id: `vote-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          resource_id: resourceId,
          user_id: requester.id,
          vote_value: value,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        filtered.push(newVote);
      }

      await saveDbVotesFallback(filtered);

      const resourceVotes = filtered.filter((v) => v.resource_id === resourceId);
      upvotes = 0;
      downvotes = 0;
      resourceVotes.forEach((v) => {
        if (v.vote_value === 1) upvotes++;
        else if (v.vote_value === -1) downvotes++;
      });
      score = upvotes - downvotes;
    }

    safeRevalidate(`/resources/${resourceId}`);
    safeRevalidate("/library");
    safeRevalidate("/subjects");
    safeRevalidate("/my-space");

    return {
      success: true,
      score,
      upvotes,
      downvotes,
      userVote: value,
    };
  } catch (err: any) {
    console.error("voteResourceAction exception:", err);
    return {
      success: false,
      score: 0,
      upvotes: 0,
      downvotes: 0,
      userVote: 0,
      error: err.message || "Erreur lors de l'enregistrement du vote.",
    };
  }
}

/**
 * Batch fetch vote summaries (score, upvotes, downvotes, current user's vote)
 * for a list of resource IDs in a single atomic operation.
 */
export async function getResourceVotesAction(
  resourceIds: string[]
): Promise<Record<string, ResourceVoteSummary>> {
  try {
    const requester = await getRequesterUser();
    return await getResourceVotes(resourceIds, requester?.id);
  } catch (err) {
    console.error("getResourceVotesAction error:", err);
    const result: Record<string, ResourceVoteSummary> = {};
    (resourceIds || []).forEach((id) => {
      result[id] = { score: 0, upvotes: 0, downvotes: 0, userVote: 0 };
    });
    return result;
  }
}

/**
 * Returns total contributions published by user and positive upvotes received
 */
export async function getUserContributionsStatsAction(
  userId?: string
): Promise<{ totalContributions: number; upvotesReceived: number }> {
  try {
    const requester = await getRequesterUser();
    const targetUserId = userId || requester?.id;
    if (!targetUserId) return { totalContributions: 0, upvotesReceived: 0 };

    const serviceSupabase = getServiceSupabase();
    let userResources: { id: string }[] = [];
    if (isSupabaseConfigured() && serviceSupabase) {
      try {
        const { data } = await serviceSupabase
          .from("resources")
          .select("id")
          .eq("owner_id", targetUserId)
          .eq("publication_status", "published");
        if (data) userResources = data;
      } catch {}
    }

    const totalContributions = userResources.length;
    if (totalContributions === 0) return { totalContributions: 0, upvotesReceived: 0 };

    // Calculate upvotes received using persistent votes store
    const userResourceIds = new Set(userResources.map((r) => r.id));
    const allVotes = await getDbVotesFallback();
    const upvotesReceived = allVotes.filter(
      (v) => userResourceIds.has(v.resource_id) && v.vote_value === 1
    ).length;

    return { totalContributions, upvotesReceived };
  } catch {
    return { totalContributions: 0, upvotesReceived: 0 };
  }
}
