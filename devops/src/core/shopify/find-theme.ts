import { z } from 'devops-zod4'
import { ThemeRole } from './theme-role.js'

export const Theme = z.object({
  admin_graphql_api_id: z.string().min(1),
  id: z.number().min(0),
  name: z.string().min(1),
  role: ThemeRole
})
export type Theme = z.infer<typeof Theme>

export const ThemesResult = z.object({
  themes: z.array(Theme).min(1)
})

export type FindThemeInput = {
  shop: string
  accessToken: string
  predicate: (theme: Theme) => boolean
}

export type FindThemeOutput = {
  theme: Theme | null
  allThemes: Theme[]
}

export const findTheme = async ({
  shop,
  accessToken,
  predicate
}: FindThemeInput): Promise<FindThemeOutput> => {
  const { default: got } = await import('got')

  const { themes: allThemes } = await ThemesResult.parseAsync(
    await got(
      `https://${shop}/admin/api/2023-04/themes.json?admin_graphql_api_id,id,name,role`,
      {
        headers: {
          'X-Shopify-Access-Token': accessToken
        }
      }
    ).json()
  )

  const theme = allThemes.find(predicate) ?? null

  return { theme, allThemes }
}
