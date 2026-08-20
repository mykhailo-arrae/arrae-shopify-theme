import { gql } from '@urql/core'
import { z } from 'devops-zod4'

export const UpsertThemeFilesData = z.object({
  themeFilesUpsert: z.object({
    upsertedThemeFiles: z.array(
      z.object({
        filename: z.string().min(1),
        checksumMd5: z.string().min(1).nullable()
      })
    ),
    userErrors: z.array(
      z.object({
        code: z.string().min(1).nullable(),
        field: z.string().min(1).nullable(),
        filename: z.string().min(1).nullable(),
        message: z.string().min(1)
      })
    )
  })
})

export type UpsertFilePayload = {
  filename: string
  body: {
    type: 'BASE64'
    value: string
  }
}

export type UpsertThemeFilesVariables = {
  themeId: string
  files: UpsertFilePayload[]
}

export const UpsertThemeFiles = gql`
mutation upsertThemeFiles($files: [OnlineStoreThemeFilesUpsertFileInput!]!, $themeId: ID!) {
  themeFilesUpsert(files: $files, themeId: $themeId) {
    upsertedThemeFiles {
      filename
      checksumMd5
    }
    userErrors {
      __typename
      code
      field
      filename
      message
    }
  }
}
`
