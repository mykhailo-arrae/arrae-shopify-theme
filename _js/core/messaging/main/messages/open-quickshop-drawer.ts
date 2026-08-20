import type { Message } from '../../create-message-bus/message-shape.js'

export type OpenQuickshopDrawer = Message<
  'request:open-quickshop-drawer',
  {
    productUrl: string
    /**
     * When true (SMP sibling swap inside an open drawer), keep the current
     * buy box visible and preserve scroll while the next product loads.
     * Product-card opens should omit this so the previous product is cleared.
     */
    replaceInPlace?: boolean
  }
>
