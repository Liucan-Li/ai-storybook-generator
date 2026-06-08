const CACHE_NAME = 'storybook-images-v1';

// Module-level dedup: CDN URL → blob URL (shared across renders)
const sessionBlobUrls = new Map<string, string>();

export function getSessionBlobUrl(url: string): string | undefined {
  return sessionBlobUrls.get(url);
}

async function openCache(): Promise<Cache | null> {
  try {
    return await caches.open(CACHE_NAME);
  } catch {
    return null;
  }
}

/**
 * Get a blob URL for display: session map → Cache API → network fetch.
 */
export async function getDisplayUrl(
  url: string
): Promise<{ blobUrl: string; fromCache: boolean }> {
  // Layer 1: session blob URL dedup
  const existing = getSessionBlobUrl(url);
  if (existing) return { blobUrl: existing, fromCache: true };

  const cache = await openCache();

  // Layer 2: Cache API
  if (cache) {
    const cached = await cache.match(url);
    if (cached) {
      const blob = await cached.blob();
      const blobUrl = URL.createObjectURL(blob);
      sessionBlobUrls.set(url, blobUrl);
      return { blobUrl, fromCache: true };
    }
  }

  // Layer 3: Network + cache
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  if (cache) {
    await cache.put(url, response.clone());
  }

  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  sessionBlobUrls.set(url, blobUrl);
  return { blobUrl, fromCache: false };
}

/**
 * Preload all images in parallel. Failed images are skipped.
 */
export async function preloadImages(urls: string[]): Promise<Record<string, string>> {
  const results: Record<string, string> = {};

  await Promise.allSettled(
    urls.map(async (url) => {
      const { blobUrl } = await getDisplayUrl(url);
      results[url] = blobUrl;
    })
  );

  return results;
}

/**
 * Get a cached image as base64 data URI (for PDF export).
 */
export async function getOrFetchDataUrl(url: string): Promise<string> {
  const cache = await openCache();
  let blob: Blob | null = null;

  if (cache) {
    const cached = await cache.match(url);
    if (cached) {
      blob = await cached.blob();
    }
  }

  if (!blob) {
    const response = await fetch(url);
    blob = await response.blob();
    if (cache) await cache.put(url, response.clone());
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob!);
  });
}
