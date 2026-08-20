import { emitSectionEvent } from '../events/section/index.js'
import { parseSectionEventPayload } from '../events/section/payload.js'

type Options = {
  deferred?: boolean
}

export type CleanupFn = () => void

// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
type HandleSelectSection = () => CleanupFn | void

// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
type HandleSelectBlock = (block: HTMLElement) => CleanupFn | void

export type Actions = {
  unload: CleanupFn | null
  select?: HandleSelectSection
  reorder?: () => void
  selectBlock?: HandleSelectBlock
}

const sectionActions = new WeakMap<HTMLElement, Actions>()
const sectionSelectCleanupFns = new WeakMap<HTMLElement, CleanupFn>()
const blockSelectCleanupFns = new WeakMap<HTMLElement, CleanupFn>()

const parseSection = (evt: Event, selectors: string): HTMLElement | null => {
  if (evt.target == null) {
    return null
  }

  const payload = parseSectionEventPayload(evt)

  if (payload == null) {
    return null
  }

  const {
    detail: { sectionId }
  } = payload

  return evt.target instanceof HTMLElement &&
    evt.target.getAttribute('id') === 'shopify-section-' + sectionId &&
    evt.target.matches(selectors)
    ? evt.target
    : null
}

const parseBlock = (evt: Event): HTMLElement | null => {
  const blockId: string | null =
    'detail' in evt &&
    evt.detail != null &&
    typeof evt.detail === 'object' &&
    'blockId' in evt.detail &&
    typeof evt.detail.blockId === 'string' &&
    evt.detail.blockId.length > 0
      ? evt.detail.blockId
      : null

  if (blockId == null) {
    return null
  }

  const _shopifyAttrs: string | null =
    evt.target instanceof HTMLElement && evt.target.dataset.shopifyEditorBlock
      ? evt.target.dataset.shopifyEditorBlock
      : null

  if (_shopifyAttrs == null) {
    return null
  }

  try {
    const parsedShopifyAttrs: unknown = JSON.parse(_shopifyAttrs)
    const id: string | null =
      parsedShopifyAttrs != null &&
      typeof parsedShopifyAttrs === 'object' &&
      'id' in parsedShopifyAttrs &&
      typeof parsedShopifyAttrs.id === 'string' &&
      parsedShopifyAttrs.id.length > 0
        ? parsedShopifyAttrs.id
        : null

    return evt.target instanceof HTMLElement && id === blockId
      ? evt.target
      : null
  } catch (err) {
    console.warn(
      'Shopify attributes cannot be parsed',
      {
        blockId,
        shopifyAttributes: _shopifyAttrs
      },
      err
    )
    return null
  }
}

const parseBlockSection = (
  block: HTMLElement | null,
  selectors: string
): HTMLElement | null => {
  if (block == null) {
    return null
  }

  const _section = block.closest('.shopify-section')

  const section: HTMLElement | null =
    _section instanceof HTMLElement && _section.matches(selectors)
      ? _section
      : null

  return section
}

export type InitFn = (section: HTMLElement) => Actions
export type InitSection = (
  selectors: string,
  initFn: InitFn,
  options?: Options
) => CleanupFn

/**
 * Initializes a Portable Section with JavaScript functionality and handles its lifecycle events.
 *
 * This helper manages the complete lifecycle of sections in both the public storefront and Shopify theme editor.
 * It automatically handles section load/unload events and editor-specific events like select/deselect.
 * The system detects sections on the page and initializes them, then properly cleans them up when needed.
 *
 * The pattern works similarly to React hooks - you set up functionality and define cleanup on unload.
 * When a section is reloaded in the theme editor (after settings change), this helper ensures proper
 * cleanup before reinitializing the section, preventing memory leaks and event listener duplication.
 *
 * @param selectors
 *   A CSS selector string to target your section, e.g., `.js-slideshow`.
 *   The "class" prop of section's schema should contain your class.
 *
 * @param initFn
 *   The initialization function that receives the section's HTML Element and should return an
 *   Actions object with the following methods:
 *   - `unload`: (Required) Cleanup function called when section is removed or replaced.
 *     If no cleanup is needed, explicitly return `null` for clarity.
 *   - `select`: (Optional) Called when section is selected in theme editor.
 *     Can return a cleanup function that will be called on deselect.
 *     Useful for pausing carousels or animations during editing.
 *   - `selectBlock`: (Optional) Called when a block within section is selected.
 *     Can return a cleanup function that will be called on block deselect.
 *     Useful for highlighting specific blocks within a section.
 *   - `reorder`: (Optional) Called when section is reordered in theme editor.
 *
 * @param options
 *   - `deferred`: When true (default), initialization is deferred to next microtask. Set to false
 *     for immediate initialization.
 *
 * @returns
 *   A cleanup function that removes all event listeners and calls section unload handlers.
 *   Rarely needed in practice, but safe to call multiple times.
 *
 * @example
 *   // Basic usage with event delegation
 *   const cleanup = initSection('.js-my-section', (section) => {
 *     // Create an event namespace for easy cleanup
 *     const namespace = createEventNamespace()
 *
 *     // Add delegated event listeners that work with dynamic content
 *     namespace.addDelegatedEventListener(section, '.accordion-title', 'click', (item) => {
 *       item.classList.toggle('is-active')
 *     })
 *
 *     return {
 *       unload: () => {
 *         // Automatically cleans up all event listeners
 *         namespace.destroy()
 *       },
 *       select: () => {
 *         console.log('Section selected in editor')
 *
 *         return () => {
 *           console.log('Section deselected in editor')
 *         }
 *       }
 *     }
 *   })
 *
 * @example
 *   // Using with React
 *   const cleanup = initSection('.js-react-section', (section) => {
 *     const target = section.querySelector('.js-react-mount')
 *
 *     if (!target) {
 *       throw new Error('Missing target element')
 *     }
 *
 *     const root = createRoot(target)
 *     root.render(<MyComponent />)
 *
 *     return {
 *       unload: () => {
 *         // Properly unmount React components
 *         root.unmount()
 *       }
 *     }
 *   })
 */
