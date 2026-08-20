import { z } from 'devops-zod4'

export const ThemeRole = z.enum(['main', 'unpublished', 'demo', 'development'])
export type ThemeRole = z.infer<typeof ThemeRole>
