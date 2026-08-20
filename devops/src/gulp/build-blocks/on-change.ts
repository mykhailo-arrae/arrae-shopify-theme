import {
  handleError,
  withFileChanges
} from '../../core/fs/watcher/with-file-changes.js'
import { buildBlocks } from './index.js'

withFileChanges([buildBlocks]).catch(handleError)
