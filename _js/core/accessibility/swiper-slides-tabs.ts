import type Swiper from 'swiper'

/**
 * Updates tab indexes and ARIA attributes for Swiper slide elements to improve accessibility
 *
 * @description
 * This function manages keyboard navigation accessibility for Swiper carousels by:
 * - Making interactive elements in visible slides focusable (tabindex="0")
 * - Hiding interactive elements in non-visible slides from screen readers and tab navigation
 * - Setting aria-hidden on slides and their interactive elements
 * - Preserving tabindex on slides that already have one defined
 *
 * The function should be called:
 * - Initially after Swiper initialization
 * - On every slide change event to update accessibility states
 *
 * @param {Swiper} swiper - The Swiper instance containing slides to update
 * @param {boolean} [fullyVisibleMode=false] - When true, uses `swiper-slide-fully-visible` class
 *   to determine visibility (only fully visible slides are considered accessible).
 *   When false (default), uses `swiper-slide-visible` class (partially visible slides are included).
 *
 * @example
 * ```typescript
 * import { updateSlideTabIndexes } from '../../core/accessibility/swiper-slides-tabs.js'
 *
 * // Standard mode - partially visible slides are accessible
 * const swiper = new Swiper('.swiper', {
 *   watchSlidesProgress: true,
 *   a11y: {
 *     enabled: true
 *   },
 *   on: {
 *     init: (swiper) => updateSlideTabIndexes(swiper),
 *     slideChange: (swiper) => updateSlideTabIndexes(swiper)
 *   },
 *   // ... swiper config
 * })
 *
 * // Fully visible mode - only fully visible slides are accessible
 * const swiperStrict = new Swiper('.swiper-strict', {
 *   watchSlidesProgress: true,
 *   on: {
 *     init: (swiper) => updateSlideTabIndexes(swiper, true),
 *     slideChange: (swiper) => updateSlideTabIndexes(swiper, true)
 *   },
 * })
 * ```
 *
 * @accessibility
 * - Prevents keyboard users from tabbing to hidden slide content
 * - Ensures screen readers don't announce hidden slide content
 * - Maintains proper focus management in carousel interfaces
 * - Follows WCAG 2.1 guidelines for keyboard navigation
 *
 * @see {@link https://www.w3.org/WAI/ARIA/apg/patterns/carousel/} ARIA Carousel Pattern
 * @see {@link https://webaim.org/techniques/keyboard/tabindex} WebAIM: Keyboard Accessibility
 *
 * @since 1.0.0
 */
export const updateSlideTabIndexes = (
  swiper: Swiper,
  fullyVisibleMode: boolean = false
): void => {
  swiper.slides.forEach((slide) => {
    const tabbableElements = slide.querySelectorAll('a, button, [tabindex]')

    const isVisible = fullyVisibleMode
      ? slide.classList.contains('swiper-slide-fully-visible')
      : slide.classList.contains('swiper-slide-visible')

    if (isVisible) {
      tabbableElements.forEach((element) => {
        element.setAttribute('tabindex', '0')
        element.setAttribute('aria-hidden', 'false')
      })
      if (slide.getAttribute('tabindex') !== null) {
        slide.setAttribute('tabindex', '0')
      }
      slide.setAttribute('aria-hidden', 'false')
    } else {
      tabbableElements.forEach((element) => {
        element.setAttribute('tabindex', '-1')
        element.setAttribute('aria-hidden', 'true')
      })
      if (slide.getAttribute('tabindex') !== null) {
        slide.setAttribute('tabindex', '-1')
      }
      slide.setAttribute('aria-hidden', 'true')
    }
  })
}
