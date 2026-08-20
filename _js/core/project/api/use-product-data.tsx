import useSWR from 'swr'
import { getProductJson } from './product.js'

type JSONProductData = Awaited<ReturnType<typeof getProductJson>>

type ProductQueryParams = Record<
  string,
  string | number | boolean | null | undefined
>

/** SWR cache key; fetcher must read from this tuple (not closure) to match the key SWR used. */
type ProductDataKey = readonly [
  'product',
  string,
  ProductQueryParams | undefined
]

/**
 * Fetcher for {@link useFetchProduct}: receives the same key array SWR uses for deduping.
 * Validation is performed inside {@link getProductJson}.
 */
const fetcher = (key: ProductDataKey): Promise<JSONProductData> => {
  const [, productHandle, queryParams] = key
  return getProductJson(productHandle, queryParams)
}

/**
 * Custom hook to fetch and validate a Shopify product JSON using SWR.
 *
 * @param {string | null} handle - The handle of the Shopify product.
 * @param {Record<string, string | number | boolean | null | undefined>} [params] - Optional query parameters.
 * @returns {object} - An object containing the product data and status.
 */
const useFetchProduct = (
  handle: string | null,
  params?: Record<string, string | number | boolean | null | undefined>
) => {
  const swr = useSWR<JSONProductData | undefined, Error, ProductDataKey | null>(
    handle && typeof handle === 'string'
      ? (['product', handle, params] as const)
      : null,
    fetcher,
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false
    }
  )
  const { data, error, isLoading } = swr

  let status: 'idle' | 'loading' | 'error'
  if (!handle || typeof handle !== 'string') {
    status = 'error'
  } else {
    status = isLoading ? 'loading' : error ? 'error' : 'idle'
  }

  return { data: data ?? null, status }
}

// Alias for improved naming conventions
export const useProductData = useFetchProduct
