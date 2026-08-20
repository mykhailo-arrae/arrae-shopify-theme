import test from 'ava'
import type { JSONValue } from '../typescript/json-value.js'
import {
  parseShopifyErrorResponse as parse,
  type ShopifyErrorResponse
} from './shopify-error-response.js'

const macro = test.macro<[JSONValue, ShopifyErrorResponse | null]>({
  exec: async (t, input, expected) => {
    const actual = parse(input)
    t.deepEqual(actual, expected)
  },
  title: (providedTitle = '', input) => {
    return `given ${JSON.stringify(input)} ${providedTitle}`.trim()
  }
})

test(macro, null, {
  __typename: 'ShopifyErrorResponse',
  description: 'Expected object, received null',
  message: 'Malformed API response',
  status: 500
})

test(
  macro,
  { message: null },
  {
    __typename: 'ShopifyErrorResponse',
    description: 'Property "message" - Expected string, received null',
    message: 'Malformed API response',
    status: 500
  }
)

test(
  macro,
  { message: '' },
  {
    __typename: 'ShopifyErrorResponse',
    description: 'Property "message" - Message should not be empty',
    message: 'Malformed API response',
    status: 500
  }
)

test(
  macro,
  { message: 'Cart Error' },
  {
    __typename: 'ShopifyErrorResponse',
    description: null,
    message: 'Cart Error',
    status: null
  }
)

test(
  macro,
  { message: 'Cart Error', description: null },
  {
    __typename: 'ShopifyErrorResponse',
    description: null,
    message: 'Cart Error',
    status: null
  }
)

test(
  macro,
  { message: 'Cart Error', description: '' },
  {
    __typename: 'ShopifyErrorResponse',
    description: null,
    message: 'Cart Error',
    status: null
  }
)

test(
  macro,
  { message: 'Cart Error', description: 'All items are in your cart' },
  {
    __typename: 'ShopifyErrorResponse',
    description: 'All items are in your cart',
    message: 'Cart Error',
    status: null
  }
)

test(
  macro,
  { message: 'Cart Error', status: null },
  {
    __typename: 'ShopifyErrorResponse',
    description: null,
    message: 'Cart Error',
    status: null
  }
)

test(
  macro,
  { message: 'Cart Error', status: '422' },
  {
    __typename: 'ShopifyErrorResponse',
    description: null,
    message: 'Cart Error',
    status: 422
  }
)

test(
  macro,
  { message: 'Cart Error', status: 422 },
  {
    __typename: 'ShopifyErrorResponse',
    description: null,
    message: 'Cart Error',
    status: 422
  }
)

test(
  'should handle NaN status',
  macro,
  { message: 'Cart Error', status: Number.NaN },
  {
    __typename: 'ShopifyErrorResponse',
    description: null,
    message: 'Cart Error',
    status: null
  }
)

test(
  'should handle empty string status',
  macro,
  { message: 'Cart Error', status: '' },
  {
    __typename: 'ShopifyErrorResponse',
    description: null,
    message: 'Cart Error',
    status: null
  }
)
