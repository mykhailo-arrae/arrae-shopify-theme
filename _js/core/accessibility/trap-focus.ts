/**
 * Focus Trapping for Accessibility (A11Y)
 *
 * @param {HTMLElement} container The container inside which the focus will be trapped
 * @param {HTMLElement} lastFocused The last focused element, which will be focused when the container is closed
 *
 * @description
 * Used to trap focus inside modals.
 * When you open a modal, you should trap the focus.
 * Tabbing should move only between the focusable elements inside the modal.
 *
 * Articles:
 * https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
 * https://medium.com/@im_rahul/focus-trapping-looping-b3ee658e5177
 * https://uxdesign.cc/how-to-trap-focus-inside-modal-to-make-it-ada-compliant-6a50f9a70700
 * https://hidde.blog/using-javascript-to-trap-focus-in-an-element/
 */

let isHandleKeydownEventSet = false

export const trapFocus = (
  container: HTMLElement | undefined,
  lastFocused?: HTMLElement | null
): void => {
  if (!container) {
    return
  }

  const elements =
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

  let focusableContent: NodeListOf<HTMLElement> =
    container.querySelectorAll(elements)
  let firstFocusableElement = focusableContent[0]
  let lastFocusableElement = focusableContent[focusableContent.length - 1]

  const handleKeydown = (e: KeyboardEvent) => {
    /**
     * Because of the dynamic content inside the modal,
     * we are rewriting cached elements on every tab click
     */
    focusableContent = container.querySelectorAll(elements)
    firstFocusableElement = focusableContent[0]
    lastFocusableElement = focusableContent[focusableContent.length - 1]

    if (e.key !== 'Tab') {
      return
    }

    if (e.shiftKey) {
      if (document.activeElement === firstFocusableElement) {
        lastFocusableElement?.focus()
        e.preventDefault()
      }
    } else {
      if (document.activeElement === lastFocusableElement) {
        firstFocusableElement?.focus()
        e.preventDefault()
      }
    }
  }

  if (lastFocused) {
    lastFocused.focus()
  } else {
    if (!isHandleKeydownEventSet) {
      document.addEventListener('keydown', handleKeydown)

      isHandleKeydownEventSet = true
    }

    firstFocusableElement?.focus()
  }
}
