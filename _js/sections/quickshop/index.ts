import { findOneElement } from '../../core/dom/traversal/index.js'
import { initMainBus } from '../../core/messaging/main/index.js'
import { initSection } from '../../core/shopify/init-section/index.js'
import {
  clearQuickshopPrefetchCache,
  collectSmpSiblingProductUrls,
  extractBuyboxFromLocalSection,
  extractBuyboxFromSectionHtml,
  fetchQuickshopSectionHtml,
  initializePortableSnippets,
  prefetchQuickshopSmpSiblings,
  productHandleFromUrl,
  resolveSectionId,
  unloadPortableSnippets
} from './helpers.js'

initSection('.js-drawer-quickshop', (section) => {
  const mainBus = initMainBus()

  const drawer = findOneElement(section, '.js-quickshop')
  const content = findOneElement(section, '.js-quickshop-content')
  const loading = findOneElement(section, '.js-quickshop-loading')

  if (drawer == null || content == null) {
    return {
      unload: () => {}
    }
  }

  const sectionId = resolveSectionId(section)
  let loadedHandle: string | null = null
  let requestId = 0
  let smpPrefetchGeneration = 0

  const hasBuybox = (): boolean =>
    findOneElement(content, '.js-quickshop-buybox') != null

  const getScrollRoot = (): HTMLElement | null => {
    const scrollRoot = findOneElement(drawer, '.js-quickshop-scroll')
    return scrollRoot instanceof HTMLElement ? scrollRoot : null
  }

  const restoreScroll = (scrollRoot: HTMLElement, scrollTop: number): void => {
    const apply = (): void => {
      scrollRoot.scrollTop = scrollTop
    }

    apply()
    queueMicrotask(apply)
    requestAnimationFrame(() => {
      apply()
      requestAnimationFrame(apply)
    })
  }

  const setInitialLoading = (isLoading: boolean): void => {
    if (loading == null) {
      return
    }
    loading.hidden = !isLoading
  }

  /** Soft busy state while swapping siblings — keep current content visible. */
  const setSwapBusy = (busy: boolean): void => {
    content.setAttribute('aria-busy', busy ? 'true' : 'false')
    content.toggleAttribute('data-quickshop-busy', busy)
  }

  const clearBusy = (): void => {
    setInitialLoading(false)
    setSwapBusy(false)
  }

  const cancelSmpPrefetch = (): void => {
    smpPrefetchGeneration += 1
  }

  const clearBuybox = (): void => {
    cancelSmpPrefetch()
    unloadPortableSnippets(content)

    const existing = findOneElement(content, '.js-quickshop-buybox')
    if (existing != null) {
      existing.remove()
    }
  }

  const startSmpSiblingPrefetch = (): void => {
    const urls = collectSmpSiblingProductUrls(content)
    if (urls.length === 0) {
      return
    }

    const generation = ++smpPrefetchGeneration
    void prefetchQuickshopSmpSiblings(
      urls,
      () => generation === smpPrefetchGeneration
    ).catch((err: unknown) => {
      console.error('[quickshop] SMP sibling prefetch failed', err)
    })
  }

  const replaceBuybox = (
    buybox: HTMLElement,
    { preserveScroll }: { preserveScroll: boolean }
  ): void => {
    const scrollRoot = getScrollRoot()
    const scrollTop =
      preserveScroll && scrollRoot != null ? scrollRoot.scrollTop : 0

    const existing = findOneElement(content, '.js-quickshop-buybox')

    cancelSmpPrefetch()
    if (existing != null) {
      unloadPortableSnippets(content)
    }

    const imported = document.importNode(buybox, true)

    // Append before removing the previous buy box so scroll height doesn't
    // collapse mid-swap (which forces scrollTop to 0 in some browsers).
    content.append(imported)
    if (existing != null) {
      existing.remove()
    }

    initializePortableSnippets(content)
    startSmpSiblingPrefetch()

    if (scrollRoot != null) {
      restoreScroll(scrollRoot, preserveScroll ? scrollTop : 0)
    }
  }

  const loadProduct = async (
    productUrl: string,
    { replaceInPlace = false }: { replaceInPlace?: boolean } = {}
  ): Promise<boolean> => {
    const handle = productHandleFromUrl(productUrl)
    if (handle == null) {
      console.error('[quickshop] Invalid product URL', productUrl)
      clearBusy()
      return false
    }

    // Same product already loaded — keep current buy box.
    if (loadedHandle === handle && hasBuybox()) {
      clearBusy()
      return true
    }

    // Only SMP in-drawer swaps opt into preserve-scroll + soft busy.
    // Product-card opens always clear so the previous product never flashes.
    const isInPlaceSwap = replaceInPlace && hasBuybox()

    if (isInPlaceSwap) {
      setSwapBusy(true)
      setInitialLoading(false)
    } else {
      clearBuybox()
      loadedHandle = null
      const scrollRoot = getScrollRoot()
      if (scrollRoot != null) {
        scrollRoot.scrollTop = 0
      }
      setInitialLoading(true)
      setSwapBusy(false)
    }

    const localHandle = drawer.getAttribute('data-product-handle')
    if (localHandle === handle) {
      const localBuybox = extractBuyboxFromLocalSection(section)
      if (localBuybox != null) {
        replaceBuybox(localBuybox, { preserveScroll: isInPlaceSwap })
        loadedHandle = handle
        clearBusy()
        return true
      }
    }

    if (sectionId == null) {
      console.error('[quickshop] Missing section id')
      clearBusy()
      return false
    }

    const currentRequest = ++requestId

    const html = await fetchQuickshopSectionHtml(productUrl, sectionId)

    if (currentRequest !== requestId) {
      return false
    }

    if (html == null) {
      console.error('[quickshop] Failed to fetch section HTML', productUrl)
      clearBusy()
      return false
    }

    const buybox = extractBuyboxFromSectionHtml(html)
    if (buybox == null) {
      console.error('[quickshop] Buy box markup missing from section HTML')
      clearBusy()
      return false
    }

    replaceBuybox(buybox, { preserveScroll: isInPlaceSwap })
    loadedHandle = handle
    clearBusy()
    return true
  }

  const openRemover = mainBus
    .on('request:open-quickshop-drawer')
    .do(({ details }) => {
      const productUrl = details.productUrl
      const replaceInPlace = details.replaceInPlace === true

      // Clear immediately (sync) before the drawer expand handler runs when
      // opening a different product from a card — avoids a one-frame flash.
      if (!replaceInPlace && hasBuybox()) {
        const nextHandle = productHandleFromUrl(productUrl)
        if (nextHandle != null && nextHandle !== loadedHandle) {
          clearBuybox()
          loadedHandle = null
          setInitialLoading(true)
          setSwapBusy(false)
          const scrollRoot = getScrollRoot()
          if (scrollRoot != null) {
            scrollRoot.scrollTop = 0
          }
        }
      }

      loadProduct(productUrl, { replaceInPlace }).catch((err: unknown) => {
        console.error('[quickshop] Failed to load product', err)
        clearBusy()
      })
    })

  // Wipe SMP prefetch cache when the drawer closes.
  const drawerObserver = new MutationObserver(() => {
    if (drawer.classList.contains('is-expanded')) {
      return
    }
    cancelSmpPrefetch()
    clearQuickshopPrefetchCache()
  })
  drawerObserver.observe(drawer, {
    attributes: true,
    attributeFilter: ['class']
  })

  return {
    unload: () => {
      openRemover()
      drawerObserver.disconnect()
      cancelSmpPrefetch()
      clearQuickshopPrefetchCache()
      unloadPortableSnippets(content)
    }
  }
})
