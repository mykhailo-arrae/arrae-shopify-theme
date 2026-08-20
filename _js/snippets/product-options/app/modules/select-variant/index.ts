import type { NonEmptyArray } from '../../../../../core/typescript/array.js'

export type VariantId = number

export type Variant = {
  id: VariantId
  options: NonEmptyArray<string>
}
export type Variants = NonEmptyArray<Variant>

export type OptionNames = NonEmptyArray<string>

export type SelectedOptions = Record<OptionNames[number], string | null>

// We have to start with Idle state to set initial values on page load only once
export type IdleState = {
  name: 'Idle'
  optionNames: OptionNames
  variants: Variants
  selectedOptions: null
  selectedVariantId: null
}

export type NoVariantSelectedState = {
  name: 'NoVariantSelected'
  optionNames: OptionNames
  variants: Variants
  selectedOptions: SelectedOptions
  selectedVariantId: null
}

export type VariantSelectedState = {
  name: 'VariantSelected'
  optionNames: OptionNames
  variants: Variants
  selectedOptions: SelectedOptions
  selectedVariantId: VariantId
}

export type State = IdleState | NoVariantSelectedState | VariantSelectedState

export type SelectOptionsAction = {
  type: 'SelectOptions'
  payload: { name: string; value: string }[]
}

export type InitAction = {
  type: 'Init'
  payload: {
    unselectedOptions: string[] | null
    initialVariantId: VariantId | null
  }
}

export type Action = SelectOptionsAction | InitAction

const inferSelectedOptionsFromVariant = ({
  optionNames,
  selectedVariant
}: {
  optionNames: OptionNames
  selectedVariant: Variant
}): SelectedOptions => {
  return optionNames.reduce<SelectedOptions>((acc, name, index) => {
    const value = selectedVariant.options[index]
    if (value) {
      acc[name] = value
    }
    return acc
  }, {})
}

type OptionValues = Record<string, Set<string>>

const inferOptionValues = (
  optionNames: OptionNames,
  variants: Variants
): OptionValues => {
  return optionNames.reduce<OptionValues>((acc, name, optionIndex) => {
    const values = new Set<string>()

    variants.forEach((v) => {
      const value = v.options[optionIndex]

      if (value) {
        values.add(value)
      }
    })

    acc[name] = values

    return acc
  }, {})
}

const normalizeSelectedOptions = ({
  optionNames,
  optionValues,
  selectedOptions
}: {
  optionNames: OptionNames
  optionValues: OptionValues
  selectedOptions: SelectedOptions | null
}): SelectedOptions => {
  if (selectedOptions == null) {
    return {}
  }

  return optionNames.reduce<SelectedOptions>((acc, name) => {
    const allValues = optionValues[name]

    if (allValues == null) {
      return acc
    }

    const value = selectedOptions[name]
    if (value && allValues.has(value)) {
      acc[name] = value
    }
    return acc
  }, {})
}

const selectVariantByOptions = ({
  optionNames,
  selectedOptions,
  variants
}: {
  optionNames: OptionNames
  selectedOptions: SelectedOptions
  variants: Variants
}): Variant | undefined => {
  return variants.find((variant) => {
    return optionNames.every((name, index) => {
      const value = selectedOptions[name]
      return value == null ? false : variant.options[index] === value
    })
  })
}

/**
 * @description
 * Select product variant based on provided product options
 */
export const selectVariantReducer = (state: State, action: Action): State => {
  // Handle single variant products early
  if (state.variants.length === 1) {
    const { optionNames, variants } = state

    const selectedVariant = variants[0]

    const nextSelectedOptions = inferSelectedOptionsFromVariant({
      optionNames,
      selectedVariant
    })

    return {
      name: 'VariantSelected',
      optionNames,
      variants,
      selectedVariantId: selectedVariant.id,
      selectedOptions: nextSelectedOptions
    } satisfies VariantSelectedState
  }

  const optionValues = inferOptionValues(state.optionNames, state.variants)

  if (action.type === 'Init') {
    if (state.name !== 'Idle') {
      return state
    }

    const { optionNames, variants } = state

    const {
      payload: { initialVariantId, unselectedOptions }
    } = action

    const lastVariant = variants.at(-1)

    if (lastVariant == null) {
      return state
    }

    const initialVariant =
      initialVariantId == null
        ? lastVariant
        : (variants.find((v) => v.id === initialVariantId) ?? lastVariant)

    const selectedOptionsFromVariant = inferSelectedOptionsFromVariant({
      optionNames,
      selectedVariant: initialVariant
    })

    const _selectedOptions =
      unselectedOptions == null
        ? selectedOptionsFromVariant
        : unselectedOptions.reduce<SelectedOptions>((acc, name) => {
            acc[name] = null
            return acc
          }, selectedOptionsFromVariant)

    const selectedOptions = normalizeSelectedOptions({
      optionNames,
      optionValues,
      selectedOptions: _selectedOptions
    })

    if (selectedOptions == null) {
      return {
        name: 'NoVariantSelected',
        optionNames,
        variants,
        selectedOptions: {},
        selectedVariantId: null
      } satisfies NoVariantSelectedState
    }

    const selectedVariantByOptions = selectVariantByOptions({
      optionNames,
      selectedOptions,
      variants
    })

    if (selectedVariantByOptions == null) {
      return {
        name: 'NoVariantSelected',
        optionNames,
        variants,
        selectedOptions,
        selectedVariantId: null
      } satisfies NoVariantSelectedState
    }

    return {
      name: 'VariantSelected',
      optionNames,
      variants,
      selectedOptions,
      selectedVariantId: selectedVariantByOptions.id
    } satisfies VariantSelectedState
  }

  if (action.type === 'SelectOptions') {
    if (state.name === 'Idle') {
      return state
    }

    const { optionNames, variants, selectedOptions: _selectedOptions } = state
    const { payload } = action

    const mappedPayload = payload.reduce<SelectedOptions>(
      (acc, { name, value }) => {
        acc[name] = value
        return acc
      },
      {}
    )

    const selectedOptions = normalizeSelectedOptions({
      optionNames,
      optionValues,
      selectedOptions: {
        ..._selectedOptions,
        ...mappedPayload
      }
    })

    const selectedVariantByOptions = selectVariantByOptions({
      optionNames,
      selectedOptions,
      variants
    })

    if (selectedVariantByOptions == null) {
      return {
        name: 'NoVariantSelected',
        optionNames,
        variants,
        selectedOptions,
        selectedVariantId: null
      } satisfies NoVariantSelectedState
    }

    return {
      name: 'VariantSelected',
      optionNames,
      variants,
      selectedOptions,
      selectedVariantId: selectedVariantByOptions.id
    } satisfies VariantSelectedState
  }

  action satisfies never

  return state
}
