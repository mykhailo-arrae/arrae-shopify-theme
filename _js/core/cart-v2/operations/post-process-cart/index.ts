import type { Cart } from '../../blueprints/cart/index.js'
import type { Warning } from '../../blueprints/context/warning.js'
import { fetchCart } from '../../operations/fetch-cart/index.js'

export const postProcessCart = async ({
  signal
}: {
  signal: AbortSignal
}): Promise<{ cart: Cart; warnings: Warning[] }> => {
  // const cart = await fetchCart({ signal })

  // Add custom postprocess logic here

  const nextCart = await fetchCart({ signal })

  return { cart: nextCart, warnings: [] }
}
