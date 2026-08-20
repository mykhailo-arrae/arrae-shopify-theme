import fs from 'node:fs/promises'
import Path from 'node:path'
import type { Ignore } from 'ignore'
import ignore from 'ignore'
import { safeAwait } from '../errors/safe-await.js'
import { gitdir } from '../process/gitdir.js'

/**
 * Reads ignore-rule files (e.g. `.gitignore`, `.prettierignore`) from the
 * project root (or a given directory) and returns a single `Ignore` instance
 * with all discovered rules merged together.
 *
 * Missing files are silently skipped.
 */
export const inferProjectIgnoreRules = async (
  filenames: string[] = ['.gitignore'],
  cwd = gitdir
): Promise<Ignore> => {
  const ig = ignore()

  await Promise.all(
    filenames.map(async (filename) => {
      const [err, content] = await safeAwait(
        fs.readFile(Path.resolve(cwd, filename), { encoding: 'utf-8' })
      )

      if (err) {
        return
      }

      ig.add(content)
    })
  )

  return ig
}
