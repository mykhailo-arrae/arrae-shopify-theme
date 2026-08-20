import { z } from 'zod'
import { findOneElement } from '../../core/dom/traversal/index.js'
import { initMainBus } from '../../core/messaging/main/index.js'
import { initSnippet } from '../../core/shopify/init-snippet/index.js'

const MediaImageSchema = z.object({
  src: z.string().min(1),
  alt: z.string().nullable().optional()
})

const MediaPropsSchema = z.object({
  productId: z.number(),
  fallback: MediaImageSchema,
  variants: z.record(z.string(), MediaImageSchema)
})

initSnippet('quickshop-media', (snippet) => {
  const image = findOneElement(snippet, '.js-quickshop-media-image')
  const propsEl = findOneElement(snippet, '.js-quickshop-media-props')

  if (!(image instanceof HTMLImageElement) || propsEl == null) {
    return
  }

  let props: z.infer<typeof MediaPropsSchema>
  try {
    props = MediaPropsSchema.parse(JSON.parse(propsEl.textContent ?? ''))
  } catch (err: unknown) {
    console.error('[quickshop-media] Invalid props JSON', err)
    return
  }

  if (Object.keys(props.variants).length === 0) {
    return
  }

  const mainBus = initMainBus()

  const applyImage = (variantId: number | null): void => {
    const variantImage =
      variantId != null ? props.variants[String(variantId)] : undefined
    const next = variantImage ?? props.fallback

    if (image.getAttribute('src') === next.src) {
      return
    }

    image.src = next.src
    image.alt = next.alt ?? ''
  }

  const busRemover = mainBus
    .on('notification:selected-variant')
    .do(({ details: { selectedVariant, product } }) => {
      if (product.id !== props.productId) {
        return
      }
      applyImage(selectedVariant?.id ?? null)
    })

  return () => {
    busRemover()
  }
})
