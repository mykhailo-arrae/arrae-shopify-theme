import test from 'ava'
import { z } from 'zod'
import { ChangeQuantityItem, ChangeQuantityPayload } from './payload.js'

test('ChangeQuantityItem schema', async (t) => {
  // Valid change quantity item
  t.deepEqual(
    ChangeQuantityItem.parse({
      lineItemKey: 'abc123',
      quantity: 2
    }),
    {
      lineItemKey: 'abc123',
      quantity: 2
    }
  )

  // With zero quantity (for removal)
  t.deepEqual(
    ChangeQuantityItem.parse({
      lineItemKey: 'def456',
      quantity: 0
    }),
    {
      lineItemKey: 'def456',
      quantity: 0
    }
  )

  // Invalid line item key
  await t.throwsAsync(
    async () => {
      await ChangeQuantityItem.parseAsync({
        lineItemKey: '',
        quantity: 1
      })
    },
    {
      instanceOf: z.ZodError,
      message: /String must contain at least 1 character/i
    }
  )

  // Invalid quantity (negative)
  await t.throwsAsync(
    async () => {
      await ChangeQuantityItem.parseAsync({
        lineItemKey: 'abc123',
        quantity: -1
      })
    },
    {
      instanceOf: z.ZodError,
      message: /Number must be greater than or equal to 0/i
    }
  )
})

test('ChangeQuantityPayload schema', async (t) => {
  // Single item
  t.deepEqual(
    ChangeQuantityPayload.parse({
      items: [{ lineItemKey: 'abc123', quantity: 2 }]
    }),
    {
      items: [{ lineItemKey: 'abc123', quantity: 2 }]
    }
  )

  // Multiple items
  t.deepEqual(
    ChangeQuantityPayload.parse({
      items: [
        { lineItemKey: 'abc123', quantity: 2 },
        { lineItemKey: 'def456', quantity: 0 },
        { lineItemKey: 'ghi789', quantity: 5 }
      ]
    }),
    {
      items: [
        { lineItemKey: 'abc123', quantity: 2 },
        { lineItemKey: 'def456', quantity: 0 },
        { lineItemKey: 'ghi789', quantity: 5 }
      ]
    }
  )

  // Empty items array
  await t.throwsAsync(
    async () => {
      await ChangeQuantityPayload.parseAsync({
        items: []
      })
    },
    {
      instanceOf: z.ZodError,
      message: /Array must contain at least 1 element/i
    }
  )

  // Missing items
  await t.throwsAsync(
    async () => {
      await ChangeQuantityPayload.parseAsync({})
    },
    {
      instanceOf: z.ZodError,
      message: /required/i
    }
  )
})
