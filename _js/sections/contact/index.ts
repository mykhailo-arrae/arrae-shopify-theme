import { makeEventNamespace } from '../../core/dom/events/index.js'
import { initSection } from '../../core/shopify/init-section/index.js'

const CONTACT_OPTION_ACTION_SELECTOR = '.js-contact-option-action'
const GORGIAS_LOAD_TIMEOUT_MS = 3000

type GorgiasChatApi = {
  init: () => Promise<void>
  open: () => void
}

type CustomWindow = Window & {
  GorgiasChat?: GorgiasChatApi
}

declare let window: CustomWindow

type ContactOptionActionHandler = () => void | Promise<void>

type PendingGorgiasInit = {
  promise: Promise<void>
  cancel: () => void
}

class GorgiasChatInitCancelledError extends Error {
  constructor() {
    super('Gorgias chat initialization cancelled because the section unloaded.')
  }
}

initSection('.js-contact-section', (section) => {
  const namespace = makeEventNamespace()
  let pendingGorgiasInit: PendingGorgiasInit | null = null
  let isSectionUnloaded = false

  const initGorgiasChat = (): Promise<void> => {
    const gorgiasChat = window.GorgiasChat

    if (gorgiasChat) {
      return gorgiasChat.init()
    }

    if (pendingGorgiasInit) {
      return pendingGorgiasInit.promise
    }

    let cancelPendingInit = (): void => {}

    const promise = new Promise<void>((resolve, reject) => {
      const gorgiasLoadedListener = namespace.addWindowEventListener(
        'gorgias-widget-loaded',
        () => {
          clearPendingInit()
          resolve()
        },
        { once: true }
      )

      const timeoutId = setTimeout(() => {
        clearPendingInit()
        reject(
          new Error(
            'Gorgias chat widget failed to load. Please ensure the Gorgias App Embed is enabled in the Theme Editor.'
          )
        )
      }, GORGIAS_LOAD_TIMEOUT_MS)

      const clearPendingInit = (): void => {
        clearTimeout(timeoutId)
        gorgiasLoadedListener.remove()
        pendingGorgiasInit = null
      }

      cancelPendingInit = (): void => {
        clearPendingInit()
        reject(new GorgiasChatInitCancelledError())
      }
    })

    pendingGorgiasInit = {
      promise,
      cancel: cancelPendingInit
    }

    return promise
  }

  const openGorgiasChat = async (): Promise<void> => {
    try {
      await initGorgiasChat()

      if (isSectionUnloaded) {
        return
      }

      window.GorgiasChat?.open()
    } catch (err) {
      if (err instanceof GorgiasChatInitCancelledError) {
        return
      }

      console.error(err)
      alert(
        'Chat is currently unavailable. Please try again later or use another contact method.'
      )
    }
  }

  /**
   * Register contact option actions here. Schema `action_key` values must match these keys.
   */
  const contactOptionActions: Record<string, ContactOptionActionHandler> = {
    'gorgias-chat': openGorgiasChat
  }

  const runContactOptionAction = (actionKey: string): void => {
    const handler = contactOptionActions[actionKey]

    if (!handler) {
      console.warn(`Unknown contact option action: ${actionKey}`)
      return
    }

    void handler()
  }

  namespace.addDelegatedEventListener(
    section,
    CONTACT_OPTION_ACTION_SELECTOR,
    'click',
    (target, event) => {
      event.preventDefault()

      const actionKey = target.getAttribute('data-contact-action')

      if (!actionKey) {
        return
      }

      runContactOptionAction(actionKey)
    }
  )

  return {
    unload: () => {
      isSectionUnloaded = true
      pendingGorgiasInit?.cancel()
      namespace.destroy()
    }
  }
})
