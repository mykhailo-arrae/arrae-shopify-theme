import { z } from 'zod'
import { findElements, findOneElement } from '../../core/dom/traversal/index.js'
import { safeAwait } from '../../core/errors/safe-await.js'
import { getText } from '../../core/network/get-text.js'
import { emitSnippetEvent } from '../../core/shopify/events/snippet/index.js'

const PORTABLE_SNIPPET_SELECTOR = '.portable-snippet[data-snippet-name]'
const BUYBOX_SOURCE_SELECTOR = 'template.js-quickshop-buybox-source'
const BUYBOX_SELECTOR = '.js-quickshop-buybox'
const QUICKSHOP_SECTION_SELECTOR = '.js-drawer-quickshop'

const PRODUCT_PATH = /\/products\/([^/?#]+)/

type PrefetchEntry = {
  promise: Promise<string | null>
  html: string | null
}

const sectionPrefetchCache = new Map<string, PrefetchEntry>()

const normalizeProductUrl = (input: string): URL | null => {
  try {
    const isAbsolute = /^https?:\/\//i.test(input)
    const url = isAbsolute
      ? new URL(input)
      : new URL(input, window.location.origin)
    if (!PRODUCT_PATH.test(url.pathname)) {
      return null
    }
    return url
  } catch {
    return null
  }
}

const prefetchCacheKey = (
  productUrl: string,
  sectionId: string
): string | null => {
  const url = normalizeProductUrl(productUrl)
  if (url == null) {
    return null
  }
  url.hash = ''
  return `${url.toString()}::${sectionId}`
}

export const productHandleFromUrl = (productUrl: string): string | null => {
  const url = normalizeProductUrl(productUrl)
  if (url == null) {
    return null
  }

  const match = PRODUCT_PATH.exec(url.pathname)
  const handle = match?.[1]
  return handle != null && handle.length > 0 ? decodeURIComponent(handle) : null
}

export const resolveSectionId = (section: HTMLElement): string | null => {
  const id = section.getAttribute('id')
  if (id == null || !id.startsWith('shopify-section-')) {
    return null
  }
  const sectionId = id.slice('shopify-section-'.length)
  return sectionId.length > 0 ? sectionId : null
}

export const buildQuickshopSectionUrl = (
  productUrl: string,
  sectionId: string
): URL | null => {
  const url = normalizeProductUrl(productUrl)
  if (url == null) {
    return null
  }
  url.searchParams.delete('sections')
  url.searchParams.set('section_id', sectionId)
  return url
}

const depthFromAncestor = (element: Element, ancestor: Element): number => {
  let depth = 0
  let current: Element | null = element
  while (current != null && current !== ancestor) {
    depth += 1
    current = current.parentElement
  }
  return depth
}

export const unloadPortableSnippets = (container: HTMLElement): void => {
  const topLevelSnippets = findElements(
    container,
    PORTABLE_SNIPPET_SELECTOR
  ).filter((snippet) => {
    const parentSnippet = snippet.parentElement?.closest(
      PORTABLE_SNIPPET_SELECTOR
    )
    return parentSnippet == null || !container.contains(parentSnippet)
  })

  topLevelSnippets.forEach((snippet) => {
    try {
      emitSnippetEvent(snippet, { type: 'portable:snippet:unload' })
    } catch (err: unknown) {
      console.error('quickshop: failed to unload portable snippet', err)
    }
  })
}

export const initializePortableSnippets = (container: HTMLElement): void => {
  queueMicrotask(() => {
    const snippets = findElements(container, PORTABLE_SNIPPET_SELECTOR).sort(
      (a, b) =>
        depthFromAncestor(b, container) - depthFromAncestor(a, container)
    )

    snippets.forEach((snippet) => {
      try {
        emitSnippetEvent(snippet, {
          type: 'portable:snippet:load',
          mode: 'self-only'
        })
      } catch (err: unknown) {
        console.error('quickshop: failed to init portable snippet', err)
      }
    })

    document.dispatchEvent(new CustomEvent('portable:web-component:load'))
  })
}

const buyboxFromTemplate = (
  template: HTMLTemplateElement
): HTMLElement | null => {
  const buybox = template.content.querySelector(BUYBOX_SELECTOR)
  return buybox instanceof HTMLElement ? buybox : null
}

export const extractBuyboxFromSectionHtml = (
  html: string
): HTMLElement | null => {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const template = doc.querySelector(BUYBOX_SOURCE_SELECTOR)

  if (template instanceof HTMLTemplateElement) {
    const fromTemplate = buyboxFromTemplate(template)
    if (fromTemplate != null) {
      return fromTemplate
    }
  }

  const buybox = findOneElement(doc, BUYBOX_SELECTOR)
  return buybox instanceof HTMLElement ? buybox : null
}

export const extractBuyboxFromLocalSection = (
  section: HTMLElement
): HTMLElement | null => {
  const template = section.querySelector(BUYBOX_SOURCE_SELECTOR)
  if (!(template instanceof HTMLTemplateElement)) {
    return null
  }
  return buyboxFromTemplate(template)
}

const fetchSectionHtmlUncached = async (
  productUrl: string,
  sectionId: string
): Promise<string | null> => {
  const renderUrl = buildQuickshopSectionUrl(productUrl, sectionId)
  if (renderUrl == null) {
    return null
  }

  const [error, html] = await safeAwait(getText({ url: renderUrl }))
  if (error != null || html == null || html.trim().length === 0) {
    return null
  }

  return html
}

const readPrefetch = (
  key: string,
  factory: () => Promise<string | null>
): Promise<string | null> => {
  const existing = sectionPrefetchCache.get(key)
  if (existing != null) {
    return existing.promise
  }

  const entry: PrefetchEntry = {
    html: null,
    promise: factory().then((html) => {
      entry.html = html
      // Do not keep failed fetches cached — allow retries in the same session.
      if (html == null) {
        sectionPrefetchCache.delete(key)
      }
      return html
    })
  }
  sectionPrefetchCache.set(key, entry)
  return entry.promise
}

export const fetchQuickshopSectionHtml = async (
  productUrl: string,
  sectionId: string
): Promise<string | null> => {
  const key = prefetchCacheKey(productUrl, sectionId)
  if (key == null) {
    return fetchSectionHtmlUncached(productUrl, sectionId)
  }

  return readPrefetch(key, () =>
    fetchSectionHtmlUncached(productUrl, sectionId)
  )
}

/**
 * Prefetch quickshop section HTML for a product URL (e.g. SMP sibling hover).
 * No-ops when the quickshop section is not on the page.
 * Returns a promise that settles when the fetch finishes (or immediately on no-op).
 */
export const prefetchQuickshopProduct = (productUrl: string): Promise<void> => {
  const section = document.querySelector(QUICKSHOP_SECTION_SELECTOR)
  if (!(section instanceof HTMLElement)) {
    return Promise.resolve()
  }

  const sectionId = resolveSectionId(section)
  if (sectionId == null) {
    return Promise.resolve()
  }

  const key = prefetchCacheKey(productUrl, sectionId)
  if (key == null) {
    return Promise.resolve()
  }

  return readPrefetch(key, () =>
    fetchSectionHtmlUncached(productUrl, sectionId)
  ).then(() => undefined)
}

/** Drop all cached quickshop section HTML (e.g. when the drawer closes). */
export const clearQuickshopPrefetchCache = (): void => {
  sectionPrefetchCache.clear()
}

const SmpSiblingPropsLite = z.object({
  smpSiblingOptions: z
    .array(
      z.object({
        url: z.string(),
        isCurrentProduct: z.boolean().optional().default(false)
      })
    )
    .optional()
    .default([])
})

/**
 * Reads SMP sibling product URLs from product-options props JSON in the buy box.
 * Excludes the current product. Empty when not an SMP product.
 */
export const collectSmpSiblingProductUrls = (
  container: HTMLElement
): string[] => {
  const propsEl = findOneElement(container, '.js-product-options-props')
  const raw = propsEl?.textContent?.trim()
  if (raw == null || raw.length === 0) {
    return []
  }

  try {
    const parsed = SmpSiblingPropsLite.safeParse(JSON.parse(raw))
    if (!parsed.success) {
      return []
    }

    const seen = new Set<string>()
    const urls: string[] = []

    for (const option of parsed.data.smpSiblingOptions) {
      if (option.isCurrentProduct || option.url.length === 0) {
        continue
      }
      if (seen.has(option.url)) {
        continue
      }
      seen.add(option.url)
      urls.push(option.url)
    }

    return urls
  } catch {
    return []
  }
}

/** First wave: prefer the first N siblings. */
export const SMP_PREFETCH_PRIORITY_COUNT = 4
/** Later waves: batch size for remaining siblings. */
export const SMP_PREFETCH_BATCH_SIZE = 4
/** Max parallel Section Rendering requests within a wave. */
export const SMP_PREFETCH_CONCURRENCY = 2

const runWithConcurrency = async (
  urls: string[],
  concurrency: number,
  shouldContinue: () => boolean
): Promise<void> => {
  if (urls.length === 0 || !shouldContinue()) {
    return
  }

  const queue = [...urls]
  const workerCount = Math.min(concurrency, queue.length)

  const workers = Array.from({ length: workerCount }, async () => {
    while (queue.length > 0 && shouldContinue()) {
      const url = queue.shift()
      if (url == null) {
        return
      }
      await prefetchQuickshopProduct(url)
    }
  })

  await Promise.all(workers)
}

/**
 * Prefetch SMP sibling buy boxes for quickshop.
 * First 4 siblings are fetched immediately (priority wave), then remaining
 * siblings in batches of 4. Concurrency is capped per wave.
 */
export const prefetchQuickshopSmpSiblings = async (
  urls: string[],
  shouldContinue: () => boolean = () => true
): Promise<void> => {
  if (urls.length === 0 || !shouldContinue()) {
    return
  }

  const priority = urls.slice(0, SMP_PREFETCH_PRIORITY_COUNT)
  const rest = urls.slice(SMP_PREFETCH_PRIORITY_COUNT)

  await runWithConcurrency(priority, SMP_PREFETCH_CONCURRENCY, shouldContinue)

  for (let i = 0; i < rest.length; i += SMP_PREFETCH_BATCH_SIZE) {
    if (!shouldContinue()) {
      return
    }
    const batch = rest.slice(i, i + SMP_PREFETCH_BATCH_SIZE)
    await runWithConcurrency(batch, SMP_PREFETCH_CONCURRENCY, shouldContinue)
  }
}
