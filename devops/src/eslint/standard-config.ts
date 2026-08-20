import { defineConfig } from 'eslint/config'
import { baseConfigs } from './base-rules.js'

/**
 * A placeholder config with minimal rules to ease the transition to Oxlint + Biome
 */
export const config = defineConfig(...baseConfigs)
