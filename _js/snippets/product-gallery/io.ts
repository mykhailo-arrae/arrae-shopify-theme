import { z } from 'zod'

export const GalleryImage = z.object({
  src: z.string().min(1),
  alt: z.string().optional().default('')
})
export type GalleryImage = z.infer<typeof GalleryImage>

const GalleryImageLoose = z.object({
  src: z.string(),
  alt: z.string().optional().default('')
})

type GalleryImageInput = z.infer<typeof GalleryImageLoose>

const filterValidImages = (images: GalleryImageInput[]): GalleryImage[] =>
  images.filter((image) => {
    const src = image.src.trim()

    return (
      src.length > 0 &&
      !src.includes('Liquid error') &&
      !src.includes('MetaobjectDrop')
    )
  })

export const ProductGalleryIO = z.object({
  defaultImages: z.array(GalleryImageLoose).transform(filterValidImages),
  variantGalleries: z
    .record(z.string(), z.array(GalleryImageLoose))
    .optional()
    .default({})
    .transform((galleries) => {
      const next: Record<string, GalleryImage[]> = {}

      for (const [variantId, images] of Object.entries(galleries)) {
        const validImages = filterValidImages(images)

        if (validImages.length > 0) {
          next[variantId] = validImages
        }
      }

      return next
    }),
  /** Matches SSR: `default` or `variant:<id>`. */
  initialGalleryKey: z.string().optional().default('default')
})

export type ProductGalleryIO = z.infer<typeof ProductGalleryIO>
