import type { JSONValue } from '../../../../../core/typescript/json-value.js'

const accessByPath = new Map<string, boolean>()

const toPath = (url: string): string | null => {
  try {
    const parsed = new URL(url, window.location.origin)
    return parsed.pathname
  } catch {
    return null
  }
}

const readAccessGranted = (data: JSONValue, path: string): boolean => {
  if (data == null || typeof data !== 'object' || Array.isArray(data)) {
    return true
  }

  const entry = data[path]
  if (entry == null || typeof entry !== 'object' || Array.isArray(entry)) {
    return true
  }

  const value = entry.access_granted
  return typeof value === 'boolean' ? value : true
}

/**
 * Batches a check against Locksmith's Storefront API for whether the
 * current visitor has access to each given product URL.
 *
 * https://www.locksmith.guide/developer-tools/locksmith-storefront-api
 *
 * Fails open (treats as granted) on any error — missing app, network
 * hiccup, store without Locksmith installed — so this never blocks
 * normal SMP behaviour for shops that don't use Locksmith.
 *
 * Results are cached for the life of the page, keyed by pathname
 * (ignoring query strings such as `?variant=`, since Locksmith locks
 * the product resource, not a particular variant).
 */
export const checkLocksmithAccess = async (
  urls: string[]
): Promise<Map<string, boolean>> => {
  const pathsByUrl = new Map<string, string>()
  urls.forEach((url) => {
    const path = toPath(url)
    if (path != null) {
      pathsByUrl.set(url, path)
    }
  })

  const uncachedPaths = [...new Set(pathsByUrl.values())].filter(
    (path) => !accessByPath.has(path)
  )

  if (uncachedPaths.length > 0) {
    const params = uncachedPaths
      .map((path) => `urls[]=${encodeURIComponent(path)}`)
      .join('&')

    try {
      // Locksmith's API replies with a JSON body but an HTML content-type —
      // parse it as text and JSON.parse manually rather than using res.json().
      const res = await window.fetch(`/apps/locksmith/api/resources?${params}`)

      if (!res.ok) {
        throw new Error(`Locksmith API responded with ${res.status}`)
      }

      const data: JSONValue = JSON.parse(await res.text())

      uncachedPaths.forEach((path) => {
        accessByPath.set(path, readAccessGranted(data, path))
      })
    } catch {
      // Locksmith app not installed on this shop, proxy hiccup, etc.
      uncachedPaths.forEach((path) => {
        accessByPath.set(path, true)
      })
    }
  }

  const result = new Map<string, boolean>()
  urls.forEach((url) => {
    const path = pathsByUrl.get(url)
    result.set(url, path != null ? (accessByPath.get(path) ?? true) : true)
  })

  return result
}
