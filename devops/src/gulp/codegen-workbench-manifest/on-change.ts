import {
  handleError,
  withFileChanges
} from '../../core/fs/watcher/with-file-changes.js'
import { codegenWorkbenchManifestTask } from './task.js'

withFileChanges([codegenWorkbenchManifestTask]).catch(handleError)
