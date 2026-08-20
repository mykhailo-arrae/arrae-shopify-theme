import test from 'ava'
import {
  type Action,
  type OptionNames,
  selectVariantReducer as reducer,
  type State,
  type Variant,
  type Variants
} from './index.js'

const macro = test.macro<[[State, Action], State]>({
  exec: async (t, input, expected) => {
    const actual = reducer(...input)
    t.deepEqual(actual, expected)
  },
  title: (providedTitle = '', [state, action]) => {
    return `given ${JSON.stringify(action.type)} in ${JSON.stringify(state.name)} with ${JSON.stringify(action.payload)} ${providedTitle}`.trim()
  }
})

const optionNames: OptionNames = ['Color', 'Size']

const blueSmall: Variant = { id: 1, options: ['Blue', 'Small'] }
const blueMedium: Variant = { id: 2, options: ['Blue', 'Medium'] }
const redLarge: Variant = { id: 3, options: ['Red', 'Large'] }

const variants: Variants = [blueSmall, blueMedium, redLarge]

const noVariantSelected: State = {
  optionNames,
  variants,
  name: 'NoVariantSelected',
  selectedOptions: {},
  selectedVariantId: null
}

test(
  'should ignore init event',
  macro,
  [
    noVariantSelected,
    {
      type: 'Init',
      payload: { initialVariantId: blueMedium.id, unselectedOptions: null }
    }
  ],
  noVariantSelected
)

test(
  'should ignore init event',
  macro,
  [
    {
      optionNames,
      variants,
      name: 'VariantSelected',
      selectedOptions: { Color: 'Blue', Size: 'Medium' },
      selectedVariantId: blueMedium.id
    },
    {
      type: 'Init',
      payload: { initialVariantId: redLarge.id, unselectedOptions: null }
    }
  ],
  {
    optionNames,
    variants,
    name: 'VariantSelected',
    selectedOptions: { Color: 'Blue', Size: 'Medium' },
    selectedVariantId: blueMedium.id
  }
)

test(
  macro,
  [
    noVariantSelected,
    {
      type: 'SelectOptions',
      payload: [
        { name: 'Size', value: 'Medium' },
        { name: 'Color', value: 'Blue' }
      ]
    }
  ],
  {
    optionNames,
    variants,
    name: 'VariantSelected',
    selectedOptions: { Color: 'Blue', Size: 'Medium' },
    selectedVariantId: blueMedium.id
  }
)

test(
  macro,
  [
    noVariantSelected,
    {
      type: 'SelectOptions',
      payload: [{ name: 'Color', value: 'Blue' }]
    }
  ],
  {
    optionNames,
    variants,
    name: 'NoVariantSelected',
    selectedOptions: { Color: 'Blue' },
    selectedVariantId: null
  }
)

test(
  'should ignore invalid option values',
  macro,
  [
    {
      optionNames,
      variants,
      name: 'VariantSelected',
      selectedOptions: { Color: 'Blue', Size: 'Medium' },
      selectedVariantId: blueMedium.id
    },
    {
      type: 'SelectOptions',
      payload: [
        { name: 'Color', value: 'Orange' },
        { name: 'Size', value: 'Medium' }
      ]
    }
  ],
  {
    optionNames,
    variants,
    name: 'NoVariantSelected',
    selectedOptions: { Size: 'Medium' },
    selectedVariantId: null
  }
)
