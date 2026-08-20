import { initLogger } from './index.js'

process.env.DEBUG = '1'

const logger = initLogger().with({ name: 'kitchen-sink' })

logger.trace('trace')
logger.debug('debug')
logger.info('info')
logger.warn('warn')
logger.error('error')
logger.fatal('fatal')

logger.trace('{message}', {
  message: 'message key value',
  details: { a: 1, b: 2, c: ['a', 'b', 'c'] }
})
logger.trace('log all values {a} {b} {c[0]}', {
  a: 1,
  b: 2,
  c: ['a', 'b', 'c']
})
logger.debug('debug {*}', {
  details: { a: 1, b: 2, c: ['a', 'b', 'c'], regex: /test/gi }
})
logger.debug('lookup missing value {details.x.y.z}', {
  details: { a: 1, b: 2, c: ['a', 'b', 'c'] }
})

logger.debug('optional chaining {details?.x?.y?.z}', {
  details: { a: 1, b: 2, c: ['a', 'b', 'c'] }
})

logger.error({ err: new Error('test') })

logger.error('validation error:\n{issues}', { issues: 'Invalid token' })
