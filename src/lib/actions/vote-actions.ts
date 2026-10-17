"use server";

import { revalidatePath } from "next/cache";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { ResourceVote, ResourceVoteSummary, ResourceVoteValue } from "@/types/database";
import { getRequesterUser, checkResourceAccess } from "@/lib/auth/authorization";
import { getResourceById, getResourceVotes, invalidateRepositoryCache } from "@/lib/supabase/repository";

// Local in-memory store for instantaneous offline/test resilience
const localVotesStore = new Map<string, ResourceVote>();

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Outside active Next.js request context
  }
  try {
    invalidateRepositoryCache();
  } catch {}
}

/**
 * Fallback loader from DB notes if resource_votes table is not migrated yet
 */
async function getDbVotesFallback(): Promise<ResourceVote[]> {
  try {
    const serviceSupabase = getServiceSupabase();
    if (!serviceSupabase) return Array.from(localVotesStore.values());

    const { data } = await serviceSupabase
      .from("notes")
      .select("content")
      .eq("title", "__validily_resource_votes__")
      .maybeSingle();

    if (data?.content) {
      const parsed = JSON.parse(data.content);
      if (Array.isArray(parsed)) return parsed as ResourceVote[];
    }
  } catch {}
  return Array.from(localVotesStore.values());
}

async function saveDbVotesFallback(votes: ResourceVote[]): Promise<void> {
  try {
    const serviceSupabase = getServiceSupabase();
    if (!serviceSupabase) return;

    const { data: existing } = await serviceSupabase
      .from("notes")
      .select("id")
      .eq("title", "__validily_resource_votes__")
      .maybeSingle();

    const json = JSON.stringify(votes);

    if (existing?.id) {
      await serviceSupabase
        .from("notes")
        .update({ content: json, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await serviceSupabase.from("notes").insert({
        user_id: "00000000-0000-0000-0000-000000000000",
        title: "__validily_resource_votes__",
        content: json,
        tags: ["system_votes_registry"],
        visibility: "public",
      });
    }
  } catch {}
}

/**
 * Cast, toggle, or remove a vote on an academic resource.
 * Value: 1 (Upvote), -1 (Downvote), 0 (Remove Vote).
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
    const resource = await getResourceById(resourceId);
    if (!resource) {
      return { success: false, score: 0, upvotes: 0, downvotes: 0, userVote: 0, error: "Ressource introuvable." };
    }

    const access = await checkResourceAccess(resource, requester.id, "view");
    if (!access.allowed) {
      return { success: false, score: 0, upvotes: 0, downvotes: 0, userVote: 0, error: "Accès non autorisé à cette ressource." };
    }

    const serviceSupabase = getServiceSupabase();
    const isConfigured = isSupabaseConfigured() && !!serviceSupabase;

    const voteKey = `${requester.id}:${resourceId}`;

    if (isConfigured) {
      // Direct PostgreSQL Table Execution
      try {
        if (value === 0) {
          // Remove vote
          await serviceSupabase
            .from("resource_votes")
            .delete()
            .eq("resource_id", resourceId)
            .eq("user_id", requester.id);
        } else {
          // Upsert vote
          await serviceSupabase
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
        }

        // Aggregate authoritative counts from DB
        const { data: allVotes } = await serviceSupabase
          .from("resource_votes")
          .select("vote_value")
          .eq("resource_id", resourceId);

        let upvotes = 0;
        let downvotes = 0;
        if (allVotes) {
          allVotes.forEach((v: { vote_value: number }) => {
            if (v.vote_value === 1) upvotes++;
            else if (v.vote_value === -1) downvotes++;
          });
        }
        const score = upvotes - downvotes;

        // Sync denormalized counters onto resources table if available
        try {
          await serviceSupabase
            .from("resources")
            .update({
              usefulness_score: score,
              upvotes_count: upvotes,
              downvotes_count: downvotes,
            })
            .eq("id", resourceId);
        } catch {}

        safeRevalidate(`/resources/${resourceId}`);
        safeRevalidate("/library");
        safeRevalidate("/subjects");

        return {
          success: true,
          score,
          upvotes,
          downvotes,
          userVote: value,
        };
      } catch (dbErr) {
        console.warn("Direct resource_votes table query failed, utilizing resilient fallback:", dbErr);
      }
    }

    // Resilient Fallback (In-memory + notes system)
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
      localVotesStore.set(voteKey, newVote);
    } else {
      localVotesStore.delete(voteKey);
    }

    await saveDbVotesFallback(filtered);

    // Compute score from fallback list
    const resourceVotes = filtered.filter((v) => v.resource_id === resourceId);
    let upvotes = 0;
    let downvotes = 0;
    resourceVotes.forEach((v) => {
      if (v.vote_value === 1) upvotes++;
      else if (v.vote_value === -1) downvotes++;
    });
    const score = upvotes - downvotes;

    safeRevalidate(`/resources/${resourceId}`);
    safeRevalidate("/library");

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
    if (isSupabaseConfigured() && serviceSupabase) {
      try {
        const { data: userResources } = await serviceSupabase
          .from("resources")
          .select("id, usefulness_score, upvotes_count")
          .eq("owner_id", targetUserId)
          .eq("publication_status", "published");

        if (userResources) {
          const totalContributions = userResources.length;
          const upvotesReceived = userResources.reduce(
            (acc: number, r: any) => acc + (r.upvotes_count || Math.max(0, r.usefulness_score || 0)),
            0
          );
          return { totalContributions, upvotesReceived };
        }
      } catch {}
    }

    // Local in-memory estimate
    return { totalContributions: 0, upvotesReceived: 0 };
  } catch {
    return { totalContributions: 0, upvotesReceived: 0 };
  }
}
