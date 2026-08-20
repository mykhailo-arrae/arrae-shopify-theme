import test from 'ava'
import { inferBundleDef } from './infer-bundle-def.js'

const macro = test.macro<
  [
    {
      path: string
      parentFolder: string
      workdir: string
    },
    { name: string; path: string } | null
  ]
>({
  exec: (t, input, expected) => {
    const actual = inferBundleDef(input)
    t.deepEqual(actual, expected)
  },
  title: (providedTitle = '', input) =>
    `given ${input.path} inside ${input.parentFolder} at ${input.workdir} ${providedTitle}`.trim()
})

test(
  macro,
  {
    path: 'packages/bundle1/index.ts',
    parentFolder: 'packages',
    workdir: '/'
  },
  {
    name: 'bundle1',
    path: 'packages/bundle1/index.ts'
  }
)

test(
  macro,
  {
    path: 'packages/bundle5/index.tsx',
    parentFolder: 'packages',
    workdir: '/'
  },
  {
    name: 'bundle5',
    path: 'packages/bundle5/index.tsx'
  }
)

test(
  macro,
  {
    path: 'packages/bundle6/index.js',
    parentFolder: 'packages',
    workdir: '/'
  },
  {
    name: 'bundle6',
    path: 'packages/bundle6/index.js'
  }
)

test(
  'should ignore .jsx files',
  macro,
  {
    path: 'packages/bundle7/index.jsx',
    parentFolder: 'packages',
    workdir: '/'
  },
  null
)

test(
  'when entrypoint is not at bundle folder level',
  macro,
  {
    path: 'packages/bundle2/src/index.tsx',
    parentFolder: 'packages',
    workdir: '/'
  },
  null
)

test(
  macro,
  {
    path: 'packages/bundle4/nested/index.ts',
    parentFolder: 'packages',
    workdir: '/'
  },
  null
)

test(
  'when entrypoint is nested too deep',
  macro,
  {
    path: 'packages/bundle7/nested/deep/index.ts',
    parentFolder: 'packages',
    workdir: '/'
  },
  null
)

test(
  'when file is not an entrypoint',
  macro,
  {
    path: 'packages/bundle8/test.js',
    parentFolder: 'packages',
    workdir: '/'
  },
  null
)

test(
  'when the entrypoint is at the parent folder level',
  macro,
  {
    path: 'packages/index.ts',
    parentFolder: 'packages',
    workdir: '/'
  },
  null
)

test(
  macro,
  {
    path: 'packages/bundle3/style.css',
    parentFolder: 'packages',
    workdir: '/'
  },
  null
)
