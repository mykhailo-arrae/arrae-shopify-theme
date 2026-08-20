import { z } from 'devops-zod4'

export const StandaloneBundle = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('asset'),
    minify: z.boolean().optional().default(true)
  }),
  z.object({
    type: z.literal('snippet'),
    minify: z.boolean().optional().default(true)
  })
])
export type StandaloneBundle = z.infer<typeof StandaloneBundle>
