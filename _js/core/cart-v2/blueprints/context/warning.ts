import { z } from 'zod'
import { Timestamp } from './timestamp.js'

export const Warning = z.object({
  message: z.string().min(1),
  timestamp: Timestamp
})
export type Warning = z.infer<typeof Warning>
