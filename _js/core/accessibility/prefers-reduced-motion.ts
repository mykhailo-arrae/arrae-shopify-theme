/**
 * Prefers Reduced Motion for Accessibility (A11Y)
 *
 * @description
 * Used to check if the user has reduced motion preferences.
 * This is used to prevent animations and transitions that are not necessary.
 *
 */

export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

export const prefersReducedMotion = (): boolean => {
  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return false
  }
  return window.matchMedia(REDUCED_MOTION_QUERY).matches
}
