import { z } from 'devops-zod4'
import { DeploymentTarget } from './target.js'

const Environment = z.object({
  name: z.string().min(1),
  contentOverridePatterns: z.string().optional().default('')
})

export const DeploymentMatrix = z.object({
  $schema: z.string().optional(),
  byTarget: z.object({
    [DeploymentTarget.enum['dev-testing']]: z.object({
      environment: z.array(Environment).length(1)
    }),
    [DeploymentTarget.enum['dev-qa']]: z.object({
      environment: z.array(Environment).min(1)
    }),
    [DeploymentTarget.enum.uat]: z.object({
      environment: z.array(Environment).min(1)
    })
  })
})
export type DeploymentMatrixInput = z.input<typeof DeploymentMatrix>
export type DeploymentMatrix = z.output<typeof DeploymentMatrix>
