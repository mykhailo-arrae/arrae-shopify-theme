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
  'given dot in identifier',
  macro,
  {
    template: '<div class="{# style header my.class #}"></div>',
    cssModules: {
      header: 'mod_header',
      'my.class': 'mod_my_class'
    }
  },
  {
    status: 'ok',
    warnings: [{ line: 1, identifier: 'my.class', code: 'INVALID_IDENTIFIER' }],
    output: '<div class="mod_header"></div>'
  }
)

test(
  'given colon in identifier',
  macro,
  {
    template: '<div class="{# style header my:class #}"></div>',
    cssModules: {
      header: 'mod_header',
      'my:class': 'mod_my_class'
    }
  },
  {
    status: 'ok',
    warnings: [{ line: 1, identifier: 'my:class', code: 'INVALID_IDENTIFIER' }],
    output: '<div class="mod_header"></div>'
  }
)

test(
  'given open brace in identifier',
  macro,
  {
    template: '<div class="{# style header my{class #}"></div>',
    cssModules: {
      header: 'mod_header',
      'my{class': 'mod_my_class'
    }
  },
  {
    status: 'ok',
    warnings: [{ line: 1, identifier: 'my{class', code: 'INVALID_IDENTIFIER' }],
    output: '<div class="mod_header"></div>'
  }
)

test(
  'given close brace in identifier',
  macro,
  {
    template: '<div class="{# style header my}class #}"></div>',
    cssModules: {
      header: 'mod_header',
      'my}class': 'mod_my_class'
    }
  },
  {
    status: 'ok',
    warnings: [{ line: 1, identifier: 'my}class', code: 'INVALID_IDENTIFIER' }],
    output: '<div class="mod_header"></div>'
  }
)

test(
  'given less-than in identifier',
  macro,
  {
    template: '<div class="{# style header my<class #}"></div>',
    cssModules: {
      header: 'mod_header',
      'my<class': 'mod_my_class'
    }
  },
  {
    status: 'ok',
    warnings: [{ line: 1, identifier: 'my<class', code: 'INVALID_IDENTIFIER' }],
    output: '<div class="mod_header"></div>'
  }
)

test(
  'given greater-than in identifier',
  macro,
  {
    template: '<div class="{# style header my>class #}"></div>',
    cssModules: {
      header: 'mod_header',
      'my>class': 'mod_my_class'
    }
  },
  {
    status: 'ok',
    warnings: [{ line: 1, identifier: 'my>class', code: 'INVALID_IDENTIFIER' }],
    output: '<div class="mod_header"></div>'
  }
)

test(
  'given percent in identifier',
  macro,
  {
    template: '<div class="{# style header my%class #}"></div>',
    cssModules: {
      header: 'mod_header',
      'my%class': 'mod_my_class'
    }
  },
  {
    status: 'ok',
    warnings: [{ line: 1, identifier: 'my%class', code: 'INVALID_IDENTIFIER' }],
    output: '<div class="mod_header"></div>'
  }
)

test(
  'given equals in identifier',
  macro,
  {
    template: '<div class="{# style header my=class #}"></div>',
    cssModules: {
      header: 'mod_header',
      'my=class': 'mod_my_class'
    }
  },
  {
    status: 'ok',
    warnings: [{ line: 1, identifier: 'my=class', code: 'INVALID_IDENTIFIER' }],
    output: '<div class="mod_header"></div>'
  }
)

test(
  'should forbid nested tags',
  macro,
  {
    template: '<div class="{# style {# style foo #} #}"></div>',
    cssModules: {
      foo: 'mod_foo'
    }
  },
  {
    status: 'error',
    errors: [{ line: 1, code: 'NESTED_TAGS_FORBIDDEN' }]
  }
)

test(
  'should forbid nested tag delimiters',
  macro,
  {
    template: '<div class="{# style foo {# #} bar #}"></div>',
    cssModules: {
      foo: 'mod_foo'
    }
  },
  {
    status: 'error',
    errors: [{ line: 1, code: 'NESTED_TAGS_FORBIDDEN' }]
  }
)

test(
  'should not try to fix HTML syntax errors',
  macro,
  {
    template: `
{# style foo
<div> #}</div>`,
    cssModules: {
      foo: 'mod_foo'
    }
  },
  {
    status: 'ok',
    warnings: [{ line: 2, identifier: '<div>', code: 'INVALID_IDENTIFIER' }],
    output: `
mod_foo</div>`
  }
)
