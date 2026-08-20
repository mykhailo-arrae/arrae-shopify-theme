import type { Task } from '../../core/fs/watcher/with-file-changes.js'
import { uploadToShopifyV2 } from './v2.js'

/**
 * Gulp task for uploading files to Shopify themes.
 *
 * @description
 * This task uses the Theme Access API directly for file uploads - faster and more reliable.
 *
 * @example
 * ```bash
 * bb watch
 * ```
 */
export const uploadToShopify: Task = uploadToShopifyV2
