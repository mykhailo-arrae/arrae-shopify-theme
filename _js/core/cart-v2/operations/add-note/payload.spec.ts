import test from 'ava'
import { z } from 'zod'
import { AddNotePayload } from './payload.js'

test('AddNotePayload schema', async (t) => {
  // Valid note
  t.deepEqual(
    AddNotePayload.parse({
      note: 'This is a test note'
    }),
    {
      note: 'This is a test note'
    }
  )

  // Empty note
  t.deepEqual(
    AddNotePayload.parse({
      note: ''
    }),
    {
      note: ''
    }
  )

  // Missing note
  await t.throwsAsync(
    async () => {
      await AddNotePayload.parseAsync({})
    },
    {
      instanceOf: z.ZodError,
      message: /required/i
    }
  )

  // Invalid note type
  await t.throwsAsync(
    async () => {
      await AddNotePayload.parseAsync({
        note: 123
      })
    },
    {
      instanceOf: z.ZodError,
      message: /Expected string/i
    }
  )
})
