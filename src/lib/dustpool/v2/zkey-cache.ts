// Persistent zkey cache using the Cache API.
//
// Downloads proving keys with progress tracking and caches them
// so subsequent proof generations skip the network round-trip entirely.
// Falls back to direct fetch if the Cache API is unavailable.

const CACHE_NAME = 'dust-zkeys-v2'

export interface DownloadProgress {
  loaded: number
  total: number
  percent: number
}

/**
 * Fetch a zkey, returning a cached version if available.
 * On cache miss, downloads with progress tracking and stores the result.
 * Returns the zkey as a Uint8Array ready to pass to snarkjs.
 */
export async function fetchZkeyWithCache(
  url: string,
  onProgress?: (p: DownloadProgress) => void
): Promise<Uint8Array> {
  if (typeof caches !== 'undefined') {
    try {
      const cache = await caches.open(CACHE_NAME)
      const cached = await cache.match(url)
      if (cached) {
        const buf = await cached.arrayBuffer()
        onProgress?.({ loaded: buf.byteLength, total: buf.byteLength, percent: 100 })
        return new Uint8Array(buf)
      }

      const data = await downloadWithProgress(url, onProgress)
      // Store in cache for next time (fire-and-forget)
      const response = new Response(data.slice().buffer as ArrayBuffer, {
        headers: { 'Content-Type': 'application/octet-stream' },
      })
      cache.put(url, response).catch(() => {})
      return data
    } catch {
      // Cache API failed, fall through to direct download
    }
  }

  return downloadWithProgress(url, onProgress)
}

async function downloadWithProgress(
  url: string,
  onProgress?: (p: DownloadProgress) => void
): Promise<Uint8Array> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to fetch zkey: ${response.status}`)

  const contentLength = parseInt(response.headers.get('content-length') || '0', 10)

  if (!response.body || !contentLength) {
    const buf = await response.arrayBuffer()
    onProgress?.({ loaded: buf.byteLength, total: buf.byteLength, percent: 100 })
    return new Uint8Array(buf)
  }

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let loaded = 0

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    loaded += value.byteLength
    onProgress?.({
      loaded,
      total: contentLength,
      percent: Math.round((loaded / contentLength) * 100),
    })
  }

  const result = new Uint8Array(loaded)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.byteLength
  }
  return result
}

/**
 * Check if a zkey is already cached (fast, no download).
 */
export async function isZkeyCached(url: string): Promise<boolean> {
  if (typeof caches === 'undefined') return false
  try {
    const cache = await caches.open(CACHE_NAME)
    const match = await cache.match(url)
    return match !== undefined
  } catch {
    return false
  }
}

/**
 * Pre-download a zkey into cache without returning the data.
 */
export async function preloadZkey(
  url: string,
  onProgress?: (p: DownloadProgress) => void
): Promise<void> {
  await fetchZkeyWithCache(url, onProgress)
}
