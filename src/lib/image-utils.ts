/**
 * Image utility functions for performance optimization.
 */

/**
 * Converts a base64 string to a Blob URL.
 * Blob URLs are much more memory-efficient than data URLs for large images.
 */
export function base64ToBlobUrl(base64: string, mimeType?: string): string {
  // Detect mime type from base64 header if not provided
  if (!mimeType) {
    if (base64.startsWith('/9j/')) {
      mimeType = 'image/jpeg'
    } else if (base64.startsWith('iVBORw')) {
      mimeType = 'image/png'
    } else if (base64.startsWith('R0lGOD')) {
      mimeType = 'image/gif'
    } else if (base64.startsWith('UklGR')) {
      mimeType = 'image/webp'
    } else {
      mimeType = 'image/png' // Default fallback
    }
  }

  // Decode base64 to binary
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }

  // Create blob and URL
  const blob = new Blob([bytes], { type: mimeType })
  return URL.createObjectURL(blob)
}

/**
 * Checks if a string is a base64 image (not a URL or blob URL).
 */
export function isBase64Image(str: string): boolean {
  if (!str) return false
  return !str.startsWith('http') && !str.startsWith('data:') && !str.startsWith('blob:')
}

/**
 * Converts an image source to an optimized blob URL if it's base64.
 * Returns the original URL if it's already a URL or blob.
 */
export function toOptimizedImageUrl(src: string): string {
  if (!src) return src

  // Already a URL or blob
  if (src.startsWith('http') || src.startsWith('blob:')) {
    return src
  }

  // Data URL - extract base64 and convert
  if (src.startsWith('data:')) {
    const base64Match = src.match(/^data:([^;]+);base64,(.+)$/)
    if (base64Match) {
      const mimeType = base64Match[1]
      const base64Data = base64Match[2]
      if (base64Data) {
        return base64ToBlobUrl(base64Data, mimeType)
      }
    }
    return src
  }

  // Raw base64 - convert to blob URL
  return base64ToBlobUrl(src)
}

/**
 * Cache for blob URLs to avoid recreating them.
 */
const blobUrlCache = new Map<string, string>()
const MAX_CACHE_SIZE = 50

/**
 * Gets or creates an optimized blob URL with caching.
 * Uses a hash of the first 100 chars + length as cache key for efficiency.
 */
export function getCachedBlobUrl(src: string): string {
  if (!src) return src

  // Already a URL or blob - return as-is
  if (src.startsWith('http') || src.startsWith('blob:')) {
    return src
  }

  // Create cache key from first/last chars and length
  const cacheKey = `${src.slice(0, 50)}_${src.slice(-50)}_${src.length}`

  // Check cache
  const cached = blobUrlCache.get(cacheKey)
  if (cached) {
    return cached
  }

  // Convert and cache
  const blobUrl = toOptimizedImageUrl(src)

  // Evict oldest entries if cache is full
  if (blobUrlCache.size >= MAX_CACHE_SIZE) {
    const firstKey = blobUrlCache.keys().next().value
    if (firstKey) {
      const oldUrl = blobUrlCache.get(firstKey)
      if (oldUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(oldUrl)
      }
      blobUrlCache.delete(firstKey)
    }
  }

  blobUrlCache.set(cacheKey, blobUrl)
  return blobUrl
}

/**
 * Clears a specific blob URL from cache and revokes it.
 */
export function revokeCachedBlobUrl(src: string): void {
  const cacheKey = `${src.slice(0, 50)}_${src.slice(-50)}_${src.length}`
  const cached = blobUrlCache.get(cacheKey)
  if (cached?.startsWith('blob:')) {
    URL.revokeObjectURL(cached)
    blobUrlCache.delete(cacheKey)
  }
}

/**
 * Clears all cached blob URLs.
 */
export function clearBlobUrlCache(): void {
  for (const url of blobUrlCache.values()) {
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url)
    }
  }
  blobUrlCache.clear()
}
