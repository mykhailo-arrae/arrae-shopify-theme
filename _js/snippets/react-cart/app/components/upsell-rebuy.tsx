import { type FC, useEffect, useMemo, useRef, useState } from 'react'
import { getLocaleString } from '../../../../core/shopify/get-locale-string.js'
import styles from '../../styles.scss.js'
import { useCartContext } from '../context.js'
import UpsellProduct from './upsell-product.js'

const REBUY_ENRICH_DELAY_MS = 150
const FALLBACK_PREVIEW_DELAY_MS = 2500
const MAX_FALLBACK_PRODUCTS = 3
const REBUY_INIT_POLL_MS = 250
const REBUY_INIT_TIMEOUT_MS = 20_000

type RebuyVariant = {
  price: string | number
  compare_at_price?: string | number | null
}

type RebuyProduct = {
  handle: string
  description: string
  selected_variant: RebuyVariant
}

type RebuyWidget = {
  id: string | number
  element?: HTMLElement | null
  template?: string | null
  templatePromise?: Promise<unknown> | null
  data?: {
    products?: RebuyProduct[]
    cart?: unknown
  }
  render?: () => void | Promise<void>
  getWidgetProducts?: (callback?: () => void) => void
  View?: {
    vue?: {
      $destroy?: () => void
    }
  }
}

type WidgetMountBinding = {
  widget: RebuyWidget
  /** True when this call tore down Vue and re-ran `Rebuy.init()` reconnect. */
  didReconnect: boolean
}

type RebuyGlobal = {
  widgets: RebuyWidget[]
  /** Re-scans for `div[data-rebuy-id]` and creates/reconnects widgets. */
  init?: () => void
}

type CustomWindow = Window & {
  Rebuy?: RebuyGlobal
  Shopify?: {
    currency?: {
      rate?: string
    }
  }
  marketCurrencySymbol?: string
}

declare let window: CustomWindow

/**
 * Cart drawer lives in the header on every page, including `/cart`. Rebuy only
 * allows one `data-rebuy-id` per widget and removes later duplicates — so the
 * page mount must be the sole owner on the cart template.
 */
const isCartPagePath = (): boolean =>
  /\/cart\/?$/.test(window.location.pathname)

const stripTrailingPeriod = (text: string): string => text.replace(/\.$/, '')

