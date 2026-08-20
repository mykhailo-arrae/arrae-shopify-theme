import test from 'ava'
import {
  type Action,
  type OptionNames,
  selectVariantReducer as reducer,
  type State,
  type Variants
} from './index.js'

const macro = test.macro<[State, Action, State]>({
  exec: async (t, state, action, expected) => {
    const actual = reducer(state, action)
    t.deepEqual(actual, expected)
  },
  title: (providedTitle = '', state, action) => {
    return `given ${JSON.stringify(action.type)} in ${JSON.stringify(state.name)} with ${JSON.stringify(action.payload)} ${providedTitle}`.trim()
  }
})

const optionNames: OptionNames = ['Color', 'Size']

const variants: Variants = [
  { id: 1, options: ['Blue', 'S'] },
  { id: 2, options: ['Blue', 'M'] },
  { id: 3, options: ['Blue', 'L'] },
  { id: 4, options: ['Red', 'S'] }
]

test(
  'should initialize state only once',
  macro,
  {
    optionNames,
    variants,
    name: 'VariantSelected',
    selectedOptions: { Color: 'Red', Size: 'S' },
    selectedVariantId: 4
  },
  {
    type: 'Init',
    payload: { initialVariantId: 1, unselectedOptions: null }
  },
  {
    optionNames,
    variants,
    name: 'VariantSelected',
    selectedOptions: { Color: 'Red', Size: 'S' },
    selectedVariantId: 4
  }
)

test(
  'should initialize state only once',
  macro,
  {
    optionNames,
    variants,
    name: 'NoVariantSelected',
    selectedOptions: {},
    selectedVariantId: null
  },
  {
    type: 'Init',
    payload: { initialVariantId: 1, unselectedOptions: null }
  },
  {
    optionNames,
    variants,
    name: 'NoVariantSelected',
    selectedOptions: {},
    selectedVariantId: null
  }
)

test(
  'should select last variant when initialVariantId is null',
  macro,
  {
    optionNames,
    variants,
    name: 'Idle',
    selectedOptions: null,
    selectedVariantId: null
  },
  {
    type: 'Init',
    payload: { initialVariantId: null, unselectedOptions: null }
  },
  {
    optionNames,
    variants,
    name: 'VariantSelected',
    selectedOptions: { Color: 'Red', Size: 'S' },
    selectedVariantId: 4
  }
)

test(
  macro,
  {
    optionNames,
    variants,
    name: 'Idle',
    selectedOptions: null,
    selectedVariantId: null
  },
  { type: 'Init', payload: { initialVariantId: 4, unselectedOptions: null } },
  {
    optionNames,
    variants,
    name: 'VariantSelected',
    selectedOptions: { Color: 'Red', Size: 'S' },
    selectedVariantId: 4
  }
)

test(
  'should handle invalid variant ID',
  macro,
  {
    optionNames,
    variants,
    name: 'Idle',
    selectedOptions: null,
    selectedVariantId: null
  },
  { type: 'Init', payload: { initialVariantId: 999, unselectedOptions: null } },
  {
    optionNames,
    variants,
    name: 'VariantSelected',
    selectedOptions: { Color: 'Red', Size: 'S' },
    selectedVariantId: 4
  }
)

test(
  'should unselect Size option',
  macro,
  {
    optionNames,
    variants,
    name: 'Idle',
    selectedOptions: null,
    selectedVariantId: null
  },
  {
    type: 'Init',
    payload: {
      initialVariantId: 4,
      unselectedOptions: ['Size']
    }
  },
  {
    optionNames,
    variants,
    name: 'NoVariantSelected',
    selectedOptions: { Color: 'Red' },
    selectedVariantId: null
  }
)

test(
  'should ignore invalid option names',
  macro,
  {
    optionNames,
    variants,
    name: 'Idle',
    selectedOptions: null,
    selectedVariantId: null
  },
  {
    type: 'Init',
    payload: {
      initialVariantId: 2,
      unselectedOptions: ['Material']
    }
  },
  {
    optionNames,
    variants,
    name: 'VariantSelected',
    selectedOptions: { Color: 'Blue', Size: 'M' },
    selectedVariantId: 2
  }
)
