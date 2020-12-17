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
  const configuredServices = Object.keys(config.services)

  return async (req, res, next) => {
    const currentServiceName = req.query['service-name'] || configuredServices[0]
    console.log(currentServiceName)
    if (!currentServiceName || !configuredServices.includes(currentServiceName)) {
      // no service configured or an invalid service is selected
      return res.render('index', { config, configuredServices })
    }

    try {
      const { specs, info } = await resolve(currentServiceName, config.services[currentServiceName])

      const currentActiveVersion = currentServiceVersion(info)
      const apiVersions = availableAPIVersions(specs)

      const currentAPIVersion = currentActiveVersion ? apiVersionForService(currentActiveVersion, apiVersions) : null
      // // TODO: handle no display version available
      const displayVersion = req.query['display-version'] ? req.query['display-version'] : defaultDisplayVersion(currentAPIVersion, apiVersions)

      const spec = specs && displayVersion ? specs[displayVersion] : null

      logger.info('Service Version / API Version / Display Version', currentActiveVersion, currentAPIVersion, displayVersion)
      logger.info(spec)

      return res.render('index', { config, spec, serviceName: currentServiceName, configuredServices })
    } catch (error) {
      logger.error(error)
      return res.render('index', { config, serviceName: currentServiceName, configuredServices, error })
    }
  }
}
