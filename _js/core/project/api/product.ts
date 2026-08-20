import type { z } from 'zod'
import { atShopifyRoot } from '../../network/shopify-root.js'
import { JSONProductSchema } from '../io/schema.js'
import { getApiResponse } from './get-api-response.js'

/**
 * Fetches and validates the JSON representation of a Shopify product.
 * This function expects a liquid template product.api.liquid. This should render the expected json
 *
 * @param {string} handle - The handle of the Shopify product.
 * @param {Record<string, string | number | boolean | null | undefined>} [params] - An optional object of additional query parameters.
 * @returns {Promise<z.infer<typeof JSONProductSchema>>} - The validated product JSON.
 * @throws Will throw an error if the fetch or validation fails.
 */
export const getProductJson = async (
  handle: string,
  params?: Record<string, string | number | boolean | null | undefined>
): Promise<z.infer<typeof JSONProductSchema>> => {
  try {
    const queryParams = { view: 'api', ...params }
    const searchParams = new URLSearchParams()
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        searchParams.set(key, String(value))
      }
    })

    const path = atShopifyRoot(`/products/${handle}?${searchParams.toString()}`)

    const response = await getApiResponse({
      url: path.toString()
    })

    try {
      const validatedResponse = JSONProductSchema.parse(response)
      return validatedResponse
    } catch (err) {
      throw new Error('Validation failed for product JSON')
    }
  } catch (err) {
    console.error('Failed to get product JSON', err)
    throw err
  }
}
