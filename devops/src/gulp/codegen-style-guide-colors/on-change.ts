import {
  handleError,
  withFileChanges
} from '../../core/fs/watcher/with-file-changes.js'
import { codegenStyleGuideColorsTask } from './task.js'

withFileChanges([codegenStyleGuideColorsTask]).catch(handleError)
