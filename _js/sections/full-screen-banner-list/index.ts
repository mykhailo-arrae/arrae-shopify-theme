import { prefersReducedMotion } from '../../core/accessibility/prefers-reduced-motion.js'
import { makeEventNamespace } from '../../core/dom/events/index.js'
import { findElements, findOneElement } from '../../core/dom/traversal/index.js'
import { initSection } from '../../core/shopify/init-section/index.js'
import styles from './styles.scss.js'

type CustomWindow = Window & {
  Shopify?: { designMode?: boolean }
}

declare let window: CustomWindow

const measureStickyTop = (): number => {
  return window.innerWidth >= 1024 ? 24 : 32
}

initSection('.js-full-screen-banner-list', (section) => {
  const list = findOneElement(section, '.js-full-screen-banner-list')

  if (list == null) {
    return { unload: null }
  }

  const designMode = window.Shopify?.designMode === true

  if (designMode) {
    section.dataset.designMode = 'true'
    return { unload: null }
  }

  const banners = findElements(list, '.shopify-block')

  if (prefersReducedMotion() || banners.length < 2) {
    list.dataset.stack = 'false'
    return { unload: null }
  }

  list.dataset.stack = 'true'

  const stickyTopVar = styles['--full-screen-banner-list-sticky-top']
  const namespace = makeEventNamespace()

  const updateStickyTop = (): void => {
    section.style.setProperty(stickyTopVar, `${measureStickyTop()}px`)
  }

  updateStickyTop()
  namespace.addWindowEventListener('resize', updateStickyTop)

  return {
    unload: () => {
      list.dataset.stack = 'false'
      section.style.removeProperty(stickyTopVar)
      namespace.destroy()
    }
  }
})
