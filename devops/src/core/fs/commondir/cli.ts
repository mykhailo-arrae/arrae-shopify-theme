import path from 'node:path'
import { commondir } from './index.js'

const rawDirs = process.argv.slice(2).filter((item) => item)

const dirs = rawDirs.map((dir) => path.dirname(path.resolve(dir)))

if (dirs.length > 0) {
  // eslint-disable-next-line no-console
  console.log(commondir(dirs))
}
