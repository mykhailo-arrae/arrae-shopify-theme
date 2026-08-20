import { useMemo } from 'react'
import { getTierValue, isTier } from '../helpers.js'
import type { CartRewardItem } from '../io.js'

const getTierSpendRange = (tiers: CartRewardItem[], index: number): number => {
  const threshold = getTierValue(tiers[index]!)
  const previousThreshold = index > 0 ? getTierValue(tiers[index - 1]!) : 0
  return Math.max(threshold - previousThreshold, 0)
}

/** Spend range per tier (threshold − previous threshold), in cents. */
export const getSegmentSpendRanges = (tiers: CartRewardItem[]): number[] =>
  tiers.map((_, index) => getTierSpendRange(tiers, index))

const greatestCommonDivisor = (left: number, right: number): number =>
  right === 0 ? left : greatestCommonDivisor(right, left % right)

const normalizeFrWeights = (ranges: readonly number[]): number[] => {
  const positiveRanges = ranges.filter((range) => range > 0)

  if (positiveRanges.length === 0) {
    return ranges.map(() => 1)
  }

  const divisor = positiveRanges.reduce(
    (acc, range) => greatestCommonDivisor(acc, range),
    positiveRanges[0]!
  )

  return ranges.map((range) => (range > 0 ? range / divisor : 1))
}

/** Grid column template sized by each tier's spend range (e.g. $100 + $100 → `1fr 1fr`). */
export const getSegmentGridTemplateColumns = (
  tiers: CartRewardItem[]
): string => {
  if (tiers.length === 0) {
    return ''
  }

  const ranges = getSegmentSpendRanges(tiers)
  const totalRange = ranges.reduce((sum, range) => sum + range, 0)

  if (totalRange <= 0) {
    return Array.from({ length: tiers.length }, () => '1fr').join(' ')
  }

  return normalizeFrWeights(ranges)
    .map((weight) => `${weight}fr`)
    .join(' ')
}

export type SegmentProgress = {
  percent: number
  isMet: boolean
}

export const getSegmentProgress = (
  total: number,
  tiers: CartRewardItem[]
): SegmentProgress[] =>
  tiers.map((tier, index) => {
    const threshold = getTierValue(tier)
    const previousThreshold = index > 0 ? getTierValue(tiers[index - 1]!) : 0
    const range = threshold - previousThreshold
    const isMet = total >= threshold

    if (range <= 0) {
      return { percent: isMet ? 100 : 0, isMet }
    }

    const percent = Math.min(
      Math.max(((total - previousThreshold) / range) * 100, 0),
      100
    )
    return { percent, isMet }
  })

type UseProgressProps = {
  total: number
  tiers: CartRewardItem[]
}

export const useProgress = ({ total, tiers }: UseProgressProps): number => {
  const progress = useMemo(() => {
    if (!Array.isArray(tiers) || tiers.length === 0) {
      return 0
    }

    // Sort tiers in ascending order based on threshold
    const sortedTiers = [...tiers].sort(
      (a, b) => getTierValue(a) - getTierValue(b)
    )
    const numberOfTiers = sortedTiers.length

    // Calculate marker positions so that the last tier is at 100%
    const tierProgressMapping = sortedTiers.map((_, index) => {
      return ((index + 1) / numberOfTiers) * 100
    })

    // First tier not yet strictly passed — mirrors Progress `nextTier` (`total < threshold`) and
    // useRewards qualification (`total >= threshold`): at exact equality the spend segment for
    // that threshold is complete, same as the tier being unlocked.
    const activeTierIndex = sortedTiers.findIndex(
      (tier) => total < getTierValue(tier)
    )

    if (activeTierIndex === -1) {
      // All tiers met, return 100%
      return 100
    }

    const activeTier = sortedTiers[activeTierIndex]

    // Ensure activeTier is a valid Tier
    if (!isTier(activeTier)) {
      return 0
    }

    // Get the previous tier if it exists
    const previousTier = sortedTiers[activeTierIndex - 1]

    let previousThreshold: number

    if (isTier(previousTier)) {
      previousThreshold = getTierValue(previousTier)
    } else {
      // If there's no previous tier, default to 0
      previousThreshold = 0
    }

    // Get the target progress for the active tier
    const targetProgress = tierProgressMapping[activeTierIndex] ?? 0

    // Get the previous target progress
    const previousProgress =
      (activeTierIndex > 0 ? tierProgressMapping[activeTierIndex - 1] : 0) ?? 0

    // Calculate the range for the active tier
    const tierRange = getTierValue(activeTier) - previousThreshold

    // Prevent division by zero
    if (tierRange === 0) {
      return previousProgress
    }

    // Calculate progress within the active tier
    const tierProgress = (total - previousThreshold) / tierRange

    // Clamp tierProgress between 0 and 1
    const clampedTierProgress = Math.min(Math.max(tierProgress, 0), 1)

    // Calculate normalized progress based on tier mapping
    const normalizedProgress =
      previousProgress +
      clampedTierProgress * (targetProgress - previousProgress)

    // Clamp final progress between 0 and 100
    const finalProgress = Math.min(Math.max(normalizedProgress, 0), 100)

    return finalProgress
  }, [tiers, total])

  return progress
}
