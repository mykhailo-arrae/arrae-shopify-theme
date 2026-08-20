import test from 'ava'
import { CartItemProperties as Props } from './item-properties.js'

const macro = test.macro<[input: unknown, expected: Props]>({
  exec: (t, input, expected) => {
    const actual = Props.parse(input)
    t.deepEqual(actual, expected)
  },
  title: (providedTitle = '', input) => {
    return `given ${JSON.stringify(input)} ${providedTitle}`.trim()
  }
})

test('should accept an empty record', macro, {}, {})

test(
  'should accept null as a prop value',
  macro,
  { bundle_id: null },
  { bundle_id: null }
)

test(
  'should accept a string or a number as a prop value',
  macro,
  {
    bundle_id: 'xxx',
    bundle_item_count: 3
  },
  {
    bundle_id: 'xxx',
    bundle_item_count: 3
  }
)

test(
  'should accept an array of values as a prop value',
  macro,
  {
    bundle_id: 'xxx',
    bundle_item_ids: ['yyy', null, undefined, 123, true]
  },
  {
    bundle_id: 'xxx',
    bundle_item_ids: ['yyy', null, undefined, 123, true]
  }
)

test(
  'should accept a boolean as a prop value',
  macro,
  {
    is_bundle: true
  },
  {
    is_bundle: true
  }
)

test(
  'with Warranty app properties should accept boolean properties',
  macro,
  {
    Product: 'Product name',
    Term: '2 years',
    '_Extend.IsPricePoint': true,
    '_Extend.PlanId': 'AA-AAA2',
    '_Extend.ProductId': '626362332327',
    '__Extend.IsExtendWarranty': true
  },
  {
    Product: 'Product name',
    Term: '2 years',
    '_Extend.IsPricePoint': true,
    '_Extend.PlanId': 'AA-AAA2',
    '_Extend.ProductId': '626362332327',
    '__Extend.IsExtendWarranty': true
  }
)
