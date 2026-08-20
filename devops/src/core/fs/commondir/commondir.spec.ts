import test from 'ava'
import { commondir } from './index.js'

test('given nothing', (t) => {
  t.is(2 * 2, 4)
})

const macro = test.macro<
  [
    input: [files: (string | null | undefined)[], cwd?: string],
    expected: string
  ]
>({
  exec: (t, [files, cwd], expected) => {
    const actual = commondir(files, cwd)
    t.is(actual, expected)
  },
  title: (providedTitle = '', input) => {
    return `given ${JSON.stringify(input)} ${providedTitle}`.trim()
  }
})

test(macro, [[]], '/')
test(
  'should return custom cwd if file list is empty',
  macro,
  [[], '/app'],
  '/app'
)

test('should handle single file', macro, [['/app/src/core']], '/app/src/core')

test(macro, [['src/core'], '/app'], '/app/src/core')

test(macro, [['/a/b/c', '/a/b', '/a/b/c/d/e']], '/a/b')

test(
  'should ignore falsy arguments',
  macro,
  [['/a/b/c', '', null, undefined, '/a/b', '/a/b/c/d/e']],
  '/a/b'
)

test(macro, [['/x/y/z/w', '/xy/z', '/x/y/z']], '/')

test(macro, [['/foo', '//foo/bar', '/foo//bar/baz']], '/foo')

test(
  'should return custom cwd on no common path',
  macro,
  [['/x/y/z/w', '/xy/z', '/x/y/z'], '/a'],
  '/a'
)

test(
  macro,
  [['src/core/a', 'src/core/b', 'src/core/c'], '/app'],
  '/app/src/core'
)
