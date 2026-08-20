import { findOneElement } from '../../../../../core/dom/traversal/index.js'
import { safeAwait } from '../../../../../core/errors/safe-await.js'
import { getText } from '../../../../../core/network/get-text.js'
import { emitSectionEvent } from '../../../../../core/shopify/events/section/index.js'

const PRODUCT_MAIN_SELECTOR = '.js-product-main.shopify-section'
const MAIN_CONTENT_ID = 'main-content'
const PRODUCT_PATH = /\/products\/[^/?#]+/
const HISTORY_STATE_KEY = 'smpSiblingSwap'

export type SwapSmpSiblingProductArgs = {
  /** Absolute or root-relative URL of the sibling product (may include ?variant=). */
  url: string
  /** Element that triggered the swap; used to locate the product-main section. */
  sourceElement?: Element | null
  /**
   * When true (default), push a history entry for the sibling URL.
   * Set false when handling popstate so we don't re-push.
   */
  pushHistory?: boolean
  /** When true, fall back to a full navigation if the product-main swap fails. */
  fallbackNavigate?: boolean
}

export type SwapSmpSiblingProductResult =
  | { ok: true }
  | { ok: false; reason: string }

type PrefetchEntry = {
  promise: Promise<string | null>
  html: string | null
}

let activeRequestId = 0
let popstateBound = false
const sectionPrefetchCache = new Map<string, PrefetchEntry>()
const fullPagePrefetchCache = new Map<string, PrefetchEntry>()

const isPrimaryUnmodifiedClick = (
  event: Pick<
    MouseEvent,
    'button' | 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey'
  >
): boolean => {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  )
}

export { isPrimaryUnmodifiedClick }

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

/** Cache key ignores hash; keeps query (e.g. variant) so prefetches stay accurate. */
export const prefetchCacheKey = (input: string): string | null => {
  const url = normalizeProductUrl(input)
  if (url == null) {
    return null
  }
  url.hash = ''
  return url.toString()
}

export const resolveProductMainSection = (
  from?: Element | null
): HTMLElement | null => {
  if (from instanceof Element) {
    const closest = from.closest('.js-product-main')
    if (
      closest instanceof HTMLElement &&
      closest.classList.contains('shopify-section')
    ) {
      return closest
    }
  }

  return findOneElement(document, PRODUCT_MAIN_SELECTOR)
}

export const resolveMainContent = (
  root: ParentNode = document
): HTMLElement | null => {
  const el =
    root instanceof Document
      ? root.getElementById(MAIN_CONTENT_ID)
      : root.querySelector(`#${MAIN_CONTENT_ID}`)
  return el instanceof HTMLElement ? el : null
}

export const resolveSectionId = (section: HTMLElement): string | null => {
  const id = section.getAttribute('id')
  if (id == null || !id.startsWith('shopify-section-')) {
    return null
  }
  const sectionId = id.slice('shopify-section-'.length)
  return sectionId.length > 0 ? sectionId : null
}

/**
 * Below-the-fold = every shopify section inside #main-content except product-main.
 */
export const getBelowFoldSections = (container: ParentNode): HTMLElement[] => {
  return [...container.children].filter(
    (child): child is HTMLElement =>
      child instanceof HTMLElement &&
      child.classList.contains('shopify-section') &&
      !child.classList.contains('js-product-main')
  )
}

export const buildSectionRenderUrl = (
  productUrl: string,
  sectionId: string
): URL | null => {
  const url = normalizeProductUrl(productUrl)
  if (url == null) {
    return null
  }
  url.searchParams.set('section_id', sectionId)
  return url
}

export const buildFullPageProductUrl = (productUrl: string): URL | null => {
  const url = normalizeProductUrl(productUrl)
  if (url == null) {
    return null
  }
  url.searchParams.delete('section_id')
  url.searchParams.delete('sections')
  return url
}

const parseSectionFromHtml = (
  html: string,
  sectionId: string
): HTMLElement | null => {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const byClass = findOneElement(doc, PRODUCT_MAIN_SELECTOR)
  if (byClass != null) {
    return byClass
  }

  const byId = doc.getElementById(`shopify-section-${sectionId}`)
  if (byId instanceof HTMLElement) {
    return byId
  }

  const first = doc.body.firstElementChild
  return first instanceof HTMLElement ? first : null
}

