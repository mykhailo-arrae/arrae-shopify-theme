import { z } from 'devops-zod4'

/**
 * On initial release theme creation, define whether to use the content from the main git branch
 * or from the live theme of the target store
 *
 * - Choose 'live-theme' if the store is already using our theme
 * - Choose 'git' if the store is using a legacy theme, and our theme wasn't launched yet
 */
export const InitialContentSource = z.enum(['live-theme', 'git'])
export type InitialContentSource = z.infer<typeof InitialContentSource>

export const InitialContentSourcePipeline = z
  .string()
  .trim()
  .nullable()
  .optional()
  .default('live-theme')
  .transform<string>((v) => v || 'live-theme')
  .pipe(InitialContentSource)
