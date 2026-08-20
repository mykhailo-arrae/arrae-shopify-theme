import { findOneElement } from '../../core/dom/traversal/index.js'

/**
 * Shows buy-box ATC controls that were hidden until product-options finished
 * initializing (avoids a premature enabled CTA next to the title while options
 * hydrate on slow networks or after SMP sibling swaps).
 */
export const revealProductFormControls = (root: ParentNode): void => {
  const form =
    root instanceof Element
      ? root.closest('form[data-product-id]')
      : root instanceof Document
        ? findOneElement(root, 'form[data-product-id]')
        : null

  const scope =
    form instanceof HTMLElement
      ? form
      : root instanceof Element || root instanceof Document
        ? root
        : null

  if (scope == null) {
    return
  }

  const controls = findOneElement(scope, '.js-product-form-controls')

  if (controls == null || !controls.hidden) {
    return
  }

  controls.hidden = false
}
