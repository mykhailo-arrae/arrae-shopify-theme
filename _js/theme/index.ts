import { init as initImageLazyloading } from './lazysizes.js'
import { init as initOffcanvasDrawers } from './offcanvas-drawers/index.js'

const logErrors = (err: unknown): void => {
  console.error(err)
}

initImageLazyloading().catch(logErrors)
initOffcanvasDrawers().catch(logErrors)
