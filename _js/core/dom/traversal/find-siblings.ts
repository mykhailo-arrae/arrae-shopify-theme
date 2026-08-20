/**
 * Find the siblings of an element
 *
 * SVG elements are ignored.
 *
 * @param {Element|HTMLElement|null} currentElement - The element we will find the siblings
 * @param {string} selector - A selector of the siblings
 * @returns {HTMLElement[]}
 */
export const findSiblings = (
  currentElement: Element | HTMLElement | null,
  selector?: string | null
): HTMLElement[] => {
  const siblings: HTMLElement[] = []

  if (!currentElement) {
    return []
  }

  if (currentElement.parentNode == null) {
    return []
  }

  const targets =
    selector && selector.length > 0
      ? currentElement.parentNode.querySelectorAll(`:scope > ${selector}`)
      : currentElement.parentNode.children

  for (const target of targets) {
    if (target !== currentElement && target instanceof HTMLElement) {
      siblings.push(target)
    }
  }

  return siblings
}
