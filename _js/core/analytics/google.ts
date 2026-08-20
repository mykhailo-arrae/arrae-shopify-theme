import type { JSONValue } from '../../core/typescript/json-value.js'

type CustomWindow = {
  dataLayer?: {
    push?: (...args: unknown[]) => void
  }
} & Window

declare let window: CustomWindow

/**
 * Send a Google Analytics event. Be sure to include `analytics-google` section in the layout.
 */
export const sendGtagEvent = (...args: JSONValue[]): void => {
  if (args.length === 0) {
    return
  }

  if (typeof window.dataLayer === 'undefined') {
    return
  }

  if (typeof window.dataLayer.push === 'undefined') {
    console.warn('window.dataLayer has no push method')
    return
  }

  window.dataLayer.push(args)
}
