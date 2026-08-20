import {
  handleError,
  type Task,
  withFileChanges
} from '../../core/fs/watcher/with-file-changes.js'
import { buildWebComponentSsrStyles } from './index.js'

const task: Task = {
  name: 'build-wc-ssr-styles',
  exec: buildWebComponentSsrStyles
}

withFileChanges([task]).catch(handleError)
