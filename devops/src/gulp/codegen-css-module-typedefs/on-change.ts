import {
  handleError,
  withFileChanges
} from '../../core/fs/watcher/with-file-changes.js'
import { codegenCssModuleTypedefs } from './task.js'

withFileChanges([codegenCssModuleTypedefs]).catch(handleError)
