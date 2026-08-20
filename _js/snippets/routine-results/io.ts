import { z } from 'zod'

export const RoutineResultProductSchema = z.object({
  productId: z.number(),
  variantId: z.number(),
  title: z.string(),
  vendor: z.string().optional().default(''),
  url: z.string().optional().default(''),
  price: z.number(),
  compareAtPrice: z.number().nullable().optional(),
  featuredImage: z.string().nullable().optional(),
  description: z.string().optional().default(''),
  routineTitle: z.string().optional().default(''),
  routineDescription: z.string().optional().default(''),
  reviewsHtml: z.string().optional().default(''),
  availableForSale: z.boolean()
})

export const RoutineCreatorEntrySchema = z.object({
  internalName: z.string().optional().default(''),
  question_1: z.string().nullable().optional().default(''),
  question_2: z.string().nullable().optional().default(''),
  results: z.array(RoutineResultProductSchema)
})

export const RoutineCreatorResultsSchema = z.array(RoutineCreatorEntrySchema)

export const RoutineLabelsSchema = z.object({
  next: z.string().default('Next'),
  back: z.string().default('Back'),
  submit: z.string().default('Find your routine'),
  stepTemplate: z.string().default('Step %current% / %total%'),
  addAllToCart: z.string().default('Add all to cart'),
  addToCart: z.string().default('Add to cart'),
  addingToCart: z.string().default('Adding to cart'),
  soldOut: z.string().default('Sold out'),
  resultsTitle: z.string().default('Your routine'),
  errorMessage: z
    .string()
    .default(
      'No routine matches your selection. Please try different answers.'
    ),
  close: z.string().default('Close results')
})

export const RoutineSettingsSchema = z.object({
  moneyFormat: z.string().default('${{amount}}'),
  totalSteps: z.number().default(0),
  labels: RoutineLabelsSchema
})

export type RoutineResultProduct = z.infer<typeof RoutineResultProductSchema>
export type RoutineCreatorEntry = z.infer<typeof RoutineCreatorEntrySchema>
export type RoutineCreatorResults = z.infer<typeof RoutineCreatorResultsSchema>
export type RoutineLabels = z.infer<typeof RoutineLabelsSchema>
export type RoutineSettings = z.infer<typeof RoutineSettingsSchema>

const QUESTION_KEYS = ['question_1', 'question_2'] as const
export type QuestionKey = (typeof QUESTION_KEYS)[number]

// Sentinel value used in "routine_creator_results" metaobject fields to mark
// a question as a wildcard. An entry with every "question_*" set to "WILDCARD"
// becomes the default routine (matches any combination of answers).
const WILDCARD = 'any'

const normalize = (value: string | null | undefined): string => {
  if (typeof value !== 'string') {
    return ''
  }
  return value.trim().toLowerCase()
}

const isWildcard = (entryValue: string | null | undefined): boolean => {
  return normalize(entryValue) === WILDCARD
}

const isEntryMatch = (
  entry: RoutineCreatorEntry,
  answers: string[]
): boolean => {
  for (let i = 0; i < QUESTION_KEYS.length; i += 1) {
    const key = QUESTION_KEYS[i]
    if (key == null) {
      continue
    }

    const expected = answers[i]

    if (expected == null || expected === '') {
      continue
    }

    const entryValue = entry[key]

    if (isWildcard(entryValue)) {
      continue
    }

    if (normalize(entryValue) !== normalize(expected)) {
      return false
    }
  }

  return true
}

const wildcardCount = (entry: RoutineCreatorEntry): number => {
  let count = 0
  for (const key of QUESTION_KEYS) {
    if (isWildcard(entry[key])) {
      count += 1
    }
  }
  return count
}

export const findMatchingEntry = (
  entries: RoutineCreatorResults,
  answers: string[]
): RoutineCreatorEntry | null => {
  let best: RoutineCreatorEntry | null = null
  let bestWildcards = Number.POSITIVE_INFINITY

  for (const entry of entries) {
    if (!isEntryMatch(entry, answers)) {
      continue
    }
    const wildcards = wildcardCount(entry)
    if (wildcards < bestWildcards) {
      best = entry
      bestWildcards = wildcards
    }
  }

  return best
}
