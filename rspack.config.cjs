// @ts-check

'use strict'

const { default: defineConfig } = require('./devops/lib/webpack/config.js')

/**
 * Please use portable sections/snippets as much as possible instead of defining manual entrypoints.
 *
 * IMPORTANT! Manual entrypoints should be defined in ./devops/src/webpack-entries.ts
 */

module.exports = defineConfig
