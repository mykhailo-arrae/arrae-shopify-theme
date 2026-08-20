import test from 'ava'
import { formatMessageLines } from './format-message-lines.js'

const macro = test.macro<[unknown, string[]]>({
  exec: (t, input, expected) => {
    const actual = formatMessageLines({ msg: input, sublineIndent: 2 })
    t.deepEqual(actual, expected)
  },
  title: (providedTitle = '', input) => {
    return `given ${JSON.stringify(input)} ${providedTitle}`.trim()
  }
})

test(macro, 'foo', ['foo'])
test(macro, 'foo\nbar', ['foo', '  bar'])
test(macro, 'foo\n   bar', ['foo', '  bar'])
test(
  macro,
  `│foo
  │ bar
  │baz
  │  qux
`,
  ['foo', '  bar', '  baz', '  qux']
)

test(
  macro,
  `

foo

bar

baz

qux
`,
  ['foo', '', '  bar', '', '  baz', '', '  qux']
)

test('should configure the subline indent', (t) => {
  const actual = formatMessageLines({ msg: 'foo\nbar', sublineIndent: 3 })
  t.deepEqual(actual, ['foo', '   bar'])
})
