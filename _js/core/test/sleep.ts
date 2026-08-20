/**
 * Pauses the execution for a specified number of seconds.
 *
 * @param seconds - The number of seconds to sleep. Defaults to zero.
 * @returns A promise that resolves after the specified number of seconds.
 */
export const sleep = async (seconds = 0): Promise<void> => {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, seconds * 1000)
  })
}
