import { z } from 'devops-zod4'
import { ASSET_FILE_PREFIX } from '../core/shopify/asset-file-prefix.js'

/**
 * Portable section asset names are generated dynamically and include the asset prefix
 */
const SECTION_PREFIX =
  ASSET_FILE_PREFIX.length > 0 ? `${ASSET_FILE_PREFIX}-section-` : 'section-'

const SNIPPET_PREFIX =
  ASSET_FILE_PREFIX.length > 0 ? `${ASSET_FILE_PREFIX}-snippet-` : 'snippet-'

const BLOCK_PREFIX =
  ASSET_FILE_PREFIX.length > 0 ? `${ASSET_FILE_PREFIX}-block-` : 'block-'

const WC_PREFIX =
  ASSET_FILE_PREFIX.length > 0 ? `${ASSET_FILE_PREFIX}-wc-` : 'wc-'

const EntryType = z.enum([
  'block',
  'collection',
  'customer',
  'home',
  'product',
  'section',
  'snippet',
  'theme',
  'wc'
])
type EntryType = z.infer<typeof EntryType>

const EntryInfo = z
  .string()
  .min(1)
  .transform<{ name: string; type: EntryType | 'no-match' }>((s) => {
    const n = s.startsWith(`${ASSET_FILE_PREFIX}-`)
      ? s.replace(`${ASSET_FILE_PREFIX}-`, '')
      : s

    if (n.startsWith(BLOCK_PREFIX)) {
      return {
        name: n.replace(BLOCK_PREFIX, ''),
        type: EntryType.enum.block
      }
    }

    if (n.startsWith(SECTION_PREFIX)) {
      return {
        name: n.replace(SECTION_PREFIX, ''),
        type: EntryType.enum.section
      }
    }

    if (n.startsWith(SNIPPET_PREFIX)) {
      return {
        name: n.replace(SNIPPET_PREFIX, ''),
        type: EntryType.enum.snippet
      }
    }

    if (n.startsWith(WC_PREFIX)) {
      return {
        name: n.replace(WC_PREFIX, ''),
        type: EntryType.enum.wc
      }
    }

    const type = EntryType.options.find((t) => {
      return n.startsWith(t + '-')
    })

    if (type == null) {
      return {
        name: n,
        type: 'no-match'
      }
    }

    return {
      type,
      name: n.replace(type + '-', '')
    }
  })
  .pipe(
    z.object({
      name: z.string().min(2),
      type: EntryType
    })
  )

export const Asset = z.object({
  name: z.string().min(1),
  src: z.string().min(1).startsWith('{{').endsWith(' }}')
})
export type Asset = z.infer<typeof Asset>

export const Entry = z.object({
  info: EntryInfo,
  assets: z.array(Asset)
})
export type Entry = z.infer<typeof Entry>

export const Manifest = z.object({
  templateDir: z.string().min(1),
  templateName: z.string().min(1),
  entries: z.array(Entry)
})
export type Manifest = z.infer<typeof Manifest>
