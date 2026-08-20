import { z } from 'zod'

export const AddNotePayload = z.object({
  note: z.string().nullable()
})

export type AddNotePayload = z.infer<typeof AddNotePayload>
