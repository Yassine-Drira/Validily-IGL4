import { createClient, isSupabaseConfigured } from "./server";

interface SignedUrlEntry {
  url: string;
  expiresAt: number;
}

const signedUrlMemoryCache = new Map<string, SignedUrlEntry>();

/**
 * Returns a signed URL for a storage path, caching it in-memory
 * to avoid hammering Supabase Storage API on repeated views or re-renders.
 * Default expiration is 900 seconds (15 minutes); cache reuses the URL
 * as long as it has at least 60 seconds before expiration.
 */
export async function getCachedSignedUrl(
  bucketName: string,
  storagePath: string,
  expiresInSeconds: number = 900
): Promise<string | null> {
  if (!isSupabaseConfigured() || !storagePath) {
    return null;
  }

  const cacheKey = `${bucketName}:${storagePath}:${expiresInSeconds}`;
  const now = Date.now();
  const cached = signedUrlMemoryCache.get(cacheKey);

  // If cached and still valid for at least 60 seconds, reuse it directly
  if (cached && cached.expiresAt > now + 60000) {
    return cached.url;
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(storagePath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      return null;
    }

    signedUrlMemoryCache.set(cacheKey, {
      url: data.signedUrl,
      expiresAt: now + expiresInSeconds * 1000,
    });

    return data.signedUrl;
  } catch (err) {
    console.error("Failed to generate or cache signed URL:", err);
    return null;
  }
}
