import type { OptionsLayout } from '../io.js'

export type DetectOptionsLayoutInput = {
  optionsLayoutOverride?: OptionsLayout | null
}

/**
 * Resolves the PDP options layout from the product metafield only.
 * Blank / missing metafield → `simple`. No inference from pipes or flavor links.
 */
export const detectOptionsLayout = ({
  optionsLayoutOverride = 'simple'
}: DetectOptionsLayoutInput): OptionsLayout => {
  return optionsLayoutOverride ?? 'simple'
}
