import { z } from 'devops-zod4'

/**
 * Deployment target names used in GitHub Actions. See CI.md for more details.
 */
export const DeploymentTarget = z.enum(['dev-testing', 'dev-qa', 'uat'])
export type DeploymentTarget = z.infer<typeof DeploymentTarget>
