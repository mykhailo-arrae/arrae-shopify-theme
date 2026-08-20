import { z } from 'zod'

/** Valid Number where `0 <= n <= 1` */
const ValidIntersectionValue = z.coerce.number().gte(0).lte(1)
/**
 * Valid IntersectionObserver threshold value.
 * See: {@link https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API#threshold | Intersection Observer API (MDN)}.
 * @default [0.5]
 */
const ThresholdSchema = z
  .union([
    ValidIntersectionValue.transform((val) => [val]).pipe(
      z.tuple([z.number()]).rest(z.number())
    ),
    z.array(ValidIntersectionValue).pipe(z.tuple([z.number()]).rest(z.number()))
  ])
  .catch([0.5])

export const VideoControlsSchema = z.object({
  videoClass: z.string(),
  scrollAutoPlay: z.boolean(),
  intersectionThreshold: ThresholdSchema,
  playOnClickVideo: z.boolean(),
  hideButtonOnPlay: z.boolean(),
  pausePageVideosOnPlay: z.boolean()
})

export type VideoControlsSchemaType = z.infer<typeof VideoControlsSchema>
