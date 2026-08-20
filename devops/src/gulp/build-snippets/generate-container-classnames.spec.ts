import test from 'ava'
import { generateContainerClassnames as gen } from './generate-container-classnames.js'

type Input = Parameters<typeof gen>

const macro = test.macro<[Input, string]>({
  exec: async (t, input, expected) => {
    const actual = gen(...input)
    t.is(actual, expected)
  },
  title: (providedTitle = '', input) => {
    const [classnames, stylenames] = input
    const classnamesStr = classnames
      .map((c) => {
        return JSON.stringify(c)
      })
      .join(',')

    return `given ${classnamesStr} and ${JSON.stringify(
      stylenames
    )} ${providedTitle}`.trim()
  }
})

test(macro, [[], {}], 'portable-snippet')

test(
  'should omit classnames that have no css-module entry',
  macro,
  [['abc', 'def', 'xyz'], { abc: '_abc', def: '_def' }],
  'portable-snippet _abc _def'
)

test(
  'should preserve non-css-module classnames if they have `global:` prefix',
  macro,
  [['abc', 'global:xyz'], { abc: '_abc' }],
  'portable-snippet _abc xyz'
)

test(
  'should handle empty global classnames gracefully',
  macro,
  [['abc', 'global:'], { abc: '_abc' }],
  'portable-snippet _abc'
)