export const updateDocumentTitleFromSection = (section: HTMLElement): void => {
  const titleEl = findOneElement(section, '.js-product-details h1')
  const productTitle = titleEl?.textContent?.trim() ?? ''
  if (productTitle.length === 0) {
    return
  }

  const current = document.title
  const separators = [' – ', ' - ', ' | '] as const
  for (const separator of separators) {
    const index = current.indexOf(separator)
    if (index > 0) {
      document.title = `${productTitle}${separator}${current.slice(index + separator.length)}`
      return
    }
  }

  document.title = productTitle
}

const updateDocumentTitleFromFullPage = (html: string): void => {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const title = doc.querySelector('title')?.textContent?.trim()
  if (title != null && title.length > 0) {
    document.title = title
  }
}

const updateCanonicalLink = (productUrl: URL): void => {
  const canonical = document.querySelector('link[rel="canonical"]')
  if (canonical == null) {
    return
  }
  const canonicalUrl = new URL(productUrl.toString())
  canonicalUrl.search = ''
  canonicalUrl.hash = ''
  canonical.setAttribute('href', canonicalUrl.toString())
}

const setSectionBusy = (section: HTMLElement, busy: boolean): void => {
  section.setAttribute('aria-busy', busy ? 'true' : 'false')
}

const setBelowFoldBusy = (mainContent: HTMLElement, busy: boolean): void => {
  mainContent.toggleAttribute('data-smp-below-fold-loading', busy)
  getBelowFoldSections(mainContent).forEach((section) => {
    section.setAttribute('aria-busy', busy ? 'true' : 'false')
    section.style.opacity = busy ? '0.55' : ''
    section.style.pointerEvents = busy ? 'none' : ''
  })
}

const emitUnload = (section: HTMLElement): void => {
  const sectionId = resolveSectionId(section)
  if (sectionId == null) {
    return
  }
  try {
    emitSectionEvent(section, {
      type: 'shopify:section:unload',
      detail: { sectionId }
    })
  } catch (err) {
    console.error('smp-sibling-swap: failed to unload section', err)
  }
}

const emitLoad = (section: HTMLElement): void => {
  const sectionId = resolveSectionId(section)
  if (sectionId == null) {
    return
  }
  try {
    emitSectionEvent(section, {
      type: 'shopify:section:load',
      detail: { sectionId }
    })
  } catch (err) {
    console.error('smp-sibling-swap: failed to load section', err)
  }
}

const fetchSectionHtml = async (
  productUrl: string,
  sectionId: string
): Promise<string | null> => {
  const renderUrl = buildSectionRenderUrl(productUrl, sectionId)
  if (renderUrl == null) {
    return null
  }

  const [error, html] = await safeAwait(getText({ url: renderUrl }))
  if (error != null || html == null || html.trim().length === 0) {
    return null
  }

  return html
}

const fetchFullPageHtml = async (
  productUrl: string
): Promise<string | null> => {
  const pageUrl = buildFullPageProductUrl(productUrl)
  if (pageUrl == null) {
    return null
  }

  const [error, html] = await safeAwait(getText({ url: pageUrl }))
  if (error != null || html == null || html.trim().length === 0) {
    return null
  }

  return html
}

const readPrefetch = async (
  cache: Map<string, PrefetchEntry>,
  key: string,
  fetcher: () => Promise<string | null>
): Promise<string | null> => {
  const cached = cache.get(key)
  if (cached != null) {
    return cached.html ?? cached.promise
  }

  const entry: PrefetchEntry = {
    html: null,
    promise: fetcher().then((html) => {
      entry.html = html
      if (html == null) {
        cache.delete(key)
      }
      return html
    })
  }
  cache.set(key, entry)
  return entry.promise
}

/**
 * Prefetch full product HTML (primary swap source) + section markup (fallback).
 * Safe to call from hover/focus; no-ops for non-product URLs.
 */
