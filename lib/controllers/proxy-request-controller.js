import logger from '../logger.js'
import { resolveDocument } from '../helpers/service-helper.js'

export default ({ config, proxyRegistry }) => {
  return async (req, res) => {
    logger.debug(proxyRegistry)
    logger.debug(config.security)
    const specHash = req.query.specHash
    const specUrl = proxyRegistry[specHash]
    const response = await resolveDocument(specUrl, config.security)
    const spec = await response.text()
    logger.debug(response.headers)
    res.set({
      'content-type': response.headers.get('content-type')
    })
    res.send(spec)
  }
}
