import type { z } from 'zod'
import { atShopifyRoot } from '../../network/shopify-root.js'
import { RecommendationsApiResponseSchema } from '../io/schema.js'
import { getApiResponse } from './get-api-response.js'

/**
 * Fetches and validates the JSON representation of a Shopify Recommendations.
 *
 * @param {number} id - The product id.
 * @param {object} [options] - Optional parameters.
 * @param {AbortSignal} [options.signal] - An optional AbortSignal to cancel the request.
 * @returns {Promise<z.infer<typeof RecommendationsApiResponseSchema>>} - The validated Recommendations JSON.
 * @throws Will throw an error if the fetch or validation fails.
 */
export const getRecommendationsJson = async (
  id: number,
  options?: {
    signal?: AbortSignal | null
    limit?: number
  }
): Promise<z.infer<typeof RecommendationsApiResponseSchema>> => {
  if (typeof id !== 'number') {
    console.warn('No id provided to getRecommendationsJson', id)
    return {
      products: [],
      intent: ''
    }
  }

  const limitParam =
    typeof options?.limit === 'number' ? `&limit=${options.limit}` : ''
  const path = atShopifyRoot(
    `/recommendations/products.json?product_id=${id}&intent=related${limitParam}`
  )

  try {
    const response = await getApiResponse({
      url: path.toString(),
      options: {
        signal: options?.signal
      }
    })

    try {
      const validatedResponse = RecommendationsApiResponseSchema.parse(response)
      return validatedResponse
    } catch (err) {
      throw new Error('Validation failed for Recommendations JSON')
    }
  } catch (err) {
    console.error('Failed to get Recommendations JSON', err)
    throw err
  }
}
