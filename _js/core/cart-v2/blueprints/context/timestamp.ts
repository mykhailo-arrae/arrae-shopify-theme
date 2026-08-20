import { z } from 'zod'

export const Timestamp = z.number().int().positive()
export type Timestamp = z.infer<typeof Timestamp>

/**
 * Returns the current timestamp in milliseconds.
 */
export const getCurrentTimestamp = (): Timestamp => Date.now()
