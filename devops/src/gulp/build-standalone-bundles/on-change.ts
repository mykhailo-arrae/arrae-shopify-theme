import {
  handleError,
  withFileChanges
} from '../../core/fs/watcher/with-file-changes.js'
import { buildStandaloneBundles } from './index.js'

withFileChanges([buildStandaloneBundles]).catch(handleError)