export const prefetchSmpSiblingProduct = (
  productUrl: string,
  sourceElement?: Element | null
): void => {
  const key = prefetchCacheKey(productUrl)
  if (key == null) {
    return
  }

  const section = resolveProductMainSection(sourceElement)
  const sectionId = section != null ? resolveSectionId(section) : null

  if (sectionId != null && !sectionPrefetchCache.has(key)) {
    void readPrefetch(sectionPrefetchCache, key, () =>
      fetchSectionHtml(productUrl, sectionId)
    )
  }

  if (!fullPagePrefetchCache.has(key)) {
    void readPrefetch(fullPagePrefetchCache, key, () =>
      fetchFullPageHtml(productUrl)
    )
  }
}

const ensurePopstateListener = (): void => {
  if (popstateBound) {
    return
  }
  popstateBound = true

  window.addEventListener('popstate', () => {
    if (resolveProductMainSection() == null) {
      return
    }
    if (!PRODUCT_PATH.test(window.location.pathname)) {
      return
    }

    void swapSmpSiblingProduct({
      url: window.location.href,
      pushHistory: false,
      fallbackNavigate: true
    })
  })
}

const navigateFallback = (url: string): void => {
  window.location.assign(url)
}

const replaceProductMainFromSource = ({
  currentSection,
  nextSection
}: {
  currentSection: HTMLElement
  nextSection: HTMLElement
}): HTMLElement => {
  const imported = document.importNode(nextSection, true)
  emitUnload(currentSection)
  currentSection.replaceWith(imported)
  emitLoad(imported)
  document.dispatchEvent(new CustomEvent('portable:web-component:load'))
  return imported
}

const parseProductMainFromFullPage = (
  fullPageHtml: string
): HTMLElement | null => {
  const sourceDoc = new DOMParser().parseFromString(fullPageHtml, 'text/html')
  const sourceMain = resolveMainContent(sourceDoc)
  if (sourceMain != null) {
    return findOneElement(sourceMain, PRODUCT_MAIN_SELECTOR)
  }
  return findOneElement(sourceDoc, PRODUCT_MAIN_SELECTOR)
}

const replaceBelowFoldFromFullPage = ({
  mainContent,
  fullPageHtml,
  requestId
}: {
  mainContent: HTMLElement
  fullPageHtml: string
  requestId: number
}): boolean => {
  if (requestId !== activeRequestId) {
    return false
  }

  const sourceDoc = new DOMParser().parseFromString(fullPageHtml, 'text/html')
  const sourceMain = resolveMainContent(sourceDoc)
  if (sourceMain == null) {
    return false
  }

  const nextSections = getBelowFoldSections(sourceMain).map((section) =>
    document.importNode(section, true)
  )

  const currentSections = getBelowFoldSections(mainContent)
  currentSections.forEach((section) => {
    emitUnload(section)
    section.remove()
  })

  if (requestId !== activeRequestId) {
    return false
  }

  const productMain = findOneElement(mainContent, PRODUCT_MAIN_SELECTOR)
  let insertAfter: Element | null = productMain

  nextSections.forEach((section) => {
    if (insertAfter != null) {
      insertAfter.after(section)
    } else {
      mainContent.append(section)
    }
    insertAfter = section
    emitLoad(section)
  })

  document.dispatchEvent(new CustomEvent('portable:web-component:load'))
  updateDocumentTitleFromFullPage(fullPageHtml)
  return true
}

/**
 * SMP sibling swap.
 *
 * Prefers full product HTML so the buy box matches the target product's
 * assigned template (including template-level title/description overrides).
 * The Section Rendering API reuses the *current* section_id and would flash
 * the wrong title when siblings use different templates — so it is only a
 * fallback when the full-page fetch fails.
 *
 * Hover/focus prefetch (see prefetchSmpSiblingProduct) usually makes the
 * full-page path feel instant.
 */
