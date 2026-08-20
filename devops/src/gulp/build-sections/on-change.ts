import {
  handleError,
  withFileChanges
} from '../../core/fs/watcher/with-file-changes.js'
import { buildSections } from './index.js'

withFileChanges([buildSections]).catch(handleError)