export const initSection: InitSection = (
  selectors,
  initFn,
  { deferred = true } = {}
) => {
  const init = (): CleanupFn => {
    const unloadSection = (section: Element | null): HTMLElement | null => {
      if (section instanceof HTMLElement === false) {
        return null
      }

      if (section.matches('.shopify-section') === false) {
        return null
      }

      const actions = sectionActions.get(section)

      if (actions?.unload == null) {
        return null
      }

      actions.unload()

      return section
    }

    const onSectionLoad = (evt: Event): void => {
      const section = parseSection(evt, selectors)

      if (section == null) {
        return
      }

      const actions = initFn(section)

      sectionActions.set(section, actions)
    }

    const onSectionUnload = (evt: Event): void => {
      unloadSection(parseSection(evt, selectors))
    }

    const onSectionSelect = (evt: Event): void => {
      const section = parseSection(evt, selectors)

      if (section == null) {
        return
      }

      const actions = sectionActions.get(section)

      if (actions?.select == null) {
        return
      }

      const cleanup = actions.select()

      if (cleanup == null) {
        return
      }

      sectionSelectCleanupFns.set(section, cleanup)
    }

    const onSectionDeselect = (evt: Event): void => {
      const section = parseSection(evt, selectors)

      if (section == null) {
        return
      }

      const cleanup = sectionSelectCleanupFns.get(section)

      if (cleanup == null) {
        return
      }

      cleanup()
    }

    const onSectioReorder = (evt: Event): void => {
      const section = parseSection(evt, selectors)

      if (section == null) {
        return
      }

      const actions = sectionActions.get(section)

      if (actions?.reorder == null) {
        return
      }

      actions.reorder()
    }

    const onBlockSelect = (evt: Event): void => {
      const block = parseBlock(evt)

      if (block == null) {
        return
      }

      const section = parseBlockSection(block, selectors)

      if (section == null) {
        return
      }

      const actions = sectionActions.get(section)

      if (actions?.selectBlock == null) {
        return
      }

      const cleanup = actions.selectBlock(block)

      if (cleanup == null) {
        return
      }

      blockSelectCleanupFns.set(block, cleanup)
    }

    const onBlockDeselect = (evt: Event) => {
      const block = parseBlock(evt)

      if (block == null) {
        return
      }

      const cleanup = blockSelectCleanupFns.get(block)

      if (cleanup == null) {
        return
      }

      cleanup()
    }

    document.addEventListener('shopify:section:load', onSectionLoad)
    document.addEventListener('shopify:section:unload', onSectionUnload)
    document.addEventListener('shopify:section:select', onSectionSelect)
    document.addEventListener('shopify:section:deselect', onSectionDeselect)
    document.addEventListener('shopify:block:select', onBlockSelect)
    document.addEventListener('shopify:block:deselect', onBlockDeselect)
    document.addEventListener('shopify:section:reorder', onSectioReorder)

    /**
     * Init matching sections on initial page load outside of Theme Editor
     */
    document.querySelectorAll(selectors).forEach((section) => {
      if (
        section instanceof HTMLElement &&
        section.matches('.shopify-section')
      ) {
        const sectionId: string | null =
          section.getAttribute('id')?.replace('shopify-section-', '') || null

        if (sectionId == null) {
          return
        }

        emitSectionEvent(section, {
          type: 'shopify:section:load',
          detail: { sectionId, stage: 'initial' }
        })
      }
    })

    return () => {
      document.querySelectorAll(selectors).forEach((_section) => {
        const section = unloadSection(_section)

        if (section == null) {
          return
        }

        sectionActions.delete(section)
      })

      document.removeEventListener('shopify:section:load', onSectionLoad)
      document.removeEventListener('shopify:section:unload', onSectionUnload)
      document.removeEventListener('shopify:section:select', onSectionSelect)
      document.removeEventListener(
        'shopify:section:deselect',
        onSectionDeselect
      )
      document.removeEventListener('shopify:block:select', onBlockSelect)
      document.removeEventListener('shopify:block:deselect', onBlockDeselect)
    }
  }

  // Defer initialization until the next microtask

  if (deferred === false) {
    return init()
  }

  let deferredCleanup: CleanupFn | null = null

  const timeout = setTimeout(() => {
    deferredCleanup = init()
  }, 0)

  return () => {
    if (deferredCleanup != null) {
      deferredCleanup()
    }

    clearTimeout(timeout)
  }
}