export const swapSmpSiblingProduct = async ({
  url,
  sourceElement = null,
  pushHistory = true,
  fallbackNavigate = true
}: SwapSmpSiblingProductArgs): Promise<SwapSmpSiblingProductResult> => {
  ensurePopstateListener()

  const targetUrl = normalizeProductUrl(url)
  if (targetUrl == null) {
    return { ok: false, reason: 'invalid-product-url' }
  }

  const currentSection = resolveProductMainSection(sourceElement)
  if (currentSection == null) {
    if (fallbackNavigate) {
      navigateFallback(targetUrl.toString())
    }
    return { ok: false, reason: 'product-main-missing' }
  }

  const sectionId = resolveSectionId(currentSection)
  if (sectionId == null) {
    if (fallbackNavigate) {
      navigateFallback(targetUrl.toString())
    }
    return { ok: false, reason: 'section-id-missing' }
  }

  const samePath =
    targetUrl.pathname === window.location.pathname &&
    targetUrl.search === window.location.search
  if (samePath && pushHistory) {
    return { ok: true }
  }

  const requestId = ++activeRequestId
  const scrollY = window.scrollY
  const cacheKey = prefetchCacheKey(targetUrl.toString())
  const mainContent = resolveMainContent()

  setSectionBusy(currentSection, true)
  if (mainContent != null) {
    setBelowFoldBusy(mainContent, true)
  }

  const fullPageHtml =
    cacheKey != null
      ? await readPrefetch(fullPagePrefetchCache, cacheKey, () =>
          fetchFullPageHtml(targetUrl.toString())
        )
      : await fetchFullPageHtml(targetUrl.toString())

  if (requestId !== activeRequestId) {
    return { ok: false, reason: 'superseded' }
  }

  if (fullPageHtml != null && mainContent != null) {
    const fullPageProductMain = parseProductMainFromFullPage(fullPageHtml)

    if (fullPageProductMain != null) {
      const liveSection = replaceProductMainFromSource({
        currentSection,
        nextSection: fullPageProductMain
      })

      updateDocumentTitleFromSection(liveSection)
      updateCanonicalLink(targetUrl)

      if (pushHistory) {
        window.history.pushState(
          { [HISTORY_STATE_KEY]: true },
          '',
          targetUrl.toString()
        )
      }

      window.scrollTo(0, scrollY)
      setSectionBusy(liveSection, false)

      replaceBelowFoldFromFullPage({
        mainContent,
        fullPageHtml,
        requestId
      })

      if (requestId === activeRequestId) {
        setBelowFoldBusy(mainContent, false)
      }

      if (cacheKey != null) {
        fullPagePrefetchCache.delete(cacheKey)
        sectionPrefetchCache.delete(cacheKey)
      }

      return requestId === activeRequestId
        ? { ok: true }
        : { ok: false, reason: 'superseded' }
    }
  }

  // Fallback: Section Rendering API (may use the wrong template overrides —
  // only used when full-page HTML is unavailable).
  let sectionHtml: string | null = null
  if (cacheKey != null) {
    sectionHtml = await readPrefetch(sectionPrefetchCache, cacheKey, () =>
      fetchSectionHtml(targetUrl.toString(), sectionId)
    )
  } else {
    sectionHtml = await fetchSectionHtml(targetUrl.toString(), sectionId)
  }

  if (requestId !== activeRequestId) {
    return { ok: false, reason: 'superseded' }
  }

  if (sectionHtml == null) {
    setSectionBusy(currentSection, false)
    if (mainContent != null) {
      setBelowFoldBusy(mainContent, false)
    }
    if (fallbackNavigate) {
      navigateFallback(targetUrl.toString())
    }
    return { ok: false, reason: 'fetch-failed' }
  }

  const parsedSection = parseSectionFromHtml(sectionHtml, sectionId)
  if (parsedSection == null) {
    setSectionBusy(currentSection, false)
    if (mainContent != null) {
      setBelowFoldBusy(mainContent, false)
    }
    if (fallbackNavigate) {
      navigateFallback(targetUrl.toString())
    }
    return { ok: false, reason: 'parse-failed' }
  }

  const liveSection = replaceProductMainFromSource({
    currentSection,
    nextSection: parsedSection
  })

  updateDocumentTitleFromSection(liveSection)
  updateCanonicalLink(targetUrl)

  if (pushHistory) {
    window.history.pushState(
      { [HISTORY_STATE_KEY]: true },
      '',
      targetUrl.toString()
    )
  }

  window.scrollTo(0, scrollY)
  setSectionBusy(liveSection, false)

  if (mainContent != null && requestId === activeRequestId) {
    setBelowFoldBusy(mainContent, false)
  }

  if (cacheKey != null) {
    sectionPrefetchCache.delete(cacheKey)
    fullPagePrefetchCache.delete(cacheKey)
  }

  return requestId === activeRequestId
    ? { ok: true }
    : { ok: false, reason: 'superseded' }
}
