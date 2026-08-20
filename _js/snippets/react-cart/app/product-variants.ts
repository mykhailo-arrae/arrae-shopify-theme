import type { z } from 'zod'
import { findOneElement } from '../../../core/dom/traversal/index.js'
import { getJson } from '../../../core/network/get-json.js'
import { atShopifyRoot } from '../../../core/network/shopify-root.js'
import type { JSONValue } from '../../../core/typescript/json-value.js'
import {
  CartDataSchema,
  type CartLayoutSchema,
  type CartProductVariants
} from './io.js'

type CartLayout = z.infer<typeof CartLayoutSchema>

const CART_DATA_SELECTOR = '.js-cart-data'
const REACT_CART_SELECTOR = 'react-cart'

export const getCartProductVariantsFromCartDataScript = (
  script: Element | null
): CartProductVariants[] => {
  const raw = script?.textContent?.trim() ?? ''
  if (raw === '') {
    return []
  }
  const parsed = CartDataSchema.safeParse(JSON.parse(raw))
  return parsed.success ? (parsed.data.cart_product_variants ?? []) : []
}

const parseCartProductVariantsFromSectionHtml = (
  html: string
): CartProductVariants[] | null => {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const script = findOneElement(
    doc,
    `${REACT_CART_SELECTOR} ${CART_DATA_SELECTOR}`
  )
  return getCartProductVariantsFromCartDataScript(script)
}

const cartSectionNameByLayout: Record<CartLayout, string> = {
  page: 'cart',
  drawer: 'cart-drawer'
}

export const resolveCartSectionId = (
  layout: CartLayout,
  sectionIdFromCartData: string | null | undefined
): string | null => {
  if (sectionIdFromCartData) {
    return sectionIdFromCartData
  }
  const sectionName = cartSectionNameByLayout[layout]
  const sectionEl = document.querySelector(
    `[data-section-name="${sectionName}"]`
  )
  return sectionEl?.getAttribute('data-section-id') ?? null
}

const getSectionHtmlFromResponse = (
  response: JSONValue,
  sectionId: string
): string | null => {
  if (
    response === null ||
    typeof response !== 'object' ||
    Array.isArray(response)
  ) {
    return null
  }

  const html = response[sectionId]
  return typeof html === 'string' ? html : null
}

/** Re-render cart section so variant lists include newly added cart products. */
export const fetchCartProductVariants = async ({
  sectionId,
  signal
}: {
  sectionId: string
  signal?: AbortSignal
}): Promise<CartProductVariants[] | null> => {
  const url = new URL(atShopifyRoot('/').href)
  url.searchParams.set('sections', sectionId)

  const response = await getJson({ url, options: { signal } })
  const html = getSectionHtmlFromResponse(response, sectionId)
  if (html == null) {
    return null
  }

  return parseCartProductVariantsFromSectionHtml(html)
}
