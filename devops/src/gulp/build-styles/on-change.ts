import {
  handleError,
  withFileChanges
} from '../../core/fs/watcher/with-file-changes.js'
import { buildGlobalStyles, buildInlineGlobalStyles } from './index.js'

withFileChanges([buildGlobalStyles, buildInlineGlobalStyles]).catch(handleError)
