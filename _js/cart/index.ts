import { initIndicator } from './indicator/index.js'

const logErrors = (err: unknown): void => {
  console.error(err)
}

initIndicator().catch(logErrors)
