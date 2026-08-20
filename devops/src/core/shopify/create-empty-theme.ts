import { z } from 'devops-zod4'
import { DevOpsError } from '../errors/index.js'
import { ThemeRole } from './theme-role.js'

const Theme = z.object({
  admin_graphql_api_id: z.string().min(1),
  id: z.number().min(1),
  name: z.string().min(1),
  role: ThemeRole
})
type Theme = z.infer<typeof Theme>

const ThemeCreationResult = z.object({
  theme: Theme
})

export type CreateThemeInput = {
  shop: string
  accessToken: string
  name: string
}

export const createEmptyTheme = async ({
  shop,
  accessToken,
  name
}: CreateThemeInput): Promise<Theme> => {
  if (!name) {
    throw new DevOpsError('Theme name is required', { shop })
  }

  const { default: got } = await import('got')

  const { theme } = await ThemeCreationResult.parseAsync(
    await got(`https://${shop}/admin/api/2023-04/themes.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': accessToken
      },
      json: {
        theme: {
          name,
          role: ThemeRole.enum.unpublished
        }
      }
    }).json()
  )

  return theme
}
