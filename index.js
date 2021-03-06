import { resolve, join, dirname } from 'path'

import { fileURLToPath } from 'url'
import logger, { init as loggerInit } from './lib/logger.js'

import { baseApp } from './lib/app.js'
import exampleContentController from './lib/controllers/example-content-controller.js'
import specRendererController from './lib/controllers/spec-renderer-controller.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

export const capture = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)

const appLink = app => (path = '.') => join(app.mountpath, path)

export default async ({ pretty, examples, configPath, logLevel = 'error' } = {}) => {
  loggerInit(logLevel)
  const app = baseApp({ moduleRoot: __dirname })

  Object.assign(app.locals, { pretty, mountpath: app.mountpath, appLink: appLink(app) })

  const configDefaults = { services: [] }
  const loadedConfig = (await import(resolve(process.cwd(), configPath))).default
  const config = Object.assign({}, configDefaults, loadedConfig)

  logger.info('CONFIG', config)

  if (examples) {
    app.use('/examples', exampleContentController)
  }

  app.get('/', capture(specRendererController({ config })))

  app.use((error, req, res, next) => {
    logger.error(error)
    res.status(500)
    res.render('5xx', { error })
  })

  return app
}
