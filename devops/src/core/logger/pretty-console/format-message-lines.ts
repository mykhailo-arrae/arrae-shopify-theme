export const formatMessageLines = ({
  msg,
  sublineIndent = 2
}: {
  msg: unknown
  sublineIndent?: number
}): string[] => {
  const SUBLINE_INDENT = Array.from({ length: sublineIndent }, () => ' ').join(
    ''
  )

  if (typeof msg !== 'string') {
    return []
  }

  const lines = msg
    .trim()
    .split('\n')
    .flatMap((__line, index): string[] => {
      const _line = __line.trim()
      const hasCustomPrefix = _line.startsWith('│')

      const line = hasCustomPrefix ? _line.slice(1) : _line

      const trimmedLine = line.trim()

      return hasCustomPrefix && trimmedLine.length === 0
        ? []
        : index > 0 && trimmedLine
          ? [[SUBLINE_INDENT, trimmedLine].join('')]
          : [trimmedLine]
    })

  if (lines.every((line) => line.length === 0)) {
    return []
  }

  return lines
}
