import test from 'ava'
import { parseBrowsersList as parse } from './browserslist-to-esbuild.js'

test('given browserslist defaults', (t) => {
  t.deepEqual(
    parse([
      'and_chr 127',
      'and_ff 127',
      'and_qq 14.9',
      'and_uc 15.5',
      'android 127',
      'chrome 127',
      'chrome 126',
      'chrome 125',
      'chrome 124',
      'chrome 123',
      'chrome 109',
      'edge 127',
      'edge 126',
      'edge 125',
      'edge 124',
      'firefox 128',
      'firefox 127',
      'firefox 126',
      'firefox 125',
      'firefox 115',
      'ios_saf 17.5',
      'ios_saf 17.4',
      'ios_saf 16.6-16.7',
      'ios_saf 15.6-15.8',
      'kaios 3.0-3.1',
      'kaios 2.5',
      'op_mini all',
      'op_mob 80',
      'opera 111',
      'opera 110',
      'opera 109',
      'safari 17.5',
      'safari 17.4',
      'samsung 25',
      'samsung 24'
    ]),
    ['chrome109', 'edge124', 'firefox115', 'ios15.6', 'opera109', 'safari17.4']
  )
})
