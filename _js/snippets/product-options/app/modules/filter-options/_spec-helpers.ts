import test from 'ava'
import {
  filterProductOptions as f,
  type OptionValueGroup,
  type OptionValueStatus,
  type OptionValueWithStatus,
  type Params
} from './index.js'

export const macro = test.macro<[Params, OptionValueGroup[]]>({
  exec: (t, input, expected) => {
    t.deepEqual(f(input), expected)
  },
  title: (providedTitle = '', input) => {
    return `given ${JSON.stringify(input.selectedOptions)} options selected ${providedTitle}`.trim()
  }
})

export const o = (
  name: string,
  status: OptionValueStatus = 'in-stock'
): OptionValueWithStatus => {
  return { name, status }
}
