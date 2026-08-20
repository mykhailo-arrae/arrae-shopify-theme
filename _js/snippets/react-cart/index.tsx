import { createRoot } from 'react-dom/client'
import { findOneElement } from '../../core/dom/traversal/index.js'
import { initSnippet } from '../../core/shopify/init-snippet/index.js'
import { App } from './app/app.js'
import { CartDataSchema } from './app/io.js'

const RENDER_TARGET_SELECTOR = '.js-cart-render-target'

initSnippet('react-cart', (snippet) => {
  const ioContainer = findOneElement(snippet, '.js-cart-data')
  const renderTarget = findOneElement(snippet, RENDER_TARGET_SELECTOR)

  if (!ioContainer) {
    throw new Error('Cart data container (.js-cart-data) not found')
  }
  if (!renderTarget) {
    throw new Error('Render target element not found')
  }

  const rawJson = ioContainer.textContent?.trim() ?? ''
  if (rawJson === '') {
    throw new Error('Cart data container is empty')
  }

  const props = CartDataSchema.parse(JSON.parse(rawJson))

  const root = createRoot(renderTarget)
  root.render(<App data={props} />)

  return () => {
    if (renderTarget) {
      root.unmount()
    }
  }
})
