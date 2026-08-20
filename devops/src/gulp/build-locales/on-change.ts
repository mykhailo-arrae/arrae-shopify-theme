import {
  handleError,
  withFileChanges
} from '../../core/fs/watcher/with-file-changes.js'
import { buildLocales } from './index.js'

withFileChanges([buildLocales]).catch(handleError)
