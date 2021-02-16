import log4js from 'log4js'

const defaultLogLevel = 'info'

const logger = log4js.getLogger('api-spec-browser')

export default logger

export const init = logLevelOverride => {
  const logLevel = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'].includes(logLevelOverride) ? logLevelOverride : defaultLogLevel
  logger.level = logLevel || logger.level
  logger.info(`LogLevel=${logLevel}`)
}
