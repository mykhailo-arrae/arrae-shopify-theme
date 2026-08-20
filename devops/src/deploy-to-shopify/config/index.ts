import { z } from 'devops-zod4'
import {
  InitialContentSource,
  InitialContentSourcePipeline
} from '../../config/initial-content-source.js'
import { ShopifyCliCredentials } from '../../core/shopify/cli-credentials.js'
import { DeploymentTarget } from '../../core/shopify/deployment/target.js'
import {
  ContentOverridePatterns,
  ContentOverridePatternsPipeline
} from './content-override-patterns/schema.js'

const DevopsActor = z.string().min(1).optional().default('unknown')
const Step = z.enum(['prepare', 'populate'])

export const Options = z.object({
  devopsActor: z.string().min(1),
  initialContentSource: InitialContentSource,
  step: Step,
  target: DeploymentTarget,
  contentOverridePatterns: ContentOverridePatterns
})
export type Options = z.infer<typeof Options>

export const CliArgs = z.object({
  contentOverridePatterns: ContentOverridePatternsPipeline,
  initialContentSource: InitialContentSourcePipeline,
  step: Step.optional(),
  target: DeploymentTarget.optional()
})
export type CliArgs = z.infer<typeof CliArgs>

export const OptionsPipeline = z
  .object({
    args: CliArgs,
    env: z.object({
      DEPLOYMENT_CONTENT_OVERRIDE_PATTERNS_DISPATCH:
        ContentOverridePatternsPipeline,
      DEPLOYMENT_CONTENT_OVERRIDE_PATTERNS_WORKFLOW_CONFIG:
        ContentOverridePatternsPipeline,
      DEPLOYMENT_INITIAL_CONTENT_SOURCE: InitialContentSourcePipeline,
      DEPLOYMENT_STEP: z.string().optional(),
      DEPLOYMENT_TARGET: z.string().optional(),
      DEVOPS_ACTOR: DevopsActor
    })
  })
  .transform(({ args, env }) => {
    return {
      contentOverridePatterns: [
        ...env.DEPLOYMENT_CONTENT_OVERRIDE_PATTERNS_WORKFLOW_CONFIG,
        ...env.DEPLOYMENT_CONTENT_OVERRIDE_PATTERNS_DISPATCH,
        ...args.contentOverridePatterns
      ],
      devopsActor: env.DEVOPS_ACTOR,
      initialContentSource:
        args.initialContentSource ??
        env.DEPLOYMENT_INITIAL_CONTENT_SOURCE ??
        'live-theme',
      step: args.step ?? env.DEPLOYMENT_STEP,
      target: args.target ?? env.DEPLOYMENT_TARGET
    }
  })
  .pipe(Options)
export type OptionsPipeline = z.infer<typeof OptionsPipeline>
export type OptionsPipelineInput = z.input<typeof OptionsPipeline>

export type RuntimeConfigParseInput = {
  args: Record<string, unknown>
  env: Record<string, unknown>
}

export type RuntimeConfig = {
  credentials: ShopifyCliCredentials
  options: Options
}

export const parseRuntimeConfig = async ({
  args,
  env
}: RuntimeConfigParseInput): Promise<RuntimeConfig> => {
  const credentials = await ShopifyCliCredentials.parseAsync(env)
  const options = await OptionsPipeline.parseAsync({ args, env })

  return { credentials, options }
}
