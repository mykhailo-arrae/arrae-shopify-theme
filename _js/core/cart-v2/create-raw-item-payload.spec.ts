import test from 'ava'

import { createRawItemPayload as c } from './create-raw-item-payload.js'

test('Create Raw Item Payload', async (t) => {
  t.deepEqual(
    c([
      { name: 'id', value: '1' },
      { name: 'quantity', value: '3' }
    ]),
    {
      id: '1',
      quantity: '3',
      properties: {}
    },
    'should build a payload object from jQuery `form.serializeArray` output'
  )

  t.deepEqual(
    c([
      { name: 'id', value: '1' },
      { name: 'quantity', value: '3' },
      { name: 'properties[foo]', value: 'bar' },
      { name: 'properties[foo bar]', value: 'foo bar' },
      { name: 'properties[This is a Test]', value: '1' },
      { name: 'properties[[MOAR BRACKETS]]', value: '0' }
    ]),
    {
      id: '1',
      quantity: '3',
      properties: {
        foo: 'bar',
        'foo bar': 'foo bar',
        'This is a Test': '1',
        '[MOAR BRACKETS]': '0'
      }
    },
    'should collect Shopify line item property values in `properties` object'
  )

  t.deepEqual(
    c([
      { name: 'id', value: '1' },
      { name: 'quantity', value: '3' },
      { name: 'properties[foo]', value: 'bar' },
      { name: 'properties[]', value: 'empty prop key' },
      { name: 'properties[', value: 'missing trailing bracket' },
      { name: 'properties]', value: 'missing leading bracket' },
      { name: 'properties', value: 'no prop key' }
    ]),
    {
      id: '1',
      quantity: '3',
      properties: {
        foo: 'bar'
      }
    },
    'should ignore malformed property entries'
  )
})
