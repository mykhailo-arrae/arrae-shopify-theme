import Path from 'node:path'
import { workdir } from '../../core/process/workdir.js'

export const LOAD_PATHS: string[] = [Path.resolve(workdir, '_sass/core')]
