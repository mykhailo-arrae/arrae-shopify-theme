import { useRef } from 'react'
import useSWR from 'swr'
import { getRecommendationsJson } from './recommendations.js'

type RecommendationsData = Awaited<ReturnType<typeof getRecommendationsJson>>

/** SWR cache key; id and limit must come from this tuple in the fetcher (not a closure). */
type RecommendationsDataKey = readonly ['recommendations', number, number?]

/**
 * Custom hook to fetch and validate a Shopify Recommendations JSON using SWR.
 *
 * @param {number | null} id - Product id for recommendations, or null to skip fetching.
 * @param {object} [options] - Optional parameters.
 * @param {AbortSignal} [options.signal] - An optional AbortSignal to cancel the request.
 * @returns {object} - An object containing the Recommendations data, status, and error.
 */
const useFetchRecommendations = (
  id: number | null,
  options?: { signal?: AbortSignal | null; limit?: number }
) => {
  const shouldFetch = typeof id === 'number'
  const optionsRef = useRef(options)
  optionsRef.current = options
  const limit = options?.limit

  const swr = useSWR<
    RecommendationsData | null | undefined,
    Error,
    RecommendationsDataKey | null
  >(
    shouldFetch ? (['recommendations', id, limit] as const) : null,
    (key: RecommendationsDataKey) =>
      getRecommendationsJson(key[1], {
        ...optionsRef.current,
        limit: key[2]
      }),
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false
    }
  )
  const { data, error, isValidating } = swr
  let status: 'idle' | 'loading' | 'error'
  if (!shouldFetch) {
    status = 'idle'
  } else {
    status = isValidating ? 'loading' : error ? 'error' : 'idle'
  }

  return { data: data ?? null, status, error }
}

// Alias for improved naming conventions
export const useRecommendationsData = useFetchRecommendations
