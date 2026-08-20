import test from 'ava'
import {
  type CssLoaderApiList,
  type CssLoaderModule,
  cssLoaderApiImport,
  cssLoaderApiImportFn as makeList
} from './css-loader-export-init.js'

const makeGeneratedLoaderExport = ({
  css,
  locals,
  moduleId
}: {
  css: string
  locals: Record<string, string>
  moduleId: number | string
}): CssLoaderApiList => {
  const module = { id: moduleId }
  const runtimeModule = makeList()

  runtimeModule.push([module.id, css])
  runtimeModule.locals = locals

  return runtimeModule
}

test('should behave like the generated loader output in index.ts', (t) => {
  const locals = { button: 'button_abc123' }
  const runtimeModule = makeGeneratedLoaderExport({
    css: '.button { color: red; }',
    locals,
    moduleId: 'scss-module'
  })

  t.true(Array.isArray(runtimeModule))
  t.deepEqual(Array.from(runtimeModule), [
    ['scss-module', '.button { color: red; }']
  ])
  t.is(runtimeModule.toString(), '.button { color: red; }')
  t.deepEqual(runtimeModule.locals, locals)
})

test('should concatenate pushed stylesheets in insertion order', (t) => {
  const list = makeList()

  list.push([1, '.first { color: red; }'])
  list.push([2, '.second { color: blue; }'])

  t.is(list.toString(), '.first { color: red; }.second { color: blue; }')
})

test('should export the api factory as source code', (t) => {
  t.is(cssLoaderApiImport, makeList.toString())
})

test('should not import string modules into an anonymous layer', (t) => {
  const list = makeList()

  list.i('.button { color: red; }', undefined, false, undefined, '')

  t.is(list.toString(), '.button { color: red; }')
})

test('should not wrap imported css in supports media and layer order', (t) => {
  const list = makeList()

  list.i('.button { color: red; }', 'screen', false, 'display: grid', 'theme')

  t.is(list.toString(), '.button { color: red; }')
})

test('should discard wrapper overrides', (t) => {
  const list = makeList()
  const modules: CssLoaderModule[] = [
    [
      1,
      '.button { color: red; }',
      'print',
      null,
      'selector(:focus-visible)',
      'base'
    ]
  ]
  const originalModules = modules.map((item) => [...item])

  list.i(modules, 'screen', false, 'display: grid', 'theme')

  t.deepEqual(modules, originalModules)
  t.deepEqual(Array.from(list), [
    [
      1,
      '.button { color: red; }',
      'print',
      null,
      'selector(:focus-visible)',
      'base'
    ]
  ])
  t.is(
    list.toString(),
    '@supports (selector(:focus-visible)) {@media print {@layer base {.button { color: red; }}}}'
  )
})

test('should not dedupe matching ids', (t) => {
  const list = makeList()

  list.i(
    [
      [1, '.first { color: red; }'],
      [null, '.anonymous-a { color: blue; }']
    ],
    undefined,
    false
  )
  list.i(
    [
      [1, '.duplicate { color: green; }'],
      [2, '.second { color: black; }'],
      [null, '.anonymous-b { color: purple; }']
    ],
    undefined,
    true
  )

  t.deepEqual(Array.from(list), [
    [1, '.first { color: red; }'],
    [null, '.anonymous-a { color: blue; }'],
    [1, '.duplicate { color: green; }'],
    [2, '.second { color: black; }'],
    [null, '.anonymous-b { color: purple; }']
  ])
  t.is(
    list.toString(),
    '.first { color: red; }.anonymous-a { color: blue; }.duplicate { color: green; }.second { color: black; }.anonymous-b { color: purple; }'
  )
})
