import test from 'ava'
import { type Input, makeCssModulesTagProcessor, type Result } from './index.js'

const process = makeCssModulesTagProcessor()

const macro = test.macro<[Input, Result]>({
  exec: (t, input, expected) => {
    const actual = process(input)
    t.deepEqual(actual, expected)
  },
  title: (providedTitle = '', input) => {
    return `given ${JSON.stringify(input)} ${providedTitle}`.trim()
  }
})

test(
  'given dot notation style tag',
  macro,
  {
    template: '<div class="{# style.my_class #}"></div>',
    cssModules: { my_class: 'mod_my_class' }
  },
  {
    status: 'error',
    errors: [{ line: 1, code: 'DOT_NOTATION_PROHIBITED' }]
  }
)

test(
  'given dot notation with whitespace control',
  macro,
  {
    template: '\n<div class="{#- style.my_class -#}"></div>',
    cssModules: { my_class: 'mod_my_class' }
  },
  {
    status: 'error',
    errors: [{ line: 2, code: 'WHITESPACE_CONTROL_NOT_SUPPORTED' }]
  }
)

test(
  'given dot notation with no spaces at delimiters',
  macro,
  {
    template: '<div class="{#style.my_class#}"></div>',
    cssModules: { my_class: 'mod_my_class' }
  },
  {
    status: 'error',
    errors: [{ line: 1, code: 'DOT_NOTATION_PROHIBITED' }]
  }
)

test(
  'given dot notation with no spaces at delimiters with whitespace control',
  macro,
  {
    template: '<div class="{#-style.my_class-#}"></div>',
    cssModules: { my_class: 'mod_my_class' }
  },
  {
    status: 'error',
    errors: [{ line: 1, code: 'WHITESPACE_CONTROL_NOT_SUPPORTED' }]
  }
)

test(
  'given unclosed dot notation tag',
  macro,
  {
    template: '{# style.my_class',
    cssModules: { my_class: 'mod_my_class' }
  },
  {
    status: 'error',
    errors: [{ line: 1, code: 'DOT_NOTATION_PROHIBITED' }]
  }
)

test(
  'given unclosed dot notation tag with whitespace control',
  macro,
  {
    template: '{#- style.my_class',
    cssModules: { my_class: 'mod_my_class' }
  },
  {
    status: 'error',
    errors: [{ line: 1, code: 'DOT_NOTATION_PROHIBITED' }]
  }
)

test(
  'given multiline template with dot notation',
  macro,
  {
    template: '<div>test</div>\n{# style.my_class #}',
    cssModules: { my_class: 'mod_my_class' }
  },
  {
    status: 'error',
    errors: [{ line: 2, code: 'DOT_NOTATION_PROHIBITED' }]
  }
)

test(
  'given multiline dot notation tag',
  macro,
  {
    template: `
<div>test</div>
{#
style.my_class #}`,
    cssModules: { my_class: 'mod_my_class' }
  },
  {
    // Line 3 is where {# starts - we report the actual tag location
    status: 'error',
    errors: [{ line: 3, code: 'DOT_NOTATION_PROHIBITED' }]
  }
)
