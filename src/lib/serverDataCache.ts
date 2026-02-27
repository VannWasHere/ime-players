/**
 * In-memory cache for server API responses.
 * - Caches by API URL with a TTL (default 45s)
 * - Min refresh interval (15s): rapid refreshes serve from cache to avoid API hammering
 * - After TTL expires, next fetch gets fresh data
 */

const CACHE_TTL_MS = 45_000 // 45 seconds - cache considered fresh
const MIN_REFRESH_INTERVAL_MS = 15_000 // 15 seconds - don't fetch if last fetch was recent

interface CacheEntry {
  data: unknown
  fetchedAt: number
}

const cache = new Map<string, CacheEntry>()

export function getCachedServerData(
  apiUrl: string
): { data: unknown; fetchedAt: Date } | null {
  const entry = cache.get(apiUrl)
  if (!entry) return null

  const age = Date.now() - entry.fetchedAt
  if (age > CACHE_TTL_MS) {
    cache.delete(apiUrl)
    return null
  }

  return { data: entry.data, fetchedAt: new Date(entry.fetchedAt) }
}

export function isWithinMinRefreshInterval(apiUrl: string): boolean {
  const entry = cache.get(apiUrl)
  if (!entry) return false
  return Date.now() - entry.fetchedAt < MIN_REFRESH_INTERVAL_MS
}

export function setCachedServerData(apiUrl: string, data: unknown): void {
  cache.set(apiUrl, { data, fetchedAt: Date.now() })
}
