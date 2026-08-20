import {
  handleError,
  withFileChanges
} from '../../core/fs/watcher/with-file-changes.js'
import { buildSnippets } from './index.js'

withFileChanges([buildSnippets]).catch(handleError)
