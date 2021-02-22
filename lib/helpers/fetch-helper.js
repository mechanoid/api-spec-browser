import crypto from 'crypto'
import fetch from 'node-fetch'
import NodeCache from 'node-cache'
import cacheControlParserLib from 'cache-control-parser'
import logger from '../logger.js'

const { default: cacheControlParser } = cacheControlParserLib

const hash = (url, options) => crypto.createHash('sha256').update(url).update(JSON.stringify(options)).digest('base64')

const initializeCache = ({ ttl }) => new NodeCache({
  stdTTL: ttl,
  useClones: false // important, because node-cache fails otherwise on storing/retrieving promise results, because they cannot be cloned.
})

const cache = initializeCache({ ttl: 60 })

const getTTL = (res) => {
  let ttl = 600
  const cacheControlHeader = res.headers.get('cache-control')
  const expiresHeader = res.headers.get('expires')

  if (cacheControlHeader) {
    const cacheControl = cacheControlParser(cacheControlHeader)
    ttl = cacheControl.public && cacheControl.maxAge ? cacheControl.maxAge : ttl
  } else if (expiresHeader) {
    return ttl // ignore expires header (don't want to parse dates :D)
  }

  return ttl
}

export default async (url, options, timeout = 2000) => {
  const requestHash = hash(url, options)
  const cached = await cache.get(requestHash)

  if (cached) {
    cached.headers.set('Cache-Status', 'HIT')
    const ttl = cache.getTtl(requestHash)
    if (ttl) { logger.info(url, `expires at ${new Date(ttl)}`) }
    return cached
  } else {
    return Promise.race([
      fetch(url, options)
        .then(res => {
          if (!res.ok) {
            throw new Error(`fetching ${url}: ${res.statusText}`)
          }

          const ttl = getTTL(res)

          cache.set(requestHash, res, ttl)
          res.headers.set('Cache-Status', 'MISS')
          return res
        }),
      new Promise((resolve, reject) =>
        setTimeout(() => reject(new Error('timeout')), timeout)
      )
    ])
  }
}
