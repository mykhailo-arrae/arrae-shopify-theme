import test from 'ava'

import { genUid } from './index.js'

test('UID Generator', async (t) => {
  t.is(genUid().length, 36, 'should use same length as UUID v4')
  t.is(genUid().slice(0, 1), 'z', 'should start with lowercase letter z')
  t.false(/\W/g.test(genUid()), 'should include only letters and numbers')
  t.false(/_/g.test(genUid()), 'should not include underscores')
  t.false(/[A-Z]/g.test(genUid()), 'should not include uppercase letters')
})
