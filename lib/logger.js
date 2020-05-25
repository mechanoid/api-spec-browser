import log4js from 'log4js'

const logLevel = () => ['trace', 'debug', 'info', 'warn', 'error', 'fatal'].indexOf(process.env.ASB_LOG_LEVEL) >= 0 ? process.env.ASB_LOG_LEVEL : 'info'

const logger = log4js.getLogger('api-spec-browser')

logger.level = logLevel() || logger.level

logger.info(`LogLevel=${logLevel()}`)
export default logger
