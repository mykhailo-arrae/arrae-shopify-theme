import { parseSectionEventPayload } from '../events/section/payload.js'

const BLOCK_SCRIPT_SELECTOR = 'script.json-portable-block-assets'

type CleanupFn = () => void

export type InitFn = (
  block: HTMLElement,
  section: HTMLElement
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
) => CleanupFn | void

export type Options = {
  deferred?: boolean
}

export type InitPortableBlock = (
  blockName: string,
  initFn: InitFn,
  options?: Options
) => CleanupFn

const parseBlockName = (block: HTMLElement): string | null => {
  const scriptEl = block.querySelector(`:scope > ${BLOCK_SCRIPT_SELECTOR}`)

  if (scriptEl == null) {
    return null
  }

  try {
    const data: unknown = JSON.parse(scriptEl.textContent ?? '{}')

    if (
      data != null &&
      typeof data === 'object' &&
      'blockName' in data &&
      typeof data.blockName === 'string' &&
      data.blockName.length > 0
    ) {
      return data.blockName
    }

    return null
  } catch {
    return null
  }
}

const matchesBlock = (el: Element, blockName: string): el is HTMLElement => {
  return el instanceof HTMLElement && parseBlockName(el) === blockName
}

/**
 * A helper utility for initializing portable blocks in an efficient way.
 *
 * - Automatically handles initialization of all matching blocks on the page
 * - Provides access to both the block element and its parent section
 * - Handles cleanup when the parent section is unloaded in the Shopify theme editor
 * - Aware of parent section reloads and will reinitialize blocks appropriately
 * - Only initializes blocks inside a valid `.shopify-section` container
 *   (blocks outside a section are silently skipped)
 *
 * Blocks are identified by the `.shopify-block` class and an embedded
 * `script.json-portable-block-assets` JSON element containing `{"blockName":"..."}`.
 *
 * @param blockName - The name of the block to initialize (must match the folder name of the portable block)
 * @param initFn - Callback that receives the block element and its parent section.
 *                 The section argument is always a valid HTMLElement.
 *                 Can return a cleanup function called when the block is unloaded.
 * @param options - Configuration options
 * @param options.deferred - Whether to defer initialization to the next microtask (true by default)
 *
 * @returns A function that can be called to manually clean up all initialized blocks.
 *
 * @example
 * initPortableBlock('_internal-test-a', (block, section) => {
 *   const button = block.querySelector('.js-button')
 *
 *   return () => {
 *     // Clean up on section reload
 *   }
 * })
 */
export const initPortableBlock: InitPortableBlock = (
  blockName,
  initFn,
  { deferred = true } = {}
) => {
  const containerSelector = '.shopify-block'
  const controller = new AbortController()

  const Cleanups = new WeakMap<HTMLElement, CleanupFn>()

  const invokeCleanup = (block: HTMLElement): void => {
    const cln = Cleanups.get(block)

    if (cln == null) {
      return
    }

    Cleanups.delete(block)
    cln()
  }

  const load = (block: HTMLElement): void => {
    const _section = block.closest('.shopify-section')
    const section: HTMLElement | null =
      _section instanceof HTMLElement &&
      _section.id.startsWith('shopify-section-')
        ? _section
        : null

    if (section == null) {
      return
    }

    try {
      invokeCleanup(block)
    } catch (err) {
      console.error('Failed to clean up block', blockName, err)
    }

    try {
      const nextCleanup = initFn(block, section)

      if (nextCleanup != null) {
        Cleanups.set(block, nextCleanup)
      }
    } catch (err) {
      console.error('Failed to initialize block', blockName, err)
    }
  }

  const unload = (block: HTMLElement): void => {
    try {
      invokeCleanup(block)
    } catch (err) {
      console.error('Failed to clean up block', blockName, err)
    }
  }

  const queryMatchingBlocks = (root: ParentNode): HTMLElement[] => {
    return [...root.querySelectorAll(containerSelector)].filter(
      (el): el is HTMLElement => matchesBlock(el, blockName)
    )
  }

  const init = (): CleanupFn => {
    const listenerOptions = { passive: true, signal: controller.signal }

    queryMatchingBlocks(document).forEach(load)

    document.addEventListener(
      'shopify:section:unload',
      (evt: Event): void => {
        const section =
          evt.target instanceof HTMLElement &&
          evt.target.matches('.shopify-section')
            ? evt.target
            : null

        if (section == null) {
          return
        }

        queryMatchingBlocks(section).forEach(unload)
      },
      listenerOptions
    )

    document.addEventListener(
      'shopify:section:load',
      (evt: Event): void => {
        const payload = parseSectionEventPayload(evt)

        if (payload?.type !== 'shopify:section:load') {
          return
        }

        if (payload.detail.stage === 'initial') {
          return
        }

        const section =
          evt.target instanceof HTMLElement &&
          evt.target.matches('.shopify-section')
            ? evt.target
            : null

        if (section == null) {
          return
        }

        queryMatchingBlocks(section).forEach(load)
      },
      listenerOptions
    )

    return () => {
      controller.abort()

      queryMatchingBlocks(document).forEach(unload)
    }
  }

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
