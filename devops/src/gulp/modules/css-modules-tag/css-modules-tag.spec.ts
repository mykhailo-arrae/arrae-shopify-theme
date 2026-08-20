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
  macro,
  { template: '', cssModules: {} },
  { status: 'ok', warnings: [], output: '' }
)

test(
  'should return unchanged template if it is whitespace-only',
  macro,
  { template: '  \n  ', cssModules: {} },
  { status: 'ok', warnings: [], output: '  \n  ' }
)

test(
  'given unclosed style tag',
  macro,
  {
    template: '<button class="{# style control_button">Button</button>',
    cssModules: { control_button: 'mod_control_button' }
  },
  {
    status: 'error',
    errors: [{ line: 1, code: 'UNCLOSED_TAG' }]
  }
)

test(
  'given single classname',
  macro,
  {
    template: '<div class="{# style container #}"></div>',
    cssModules: { container: 'mod_container' }
  },
  {
    status: 'ok',
    warnings: [],
    output: '<div class="mod_container"></div>'
  }
)

test(
  'given multiple classnames',
  macro,
  {
    template: '<div class="{# style header main footer #}"></div>',
    cssModules: {
      header: 'mod_header',
      main: 'mod_main',
      footer: 'mod_footer'
    }
  },
  {
    status: 'ok',
    warnings: [],
    output: '<div class="mod_header mod_main mod_footer"></div>'
  }
)

test(
  'given multiple classnames with quoted notation',
  macro,
  {
    template: '<div class="{# style "header" "main" "footer" #}"></div>',
    cssModules: {
      header: 'mod_header',
      main: 'mod_main',
      footer: 'mod_footer'
    }
  },
  {
    status: 'ok',
    warnings: [],
    output: '<div class="mod_header mod_main mod_footer"></div>'
  }
)

test(
  'given multiple classnames with single quote notation',
  macro,
  {
    template: `<div class="{# style 'header' main "footer" #}"></div>`,
    cssModules: {
      header: 'mod_header',
      main: 'mod_main',
      footer: 'mod_footer'
    }
  },
  {
    status: 'ok',
    warnings: [],
    output: '<div class="mod_header mod_main mod_footer"></div>'
  }
)

test(
  'given css variable',
  macro,
  {
    template: `
<style>
  :root {
    {# style --color #}: red;
  }
</style>`,
    cssModules: { '--color': '--mod_color' }
  },
  {
    status: 'ok',
    warnings: [],
    output: `
<style>
  :root {
    --mod_color: red;
  }
</style>`
  }
)

test(
  'given extra whitespace',
  macro,
  {
    template: '<div class="{# style header  main   footer #}"></div>',
    cssModules: {
      header: 'mod_header',
      main: 'mod_main',
      footer: 'mod_footer'
    }
  },
  {
    status: 'ok',
    warnings: [],
    output: '<div class="mod_header mod_main mod_footer"></div>'
  }
)

test(
  'given no spaces at delimiters',
  macro,
  {
    template: '<div class="{#style header footer#}"></div>',
    cssModules: {
      header: 'mod_header',
      footer: 'mod_footer'
    }
  },
  {
    status: 'ok',
    warnings: [],
    output: '<div class="mod_header mod_footer"></div>'
  }
)

test(
  'given whitespace control characters',
  macro,
  {
    template: '<div class="{#- style header footer -#}"></div>',
    cssModules: {
      header: 'mod_header',
      footer: 'mod_footer'
    }
  },
  {
    status: 'error',
    errors: [{ line: 1, code: 'WHITESPACE_CONTROL_NOT_SUPPORTED' }]
  }
)

test(
  'given whitespace control characters with no spaces at delimiters',
  macro,
  {
    template: '<div class="{#-style header footer-#}"></div>',
    cssModules: {
      header: 'mod_header',
      footer: 'mod_footer'
    }
  },
  {
    status: 'error',
    errors: [{ line: 1, code: 'WHITESPACE_CONTROL_NOT_SUPPORTED' }]
  }
)

test(
  'should preserve duplicate class names',
  macro,
  {
    template:
      '<div class="{# style header main footer main footer header #}"></div>',
    cssModules: {
      header: 'mod_header',
      main: 'mod_main',
      footer: 'mod_footer'
    }
  },
  {
    status: 'ok',
    warnings: [],
    output:
      '<div class="mod_header mod_main mod_footer mod_main mod_footer mod_header"></div>'
  }
)

test(
  'given missing identifier in cssModules',
  macro,
  {
    template: '<div class="{# style header unknown_name footer #}"></div>',
    cssModules: {
      header: 'mod_header',
      footer: 'mod_footer'
    }
  },
  {
    status: 'ok',
    warnings: [
      { line: 1, identifier: 'unknown_name', code: 'MISSING_IDENTIFIER' }
    ],
    output: '<div class="mod_header mod_footer"></div>'
  }
)

test(
  'given all identifiers missing from cssModules',
  macro,
  {
    template: '<div class="{# style header #}"></div>',
    cssModules: {}
  },
  {
    status: 'ok',
    warnings: [{ line: 1, identifier: 'header', code: 'MISSING_IDENTIFIER' }],
    output: '<div class=""></div>'
  }
)

test(
  'given multiline template with style tag on line 3',
  macro,
  {
    template:
      '<div>\n  <span>\n    <p class="{# style para #}"></p>\n  </span>\n</div>',
    cssModules: { para: 'mod_para' }
  },
  {
    status: 'ok',
    warnings: [],
    output: '<div>\n  <span>\n    <p class="mod_para"></p>\n  </span>\n</div>'
  }
)

test(
  'given multiple style tags in template',
  macro,
  {
    template:
      '<div class="{# style container #}"><span class="{# style item #}"></span></div>',
    cssModules: { container: 'mod_container', item: 'mod_item' }
  },
  {
    status: 'ok',
    warnings: [],
    output: '<div class="mod_container"><span class="mod_item"></span></div>'
  }
)

test(
  'should report error given unclosed tag with # character in the middle',
  macro,
  {
    template: '<div class="{# style foo # bar',
    cssModules: { foo: 'mod_foo' }
  },
  {
    status: 'error',
    errors: [{ line: 1, code: 'UNCLOSED_TAG' }]
  }
)

test(
  'given empty style tag arguments',
  macro,
  {
    template: '<div class="{# style #}"></div>',
    cssModules: {}
  },
  {
    status: 'ok',
    warnings: [],
    output: '<div class=""></div>'
  }
)

test(
  'should report all errors given multiple unclosed tags',
  macro,
  {
    template: '<div class="{# style foo"><span class="{# style bar"></span>',
    cssModules: { foo: 'mod_foo', bar: 'mod_bar' }
  },
  {
    status: 'error',
    errors: [
      { line: 1, code: 'UNCLOSED_TAG' },
      { line: 1, code: 'UNCLOSED_TAG' }
    ]
  }
)

test(
  'should process style tags in Liquid comments',
  macro,
  {
    template:
      '{% comment %}<div class="{# style foo #}">test</div>{% endcomment %}',
    cssModules: { foo: 'mod_foo' }
  },
  {
    status: 'ok',
    warnings: [],
    output: '{% comment %}<div class="mod_foo">test</div>{% endcomment %}'
  }
)
