export type EventNamespace = {
  addDelegatedEventListener: <P extends Document | Element>(
    parent: P,
    selectors: string,
    type: string,
    handler: (target: HTMLElement, evt: Event, delegateTarget: P) => void,
    options?: Omit<AddEventListenerOptions, 'signal'>
  ) => {
    remove: () => void
  }
  addDirectEventListener: <E extends Element>(
    element: E,
    type: string,
    handler: (delegateTarget: E, evt: Event) => void,
    options?: Omit<AddEventListenerOptions, 'signal'>
  ) => {
    remove: () => void
  }
  addDocumentEventListener: (
    type: string,
    handler: (evt: Event) => void,
    options?: Omit<AddEventListenerOptions, 'signal'>
  ) => {
    remove: () => void
  }
  addWindowEventListener: (
    type: string,
    handler: (evt: Event) => void,
    options?: Omit<AddEventListenerOptions, 'signal'>
  ) => {
    remove: () => void
  }
  destroy: () => void
}

type EventTargetWindow = Pick<
  Window,
  'addEventListener' | 'removeEventListener'
>

type Globals = {
  AbortController: typeof window.AbortController
  HTMLElement: typeof window.HTMLElement
  SVGElement: typeof window.SVGElement
  document: typeof document
  window?: EventTargetWindow
}

/**
 * Allows setting up multiple jQuery-style delegated event handlers
 * and cleaning them up in bulk with the destroy command.
 *
 * Delegated event handlers can process events from descendant elements
 * that are added to the document at a later time.
 *
 * Only the parent element has to be present at the time the event handler is attached.
 *
 * The delegated event handler is not called when the event occurs directly on the parent
 * element, but only for descendants (inner elements) that match the selector string.
 *
 * The `document` element is available in the head of the document before loading
 * any other HTML, so it is safe to attach events there without waiting for the
 * document to be ready.
 *
 * Delegated event handlers do not work for SVG elements.
 */
export const makeEventNamespace = (
  globals: Globals = {
    AbortController: window.AbortController,
    HTMLElement: window.HTMLElement,
    SVGElement: window.SVGElement,
    document: document
  }
): EventNamespace => {
  const { AbortController, HTMLElement, SVGElement, document } = globals
  const controller = new AbortController()

  return {
    addDelegatedEventListener(parent, selectors, type, handler, options = {}) {
      if (controller.signal.aborted === true) {
        throw new Error(
          'Event namespace already destroyed, new event listeners cannot be attached'
        )
      }

      const handlerWrapper = (evt: Event) => {
        if (
          evt.target instanceof HTMLElement ||
          evt.target instanceof SVGElement
        ) {
          const intendedTarget = evt.target.closest(selectors)

          if (intendedTarget instanceof HTMLElement) {
            handler(intendedTarget, evt, parent)
          }
        }
      }

      parent.addEventListener(type, handlerWrapper, {
        ...options,
        signal: controller.signal
      })

      return {
        remove() {
          parent.removeEventListener(type, handlerWrapper, options)
        }
      }
    },
    /**
     * Use this method on SVG Elements or for events that do not bubble, e.g., HTMLAudioElement events
     */
    addDirectEventListener(element, type, handler, options = {}) {
      if (controller.signal.aborted === true) {
        throw new Error(
          'Event namespace already destroyed, new event listeners cannot be attached'
        )
      }

      const handlerWrapper = (evt: Event) => {
        handler(element, evt)
      }

      element.addEventListener(type, handlerWrapper, {
        ...options,
        signal: controller.signal
      })

      return {
        remove() {
          element.removeEventListener(type, handlerWrapper, options)
        }
      }
    },
    /**
     * Use this method for events that are triggered directly on the document
     */
    addDocumentEventListener(type, handler, options = {}) {
      if (controller.signal.aborted === true) {
        throw new Error(
          'Event namespace already destroyed, new event listeners cannot be attached'
        )
      }

      const handlerWrapper = (evt: Event) => {
        handler(evt)
      }

      document.addEventListener(type, handlerWrapper, {
        ...options,
        signal: controller.signal
      })

      return {
        remove() {
          document.removeEventListener(type, handlerWrapper, options)
        }
      }
    },
    /**
     * Use this method for events dispatched on the window object
     */
    addWindowEventListener(type, handler, options = {}) {
      if (controller.signal.aborted === true) {
        throw new Error(
          'Event namespace already destroyed, new event listeners cannot be attached'
        )
      }

      const eventWindow = globals.window ?? window

      const handlerWrapper = (evt: Event) => {
        handler(evt)
      }

      eventWindow.addEventListener(type, handlerWrapper, {
        ...options,
        signal: controller.signal
      })

      return {
        remove() {
          eventWindow.removeEventListener(type, handlerWrapper, options)
        }
      }
    },
    destroy() {
      controller.abort()
    }
  }
}
