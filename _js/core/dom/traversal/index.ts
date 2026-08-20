/**
 * Ensures every item is of HTMLElement type.
 *
 * SVG elements elements are ignored, please use `querySelectorAll` directly.
 */
export const findElements = (
  parent: Document | Element | null,
  selectors: string
): HTMLElement[] => {
  if (parent == null) {
    return []
  }

  if (selectors.length === 0) {
    return []
  }

  return Array.from(parent.querySelectorAll(selectors)).filter(
    (element): element is HTMLElement => element instanceof HTMLElement
  )
}

/**
 * Ensures the target item is of HTMLElement type.
 *
 * Cannot target SVG elements, please use `querySelector` directly.
 */
export const findOneElement = (
  parent: Document | Element | null,
  selectors: string
): HTMLElement | null => {
  if (parent == null) {
    return null
  }

  if (selectors.length === 0) {
    return null
  }

  const _element = parent.querySelector(selectors)

  return _element instanceof HTMLElement ? _element : null
}

/**
 * Finds a single element of a specific type that matches the given selector.
 *
 * @example
 * // Find a button element
 * const button = findOneElementOfType(HTMLButtonElement)(document, '.submit-btn');
 *
 * @example
 * // Find a custom element
 * const customEl = findOneElementOfType(MyCustomElement)(document, '.custom-el');
 */
export const findOneElementOfType =
  <T extends Element>(type: new () => T) =>
  (parent: Document | Element | null, selectors: string): T | null => {
    if (parent == null) {
      return null
    }

    if (selectors.length === 0) {
      return null
    }

    const _element = parent.querySelector(selectors)

    if (_element == null) {
      return null
    }

    return _element instanceof type ? _element : null
  }