const parsePrice = (value: string | number | null | undefined): number => {
  if (value == null || value === '') {
    return 0
  }
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const getCurrencyRate = (): number => {
  const rate = window.Shopify?.currency?.rate
  if (rate == null || rate === '') {
    return 1
  }
  const parsed = Number.parseFloat(rate)
  return Number.isFinite(parsed) ? parsed : 1
}

const ENRICHMENT_NODE_SELECTOR =
  '.c-rebuy-product-description, .c-rebuy-product-save-badge'

const isEnrichmentRelatedNode = (node: Node, mutationTarget: Node): boolean => {
  if (node instanceof Element) {
    return (
      node.matches(ENRICHMENT_NODE_SELECTOR) ||
      Boolean(node.closest(ENRICHMENT_NODE_SELECTOR))
    )
  }
  const parent =
    node.parentElement ??
    (mutationTarget instanceof Element ? mutationTarget : null)
  return parent != null && Boolean(parent.closest(ENRICHMENT_NODE_SELECTOR))
}

const isEnrichmentOnlyMutation = (mutation: MutationRecord): boolean => {
  const nodes = [
    ...Array.from(mutation.addedNodes),
    ...Array.from(mutation.removedNodes)
  ]
  if (nodes.length === 0) {
    const target = mutation.target
    return (
      target instanceof Element &&
      Boolean(target.closest(ENRICHMENT_NODE_SELECTOR))
    )
  }
  return nodes.every((node) => isEnrichmentRelatedNode(node, mutation.target))
}

/**
 * Mirrors legacy `rebuyCartUpsellWidgetHandler`: enriches Rebuy-injected product
 * blocks with description copy and a compare-at save badge.
 * Writes are idempotent so repeated calls do not churn the DOM.
 */
export const enrichRebuyCartUpsellProducts = (
  container: HTMLElement,
  widgetId: string,
  currencySymbol: string,
  currencyRate: number
): void => {
  if (typeof window.Rebuy === 'undefined' || !window.Rebuy.widgets) {
    return
  }

  const widget = window.Rebuy.widgets.find(
    (w) => String(w.id) === String(widgetId)
  )
  const products = widget?.data?.products
  if (!products?.length) {
    return
  }

  const productsDOM = container.querySelectorAll('.rebuy-product-block')
  if (!productsDOM.length) {
    return
  }

  productsDOM.forEach((productItem) => {
    const productObject = products.find((p) =>
      productItem.classList.contains(p.handle)
    )
    if (!productObject) {
      return
    }

    const title = productItem.querySelector('.rebuy-product-title')
    if (!title) {
      return
    }

    const descriptionText = stripTrailingPeriod(productObject.description)
    let descriptionElem = productItem.querySelector(
      '.c-rebuy-product-description'
    )
    if (!descriptionElem) {
      descriptionElem = document.createElement('div')
      descriptionElem.classList.add('c-rebuy-product-description')
      title.after(descriptionElem)
    }
    if (descriptionElem.textContent !== descriptionText) {
      descriptionElem.textContent = descriptionText
    }

    const originPrice = parsePrice(productObject.selected_variant.price)
    const compareAtPrice = parsePrice(
      productObject.selected_variant.compare_at_price
    )

    if (compareAtPrice > originPrice) {
      const rawDiff = (compareAtPrice - originPrice) * currencyRate
      const formattedSave =
        rawDiff % 1 === 0 ? rawDiff.toString() : Math.ceil(rawDiff).toString()
      const badgeText = `Save ${currencySymbol}${formattedSave}`

      let saveBadge = productItem.querySelector('.c-rebuy-product-save-badge')
      if (!saveBadge) {
        saveBadge = document.createElement('div')
        saveBadge.classList.add('c-rebuy-product-save-badge')
        title.appendChild(saveBadge)
      }

      if (saveBadge.textContent !== badgeText) {
        saveBadge.textContent = badgeText
      }
    } else {
      productItem.querySelector('.c-rebuy-product-save-badge')?.remove()
    }
  })
}

/**
 * Rebuy cart upsell: mounts the Rebuy widget container and enriches injected
 * `.rebuy-product-block` markup (description + save badge). When Rebuy is
 * unavailable, falls back to theme collection products via {@link UpsellProduct}.
 */
const UpsellRebuy: FC = () => {
  const { state } = useCartContext()
  const { upsell, market, layout } = state.data
  const { title, rebuy_upsell_section_id, collection_products, max_quantity } =
    upsell

  const widgetId = rebuy_upsell_section_id?.trim() ?? ''
  const moneyFormat = market?.money_format ?? '${{amount}}'
  const currencySymbol =
    market?.currency_symbol ?? window.marketCurrencySymbol ?? '$'
  /** Drawer must not compete with the cart page for the same Rebuy widget id. */
  const suppressRebuyMount = layout === 'drawer' && isCartPagePath()

  const containerRef = useRef<HTMLDivElement>(null)
  const [showFallbackPreview, setShowFallbackPreview] = useState(false)
  const [hasRebuyProductBlocks, setHasRebuyProductBlocks] = useState(false)

  const collectionHandles = useMemo(
    () =>
      (collection_products ?? [])
        .map((product) => product.handle)
        .filter((handle): handle is string => Boolean(handle))
        .slice(0, max_quantity ?? MAX_FALLBACK_PRODUCTS),
    [collection_products, max_quantity]
  )

  /**
   * Create the `data-rebuy-id` node imperatively (not via React JSX). React must
   * not reconcile that node — otherwise cart updates wipe Rebuy/Vue children.
   *
   * After hydration, leave product refresh to Rebuy's cart watcher. We only
   * re-fetch/render when the mount is missing or broken. Layouts keep this
   * component mounted across empty ↔ filled so cart changes do not destroy it.
   */
  useEffect(() => {
    if (!widgetId || suppressRebuyMount) {
      return
    }

    const host = containerRef.current
    if (!host) {
      return
    }

    let cancelled = false
    let didCreateWidget = false
    let fetchGeneration = 0
    let awaitingProducts = false

    const existingMount = host.querySelector(`[data-rebuy-id="${widgetId}"]`)
    const mountEl =
      existingMount instanceof HTMLElement
        ? existingMount
        : document.createElement('div')
    if (!(existingMount instanceof HTMLElement)) {
      mountEl.setAttribute('data-rebuy-id', widgetId)
      host.appendChild(mountEl)
    }

    const isHydrated = (el: HTMLElement): boolean =>
      Boolean(
        el.querySelector(
          '[id^="rebuy-widget-"], .rebuy-product-block, .rebuy-widget'
        )
      ) && !el.textContent?.includes('[object HTMLDivElement]')

    const hasBrokenMountMarkup = (el: HTMLElement): boolean =>
      Boolean(el.textContent?.includes('[object HTMLDivElement]'))

    /** Clear known bad stringified-node markup before any reconnect/render. */
    const clearBrokenMountMarkup = (el: HTMLElement): void => {
      if (!hasBrokenMountMarkup(el)) {
        return
      }
      el.innerHTML = ''
      el.removeAttribute('data-initialized')
    }

    const findWidget = (): RebuyWidget | undefined =>
      window.Rebuy?.widgets?.find((w) => String(w.id) === String(widgetId))

    const removeForeignMounts = (el: HTMLElement): void => {
      document
        .querySelectorAll(`[data-rebuy-id="${widgetId}"]`)
        .forEach((other) => {
          if (other === el || !(other instanceof HTMLElement)) {
            return
          }
          other.removeAttribute('data-initialized')
          other.innerHTML = ''
          other.remove()
        })
    }

    const isTemplateReady = (widget: RebuyWidget): boolean =>
      typeof widget.template === 'string' && widget.template.length > 0

    /**
     * When the widget is bound to a missing/foreign node, or this mount has the
     * known `[object HTMLDivElement]` corruption, tear down Vue and let
     * `Rebuy.init()` reconnect (clears template, reloads it, then renders).
     * Do not null the template and call `render()` ourselves — that skips
     * Rebuy's reconnect path and can leave the mount unhydrated.
     */
    const ensureWidgetBoundToMount = (
      el: HTMLElement
    ): WidgetMountBinding | undefined => {
      removeForeignMounts(el)

      const widget = findWidget()
      if (!widget) {
        clearBrokenMountMarkup(el)
        return undefined
      }

      const elementMissing =
        widget.element == null || !document.contains(widget.element)
      const elementIsForeign = widget.element != null && widget.element !== el
      const mountHasCorruptMarkup = hasBrokenMountMarkup(el)

      // Already bound to this mount and markup is fine — leave Rebuy alone
      // even if products have not rendered yet.
      if (!elementMissing && !elementIsForeign && !mountHasCorruptMarkup) {
        return { widget, didReconnect: false }
      }

      clearBrokenMountMarkup(el)
      widget.View?.vue?.$destroy?.()
      widget.template = null
      widget.templatePromise = null
      // Detached stub → initializeElements takes the reconnect branch onto `el`.
      widget.element = document.createElement('div')
      el.removeAttribute('data-initialized')
      el.innerHTML = ''

      window.Rebuy?.init?.()
      const reconnected = findWidget()
      return reconnected
        ? { widget: reconnected, didReconnect: true }
        : undefined
    }

    /**
     * Call `widget.render()` only after the template string is present. Rebuy's
     * reconnect path reloads the template asynchronously; rendering earlier can
     * stringify the mount node as `[object HTMLDivElement]`.
     */
    const renderWhenTemplateReady = (
      widget: RebuyWidget,
      generation: number,
      onReady: () => void
    ): void => {
      if (generation !== fetchGeneration || cancelled) {
        return
      }

      if (isTemplateReady(widget)) {
        onReady()
        return
      }

      const promise = widget.templatePromise
      if (promise != null) {
        void promise.then(() => {
          if (generation !== fetchGeneration || cancelled) {
            return
          }
          if (!isTemplateReady(widget)) {
            return
          }
          onReady()
        })
        return
      }

      // Template reload has not produced a promise yet — leave for poll/events.
    }

    const fetchProductsAndRender = (widget: RebuyWidget): void => {
      if (cancelled || awaitingProducts) {
        return
      }

      const generation = ++fetchGeneration

      const runRender = (): void => {
        if (generation !== fetchGeneration) {
          return
        }
        awaitingProducts = false
        if (cancelled) {
          return
        }

        renderWhenTemplateReady(widget, generation, () => {
          if (widget.data && !Array.isArray(widget.data.products)) {
            widget.data.products = []
          }
          void widget.render?.()
        })
      }

      if (typeof widget.getWidgetProducts !== 'function') {
        runRender()
        return
      }

      awaitingProducts = true
      widget.getWidgetProducts(runRender)

      window.setTimeout(() => {
        if (generation === fetchGeneration && awaitingProducts) {
          awaitingProducts = false
        }
      }, 2000)
    }

    const tryInitRebuyWidget = (): boolean => {
      if (cancelled) {
        return true
      }

      const rebuy = window.Rebuy
      if (typeof rebuy?.init !== 'function') {
        return false
      }

      if (!document.contains(mountEl)) {
        return false
      }

      // Healthy mount — do not re-render; Rebuy's cart watcher owns updates.
      if (isHydrated(mountEl) && findWidget()?.element === mountEl) {
        return true
      }

      removeForeignMounts(mountEl)

      let widget = findWidget()
      if (!widget) {
        if (!didCreateWidget) {
          mountEl.removeAttribute('data-initialized')
          rebuy.init()
          didCreateWidget = true
        }
        widget = findWidget()
      }

      if (widget) {
        const binding = ensureWidgetBoundToMount(mountEl)
        if (binding) {
          widget = binding.widget
        }
        // After reconnect, Rebuy reloads the template then renders on its own.
        // Calling fetch/render immediately races that reload and can corrupt
        // the mount. Poll/events will fetch products once the template is ready
        // and the mount is still empty.
        if (!binding?.didReconnect && !isHydrated(mountEl)) {
          fetchProductsAndRender(widget)
        }
      }

      return isHydrated(mountEl) && findWidget()?.element === mountEl
    }

    tryInitRebuyWidget()

    const onRebuyEvent = () => {
      if (cancelled) {
        return
      }
      // Only recover when the mount lost its widget; skip healthy updates.
      if (isHydrated(mountEl) && findWidget()?.element === mountEl) {
        return
      }
      awaitingProducts = false
      tryInitRebuyWidget()
    }
    document.addEventListener('rebuy.loaded', onRebuyEvent)
    document.addEventListener('rebuy:cart.ready', onRebuyEvent)
    document.addEventListener('rebuy.ready', onRebuyEvent)
    document.addEventListener('rebuy:cart.change', onRebuyEvent)
    document.addEventListener('rebuy:cart.add', onRebuyEvent)

    const pollId = window.setInterval(() => {
      if (tryInitRebuyWidget()) {
        window.clearInterval(pollId)
      }
    }, REBUY_INIT_POLL_MS)

    const stopPollId = window.setTimeout(() => {
      window.clearInterval(pollId)
    }, REBUY_INIT_TIMEOUT_MS)

    return () => {
      cancelled = true
      document.removeEventListener('rebuy.loaded', onRebuyEvent)
      document.removeEventListener('rebuy:cart.ready', onRebuyEvent)
      document.removeEventListener('rebuy.ready', onRebuyEvent)
      document.removeEventListener('rebuy:cart.change', onRebuyEvent)
      document.removeEventListener('rebuy:cart.add', onRebuyEvent)
      window.clearInterval(pollId)
      window.clearTimeout(stopPollId)
    }
  }, [widgetId, suppressRebuyMount])

  useEffect(() => {
    const container = containerRef.current
    if (!container || !widgetId || suppressRebuyMount) {
      return
    }

    let enrichTimeout: number | null = null
    let isEnriching = false
    const observerRef: { current: MutationObserver | null } = { current: null }

    const scheduleEnrichment = () => {
      if (enrichTimeout != null) {
        window.clearTimeout(enrichTimeout)
      }

      enrichTimeout = window.setTimeout(() => {
        const observer = observerRef.current
        if (!observer) {
          return
        }

        isEnriching = true
        observer.disconnect()

        enrichRebuyCartUpsellProducts(
          container,
          widgetId,
          currencySymbol,
          getCurrencyRate()
        )

        observer.takeRecords()
        observer.observe(container, { childList: true, subtree: true })
        isEnriching = false

        const blockCount = container.querySelectorAll(
          '.rebuy-product-block'
        ).length
        if (blockCount > 0) {
          setHasRebuyProductBlocks(true)
          setShowFallbackPreview(false)
        }
      }, REBUY_ENRICH_DELAY_MS)
    }

    observerRef.current = new MutationObserver((mutations) => {
      if (isEnriching) {
        return
      }
      if (mutations.every(isEnrichmentOnlyMutation)) {
        return
      }
      scheduleEnrichment()
    })

    scheduleEnrichment()
    observerRef.current.observe(container, { childList: true, subtree: true })

    return () => {
      observerRef.current?.disconnect()
      if (enrichTimeout != null) {
        window.clearTimeout(enrichTimeout)
      }
    }
  }, [widgetId, currencySymbol, suppressRebuyMount])

  useEffect(() => {
    if (suppressRebuyMount) {
      return
    }

    if (!widgetId) {
      setShowFallbackPreview(true)
      return
    }

    if (hasRebuyProductBlocks) {
      return
    }

    const timeout = window.setTimeout(() => {
      const container = containerRef.current
      const blockCount =
        container?.querySelectorAll('.rebuy-product-block').length ?? 0
      const rebuyReady =
        typeof window.Rebuy !== 'undefined' && Boolean(window.Rebuy?.widgets)

      if (blockCount === 0 && !rebuyReady) {
        setShowFallbackPreview(true)
      }
    }, FALLBACK_PREVIEW_DELAY_MS)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [hasRebuyProductBlocks, widgetId, suppressRebuyMount])

  if (suppressRebuyMount) {
    return null
  }

  return (
    <>
      {title ? <h2 className={styles.upsell__title}>{title}</h2> : null}

      {widgetId ? (
        <div
          ref={containerRef}
          className="cart-drawer__upsell"
          role="region"
          aria-label={getLocaleString(
            'snippets.react_cart.upsell_carousel_aria_label'
          )}
        />
      ) : null}

      {showFallbackPreview &&
      !hasRebuyProductBlocks &&
      collectionHandles.length > 0 ? (
        <div className={styles.upsell__list} role="list">
          {collectionHandles.map((handle) => (
            <UpsellProduct
              key={handle}
              handle={handle}
              money_format={moneyFormat}
            />
          ))}
        </div>
      ) : null}
    </>
  )
}

export default UpsellRebuy
