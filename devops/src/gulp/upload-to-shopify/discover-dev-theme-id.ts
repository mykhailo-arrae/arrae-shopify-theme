import { readFile } from 'node:fs/promises'
import Path from 'node:path'
import { z } from 'devops-zod4'
import { DevOpsError } from '../../core/errors/index.js'
import { safeAwait } from '../../core/errors/safe-await.js'
import { Integer } from '../../core/zod/integer.js'

const Env = z.object({
  XDG_CONFIG_HOME: z.string().min(1)
})

const DevThemeConfig = z.record(
  z.string(),
  z.object({
    myshopify: z.object({
      com: Integer.pipe(z.number().min(1))
    })
  })
)
type DevThemeConfig = z.infer<typeof DevThemeConfig>

export const discoverDevThemeId = async ({
  shop
}: {
  shop: string
}): Promise<{ shortThemeId: number; themeId: string }> => {
  const permanentDomain = shop.split('.').at(0)

  if (!permanentDomain) {
    throw new DevOpsError('Shopify shop domain is invalid', {
      shop
    })
  }

  if (permanentDomain.startsWith('https://')) {
    throw new DevOpsError('Shop domain cannot start with "https://"', {
      permanentDomain,
      shop
    })
  }

  const { XDG_CONFIG_HOME } = await Env.parseAsync(process.env)

  const configFilePath = Path.resolve(
    XDG_CONFIG_HOME,
    'shopify-cli-development-theme-config-nodejs/config.json'
  )
  const [configFileContentsError, configFileContents] = await safeAwait(
    readFile(configFilePath, { encoding: 'utf-8' }).then((v) => JSON.parse(v))
  )

  if (configFileContentsError) {
    throw new DevOpsError('Failed to read dev theme config file', {
      err: configFileContentsError,
      configFilePath
    })
  }

  const devThemeConfigResult =
    await DevThemeConfig.safeParseAsync(configFileContents)

  if (!devThemeConfigResult.success) {
    throw new DevOpsError('Failed to parse dev theme config file', {
      issues: devThemeConfigResult.error.issues
    })
  }

  const shortThemeId = devThemeConfigResult.data[permanentDomain]?.myshopify.com

  if (!shortThemeId) {
    throw new DevOpsError('Theme ID not found in dev theme config', {
      devThemeConfig: devThemeConfigResult.data,
      permanentDomain,
      shop
    })
  }

  return {
    shortThemeId,
    themeId: `gid://shopify/OnlineStoreTheme/${shortThemeId}`
  }
}
