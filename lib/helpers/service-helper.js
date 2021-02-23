/* global Buffer */
import fetch from './fetch-helper.js'
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

const toB64 = data => {
  const buff = Buffer.from(data)
  return buff.toString('base64')
}

const applyCookieCredentials = (headers, auth = {}) => {
  const name = auth.nameEnv ? process.env[auth.nameEnv] : auth.name
  const value = auth.valueEnv ? process.env[auth.valueEnv] : auth.value
  let cookie
  if (!!name && !!value) {
    cookie = [name, value].join('=')
    return Object.assign({}, headers, { Cookie: cookie })
  }
  return headers
}

const applyBasicAuthCredentials = (headers, auth = {}) => {
  const name = auth.nameEnv ? process.env[auth.nameEnv] : auth.name
  const password = auth.passwordEnv ? process.env[auth.passwordEnv] : auth.password
  let authorization
  if (!!name && !!password) {
    authorization = `Basic ${toB64([name, password].join(':'))}`
    return Object.assign({}, headers, { Authorization: authorization })
  }
  return headers
}

const authMethods = {
  BasicAuth: applyBasicAuthCredentials,
  CookieProtection: applyCookieCredentials
}

export const resolveDocument = async (url, auth = [], contextName, requestHost) => {
  const docUrl = new URL(url.href ? url.href : url, requestHost).toString()
  logger.info('fetching', docUrl)

  const headers = auth
    // certain resources are not protected, those can be excluded by adding "exclude" entries for contexts
    .filter(a => !(a.exclude && a.exclude.includes(contextName)))
    // building up a header containing all necessary auth credentials
    .reduce((headers, c) => Object.prototype.hasOwnProperty.call(authMethods, c.type) ? authMethods[c.type](headers, c) : headers, { })

  try {
    const response = await fetch(docUrl, { mode: 'cors', credentials: 'include', redirect: 'follow', headers })
    return response
  } catch (e) {
    logger.error(e)
    throw new Error(`could not resolve ${docUrl}`)
  }
}

const resolveSpecManifest = async (links = {}, auth, contextName, requestHost) => {
  if (links.specs) {
    const document = await resolveDocument(links.specs, auth, contextName, requestHost)

    if (document._links) {
      if (document._links instanceof Array) { // some teams deliver a list of objects instead of a one object (each object contains on version then ...)
        logger.warn('_links is delivered as list of objects, instead object!')
        const result = document._links.reduce((result, curr) => {
          const [v, url] = Object.entries(curr)[0]
          result[v] = url
          return result
        }, {})
        return result
      }

      return document._links
    }
  }
  return {}
}

const resolveServiceInfo = async (links = {}, auth, contextName, requestHost) => {
  if (links.info) {
    return resolveDocument(links.info, auth, contextName, requestHost)
  }
  return {}
}

export const resolveSpec = async (spec, auth = [], requestHost) => {
  return resolveDocument(spec, auth, 'spec', requestHost)
}

export const resolve = async (hypermediaDocumentUrl, auth, requestHost) => {
  if (typeof hypermediaDocumentUrl === 'object' && hypermediaDocumentUrl.spec) {
    return { standaloneSpec: await resolveSpec(hypermediaDocumentUrl.spec, auth, requestHost) }
  }

  logger.info('--------- RESOLVE HYPERMEDIA DOCUMENT:', hypermediaDocumentUrl)
  const hypermediaDocument = await resolveDocument(hypermediaDocumentUrl, auth, 'root', requestHost)
  logger.debug('hypermedia root', hypermediaDocument)
  const links = hypermediaDocument._links
  if (!links) {
    return {}
  }

  let specs, info

  try {
    logger.info('--------- RESOLVE SPEC DOCUMENT:', links.specs)
    specs = await resolveSpecManifest(links, auth, 'specs', requestHost)
  } catch (e) {
    logger.warn(e)
  }

  try {
    logger.info('--------- RESOLVE INFO RESOURCE:', links.info)
    info = await resolveServiceInfo(links, auth, 'info', requestHost)
  } catch (e) {
    logger.warn(e)
  }

  return { specs, info }
}
