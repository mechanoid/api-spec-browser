import semver from 'semver'
import logger from '../logger.js'
import { memoize } from '../helpers/memoization-helper.js'
import { dismantle } from '../helpers/service-helper.js'

const currentVersion = info => info && info.version ? info.version : 'latest'

const getServices = async serviceConfig => {
  const servicePromises = Object.entries(serviceConfig).map(([serviceName, serviceHypermediaUrl]) => dismantle(serviceName, serviceHypermediaUrl))
  const services = await Promise.all(servicePromises)

  return services.reduce((result, [serviceName, servicesMetaData]) => {
    result[serviceName] = servicesMetaData
    return result
  }, {})
}

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

// accepts two-letter (1.2, 0.3,...) versions as (1.2.0, 0.3.0, ...) due to fallback coercion (then it looses the loose tags)
const availableAPIVersions = specs => Object
  .keys(specs)
  .map(String)
  .map(v => semver.clean(v, { loose: true }) || semver.coerce(v))
  .sort(semver.rcompare)

const apiVersionForService = (serviceVersion, apiVersions = []) =>
  apiVersions
    .find(api => {
      return semver.eq(semver.coerce(versionWithoutPatchLevel(api)), semver.coerce(serviceVersion))
    })

const defaultDisplayVersion = (currentAPIVersion, apiVersions) => currentAPIVersion || (apiVersions && stringFormat(apiVersions[0]))

export default ({ config, cache, pretty, mountpath }) => {
  const decoratedGetServices = cache ? memoize(getServices) : getServices

  return async (req, res, next) => {
    let currentServiceName = req.query['service-name']
    const services = Object.keys(config.services)

    if (!Object.prototype.hasOwnProperty.call(config.services, currentServiceName)) {
      logger.info(`No proper service-name provided: "${currentServiceName}"`)
      currentServiceName = services && services.length > 0 ? services[0] : null
    }

    let servicesMetaData
    try {
      servicesMetaData = await decoratedGetServices(config.services)
    } catch (error) {
      servicesMetaData = null
    }

    const currentService = servicesMetaData && servicesMetaData[currentServiceName]
    const currentActiveVersion = currentService && currentServiceVersion(currentService.info)
    const apiVersions = currentService && availableAPIVersions(currentService.specs)

    const currentAPIVersion = apiVersions && currentActiveVersion ? apiVersionForService(currentActiveVersion, apiVersions) : null

    // TODO: handle no display version available
    const displayVersion = req.query['display-version'] ? req.query['display-version'] : defaultDisplayVersion(currentAPIVersion, apiVersions)

    const spec = currentService && currentService.specs && displayVersion ? currentService.specs[displayVersion] : null

    logger.info('Service Version / API Version / Display Version', currentActiveVersion, currentAPIVersion, displayVersion)

    res.render('index', { mountpath, pretty, config, spec, currentService, serviceName: currentServiceName, services, servicesMetaData })
  }
}
