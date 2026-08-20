import Path from 'node:path/posix'
import { DevOpsError } from '../../core/errors/index.js'
import type { Logger } from '../../core/logger/index.js'
import {
  inferRspackModuleFilePath,
  type RspackModule
} from './infer-module-file-path.js'

export type ModuleCondition = {
  name: string
  mode: 'startsWith' | 'contains' | 'exact'
  debug?: boolean
}

type MatchNodeModuleNames = (
  conditions: ModuleCondition[]
) => (module: RspackModule) => boolean

type Context = {
  logger?: Logger
  tmpdir: string
}

export const makeMatchNodeModuleNames = ({
  logger,
  tmpdir
}: Context): MatchNodeModuleNames => {
  return (conditions) => {
    return (module) => {
      const resource = inferRspackModuleFilePath(module.identifier())

      if (resource == null) {
        return false
      }

      const shortPath = Path.relative(
        Path.resolve(tmpdir, 'node_modules', '.pnpm'),
        resource
      )

      if (shortPath.startsWith('../')) {
        return false
      }

      const _packageName = shortPath.split(Path.sep).at(0)

      if (_packageName == null) {
        throw new DevOpsError('Package name is empty', {
          resource,
          shortPath
        })
      }

      const _packageNameSegments = _packageName
        .split('@')
        .slice(0, _packageName.startsWith('@') ? 2 : 1)

      const packageNameSegments = _packageName.startsWith('@')
        ? ['@', ..._packageNameSegments]
        : _packageNameSegments

      const packageName = packageNameSegments.join('')

      if (!packageName) {
        throw new DevOpsError('Package name cannot be resolved', {
          _packageNameSegments,
          packageNameSegments,
          packageName,
          resource,
          shortPath
        })
      }

      return conditions.some(
        ({ name: _name, mode = 'exact', debug = false }) => {
          const name = _name.replace(/\//g, '+')

          const match =
            mode === 'exact'
              ? packageName === name
              : mode === 'startsWith'
                ? packageName.startsWith(name)
                : packageName.includes(name)

          if (debug && logger != null) {
            logger.debug('[{name}] {mode} match {match}: {shortPath}', {
              name,
              shortPath,
              match: match ? 'found' : 'not found',
              mode: mode === 'exact' ? 'Exact' : 'Lax'
            })
          }

          return match
        }
      )
    }
  }
}
