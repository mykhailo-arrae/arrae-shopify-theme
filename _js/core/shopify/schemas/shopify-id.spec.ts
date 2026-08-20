import test from 'ava'
import { ShopifyId, type ShopifyIdInput } from './shopify-id.js'

const macro = test.macro<[ShopifyIdInput, ShopifyId]>({
  exec: (t, input, expected) => {
    const actual = ShopifyId.parse(input)
    t.deepEqual(actual, expected)
  },
  title: (providedTitle = '', input) => {
    return `given ${typeof input} ${input} ${providedTitle}`.trim()
  }
})

test(macro, 'gid://shopify/Product/123', {
  type: 'GlobalId',
  value: 'gid://shopify/Product/123'
})

test(macro, 'gid://shopify/InventoryLevel/123?inventory_item_id=456', {
  type: 'GlobalId',
  value: 'gid://shopify/InventoryLevel/123?inventory_item_id=456'
})

test(macro, 123, { type: 'LegacyId', value: '123', originalValue: 123 })

test(macro, '123', { type: 'LegacyId', value: '123', originalValue: '123' })
