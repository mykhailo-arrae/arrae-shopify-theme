import { CoreVideo } from './app.js'

if (!customElements.get('core-video')) {
  customElements.define('core-video', CoreVideo)
}
