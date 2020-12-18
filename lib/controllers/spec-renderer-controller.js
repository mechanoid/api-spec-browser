import semver from 'semver'
import logger from '../logger.js'
import { resolve } from '../helpers/service-helper.js'

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

  return async (req, res, next) => {
    const error = renderError({ res, config, configuredServices })

    const currentServiceName = req.query['service-name'] || configuredServices[0]

    if (!currentServiceName || !configuredServices.includes(currentServiceName)) {
      return error('no service configured or an invalid service is selected')
    }

    try {
      const { specs, info } = await resolve(currentServiceName, config.services[currentServiceName])

      const currentActiveVersion = currentServiceVersion(info)
      const apiVersions = availableAPIVersions(specs)

      if (!apiVersions.length > 0) {
        return error('no APIs referenced in specs document')
      }

      const currentAPIVersionOfDeployedService = currentActiveVersion ? apiVersionForService(currentActiveVersion, apiVersions) : null

      const displayVersion = req.query['display-version'] ? req.query['display-version'] : defaultDisplayVersion(currentAPIVersionOfDeployedService, apiVersions)

      if (!displayVersion) {
        return error('no APIs referenced in specs document')
      }

      const spec = findSpec(specs, displayVersion)

      if (!spec) {
        return error('no spec available for selected version')
      }

      logger.info('Service Version / API Version / Display Version', currentActiveVersion, currentAPIVersionOfDeployedService, displayVersion)
      logger.info(spec)

      return res.render('index', {
        stringFormat,
        config,
        apiVersions,
        spec,
        serviceName: currentServiceName,
        configuredServices,
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
