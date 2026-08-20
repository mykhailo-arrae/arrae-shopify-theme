import test from 'ava'
import { z } from 'zod'
import { ChangeSellingPlanItem, ChangeSellingPlanPayload } from './payload.js'

const validParseMacro = test.macro<
  [
    input: Record<string, unknown>,
    expected: Record<string, unknown>,
    schemaName: 'ChangeSellingPlanItem' | 'ChangeSellingPlanPayload'
  ]
>({
  exec: (t, input, expected, schemaName) => {
    const schema =
      schemaName === 'ChangeSellingPlanItem'
        ? ChangeSellingPlanItem
        : ChangeSellingPlanPayload
    const actual = schema.parse(input)
    t.deepEqual(actual, expected)
  },
  title: (providedTitle = '', input, expected, schemaName) => {
    return `${schemaName} - ${providedTitle}`.trim()
  }
})

const invalidParseMacro = test.macro<
  [
    input: Record<string, unknown>,
    message: RegExp | undefined,
    schemaName: 'ChangeSellingPlanItem' | 'ChangeSellingPlanPayload'
  ]
>({
  exec: async (t, input, expectedMessagePattern, schemaName) => {
    const schema =
      schemaName === 'ChangeSellingPlanItem'
        ? ChangeSellingPlanItem
        : ChangeSellingPlanPayload
    const error = await t.throwsAsync(
      async () => {
        await schema.parseAsync(input)
      },
      {
        instanceOf: z.ZodError
      }
    )

    if (expectedMessagePattern) {
      t.regex(error.message, expectedMessagePattern)
    }
  },
  title: (providedTitle = '', input, expectedMessagePattern, schemaName) => {
    return `${schemaName} - ${providedTitle}`.trim()
  }
})

// ChangeSellingPlanItem valid cases
test(
  'parses valid item with selling plan ID',
  validParseMacro,
  {
    lineItemKey: 'abc123',
    sellingPlan: 12_345
  },
  {
    lineItemKey: 'abc123',
    sellingPlan: 12_345
  },
  'ChangeSellingPlanItem'
)

test(
  'parses valid item with null selling plan',
  validParseMacro,
  {
    lineItemKey: 'def456',
    sellingPlan: null
  },
  {
    lineItemKey: 'def456',
    sellingPlan: null
  },
  'ChangeSellingPlanItem'
)

test(
  'rejects empty string selling plan',
  invalidParseMacro,
  {
    lineItemKey: 'ghi789',
    sellingPlan: ''
  },
  /Expected number/i,
  'ChangeSellingPlanItem'
)

// ChangeSellingPlanItem invalid cases
test(
  'rejects empty line item key',
  invalidParseMacro,
  {
    lineItemKey: '',
    sellingPlan: 12_345
  },
  /String must contain at least 1 character/i,
  'ChangeSellingPlanItem'
)

test(
  'rejects negative selling plan',
  invalidParseMacro,
  {
    lineItemKey: 'abc123',
    sellingPlan: -1
  },
  /Number must be greater than 0/i,
  'ChangeSellingPlanItem'
)

test(
  'rejects zero selling plan',
  invalidParseMacro,
  {
    lineItemKey: 'abc123',
    sellingPlan: 0
  },
  /Number must be greater than 0/i,
  'ChangeSellingPlanItem'
)

test(
  'rejects non-integer selling plan',
  invalidParseMacro,
  {
    lineItemKey: 'abc123',
    sellingPlan: 123.45
  },
  /Expected integer/i,
  'ChangeSellingPlanItem'
)

test(
  'rejects non-empty string selling plan',
  invalidParseMacro,
  {
    lineItemKey: 'abc123',
    sellingPlan: 'invalid'
  },
  undefined,
  'ChangeSellingPlanItem'
)

test(
  'rejects missing selling plan',
  invalidParseMacro,
  {
    lineItemKey: 'abc123'
  },
  /required/i,
  'ChangeSellingPlanItem'
)

test(
  'rejects missing line item key',
  invalidParseMacro,
  {
    sellingPlan: 12_345
  },
  /required/i,
  'ChangeSellingPlanItem'
)

// ChangeSellingPlanPayload valid cases
test(
  'parses single item payload',
  validParseMacro,
  {
    items: [
      {
        lineItemKey: 'abc123',
        sellingPlan: 12_345
      }
    ]
  },
  {
    items: [
      {
        lineItemKey: 'abc123',
        sellingPlan: 12_345
      }
    ]
  },
  'ChangeSellingPlanPayload'
)

test(
  'parses multiple items payload',
  validParseMacro,
  {
    items: [
      {
        lineItemKey: 'abc123',
        sellingPlan: 12_345
      },
      {
        lineItemKey: 'def456',
        sellingPlan: null
      },
      {
        lineItemKey: 'ghi789',
        sellingPlan: null
      }
    ]
  },
  {
    items: [
      {
        lineItemKey: 'abc123',
        sellingPlan: 12_345
      },
      {
        lineItemKey: 'def456',
        sellingPlan: null
      },
      {
        lineItemKey: 'ghi789',
        sellingPlan: null
      }
    ]
  },
  'ChangeSellingPlanPayload'
)

// ChangeSellingPlanPayload invalid cases
test(
  'rejects empty items array',
  invalidParseMacro,
  {
    items: []
  },
  /Array must contain at least 1 element/i,
  'ChangeSellingPlanPayload'
)

test(
  'rejects missing items',
  invalidParseMacro,
  {},
  /required/i,
  'ChangeSellingPlanPayload'
)
