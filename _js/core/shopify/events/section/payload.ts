export type ShopifySectionEventPayload =
  | {
      type: 'shopify:section:load'
      detail: {
        sectionId: string
        stage?: 'initial' | null
      }
    }
  | {
      type: 'shopify:section:unload' | 'shopify:section:deselect'
      detail: {
        sectionId: string
      }
    }
  | {
      type: 'shopify:section:select'
      detail: {
        load: boolean
        sectionId: string
      }
    }

export const parseSectionEventPayload = (
  evt: Event
): ShopifySectionEventPayload | null => {
  const { type: _type } = evt

  const eventType: ShopifySectionEventPayload['type'] | null =
    _type === 'shopify:section:load'
      ? 'shopify:section:load'
      : _type === 'shopify:section:unload'
        ? 'shopify:section:unload'
        : _type === 'shopify:section:deselect'
          ? 'shopify:section:deselect'
          : _type === 'shopify:section:select'
            ? 'shopify:section:select'
            : null

  if (eventType == null) {
    return null
  }

  const sectionId: string | null =
    'detail' in evt &&
    evt.detail != null &&
    typeof evt.detail === 'object' &&
    'sectionId' in evt.detail &&
    typeof evt.detail.sectionId === 'string' &&
    evt.detail.sectionId.length > 0
      ? evt.detail.sectionId
      : null

  if (sectionId == null) {
    return null
  }

  if (eventType === 'shopify:section:load') {
    const stage: 'initial' | null =
      'detail' in evt &&
      evt.detail != null &&
      typeof evt.detail === 'object' &&
      'stage' in evt.detail &&
      evt.detail.stage === 'initial'
        ? 'initial'
        : null

    return { type: eventType, detail: { sectionId, stage } }
  }

  if (eventType === 'shopify:section:unload') {
    return {
      type: eventType,
      detail: { sectionId }
    }
  }

  if (eventType === 'shopify:section:deselect') {
    return {
      type: eventType,
      detail: { sectionId }
    }
  }

  if (eventType === 'shopify:section:select') {
    const load: boolean =
      'detail' in evt &&
      evt.detail != null &&
      typeof evt.detail === 'object' &&
      'load' in evt.detail &&
      typeof evt.detail.load === 'boolean'
        ? evt.detail.load
        : false

    return {
      type: eventType,
      detail: { load, sectionId }
    }
  }

  eventType satisfies never
  return null
}
