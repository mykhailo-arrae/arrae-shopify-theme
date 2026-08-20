import { z } from 'devops-zod4'
import { initLogger } from '../core/logger/index.js'
import { makeHandleRejection } from '../core/process/handle-rejection.js'
import { ShopifyCliCredentials } from '../core/shopify/cli-credentials.js'
import { ThemeRole } from '../core/shopify/theme-role.js'
import { syncThemeTranslations } from './main.js'

const CliResult = z.object({
  args: z
    .tuple([
      z.coerce.number().min(0),
      z.object({
        source: z.coerce.number().min(0).nullable().optional().default(null)
      })
    ])
    .rest(z.unknown())
})
type CliResult = z.infer<typeof CliResult>

const ThemesResult = z.object({
  themes: z
    .array(
      z.object({
        id: z.number(),
        name: z.string().min(1),
        role: ThemeRole
      })
    )
    .min(1)
})
type ThemesResult = z.infer<typeof ThemesResult>

const logger = initLogger()

const run = async (): Promise<void> => {
  const { default: got } = await import('got')
  const { default: sade } = await import('sade')
  const { accessToken, shop } = await ShopifyCliCredentials.parseAsync(
    process.env
  )

  const cli = sade('sync-theme-translations <target_theme_id>', true)
    .version('1.0.0')
    .describe('Sync theme translations')
    .option('--source, -s', 'Source theme ID (live theme by default)')
    .example('3497656456987')
    .example('--source=1123129897654 3497656456987')

  const cliResult = cli.parse(process.argv, { lazy: true })

  // Sade returns undefined in lazy parse mode if the user uses help flag
  // https://github.com/lukeed/sade/issues/56
  if (cliResult == null) {
    return
  }

  const {
    args: [targetThemeId, { source: _sourceThemeId }]
  } = await CliResult.parseAsync(cliResult)

  const sourceThemeId =
    _sourceThemeId != null
      ? _sourceThemeId
      : await got(
          `https://${shop}/admin/api/2023-04/themes.json?fields=id,name,role`,
          {
            headers: {
              'X-Shopify-Access-Token': accessToken
            }
          }
        )
          .json()
          .then((result) => {
            return ThemesResult.parseAsync(result)
          })
          .then(({ themes }) => {
            return themes.find(({ role }) => role === 'main')?.id
          })

  if (sourceThemeId == null) {
    throw new Error('Live theme not found')
  }

  await syncThemeTranslations({
    env: { accessToken, shop },
    sourceThemeId,
    targetThemeId
  })
}

run().catch(makeHandleRejection({ logger }))
