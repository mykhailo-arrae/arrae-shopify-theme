import test from 'ava'
import { ASSET_FILE_PREFIX as prefix } from './asset-file-prefix.js'

test('can be empty', (t) => {
  t.true(typeof prefix === 'string')
  t.true(prefix.length >= 0)
})

test('should be no longer than five symbols', (t) => {
  t.true(prefix.length <= 5)
})

test('should be lowercase letters only', (t) => {
  t.regex(prefix, /^[a-z]*?$/)
})
