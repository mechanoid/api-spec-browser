import fetch from './fetch-helper.js'
import logger from '../logger.js'

export const resolveDocument = async url => {
  const docUrl = url.href ? url.href : url
  logger.info('fetching', docUrl)

  const cookie = process.env.ASB_REQUEST_COOKIE_NAME && process.env.ASB_REQUEST_COOKIE_VALUE ? `${process.env.ASB_REQUEST_COOKIE_NAME}=${process.env.ASB_REQUEST_COOKIE_VALUE}` : undefined

  const headers = { cookie }
  try {
    const response = await fetch(docUrl, { mode: 'cors', credentials: 'include', redirect: 'follow', headers })

    if (!response.ok) {
      throw new Error(`could not resolve ${docUrl}`)
    }

    return response
  } catch (e) {
    logger.error(e)
    throw new Error(`could not resolve ${docUrl}`)
  }
}

export const resolveJSONDocument = async url => {
  try {
    const response = await resolveDocument(url)
    return response.json()
  } catch (e) {
    logger.error(e)
    throw e
  }
}

const resolveSpecManifest = async (links = {}) => {
  if (links.specs) {
    const document = await resolveJSONDocument(links.specs)
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

const resolveServiceInfo = async (links = {}) => {
  if (links.info) {
    return resolveJSONDocument(links.info)
  }
  return {}
}

export const resolve = async (serviceName, hypermediaDocumentUrl) => {
  logger.info('--------- RESOLVE HYPERMEDIA DOCUMENT:', hypermediaDocumentUrl)
  const hypermediaDocument = await resolveJSONDocument(hypermediaDocumentUrl)
  const links = hypermediaDocument._links
  if (!links) {
    return {}
  }

  let specs, info

  try {
    logger.info('--------- RESOLVE SPEC DOCUMENT:', links.specs)
    specs = await resolveSpecManifest(links)
  } catch (e) {
    logger.warn(e)
  }

  try {
    logger.info('--------- RESOLVE INFO RESOURCE:', links.info)
    info = await resolveServiceInfo(links)
  } catch (e) {
    logger.warn(e)
  }

  return { specs, info }
}
