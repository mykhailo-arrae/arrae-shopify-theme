import type { InternalDemoMuteButton } from './component.js'

declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface HTMLElementTagNameMap {
    'internal-demo-mute-button': InternalDemoMuteButton
  }
}
