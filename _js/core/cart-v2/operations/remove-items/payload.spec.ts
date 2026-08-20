import test from 'ava'
import { z } from 'zod'
import { RemoveItemsPayload } from './payload.js'

test('RemoveItemsPayload schema', async (t) => {
  // Single line item key
  t.deepEqual(
    RemoveItemsPayload.parse({
      lineItemKeys: ['abc123']
    }),
    {
      lineItemKeys: ['abc123']
    }
  )

  // Multiple line item keys
  t.deepEqual(
    RemoveItemsPayload.parse({
      lineItemKeys: ['abc123', 'def456', 'ghi789']
    }),
    {
      lineItemKeys: ['abc123', 'def456', 'ghi789']
    }
  )

  // Empty array
  await t.throwsAsync(
    async () => {
      await RemoveItemsPayload.parseAsync({
        lineItemKeys: []
      })
    },
    {
      instanceOf: z.ZodError,
      message: /Array must contain at least 1 element/i
    }
  )

  // Missing lineItemKeys
  await t.throwsAsync(
    async () => {
      await RemoveItemsPayload.parseAsync({})
    },
    {
      instanceOf: z.ZodError,
      message: /required/i
    }
  )

  // Empty string in array
  await t.throwsAsync(
    async () => {
      await RemoveItemsPayload.parseAsync({
        lineItemKeys: ['abc123', '']
      })
    },
    {
      instanceOf: z.ZodError,
      message: /String must contain at least 1 character/i
    }
  )

  // Non-string in array
  await t.throwsAsync(
    async () => {
      await RemoveItemsPayload.parseAsync({
        lineItemKeys: ['abc123', 123]
      })
    },
    {
      instanceOf: z.ZodError,
      message: /Expected string, received number/i
    }
  )

  // Non-array lineItemKeys
  await t.throwsAsync(
    async () => {
      await RemoveItemsPayload.parseAsync({
        lineItemKeys: 'abc123'
      })
    },
    {
      instanceOf: z.ZodError,
      message: /Expected array, received string/i
    }
  )
})
