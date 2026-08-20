import { z } from 'devops-zod4'

const NonNegativeInteger = z.number().int().nonnegative()

const SeverityInput = z.enum(['error', 'warning', 'info'])

const SeverityOutput = z.enum(['error', 'warn', 'info'])
type SeverityOutput = z.infer<typeof SeverityOutput>

const Severity = SeverityInput.transform<SeverityOutput>((s) => {
  if (s === 'warning') {
    return 'warn'
  }
  return s
})
export type Severity = z.infer<typeof Severity>

export const Offense = z.object({
  check: z.string().min(1),
  severity: Severity,
  start_row: NonNegativeInteger,
  start_column: NonNegativeInteger,
  end_row: NonNegativeInteger,
  end_column: NonNegativeInteger,
  message: z.string().min(1)
})
export type Offense = z.infer<typeof Offense>

export const ReportEntry = z.object({
  path: z.string(),
  offenses: z.array(Offense),
  errorCount: z.number(),
  warningCount: z.number(),
  infoCount: z.number()
})
export type ReportEntry = z.infer<typeof ReportEntry>

export const Report = z.array(ReportEntry)
export type Report = z.infer<typeof Report>
