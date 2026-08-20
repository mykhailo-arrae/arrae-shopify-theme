import type { ShopifySectionEventPayload as FullPayload } from './payload.js'

export type Payload = {
  type: FullPayload['type']
  detail: Omit<FullPayload['detail'], 'sectionId'>
}

export type EmitSectionEvent = (section: HTMLElement, payload: Payload) => void

export const emitSectionEvent: EmitSectionEvent = (section, payload) => {
  const { type, detail: _detail } = payload

  const sectionId = section.id.startsWith('shopify-section-')
    ? section.id.replace('shopify-section-', '')
    : null

  if (sectionId == null) {
    throw new Error("The element's ID does not start with 'shopify-section-'")
  }

  const detail = {
    ..._detail,
    sectionId
  }

  const evt = new CustomEvent(type, {
    detail,
    bubbles: true,
    cancelable: false
  })

  section.dispatchEvent(evt)
}
