import crypto from 'crypto'
import fetch from 'node-fetch'
import NodeCache from 'node-cache'
import cacheControlParserLib from 'cache-control-parser'
import yaml from 'js-yaml'
import logger from '../logger.js'

const YAML_TYPES = [
  'text/x-yaml',
  'text/yaml',
  'text/yml',
  'application/x-yaml',
  'application/x-yml',
  'application/yaml',
  'application/yml'
]

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
    const ttl = cache.getTtl(requestHash)
    if (ttl) { logger.info(url, `expires at ${new Date(ttl)}`) }
    logger.info(url, 'Cache-Status', 'HIT')
    return cached
  } else {
    return Promise.race([
      fetch(url, options)
        .then(async res => {
          if (!res.ok) {
            throw new Error(`fetching ${url}: ${res.statusText}`)
          }

          const contentType = res.headers.get('content-type')

          let parsed
          if (contentType && !!YAML_TYPES.find(t => contentType.includes(t))) {
            const text = await res.text()
            parsed = yaml.load(text)
          } else {
            parsed = await res.json()
          }
          console.log(parsed)

          const ttl = getTTL(res)
          cache.set(requestHash, parsed, ttl)
          logger.info(url, 'Cache-Status', 'MISS')
          return parsed
        }),
      new Promise((resolve, reject) => setTimeout(() => reject(new Error('timeout')), timeout)
      )
    ])
  }
}
