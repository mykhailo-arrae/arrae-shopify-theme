import test from 'ava'
import type { ZodSafeParseSuccess, core as zodCore } from 'devops-zod4'
import {
  ShopifyCliCredentials,
  type ShopifyCliCredentialsInput
} from './cli-credentials.js'

const Success = test.macro<
  [ShopifyCliCredentialsInput, ZodSafeParseSuccess<ShopifyCliCredentials>]
>({
  exec: async (t, input, expected) => {
    const actual = await ShopifyCliCredentials.safeParseAsync(input)
    t.like(actual, expected)
  },
  title: (providedTitle = '', input) => {
    return `given ${JSON.stringify(input)} ${providedTitle}`.trim()
  }
})

const ParseError = test.macro<
  [ShopifyCliCredentialsInput, Partial<zodCore.$ZodIssue>[]]
>({
  exec: async (t, input, expected) => {
    const actual = await ShopifyCliCredentials.safeParseAsync(input)
    if (actual.success) {
      t.fail('Parse error expected')
      return
    }

    t.like(actual.error.issues, expected)
  },
  title: (providedTitle = '', input) => {
    return `given ${JSON.stringify(input)} ${providedTitle || 'should throw parse error'}`.trim()
  }
})

test(
  'should use Shopify CLI variables',
  Success,
  {
    SHOPIFY_FLAG_STORE: 'test.myshopify.com',
    SHOPIFY_CLI_THEME_TOKEN: '1234567890'
  },
  {
    success: true,
    data: {
      accessToken: '1234567890',
      shop: 'test.myshopify.com',
      shopHandle: 'test'
    }
  }
)

test(
  'should use ThemeKit variables',
  Success,
  {
    SHOPIFY_SHOP: 'test.myshopify.com',
    SHOPIFY_CLI_ADMIN_AUTH_TOKEN: '1234567890'
  },
  {
    success: true,
    data: {
      accessToken: '1234567890',
      shop: 'test.myshopify.com',
      shopHandle: 'test'
    }
  }
)

test(
  'should use ineternal variables',
  Success,
  {
    SHOPIFY_SHOP: 'test.myshopify.com',
    SHOPIFY_ADMIN_API_TOKEN: '1234567890'
  },
  {
    success: true,
    data: {
      accessToken: '1234567890',
      shop: 'test.myshopify.com',
      shopHandle: 'test'
    }
  }
)

test(
  'should prefer Shopify CLI variables',
  Success,
  {
    SHOPIFY_SHOP: 'test.myshopify.com',
    SHOPIFY_FLAG_STORE: 'test2.myshopify.com',
    SHOPIFY_CLI_ADMIN_AUTH_TOKEN: 'x',
    SHOPIFY_CLI_THEME_TOKEN: 'y',
    SHOPIFY_ADMIN_API_TOKEN: 'z'
  },
  {
    success: true,
    data: {
      accessToken: 'y',
      shop: 'test2.myshopify.com',
      shopHandle: 'test2'
    }
  }
)

test(
  'should prefer ThemeKit variables',
  Success,
  {
    SHOPIFY_SHOP: 'test.myshopify.com',
    SHOPIFY_CLI_ADMIN_AUTH_TOKEN: 'x',
    SHOPIFY_CLI_THEME_TOKEN: 'y',
    SHOPIFY_ADMIN_API_TOKEN: 'z'
  },
  {
    success: true,
    data: {
      accessToken: 'x',
      shop: 'test.myshopify.com',
      shopHandle: 'test'
    }
  }
)

test(
  'should prefer internal variables',
  Success,
  {
    SHOPIFY_SHOP: 'test.myshopify.com',
    SHOPIFY_CLI_THEME_TOKEN: 'y',
    SHOPIFY_ADMIN_API_TOKEN: 'z'
  },
  {
    success: true,
    data: {
      accessToken: 'z',
      shop: 'test.myshopify.com',
      shopHandle: 'test'
    }
  }
)

test(
  ParseError,
  {
    SHOPIFY_SHOP: 'test.myshopify.com'
  },
  [
    {
      code: 'invalid_type',
      path: ['accessToken']
    }
  ]
)

test(
  ParseError,
  {
    SHOPIFY_SHOP: 'example.com',
    SHOPIFY_CLI_ADMIN_AUTH_TOKEN: '1234567890'
  },
  [
    {
      code: 'invalid_format',
      path: ['shop'],
      message: 'Invalid string: must end with ".myshopify.com"'
    }
  ]
)

test(
  ParseError,
  {
    SHOPIFY_SHOP: '.myshopify.com',
    SHOPIFY_CLI_ADMIN_AUTH_TOKEN: '1234567890'
  },
  [
    {
      code: 'too_small',
      path: ['shopHandle']
    }
  ]
)
