import type { DeploymentTarget } from '../core/shopify/deployment/target.js'

/**
 * The corresponding Shopify theme name will be created or updated depending on the active deployment target.
 */
export const DeploymentTargetThemeNames = {
  'dev-testing': 'Vaan Dev Testing',
  'dev-qa': 'Vaan Dev QA',
  uat: 'Vaan UAT'
} as const satisfies Record<DeploymentTarget, string>
