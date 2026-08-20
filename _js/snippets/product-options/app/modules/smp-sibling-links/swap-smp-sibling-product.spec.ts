import test from 'ava'
import {
  buildFullPageProductUrl,
  buildSectionRenderUrl,
  prefetchCacheKey
} from './swap-smp-sibling-product.js'

test('prefetchCacheKey normalizes origin and strips hash', (t) => {
  const key = prefetchCacheKey(
    'https://www.example.com/products/tone-green-apple?variant=1#gallery'
  )
  t.is(key, 'https://www.example.com/products/tone-green-apple?variant=1')
})

test('prefetchCacheKey rejects non-product paths', (t) => {
  t.is(prefetchCacheKey('https://www.example.com/collections/all'), null)
})

test('buildSectionRenderUrl appends section_id and keeps variant', (t) => {
  const url = buildSectionRenderUrl(
    'https://www.example.com/products/tone-green-apple?variant=9',
    'template--123__product-main'
  )

  t.not(url, null)
  t.is(url?.searchParams.get('section_id'), 'template--123__product-main')
  t.is(url?.searchParams.get('variant'), '9')
  t.is(url?.pathname, '/products/tone-green-apple')
})

test('buildSectionRenderUrl rejects non-product urls', (t) => {
  t.is(
    buildSectionRenderUrl(
      'https://www.example.com/pages/about',
      'template--123__product-main'
    ),
    null
  )
})

test('buildFullPageProductUrl strips section rendering params', (t) => {
  const url = buildFullPageProductUrl(
    'https://www.example.com/products/tone-green-apple?variant=9&section_id=x&sections=a,b'
  )

  t.not(url, null)
  t.is(url?.searchParams.get('variant'), '9')
  t.is(url?.searchParams.has('section_id'), false)
  t.is(url?.searchParams.has('sections'), false)
})
