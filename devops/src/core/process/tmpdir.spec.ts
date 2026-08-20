import test from 'ava'
import { tmpdir } from './tmpdir.js'

test('TMP_DIR helper', async (t) => {
  if (!process.env.TMP_DIR) {
    throw new Error('TMP_DIR environment variable not set')
  }

  t.is(tmpdir, '/mnt/tmp')
  t.is(tmpdir, process.env.TMP_DIR)
})
