import test from 'ava'
import {
  type AnnotatedJournal,
  annotateJournal
} from './test-helper-journal.js'

const macro = test.macro<
  [Parameters<typeof annotateJournal>, AnnotatedJournal]
>({
  exec: async (t, input, expected) => {
    const actual = annotateJournal(...input)
    t.deepEqual(actual, expected)
  },
  title: (providedTitle = '', input) => {
    return `given ${JSON.stringify(input)} ${providedTitle}`.trim()
  }
})

test(macro, [[]], {})

test(
  macro,
  [
    [
      { type: 'stage', name: 'page-load' },
      { type: 'stage', name: 'page-unload' }
    ]
  ],
  {
    '1-page-load': [],
    '2-page-unload': []
  }
)

test(
  macro,
  [
    [
      { type: 'stage', name: 'page-load' },
      { type: 'load', snippetId: 'a', sectionId: null },
      { type: 'load', snippetId: 'b', sectionId: null },
      { type: 'stage', name: 'parent-unload' },
      { type: 'unload', snippetId: 'a', sectionId: null },
      { type: 'unload', snippetId: 'b', sectionId: null },
      { type: 'stage', name: 'page-unload' },
      { type: 'unload', snippetId: 'a', sectionId: null },
      { type: 'unload', snippetId: 'b', sectionId: null }
    ]
  ],
  {
    '1-page-load': [
      { type: 'load', snippetId: 'a', sectionId: null },
      { type: 'load', snippetId: 'b', sectionId: null }
    ],
    '2-parent-unload': [
      { type: 'unload', snippetId: 'a', sectionId: null },
      { type: 'unload', snippetId: 'b', sectionId: null }
    ],
    '3-page-unload': [
      { type: 'unload', snippetId: 'a', sectionId: null },
      { type: 'unload', snippetId: 'b', sectionId: null }
    ]
  }
)

test(
  macro,
  [
    [
      { type: 'stage', name: 'page-load' },
      { type: 'load', snippetId: 'a', sectionId: null },
      { type: 'load', snippetId: 'b', sectionId: null },
      { type: 'stage', name: 'misc-activity' },
      { type: 'stage', name: 'page-unload' },
      { type: 'unload', snippetId: 'a', sectionId: null },
      { type: 'unload', snippetId: 'b', sectionId: null }
    ]
  ],
  {
    '1-page-load': [
      { type: 'load', snippetId: 'a', sectionId: null },
      { type: 'load', snippetId: 'b', sectionId: null }
    ],
    '2-misc-activity': [],
    '3-page-unload': [
      { type: 'unload', snippetId: 'a', sectionId: null },
      { type: 'unload', snippetId: 'b', sectionId: null }
    ]
  }
)
