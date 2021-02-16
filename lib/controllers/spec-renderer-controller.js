import semver from 'semver'
import logger from '../logger.js'
import { resolve, resolveSpec } from '../helpers/service-helper.js'

const currentVersion = info => info && info.version ? info.version : 'latest'

const isString = version => typeof version === 'string'

const stringFormat = version => version
  ? isString(version) ? version : version.toString()
  : null

const versionWithoutPatchLevel = version => {
  const parsed = isString(version) ? semver.coerce(version) : version

  return `${parsed.major}.${parsed.minor}`
}

const currentServiceVersion = info => {
  if (info && info.version) {
    const full = currentVersion(info)
    return versionWithoutPatchLevel(full)
  }
}

const cleanOrConvert = v => semver.clean(v, { loose: true }) || semver.coerce(v).toString()

// accepts two-letter (1.2, 0.3,...) versions as (1.2.0, 0.3.0, ...) due to fallback coercion (then it looses the loose tags)
const availableAPIVersions = (specs = {}) => Object
  .keys(specs)
  .map(String)
  .filter(v => v !== 'latest') // some people also add a link entry for latest, this fails.
  .sort((a, b) => semver.rcompare(cleanOrConvert(a), cleanOrConvert(b)))

const apiVersionForService = (serviceVersion, apiVersions = []) =>
  apiVersions
    .find(api => {
      return semver.eq(semver.coerce(versionWithoutPatchLevel(api)), semver.coerce(serviceVersion))
    })

const defaultDisplayVersion = (currentAPIVersion, apiVersions) => currentAPIVersion || (apiVersions && stringFormat(apiVersions[0]))

const renderError = ({ res, config, configuredServices }) => message => res.render('index', { config, configuredServices, error: new Error(message) })

const findSpec = (specs = {}, displayVersion = '') => specs[displayVersion]

export default ({ config }) => {
  const configuredServices = Object.keys(config.services)

  return async (req, res) => {
    const error = renderError({ res, config, configuredServices })

    const currentServiceName = req.query['service-name'] || configuredServices[0]
    logger.info('CURRENT SERVICE NAME:', currentServiceName)

    if (!currentServiceName || !configuredServices.includes(currentServiceName)) {
      return error('no service configured or an invalid service is selected')
    }

    try {
      const serviceAuth = config.auth && config.auth[currentServiceName]
      const { specs, info, standaloneSpec } = await resolve(config.services[currentServiceName], serviceAuth)

      let spec
      let apiVersions
      let displayVersion
      let currentActiveVersion
      let currentAPIVersionOfDeployedService

      if (!standaloneSpec) {
        logger.info('Currently Deployed Service Version:', info && info.version)

        currentActiveVersion = currentServiceVersion(info)
        apiVersions = availableAPIVersions(specs)
        logger.info('Available API Versions:\n--', apiVersions.join('\n--'))
        if (!apiVersions.length > 0) {
          return error('no APIs referenced in specs document')
        }

        currentAPIVersionOfDeployedService = currentActiveVersion ? apiVersionForService(currentActiveVersion, apiVersions) : null

        displayVersion = req.query['display-version'] ? req.query['display-version'] : defaultDisplayVersion(currentAPIVersionOfDeployedService, apiVersions)

        if (!displayVersion) {
          return error('no APIs referenced in specs document')
        }

        const displaySpec = findSpec(specs, displayVersion)

        if (!displaySpec) {
          return error('no spec available for selected version')
        }

        spec = await resolveSpec(displaySpec, serviceAuth)

        logger.info('----------------')
        logger.info('Service Version', currentActiveVersion)
        logger.info('API Version / Display Version', currentAPIVersionOfDeployedService)
        logger.info('Display Version', displayVersion)
        logger.info('----------------')
      } else {
        spec = standaloneSpec
      }

      logger.debug('Resolved Spec: ', spec)

      return res.render('index', {
        stringFormat,
        config,
        spec,
        serviceName: currentServiceName,
        configuredServices,
        apiVersions,
        displayVersion,
        currentActiveVersion,
        currentAPIVersion: currentAPIVersionOfDeployedService
      })
    } catch (e) {
      logger.error(e)
      return error(e.message)
    }
  }
}
