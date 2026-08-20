import fs from 'node:fs/promises'
import Path from 'node:path'
import test from 'ava'
import { glob } from 'glob'
import { workdir } from '../core/process/workdir.js'

test('css outputs should match snapshots', async (t) => {
  const { execa } = await import('execa9')

  await glob('./_sass/**/*.spec.scss', {
    cwd: workdir,
    nodir: true,
    absolute: true,
    signal: AbortSignal.timeout(10_000)
  }).then(async (specPaths) => {
    for (const specPath of specPaths) {
      const { stdout: actual, stderr } = await execa('sass', [specPath], {
        cwd: workdir
      })

      const warning = stderr.trim()

      if (warning) {
        t.log(warning)
      }

      const snapshotPath = Path.resolve(
        Path.dirname(specPath),
        Path.basename(specPath).replace('.spec.scss', '.spec-snapshot.css')
      )

      const expected = await fs.readFile(snapshotPath, {
        encoding: 'utf-8'
      })

      const shortSpecPath = Path.relative(workdir, specPath)

      t.is(
        actual.trim(),
        expected.trim(),
        `Output from ${shortSpecPath} should match snapshot`
      )
    }
  })
})
