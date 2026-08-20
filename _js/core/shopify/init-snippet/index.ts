import { parseSectionEventPayload } from '../events/section/payload.js'
import { emitSnippetEvent } from '../events/snippet/index.js'
import { parseSnippetEventPayload } from '../events/snippet/payload.js'

const PORTABLE_SNIPPET_SELECTOR = `.portable-snippet[data-snippet-name]`

type CleanupFn = () => void

export type InitFn = (
  snippet: HTMLElement,
  section: HTMLElement | null
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
) => CleanupFn | void

export type Options = {
  deferred?: boolean
}

export type InitSnippet = (
  snippetName: string,
  initFn: InitFn,
  options?: Options
) => CleanupFn

/**
 * A helper utility for initializing portable snippets in an efficient way.
 *
 * - Automatically handles initialization of all matching snippets on the page
 * - Provides access to both the snippet element and its parent section
 * - Handles cleanup when the snippet or the parent section are unloaded in the Shopify theme editor
 * - Aware of parent section reloads and will reinitialize snippets appropriately
 * - Manages nested snippets and their lifecycle events
 *
 * Unlike initSection, the initSnippet helper only has the unload/cleanup lifecycle function.
 * It's particularly useful for reusable components that might appear within different sections.
 *
 * @param {string} snippetName - The filename of the snippet to initialize (must match the folder name of the portable snippet)
 * @param {InitFn} initFn - Callback function that receives the snippet element and parent section.
 *                          Can return a cleanup function that will be called when the snippet is unloaded.
 * @param {Object} [options] - Configuration options
 * @param {boolean} [options.deferred=true] - Whether to defer initialization to the next microtask (true by default)
 *
 * @returns {CleanupFn} A function that can be called to manually clean up all initialized snippets.
 *
 * @example
 * // Basic usage
 * initSnippet('product-card', (snippet, section) => {
 *   // Initialize snippet
 *   const element = snippet.querySelector('.some-element');
 *
 *   // Set up event handlers or other functionality
 *
 *   // Return cleanup function
 *   return () => {
 *     // Clean up resources when snippet is unloaded
 *     // This helps prevent memory leaks
 *   };
 * });
 *
 * @example
 * // React app initialization in a snippet
 * initSnippet('product-card', (snippet, section) => {
 *   const rootElement = snippet.querySelector('.react-root');
 *
 *   if (!rootElement) {
 *     throw new Error('Missing root element')
 *   }
 *
 *   const root = ReactDOM.createRoot(rootElement);
 *   root.render(<App />);
 *
 *   return () => {
 *     // Properly unmount React app when snippet is unloaded
 *     root.unmount();
 *   };
 * });
 */
export const initSnippet: InitSnippet = (
  snippetName,
  initFn,
  { deferred = true } = {}
) => {
  const selector = `.portable-snippet[data-snippet-name="${snippetName}"]`
  const controller = new AbortController()

  const Cleanups = new WeakMap<HTMLElement, CleanupFn>()

  const invokeCleanup = (snippet: HTMLElement): CleanupFn | undefined => {
    const cln = Cleanups.get(snippet)

    if (cln == null) {
      return
    }

    Cleanups.delete(snippet)
    cln()
  }

  const load = (_snippet: Element): void => {
    const snippet: HTMLElement | null =
      _snippet instanceof HTMLElement ? _snippet : null

    if (snippet == null) {
      return
    }

    const _section = snippet.closest('.shopify-section')
    const section: HTMLElement | null =
      _section instanceof HTMLElement &&
      _section.id.startsWith('shopify-section-')
        ? _section
        : null

    try {
      invokeCleanup(snippet)
    } catch (err) {
      console.error('Failed to clean up snippet', snippetName, err)
    }

    try {
      const nextCleanup = initFn(snippet, section)

      if (nextCleanup != null) {
        Cleanups.set(snippet, nextCleanup)
      }
    } catch (err) {
      console.error('Failed to initialize snippet', snippetName, err)
    }
  }

  const unload = (_snippet: Element): void => {
    const snippet: HTMLElement | null =
      _snippet instanceof HTMLElement ? _snippet : null

    if (snippet == null) {
      return
    }

    try {
      invokeCleanup(snippet)
    } catch (err) {
      console.error('Failed to clean up snippet', snippetName, err)
    }
  }

  const init = (): CleanupFn => {
    const listenerOptions = { passive: true, signal: controller.signal }

    document.querySelectorAll(selector).forEach(load)

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

        section.querySelectorAll(selector).forEach(unload)
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
          // Skip initialization for the custom event the `initSection` utility dispatches on page load; see core/shopify/init-section
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

        section.querySelectorAll(selector).forEach(load)
      },
      listenerOptions
    )

    document.addEventListener(
      'portable:snippet:unload',
      (evt): void => {
        const snippet =
          evt.target instanceof HTMLElement &&
          evt.target.matches('.portable-snippet') &&
          evt.target.getAttribute('data-snippet-name') === snippetName
            ? evt.target
            : null

        if (snippet == null) {
          return
        }

        const childSnippets = [
          ...snippet.querySelectorAll(PORTABLE_SNIPPET_SELECTOR)
        ]
          .filter((el) => el instanceof HTMLElement)
          .reverse()

        childSnippets.forEach((child) => {
          try {
            emitSnippetEvent(child, { type: 'portable:snippet:unload' })
          } catch (err: unknown) {
            console.error('Nested snippet error', {
              child,
              parent: snippet,
              err
            })
          }
        })

        unload(snippet)
      },
      listenerOptions
    )

    document.addEventListener(
      'portable:snippet:load',
      (evt): void => {
        const snippet =
          evt.target instanceof HTMLElement &&
          evt.target.matches('.portable-snippet') &&
          evt.target.getAttribute('data-snippet-name') === snippetName
            ? evt.target
            : null

        if (snippet == null) {
          return
        }

        const payload = parseSnippetEventPayload(evt)

        if (payload?.type !== 'portable:snippet:load') {
          return
        }

        if (payload.mode === 'self-only') {
          load(snippet)
          return
        }

        const childSnippets = [
          ...snippet.querySelectorAll(PORTABLE_SNIPPET_SELECTOR)
        ]
          .filter((el) => el instanceof HTMLElement)
          .reverse()

        childSnippets.forEach((child) => {
          try {
            emitSnippetEvent(child, {
              type: 'portable:snippet:load',
              mode: 'self-only'
            })
          } catch (err: unknown) {
            console.error('Nested snippet error', {
              child,
              parent: snippet,
              err
            })
          }
        })

        load(snippet)
      },
      listenerOptions
    )

    return () => {
      controller.abort()

      document.querySelectorAll(selector).forEach(unload)
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
