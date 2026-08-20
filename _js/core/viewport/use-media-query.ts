import { useState } from 'react'
import { useIsomorphicLayoutEffect } from '../react/use-isomorphic-layout-effect.js'

type UseMediaQueryOptions = {
  defaultValue?: boolean
}

/**
 * Custom hook for tracking the state of a media query.
 * @param {string} query - The media query to track.
 * @param {?boolean} [options.defaultValue] - The default value to return if the hook is being run on the server (default is `false`).
 * @returns {boolean} The current state of the media query (true if the query matches, false otherwise).
 * @see [MDN Match Media](https://developer.mozilla.org/en-US/docs/Web/API/Window/matchMedia)
 * @example
 * const isSmallScreen = useMediaQuery('(max-width: 600px)');
 * // Use `isSmallScreen` to conditionally apply styles or logic based on the screen size.
 */
export const useMediaQuery = (
  query: string,
  { defaultValue = false }: UseMediaQueryOptions = {}
): boolean => {
  const [matches, setMatches] = useState<boolean>(defaultValue)

  useIsomorphicLayoutEffect(() => {
    const controller = new AbortController()
    const matchMedia = window.matchMedia(query)

    // Check match at the first client-side load
    setMatches(() => {
      return matchMedia.matches
    })

    // Check match on media query change
    matchMedia.addEventListener(
      'change',
      (evt) => {
        setMatches(() => evt.matches)
      },
      { signal: controller.signal }
    )

    return () => {
      controller.abort()
    }
  }, [query])

  return matches
}
