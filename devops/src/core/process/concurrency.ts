import os from 'node:os'
import { clamp } from 'remeda'

export type Predicate = (totalCores: number) => number

export const _makeInferMaxConcurrency =
  (totalCores: number) =>
  (predicate: Predicate): number => {
    return Math.floor(clamp(predicate(totalCores), { min: 2, max: totalCores }))
  }

/**
 * Infers **safe** maximum concurrency based on the adjustments made to the total number of cores.
 *
 * @param predicate - A function that takes the total number of cores and returns the desired concurrency.
 * @returns The maximum concurrency value that is never lower than 2 and never higher than the total number of cores.
 */
export const inferMaxConcurrency = (predicate: Predicate): number => {
  const totalCores = os.cpus().length

  return _makeInferMaxConcurrency(totalCores)(predicate)
}
