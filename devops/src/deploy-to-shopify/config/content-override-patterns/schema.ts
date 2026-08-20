import { z } from 'devops-zod4'

export const ContentOverridePatterns = z.array(z.string().min(1))
export type ContentOverridePatterns = z.infer<typeof ContentOverridePatterns>

export const ContentOverridePatternsPipeline = z
  .string()
  .optional()
  .nullable()
  .default('')
  .transform((value) => {
    if (value == null) {
      return []
    }

    return value.split('|||').flatMap((_pattern) => {
      const pattern = _pattern.trim()

      if (pattern.length === 0) {
        return []
      }

      return [pattern]
    })
  })
  .pipe(ContentOverridePatterns)
