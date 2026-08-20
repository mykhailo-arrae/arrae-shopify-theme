import test from 'ava'

import { getSizedImageUrl } from './get-sized-image-url.js'

test('Get Sized Image URL utility', async (t) => {
  t.is(
    getSizedImageUrl(undefined),
    null,
    'should return null on missing URL argument'
  )

  t.is(getSizedImageUrl(null), null, 'should return null on null URL argument')

  t.is(
    getSizedImageUrl('/test.jpg', '300x'),
    '/test.jpg',
    'should pass through non-Shopify URLs'
  )

  t.is(
    getSizedImageUrl(
      'https://cdn.shopify.com/s/files/1/0012/7628/0935/products/32b3863554f4686d825d9da18a24cfc6_320x.jpg?v=1531319636',
      '300x'
    ),
    '//cdn.shopify.com/s/files/1/0012/7628/0935/products/32b3863554f4686d825d9da18a24cfc6_300x.jpg?v=1531319636',
    'should replace width-only size in the URL'
  )

  t.is(
    getSizedImageUrl(
      'https://cdn.shopify.com/s/files/1/0012/7628/0935/products/32b3863554f4686d825d9da18a24cfc6_x400.jpg?v=1531319636',
      'x600'
    ),
    '//cdn.shopify.com/s/files/1/0012/7628/0935/products/32b3863554f4686d825d9da18a24cfc6_x600.jpg?v=1531319636',
    'should replace height-only size in the URL'
  )

  t.is(
    getSizedImageUrl(
      'https://cdn.shopify.com/s/files/1/0012/7628/0935/products/32b3863554f4686d825d9da18a24cfc6_320x640.jpg?v=1531319636',
      '300x'
    ),
    '//cdn.shopify.com/s/files/1/0012/7628/0935/products/32b3863554f4686d825d9da18a24cfc6_300x.jpg?v=1531319636',
    'should replace two-dimensional size in the URL'
  )

  t.is(
    getSizedImageUrl(
      '//cdn.shopify.com/s/files/1/0869/4382/products/CCHP8981-eba6a9a5-99be-40b0-b488-e070d7587269_grande.jpg?v=1562099594',
      '300x'
    ),
    '//cdn.shopify.com/s/files/1/0869/4382/products/CCHP8981-eba6a9a5-99be-40b0-b488-e070d7587269_300x.jpg?v=1562099594',
    'should replace deprecated size keyword in the URL'
  )

  t.is(
    getSizedImageUrl(
      '//cdn.shopify.com/s/files/1/0869/4382/products/CCHP8981_grande_2048x2048.jpg?v=1562099594',
      '300x'
    ),
    '//cdn.shopify.com/s/files/1/0869/4382/products/CCHP8981_grande_300x.jpg?v=1562099594',
    'should keep deprecated size keyword if dimensional size value is present'
  )

  t.is(
    getSizedImageUrl(
      '//cdn.shopify.com/s/files/1/0869/4382/products/CCHP8981-eba6a9a5-99be-40b0-b488-e070d7587269_2048x2048.jpg?v=1562099594&view=abc',
      '300x'
    ),
    '//cdn.shopify.com/s/files/1/0869/4382/products/CCHP8981-eba6a9a5-99be-40b0-b488-e070d7587269_300x.jpg?v=1562099594&view=abc',
    'should keep query portion of the URL as-is'
  )
})
