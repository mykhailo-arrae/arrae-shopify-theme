import { clamp } from 'remeda'
import type { Logger } from '../../core/logger/index.js'
import { tmpdir } from '../../core/process/tmpdir.js'
import { workdir } from '../../core/process/workdir.js'
import type { RspackModule } from './infer-module-file-path.js'
import { makeMatchNodeModuleNames } from './match-module-names.js'
import { matchNodeModules } from './match-node-modules.js'
import { makeMatchSourceFolder } from './match-source-folder.js'

export type ChunkGroup = {
  __handle: string
  chunks: 'all'
  minChunks?: number
  reuseExistingChunk?: boolean
  test?: (module: RspackModule) => boolean
}

export const makeChunkGroups = ({
  entryCount,
  logger
}: {
  entryCount: number
  logger: Logger
}): ChunkGroup[] => {
  const matchNodeModuleNames = makeMatchNodeModuleNames({ logger, tmpdir })
  const matchSourceFolder = makeMatchSourceFolder({
    workdir,
    srcdir: '_js-dist'
  })

  return [
    {
      __handle: 'by-usage-catch-all',
      chunks: 'all',
      minChunks: 2
    },
    {
      __handle: 'by-usage-min-2',
      chunks: 'all',
      minChunks: 2,
      test: matchNodeModules
    },
    {
      __handle: 'by-usage-min-3',
      chunks: 'all',
      minChunks: 3,
      test: matchNodeModules
    },
    {
      __handle: 'by-usage-min-4',
      chunks: 'all',
      minChunks: 4,
      test: matchNodeModules
    },
    {
      __handle: 'by-usage-min-5',
      chunks: 'all',
      minChunks: 5,
      test: matchNodeModules
    },
    {
      __handle: 'by-usage-min-6',
      chunks: 'all',
      minChunks: 6,
      test: matchNodeModules
    },
    {
      __handle: 'by-usage-min-7',
      chunks: 'all',
      minChunks: 7,
      test: matchNodeModules
    },
    {
      __handle: 'by-usage-75-percent',
      chunks: 'all',
      reuseExistingChunk: false,
      minChunks: clamp(Math.floor((entryCount / 4) * 3), { min: 2 }),
      test: matchNodeModules
    },
    {
      __handle: 'by-usage-90-percent',
      chunks: 'all',
      reuseExistingChunk: false,
      minChunks: clamp(Math.floor((entryCount / 10) * 9), { min: 2 }),
      test: matchNodeModules
    },
    {
      __handle: 'src-by-usage-min-2',
      chunks: 'all',
      minChunks: 2,
      test: matchSourceFolder
    },
    {
      __handle: 'src-by-usage-min-3',
      chunks: 'all',
      minChunks: 3,
      test: matchSourceFolder
    },
    {
      __handle: 'src-by-usage-min-4',
      chunks: 'all',
      minChunks: 4,
      test: matchSourceFolder
    },
    {
      __handle: 'src-by-usage-min-5',
      chunks: 'all',
      minChunks: 5,
      test: matchSourceFolder
    },
    {
      __handle: 'src-by-usage-min-6',
      chunks: 'all',
      minChunks: 6,
      test: matchSourceFolder
    },
    {
      __handle: 'src-by-usage-min-7',
      chunks: 'all',
      minChunks: 7,
      test: matchSourceFolder
    },
    {
      __handle: 'src-by-usage-75-percent',
      chunks: 'all',
      minChunks: clamp(Math.floor((entryCount / 4) * 3), { min: 2 }),
      test: matchSourceFolder
    },
    {
      __handle: 'src-by-usage-90-percent',
      chunks: 'all',
      minChunks: clamp(Math.floor((entryCount / 10) * 9), { min: 2 }),
      test: matchSourceFolder
    },
    {
      __handle: 'algolia',
      chunks: 'all',
      test: matchNodeModuleNames([
        { name: 'algolia', mode: 'startsWith' },
        { name: 'react-instantsearch', mode: 'startsWith' }
      ])
    },
    {
      __handle: 'cart',
      chunks: 'all',
      test: matchNodeModuleNames([{ name: 'stent', mode: 'startsWith' }])
    },
    {
      __handle: 'graphql',
      chunks: 'all',
      test: matchNodeModuleNames([{ name: 'graphql', mode: 'startsWith' }])
    },
    {
      __handle: 'jquery-plugins',
      chunks: 'all',
      test: matchNodeModuleNames([{ name: 'jquery', mode: 'startsWith' }])
    },
    {
      __handle: 'ixjs',
      chunks: 'all',
      test: matchNodeModuleNames([{ name: '@reactivex', mode: 'startsWith' }])
    },
    {
      __handle: 'lit',
      chunks: 'all',
      test: matchNodeModuleNames([
        { name: 'lit', mode: 'exact' },
        { name: 'lit-', mode: 'startsWith' },
        { name: '@lit', mode: 'startsWith' }
      ])
    },
    {
      __handle: 'preact',
      chunks: 'all',
      test: matchNodeModuleNames([{ name: 'preact', mode: 'exact' }])
    },
    {
      __handle: 'react-forms',
      chunks: 'all',
      test: matchNodeModuleNames([
        { name: 'react-hook-form', mode: 'exact' },
        { name: '@hookform', mode: 'startsWith' }
      ])
    },
    {
      __handle: 'react-query',
      chunks: 'all',
      test: matchNodeModuleNames([
        { name: '@tanstack/query', mode: 'startsWith' }
      ])
    },
    {
      __handle: 'react-router',
      chunks: 'all',
      test: matchNodeModuleNames([{ name: 'react-router', mode: 'startsWith' }])
    },
    {
      __handle: 'gsap',
      chunks: 'all',
      test: matchNodeModuleNames([
        { name: 'gsap', mode: 'exact' },
        { name: 'gsap-business', mode: 'contains' }
      ])
    },
    {
      __handle: 'jquery',
      chunks: 'all',
      test: matchNodeModuleNames([
        { name: 'jquery', mode: 'exact' },
        { name: 'uberslim-jquery', mode: 'contains' }
      ])
    },
    {
      __handle: 'react-core',
      chunks: 'all',
      test: matchNodeModuleNames([
        { name: 'react', mode: 'exact' },
        { name: 'react-dom', mode: 'exact' }
      ])
    },
    {
      __handle: 'swiper',
      chunks: 'all',
      test: matchNodeModuleNames([{ name: 'swiper', mode: 'startsWith' }])
    },
    {
      __handle: 'zod',
      chunks: 'all',
      test: matchNodeModuleNames([{ name: 'zod', mode: 'exact' }])
    },
    {
      __handle: 'superstruct',
      chunks: 'all',
      test: matchNodeModuleNames([{ name: 'superstruct', mode: 'exact' }])
    }
  ]
}
