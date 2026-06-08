const CACHE_NAME = 'storybook-images-v1';

export async function getCachedImage(url: string): Promise<string | null> {
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(url);
    if (response) {
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    }
    return null;
  } catch {
    return null;
  }
}

export async function cacheAndFetchImage(url: string): Promise<string> {
  // Check cache first
  const cached = await getCachedImage(url);
  if (cached) return cached;

  // Fetch and cache
  const response = await fetch(url);
  const cache = await caches.open(CACHE_NAME);
  // Clone because response can only be consumed once
  cache.put(url, response.clone());

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export async function preloadStoryImages(urls: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();

  await Promise.all(
    urls.map(async (url) => {
      if (!url) return;
      try {
        // Check cache first
        let cached = await getCachedImage(url);
        if (!cached) {
          // Fetch and cache
          const response = await fetch(url);
          const cache = await caches.open(CACHE_NAME);
          cache.put(url, response.clone());
          const blob = await response.blob();
          cached = URL.createObjectURL(blob);
        }
        map.set(url, cached);
      } catch {
        // Image failed to load, skip
      }
    })
  );

  return map;
}