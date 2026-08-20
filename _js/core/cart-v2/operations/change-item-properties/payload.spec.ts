import test from 'ava'
import { z } from 'zod'
import { ChangePropertiesItem, ChangePropertiesPayload } from './payload.js'

test('ChangePropertiesItem schema', async (t) => {
  // Valid change properties item with string properties
  t.deepEqual(
    ChangePropertiesItem.parse({
      lineItemKey: 'abc123',
      properties: {
        color: 'red',
        size: 'large'
      }
    }),
    {
      lineItemKey: 'abc123',
      properties: {
        color: 'red',
        size: 'large'
      }
    }
  )

  // Valid change properties item with mixed property types
  t.deepEqual(
    ChangePropertiesItem.parse({
      lineItemKey: 'def456',
      properties: {
        color: 'blue',
        size: 'medium',
        customizable: true,
        weight: 2.5,
        tags: ['sport', 'outdoor'],
        _internal: 'hidden'
      }
    }),
    {
      lineItemKey: 'def456',
      properties: {
        color: 'blue',
        size: 'medium',
        customizable: true,
        weight: 2.5,
        tags: ['sport', 'outdoor'],
        _internal: 'hidden'
      }
    }
  )

  // Valid change properties item with empty properties (to clear all properties)
  t.deepEqual(
    ChangePropertiesItem.parse({
      lineItemKey: 'ghi789',
      properties: {}
    }),
    {
      lineItemKey: 'ghi789',
      properties: {}
    }
  )

  // Valid change properties item with null properties
  t.deepEqual(
    ChangePropertiesItem.parse({
      lineItemKey: 'jkl012',
      properties: {
        color: null,
        size: 'small'
      }
    }),
    {
      lineItemKey: 'jkl012',
      properties: {
        color: null,
        size: 'small'
      }
    }
  )

  // Invalid line item key
  await t.throwsAsync(
    async () => {
      await ChangePropertiesItem.parseAsync({
        lineItemKey: '',
        properties: { color: 'red' }
      })
    },
    {
      instanceOf: z.ZodError,
      message: /String must contain at least 1 character/i
    }
  )

  // Missing properties
  await t.throwsAsync(
    async () => {
      await ChangePropertiesItem.parseAsync({
        lineItemKey: 'abc123'
      })
    },
    {
      instanceOf: z.ZodError,
      message: /required/i
    }
  )
})

test('ChangePropertiesPayload schema', async (t) => {
  // Single item
  t.deepEqual(
    ChangePropertiesPayload.parse({
      items: [
        {
          lineItemKey: 'abc123',
          properties: { color: 'red', size: 'large' }
        }
      ]
    }),
    {
      items: [
        {
          lineItemKey: 'abc123',
          properties: { color: 'red', size: 'large' }
        }
      ]
    }
  )

  // Multiple items with different property types
  t.deepEqual(
    ChangePropertiesPayload.parse({
      items: [
        {
          lineItemKey: 'abc123',
          properties: { color: 'red', size: 'large' }
        },
        {
          lineItemKey: 'def456',
          properties: { customizable: true, weight: 1.5 }
        },
        {
          lineItemKey: 'ghi789',
          properties: {}
        }
      ]
    }),
    {
      items: [
        {
          lineItemKey: 'abc123',
          properties: { color: 'red', size: 'large' }
        },
        {
          lineItemKey: 'def456',
          properties: { customizable: true, weight: 1.5 }
        },
        {
          lineItemKey: 'ghi789',
          properties: {}
        }
      ]
    }
  )

  // Empty items array
  await t.throwsAsync(
    async () => {
      await ChangePropertiesPayload.parseAsync({
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
      await ChangePropertiesPayload.parseAsync({})
    },
    {
      instanceOf: z.ZodError,
      message: /required/i
    }
  )
})
