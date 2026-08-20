export const truncate = (s: string, n: number, indicator = '…'): string => {
  if (s.length <= n) {
    return s
  }

  const firstPass = s.substring(0, n)

  const lastSpaceIndex = firstPass.lastIndexOf(' ')

  const secondPass =
    s.charAt(n) === ' '
      ? firstPass
      : lastSpaceIndex === -1
        ? firstPass
        : firstPass.substring(0, firstPass.lastIndexOf(' '))

  return secondPass + indicator
}
