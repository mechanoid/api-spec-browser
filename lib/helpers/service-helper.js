import fetch from './fetch-helper.js'
import logger from '../logger.js'

export const resolveDocument = async url => {
  const docUrl = url.href ? url.href : url
  logger.info('fetching', docUrl)

  const cookie = process.env.ASB_REQUEST_COOKIE || undefined
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
  const hypermediaDocument = await resolveJSONDocument(hypermediaDocumentUrl)
  const links = hypermediaDocument._links
  if (!links) {
    return {}
  }

  const specs = await resolveSpecManifest(links)
  const info = await resolveServiceInfo(links)

  return { specs, info }
}
