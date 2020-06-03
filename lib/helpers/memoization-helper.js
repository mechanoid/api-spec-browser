import Cache from 'cache'
import { sha256Args } from './crypto-helper.js'
import logger from '../logger.js'

export const memoize = (fn, ttl = 3600) => {
  const cache = new Cache(ttl * 1000)

  return async (...args) => {
    const argHash = sha256Args(args)
    let result = cache.get(argHash)
    if (result) {
      logger.info('CACHE_HIT', ...args)
      return result
    }

    logger.info('CACHE_MISS', ...args)
    result = await fn(...args)
    cache.put(argHash, result)
    return result
  }
}
