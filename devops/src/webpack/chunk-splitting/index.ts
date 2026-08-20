import type {
  OptimizationSplitChunksCacheGroup,
  OptimizationSplitChunksOptions as SplitChunks
} from '@rspack/core'
import { DevOpsError } from '../../core/errors/index.js'
import { initLogger } from '../../core/logger/index.js'
import { ASSET_FILE_PREFIX } from '../../core/shopify/asset-file-prefix.js'
import { joinNameSegments } from '../../core/string/join-name-segments.js'
import { kebabCase } from '../../core/string/kebab-case.js'
import { makeChunkGroups } from './groups.js'

export const CHUNK_FILE_PREFIX = joinNameSegments([ASSET_FILE_PREFIX, 'shared'])

const logger = initLogger().with({ name: 'chunk-splitting' })

export const makeSplitChunks = ({
  entryCount
}: {
  entryCount: number
}): SplitChunks => {
  const processedGroups: Record<string, true> = {}

  const _groups = makeChunkGroups({ entryCount, logger })
  const groups = _groups.reduce<
    Record<string, OptimizationSplitChunksCacheGroup>
  >((acc, { __handle, ...group }, index) => {
    if (__handle === 'default') {
      throw new DevOpsError('`default` group is not allowed', {
        __handle,
        group
      })
    }

    if (processedGroups[__handle]) {
      throw new DevOpsError('Duplicate group handle', {
        __handle,
        processedGroups
      })
    }

    const priority = 1 + index

    if (priority > 100) {
      throw new DevOpsError('Too many chunk rules', { count: groups.length })
    }

    const name = joinNameSegments([CHUNK_FILE_PREFIX, kebabCase(__handle)])

    acc[__handle] = {
      ...group,
      name,
      priority
    }

    processedGroups[__handle] = true

    return acc
  }, {})

  return {
    cacheGroups: {
      default: false,
      ...groups
    },
    minSize: 10_000,
    usedExports: true
  } satisfies SplitChunks
}
