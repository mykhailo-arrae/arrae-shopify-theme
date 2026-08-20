import Path from 'node:path'
import { z } from 'devops-zod4'

const Themedir = z
  .string()
  .min(1)
  .describe('The theme directory')
  .refine((v) => Path.isAbsolute(v), {
    message: 'The theme directory must be an absolute path'
  })

export const themedir = Themedir.parse(process.env.THEMEDIR)
