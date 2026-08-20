import test from 'ava'
import { z } from 'zod'
import { AddItemsPayload, SingleItemPayload } from './payload.js'

test('SingleItemPayload schema', async (t) => {
  // Valid single item
  t.deepEqual(
    SingleItemPayload.parse({
      id: 1,
      quantity: 1
    }),
    {
      id: 1,
      quantity: 1
    }
  )

  // With properties
  t.deepEqual(
    SingleItemPayload.parse({
      id: 123,
      quantity: 2,
      properties: {
        bundle_id: 'xxx',
        custom_field: 'value'
      }
    }),
    {
      id: 123,
      quantity: 2,
      properties: {
        bundle_id: 'xxx',
        custom_field: 'value'
      }
    }
  )

  // With selling plan
  t.deepEqual(
    SingleItemPayload.parse({
      id: '456',
      quantity: 1,
      selling_plan: '789'
    }),
    {
      id: 456,
      quantity: 1,
      selling_plan: 789
    }
  )

  // Invalid id
  await t.throwsAsync(
    async () => {
      await SingleItemPayload.parseAsync({
        id: 0,
        quantity: 1
      })
    },
    {
      instanceOf: z.ZodError,
      message: /Number must be greater than or equal to 1/i
    }
  )

  // Invalid quantity
  await t.throwsAsync(
    async () => {
      await SingleItemPayload.parseAsync({
        id: 1,
        quantity: 0
      })
    },
    {
      instanceOf: z.ZodError,
      message: /Number must be greater than or equal to 1/i
    }
  )
})

test('AddItemsPayload schema', async (t) => {
  // Single item
  t.deepEqual(
    AddItemsPayload.parse({
      items: [{ id: 1, quantity: 1 }]
    }),
    {
      items: [{ id: 1, quantity: 1 }]
    }
  )

  // Multiple items
  t.deepEqual(
    AddItemsPayload.parse({
      items: [
        { id: 1, quantity: 1 },
        { id: 2, quantity: 3, properties: { foo: 'bar' } },
        { id: 3, quantity: 1, selling_plan: 100 }
      ]
    }),
    {
      items: [
        { id: 1, quantity: 1 },
        { id: 2, quantity: 3, properties: { foo: 'bar' } },
        { id: 3, quantity: 1, selling_plan: 100 }
      ]
    }
  )

  // Empty items array
  await t.throwsAsync(
    async () => {
      await AddItemsPayload.parseAsync({
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
      await AddItemsPayload.parseAsync({})
    },
    {
      instanceOf: z.ZodError,
      message: /required/i
    }
  )
})
