/* global Buffer */
import yaml from 'js-yaml'
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

export const resolveDocument = async (url, auth = [], contextName) => {
  const docUrl = url.href ? url.href : url
  logger.info('fetching', docUrl)

  const headers = auth
    // certain resources are not protected, those can be excluded by adding "exclude" entries for contexts
    .filter(a => !(a.exclude && a.exclude.includes(contextName)))
    // building up a header containing all necessary auth credentials
    .reduce((headers, c) => Object.prototype.hasOwnProperty.call(authMethods, c.type) ? authMethods[c.type](headers, c) : headers, { })

  try {
    const response = await fetch(docUrl, { mode: 'cors', credentials: 'include', redirect: 'follow', headers })

    if (!response.ok) {
      throw new Error(`could not resolve ${docUrl}`)
    }
    console.log(url, response.headers.get('Cache-Status'))

    return response
  } catch (e) {
    logger.error(e)
    throw new Error(`could not resolve ${docUrl}`)
  }
}

export const resolveJSONDocument = async (url, auth, contextName) => {
  try {
    const response = await resolveDocument(url, auth, contextName)
    return response.json()
  } catch (e) {
    logger.error(e)
    throw e
  }
}

const resolveSpecManifest = async (links = {}, auth, contextName) => {
  if (links.specs) {
    const document = await resolveJSONDocument(links.specs, auth, contextName)

    if (document._links) {
      if (document._links instanceof Array) { // some teams deliver a list of objects instead of a one object (each object contains on version then ...)
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

const resolveServiceInfo = async (links = {}, auth, contextName) => {
  if (links.info) {
    return resolveJSONDocument(links.info, auth, contextName)
  }
  return {}
}

export const resolve = async (hypermediaDocumentUrl, auth) => {
  logger.info('--------- RESOLVE HYPERMEDIA DOCUMENT:', hypermediaDocumentUrl)
  const hypermediaDocument = await resolveJSONDocument(hypermediaDocumentUrl, auth, 'root')
  const links = hypermediaDocument._links
  if (!links) {
    return {}
  }

  let specs, info

  try {
    logger.info('--------- RESOLVE SPEC DOCUMENT:', links.specs)
    specs = await resolveSpecManifest(links, auth, 'specs')
  } catch (e) {
    logger.warn(e)
  }

  try {
    logger.info('--------- RESOLVE INFO RESOURCE:', links.info)
    info = await resolveServiceInfo(links, auth, 'info')
  } catch (e) {
    logger.warn(e)
  }

  return { specs, info }
}

export const resolveSpec = async (spec, auth = []) => {
  const document = await resolveDocument(spec, auth, 'spec')

  const contentType = document.headers.get('content-type')

  if (contentType && !!YAML_TYPES.find(t => contentType.includes(t))) {
    const text = await document.text()
    return yaml.load(text)
  }

  // as default try json
  return document.json()
}
