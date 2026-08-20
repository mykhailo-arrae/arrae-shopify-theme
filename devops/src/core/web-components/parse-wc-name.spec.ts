import test from 'ava'
import { parseWebComponentName as parse } from './parse-wc-name.js'

const successMacro = test.macro<[string, string]>({
  exec: (t, input, expected) => {
    const actual = parse(input)
    t.is(actual, expected)
  },
  title: (providedTitle = '', input) => {
    return `given ${input || 'nothing'} ${providedTitle}`.trim()
  }
})

test(successMacro, 'my-component', 'my-component')

const errorMacro = test.macro<[string, RegExp]>({
  exec: (t, input, expected) => {
    t.throws(() => parse(input), {
      message: expected
    })
  },
  title: (providedTitle = '', input) => {
    return `throws given ${input || 'nothing'} ${providedTitle}`.trim()
  }
})

test(errorMacro, 'MyComponent', /kebab-case/)
test(errorMacro, '-my-component', /kebab-case/)
test(errorMacro, 'my_component', /kebab-case/)
test(errorMacro, 'mycomponent', /dash/)

test(errorMacro, 'annotation-xml', /restricted names/)
test(errorMacro, 'color-profile', /restricted names/)
test(errorMacro, 'font-face', /restricted names/)
test(errorMacro, 'font-face-src', /restricted names/)
test(errorMacro, 'font-face-uri', /restricted names/)
test(errorMacro, 'font-face-format', /restricted names/)
test(errorMacro, 'font-face-name', /restricted names/)
test(errorMacro, 'missing-glyph', /restricted names/)
