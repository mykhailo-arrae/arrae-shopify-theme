import { gql } from '@urql/core'
import { z } from 'devops-zod4'

export const FindThemeData = z.object({
  theme: z.object({
    id: z.string().min(1),
    name: z.string().min(1)
  })
})

export type FindThemeVariables = {
  themeId: string
}

export const FindTheme = gql`
query findTheme($themeId: ID!) {
  theme(id: $themeId) {
    id
    name
  }
}
`
