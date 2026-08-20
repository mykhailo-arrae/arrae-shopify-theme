import { z } from 'devops-zod4'

const Stylesheet = z.union([z.literal('inline'), z.literal('external')])
export type Stylesheet = z.infer<typeof Stylesheet>

const DynamicSnippet = z.object({
  type: z.literal('dynamic'),
  class: z.array(z.string().min(2)).optional().default([]),
  tag: z
    .union([
      z.literal('article'),
      z.literal('aside'),
      z.literal('div'),
      z.literal('footer'),
      z.literal('header'),
      z.literal('section')
    ])
    .optional()
    .default('div'),
  stylesheet: Stylesheet.optional().default('inline')
})
export type DynamicSnippet = z.infer<typeof DynamicSnippet>

const StaticSnippet = z.object({
  type: z.literal('static'),
  stylesheet: Stylesheet.optional().default('external')
})
export type StaticSnippet = z.infer<typeof StaticSnippet>

export const Snippet = z.discriminatedUnion('type', [
  DynamicSnippet,
  StaticSnippet
])

export type Snippet = z.infer<typeof Snippet>
