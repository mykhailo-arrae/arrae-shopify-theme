import { isObject } from '../typescript/is-object.js'

type FilterSections = (
  shopifyEvent?: unknown
) => (index: number, element: HTMLElement) => boolean

type ShopifyEvent = {
  originalEvent: {
    detail: {
      sectionId: string
    }
  }
}

const checkShopifyEvent = (evt: unknown): evt is ShopifyEvent =>
  isObject(evt) &&
  'originalEvent' in evt &&
  isObject(evt.originalEvent) &&
  'detail' in evt.originalEvent &&
  isObject(evt.originalEvent.detail) &&
  'sectionId' in evt.originalEvent.detail &&
  typeof evt.originalEvent.detail.sectionId === 'string' &&
  evt.originalEvent.detail.sectionId.length > 0

/**
 * jQuery section filter function
 * Filters elements by Shopify section ID.
 * If the section ID is undefined, all sections are selected
 */
export const filterSections: FilterSections = function filterSections(
  shopifyEvent
) {
  const sectionId: string = checkShopifyEvent(shopifyEvent)
    ? shopifyEvent.originalEvent.detail.sectionId
    : ''

  return (_, element): boolean =>
    !sectionId
      ? true
      : element.getAttribute('id') === 'shopify-section-' + sectionId
        ? true
        : element.getAttribute('data-section-id') === sectionId
}
