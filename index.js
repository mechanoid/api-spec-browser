import express from 'express'
import { resolve, join } from 'path'

import logger from './lib/logger.js'
import { baseApp } from './lib/app.js'
import exampleContentController from './lib/controllers/example-content-controller.js'
import specRendererController from './lib/controllers/spec-renderer-controller.js'

export const capture = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)

const appLink = mountpath => (path = '.') => join(mountpath, path)

export default async ({ pretty, examples, configPath, moduleRoot, cache } = {}) => {
  const app = baseApp({ moduleRoot })

  Object.assign(app.locals, { pretty, mountpath: app.mountpath, appLink: appLink(app.mountpath) })

  const configDefaults = { services: [] }
  const loadedConfig = (await import(resolve(process.cwd(), configPath))).default
  const config = Object.assign({}, configDefaults, loadedConfig)

  logger.info('CONFIG', config)

  if (examples) {
    app.use('/examples', exampleContentController)
  }

  app.use('/client', express.static(resolve(moduleRoot, 'dist')))

  app.get('/', capture(specRendererController({ config })))
  logger.info('MOUNTPATH', app.mountpath)

  app.use((error, req, res, next) => {
    logger.error(error)
    res.status(500)
    res.render('5xx', { error })
  })

  return app
}
