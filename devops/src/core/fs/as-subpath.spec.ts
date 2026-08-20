import test from 'ava'
import { asSubPath, type Input } from './as-subpath.js'

const macro = test.macro<[Input, string | null]>({
  exec: (t, input, expected) => {
    const actual = asSubPath(input)
    t.is(actual, expected)
  },
  title: (providedTitle = '', input) => {
    return `given ${JSON.stringify(input)} ${providedTitle}`.trim()
  }
})

test(macro, { parent: 'a', child: 'a', cwd: '/' }, null)
test(macro, { parent: 'a', child: 'a', cwd: '/app' }, null)

test(macro, { parent: '/app', child: '/app', cwd: '/app' }, null)

test(macro, { parent: 'a', child: 'a/b', cwd: '/' }, 'b')
test(macro, { parent: '/a', child: '/a/b', cwd: '/' }, 'b')
test(macro, { parent: 'a', child: 'a/b', cwd: '/app' }, 'b')
test(macro, { parent: 'a', child: 'a/b', cwd: 'a' }, 'b')

test(macro, { parent: 'theme', child: 'theme/assets', cwd: '/app' }, 'assets')
test(
  macro,
  { parent: '/app/theme', child: '/app/theme/assets', cwd: '/app' },
  'assets'
)
test(macro, { parent: 'theme', child: 'assets', cwd: '/app' }, null)

test(macro, { parent: '/x', child: 'z', cwd: '/y' }, null)
