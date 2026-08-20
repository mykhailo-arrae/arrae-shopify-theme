import type { CSSModulesConfig } from 'lightningcss'
import { toSnakeCase } from 'remeda'

export type CssModulesOptionsOutput = {
  dashedIdents: true
  pattern: string
}

/**
 * 'rspack' mode is used to set localIdentName fallback defaults for rspack.
 *
 * See also core/webpack/get-local-ident.ts
 */
export const makeCssModulesOptions = (
  options:
    | {
        mode: 'custom'
        assetFilePrefix: string | null
        cssModuleName: string | null
      }
    | { mode: 'rspack'; assetFilePrefix: string | null }
): CssModulesOptionsOutput => {
  if (options.mode === 'rspack') {
    return {
      dashedIdents: true,
      pattern: [
        toSnakeCase(options.assetFilePrefix || 'mod'),
        '[folder]',
        '[hash]',
        '[local]'
      ].join('_')
    } satisfies CSSModulesConfig
  }

  return {
    dashedIdents: true,
    pattern: [
      toSnakeCase(options.assetFilePrefix || 'mod'),
      toSnakeCase(options.cssModuleName || 'module'),
      '[hash]',
      '[local]'
    ].join('_')
  } satisfies CSSModulesConfig
}
