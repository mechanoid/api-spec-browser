import { sha256Args } from './crypto-helper.js'
import logger from '../logger.js'

export const memoize = fn => {
  const cache = {}

  return async (...args) => {
    const argHash = sha256Args(args)
    if (Object.hasOwnProperty.call(cache, argHash)) {
      logger.info('CACHE_HIT', ...args)
      return cache[argHash]
    }

    logger.info('CACHE_MISS', ...args)
    cache[argHash] = await fn(...args)
    return cache[argHash]
  }
}
