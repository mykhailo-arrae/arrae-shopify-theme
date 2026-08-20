/**
 * Reports if the element wasn't hidden by CSS; slightly expensive.
 * Note: We support modern browsers only.
 */
const isActuallyVisible = (element: Element): boolean => {
  const style = window.getComputedStyle(element)
  const matrix = new DOMMatrix(style.transform)
  const opacity = Number.parseFloat(style.opacity)
  const rect = element.getBoundingClientRect()

  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.visibility !== 'collapse' &&
    !/^inset\(100%(\s|\)|$)/.test(style.clipPath) &&
    opacity > 0 &&
    rect.width > 0 &&
    rect.height > 0 &&
    matrix.m11 !== 0 &&
    matrix.m22 !== 0
  )
}

/**
 * Callback invoked when an element's visibility state changes.
 */
export type Callback = (payload: {
  element: HTMLElement
  /**
   * How much of the element is visible in the viewport.
   * 0 = not visible, 1 = fully visible.
   */
  intersectionRatio: number
  isVisible: boolean
  /**
   * Reports if the element wasn't hidden by CSS; slightly expensive.
   */
  isActuallyVisible: () => boolean
  untrack: () => void
}) => void

/**
 * Configuration options for the visibility tracker.
 * @see [Intersection Observer API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)
 */
export type Options = {
  rootMargin?: string
  threshold?: [number, ...number[]]
  root?: { type: 'viewport' } | { type: 'element'; element: HTMLElement }
}

/**
 * A tracker instance that observes element visibility in the viewport.
 */
export type VisibilityTracker = {
  track: (element: HTMLElement, callback: Callback) => { untrack: () => void }
  destroy: () => void
}

/**
 * Creates a visibility tracker that monitors when elements enter or exit the viewport.
 * Uses IntersectionObserver under the hood for efficient visibility detection.
 */
export const makeVisibilityTracker = (
  options: Options = {}
): VisibilityTracker => {
  let isDestroyed = false

  const {
    threshold = [0.25],
    root: _root = { type: 'viewport' },
    rootMargin
  } = options

  if (threshold.length === 0) {
    throw new Error('Invalid threshold values')
  }

  for (const t of threshold) {
    if (t < 0 || t > 1) {
      throw new Error(`Invalid threshold value: ${t}. Must be between 0 and 1.`)
    }
  }

  const root = _root.type === 'element' ? _root.element : null

  const callbacks = new WeakMap<HTMLElement, Callback>()
  const untrackFunctions = new WeakMap<HTMLElement, () => void>()

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const element = entry.target

        if (element instanceof HTMLElement === false) {
          continue
        }

        const callback = callbacks.get(element)
        const untrack = untrackFunctions.get(element)

        if (callback == null || untrack == null) {
          continue
        }

        const { intersectionRatio, isIntersecting: isVisible } = entry

        let cachedIsActuallyVisible: boolean | null = null

        try {
          callback({
            element,
            intersectionRatio,
            isActuallyVisible: () => {
              if (cachedIsActuallyVisible == null) {
                cachedIsActuallyVisible = isActuallyVisible(element)
              }
              return cachedIsActuallyVisible
            },
            isVisible,
            untrack
          })
        } catch (err) {
          console.error('Visibility tracker error:', err)
        }
      }
    },
    { root, rootMargin, threshold }
  )

  return {
    /**
     * Start tracking an element's visibility.
     * Debounce/throttle the callback yourself as needed.
     */
    track: (element, callback) => {
      if (isDestroyed) {
        throw new Error('Visibility tracker is destroyed')
      }

      if (callbacks.has(element)) {
        console.warn('Visibility tracker: Element was already tracked')
        // clean up the previous tracking
        untrackFunctions.get(element)?.()
      }

      // Create untrack function once during tracking
      const untrack = () => {
        // Prevent stale untrack references from affecting newer observations
        if (isDestroyed || untrackFunctions.get(element) !== untrack) {
          return
        }
        observer.unobserve(element)
        callbacks.delete(element)
        untrackFunctions.delete(element)
      }

      callbacks.set(element, callback)
      untrackFunctions.set(element, untrack)
      observer.observe(element)

      return { untrack }
    },
    /**
     * Stop tracking all elements and clean up the observer.
     * After calling this, the tracker instance cannot be reused.
     */
    destroy: () => {
      observer.disconnect()
      isDestroyed = true
    }
  }
}
