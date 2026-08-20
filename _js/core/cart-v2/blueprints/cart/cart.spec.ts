import test from 'ava'
import { Cart } from './index.js'

test('should parse minimal cart payload', (t) => {
  const input = {
    token: '198cd58bfa8a48e7910b63a5335d1860',
    note: null,
    attributes: {},
    original_total_price: 0,
    total_price: 0,
    total_discount: 0,
    total_weight: 0,
    currency: 'USD',
    item_count: 0,
    items_subtotal_price: 0,
    requires_shipping: false,
    items: [],
    cart_level_discount_applications: [],
    discount_codes: []
  } satisfies Cart

  t.deepEqual(Cart.parse(input), input)
})

test('should parse cart payload', (t) => {
  const input = {
    token: '198cd58bfa8a48e7910b63a5335d1860',
    note: 'This is a note',
    attributes: {
      _internal_id: 'xxx'
    },
    original_total_price: 1000,
    total_price: 1000,
    total_discount: 0,
    total_weight: 800,
    currency: 'USD',
    item_count: 1,
    items_subtotal_price: 1000,
    requires_shipping: false,
    items: [
      {
        id: 1,
        title: 'Test Product',
        quantity: 1,
        price: 1000,
        presentment_price: 10.0,
        requires_shipping: false,
        properties: {
          _internal_id: 'xxx'
        },
        total_discount: 0,
        key: 'a',
        variant_id: 0,
        original_price: 0,
        discounted_price: 0,
        discounts: [],
        featured_image: {
          url: null,
          alt: null,
          width: null,
          height: null,
          aspect_ratio: null
        },
        image: null,
        final_line_price: 1000,
        final_price: 1000,
        gift_card: false,
        grams: 800,
        sku: null,
        handle: null,
        line_level_discount_allocations: [],
        line_level_total_discount: 0,
        line_price: 1000,
        options_with_values: null,
        original_line_price: 1000,
        product_description: null,
        product_has_only_default_variant: true,
        product_id: null,
        product_title: null,
        product_type: null,
        taxable: null,
        url: 'https://example.com/products/test-product',
        variant_options: null,
        variant_title: null,
        vendor: null,
        quantity_rule: {
          min: 1,
          max: null,
          increment: 1
        },
        has_components: false
      }
    ],
    cart_level_discount_applications: [],
    discount_codes: []
  } satisfies Cart

  t.deepEqual(input, Cart.parse(input))
})
