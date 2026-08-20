import type { EntryObject } from '@rspack/core'
import { DevOpsError } from '../../errors/index.js'
import { ASSET_FILE_PREFIX } from '../../shopify/asset-file-prefix.js'
import { joinNameSegments } from '../../string/join-name-segments.js'
import { discoverBlockEntrypoints } from './discover-block-entrypoints.js'
import { discoverSectionEntrypoints } from './discover-section-entrypoints.js'
import { discoverSnippetEntrypoints } from './discover-snippet-entrypoints.js'
import { discoverWebComponentEntrypoints } from './discover-wc-entrypoints.js'

export const discoverEntrypoints = async ({
  baseEntry: _baseEntry
}: {
  baseEntry: EntryObject
}): Promise<{
  count: number
  entry: EntryObject
}> => {
  const baseEntry: EntryObject = Object.entries(_baseEntry).reduce<EntryObject>(
    (acc, [_name, path]) => {
      const name = joinNameSegments([ASSET_FILE_PREFIX, _name])
      acc[name] = path
      return acc
    },
    {}
  )

  const blocksEntry = await discoverBlockEntrypoints()

  const sectionsEntry = await discoverSectionEntrypoints()

  const snippetsEntry = await discoverSnippetEntrypoints()

  const wcEntry = await discoverWebComponentEntrypoints()

  const entry: EntryObject = {
    ...baseEntry,
    ...blocksEntry,
    ...sectionsEntry,
    ...snippetsEntry,
    ...wcEntry
  }

  const count = Object.keys(entry).length

  if (count === 0) {
    throw new DevOpsError('No entrypoints found', { baseEntry, entry })
  }

  return { count, entry }
}
