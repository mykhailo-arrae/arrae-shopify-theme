import {
  handleError,
  withFileChanges
} from '../../core/fs/watcher/with-file-changes.js'
import { uploadToShopify } from './index.js'

withFileChanges([uploadToShopify]).catch(handleError)
