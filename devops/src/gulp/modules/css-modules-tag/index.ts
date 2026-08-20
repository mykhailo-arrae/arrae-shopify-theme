export type Warning = {
  line: number
  identifier: string
  code: 'INVALID_IDENTIFIER' | 'MISSING_IDENTIFIER'
}

export type Error = {
  line: number
  code:
    | 'UNCLOSED_TAG'
    | 'INVALID_ARGUMENTS'
    | 'INVALID_POSITION'
    | 'DOT_NOTATION_PROHIBITED'
    | 'WHITESPACE_CONTROL_NOT_SUPPORTED'
    | 'NESTED_TAGS_FORBIDDEN'
}

export type Result =
  | {
      status: 'ok'
      warnings: Warning[]
      output: string
    }
  | { status: 'error'; errors: Error[] }

export type Input = {
  template: string
  cssModules: Record<string, string>
}

const getLineNumber = (template: string, offset: number): number => {
  return template.slice(0, offset).split('\n').length
}

export const makeCssModulesTagProcessor = () => {
  return ({ template, cssModules }: Input): Result => {
    const _trimmedTemplate = template.trim()

    if (_trimmedTemplate.length === 0) {
      return { status: 'ok', warnings: [], output: template }
    }

    const errors: Error[] = []
    const warnings: Warning[] = []

    // Check for dot notation: style.classname patterns (e.g., {# style.my_class #})
    // This is a common mistake - the correct syntax is {# style my_class #}

    // First, find CLOSED dot notation tags with whitespace control
    // Matches {#- style.xxx ... #} or {# style.xxx ... -#}
    const closedDotNotationWithWsControlPattern =
      /\{#-\s*style\.[\w]+[\s\S]*?#\}|\{#\s*style\.[\w]+[\s\S]*?-#\}/g

    let dotWsMatch
    while (
      (dotWsMatch = closedDotNotationWithWsControlPattern.exec(template)) !==
      null
    ) {
      const offset = dotWsMatch.index
      const line = getLineNumber(template, offset)
      errors.push({ line, code: 'WHITESPACE_CONTROL_NOT_SUPPORTED' })
    }

    if (errors.length > 0) {
      return { status: 'error', errors }
    }

    // Then find ANY remaining style. patterns (closed or unclosed, without ws control)
    // This catches {# style.xxx #} and {# style.xxx (unclosed)
    // Include optional - for whitespace control in pattern
    const anyDotNotationPattern = /\{#-?\s*style\./g

    let dotMatch
    while ((dotMatch = anyDotNotationPattern.exec(template)) !== null) {
      const offset = dotMatch.index
      const line = getLineNumber(template, offset)
      errors.push({ line, code: 'DOT_NOTATION_PROHIBITED' })
    }

    if (errors.length > 0) {
      return { status: 'error', errors }
    }

    // Check for whitespace control in regular style tags (not dot notation)
    // Matches {#- style ... #} or {# style ... -#} or {#- style ... -#}
    const whitespaceControlPattern =
      /\{#-\s*style\s+[^.#][\s\S]*?#\}|\{#\s*style\s+[^.#][\s\S]*?-#\}/g

    let wsMatch
    while ((wsMatch = whitespaceControlPattern.exec(template)) !== null) {
      const offset = wsMatch.index
      const line = getLineNumber(template, offset)
      errors.push({ line, code: 'WHITESPACE_CONTROL_NOT_SUPPORTED' })
    }

    if (errors.length > 0) {
      return { status: 'error', errors }
    }

    // Pre-scan for unclosed style tags before processing
    // Find all {# style ... patterns and verify each has a closing #}
    // Use word boundary \b to avoid matching {#stylesheet etc.
    const styleTagOpenPattern = /\{#\s*style\b/g
    let openMatch
    while ((openMatch = styleTagOpenPattern.exec(template)) !== null) {
      const startOffset = openMatch.index
      const afterOpen = template.slice(startOffset)

      // Look for the closing #} - it should be the first #} after the opening
      const closingMatch = /#\}/.exec(afterOpen)
      if (!closingMatch) {
        const line = getLineNumber(template, startOffset)
        errors.push({ line, code: 'UNCLOSED_TAG' })
      }
    }

    if (errors.length > 0) {
      return { status: 'error', errors }
    }

    // Process valid style tags: {# style classname1 classname2 ... #}
    // Note: Duplicate class names are preserved in output (not deduplicated)
    // Use word boundary \b to avoid matching {#stylesheet etc.
    // The args capture uses * instead of + to handle empty {# style #} tags
    const output = template.replace(
      /\{#\s*style\b\s*([\s\S]*?)\s*#\}/g,
      (match, args: unknown, offset: unknown) => {
        if (typeof offset !== 'number' || Number.isNaN(offset)) {
          errors.push({ line: 0, code: 'INVALID_POSITION' })
          return match
        }

        const line = getLineNumber(template, offset)

        if (typeof args !== 'string') {
          errors.push({ line, code: 'INVALID_ARGUMENTS' })
          return match
        }

        // Check for nested tags - {# inside the arguments indicates a nested tag
        if (args.includes('{#')) {
          errors.push({ line, code: 'NESTED_TAGS_FORBIDDEN' })
          return match
        }

        return args
          .trim()
          .split(/\s+/)
          .filter(Boolean)
          .map((arg) => arg.replace(/["']/g, ''))
          .flatMap((arg) => {
            // Check for forbidden characters in identifier
            const forbiddenChars = /[.:{}<>%=]/
            if (forbiddenChars.test(arg)) {
              warnings.push({
                identifier: arg,
                line,
                code: 'INVALID_IDENTIFIER'
              })
              return []
            }

            const identifier = cssModules[arg]

            if (!identifier) {
              warnings.push({
                identifier: arg,
                line,
                code: 'MISSING_IDENTIFIER'
              })
              return []
            }

            return [identifier]
          })
          .join(' ')
      }
    )

    if (errors.length) {
      return { status: 'error', errors }
    }

    return { status: 'ok', warnings, output }
  }
}
