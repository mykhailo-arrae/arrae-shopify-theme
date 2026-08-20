import type { KnipConfig } from 'knip'
import { inferWebpackEntrypoints } from './infer-webpack-entrypoints.js'

const config = async (): Promise<KnipConfig> => {
  const entrypoints = await inferWebpackEntrypoints()
  return {
    entry: [
      ...entrypoints,
      '_js/**/*.spec.{ts,tsx}',
      '_js/standalone/*/index.{js,ts,tsx}'
    ],
    project: ['_js/**/*.{js,ts,tsx}', '!_js/**/*.scss.ts'],
    ignoreExportsUsedInFile: true,
    ignore: [
      // Exclude core files from reports, but use them in analysis
      '_js/core/**/*.{js,ts,tsx}'
    ],
    rules: {
      binaries: 'off',
      dependencies: 'off'
    },
    webpack: false
  }
}

export default config
