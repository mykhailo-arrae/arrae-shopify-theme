import { sendGtagEvent } from '../../core/analytics/google.js'
import { findOneElement } from '../../core/dom/traversal/index.js'
import { initSection } from '../../core/shopify/init-section/index.js'
import type { JSONValue } from '../../core/typescript/json-value.js'

type Settings = {
  enabled: boolean
  gtag: string | null
}

const parseSettings = (input: JSONValue): Settings => {
  const enabled: boolean =
    input != null &&
    typeof input === 'object' &&
    'enabled' in input &&
    input.enabled === true

  const gtag: string | null =
    input != null &&
    typeof input === 'object' &&
    'gtag' in input &&
    typeof input.gtag === 'string'
      ? input.gtag
      : null

  return { enabled, gtag }
}

let initialized = false

initSection('.js-analytics-google', (section) => {
  if (initialized) {
    return {
      unload: null
    }
  }

  const settingsElement = findOneElement(
    section,
    'script[type="application/json"]'
  )

  if (settingsElement == null) {
    return {
      unload: null
    }
  }

  const { enabled, gtag } = parseSettings(JSON.parse(settingsElement.innerHTML))

  if (enabled === false || gtag == null) {
    return {
      unload: null
    }
  }

  sendGtagEvent('js', new Date().toISOString())
  sendGtagEvent('config', gtag, { send_page_view: false })

  initialized = true

  return {
    unload: null
  }
})
