import fs from 'node:fs/promises'
import Path from 'node:path'
import test from 'ava'
import { z } from 'devops-zod4'
import { DeploymentMatrix } from './matrix.js'

test('should generate a JSON schema file', async (t) => {
  const jsonSchema = z.toJSONSchema(DeploymentMatrix, {
    cycles: 'throw',
    reused: 'inline',
    unrepresentable: 'throw'
  })

  await fs.writeFile(
    Path.resolve(
      __dirname.replace('devops/lib', 'devops/src'),
      'matrix.schema.json'
    ),
    JSON.stringify(jsonSchema, null, 2)
  )

  t.pass()
})
