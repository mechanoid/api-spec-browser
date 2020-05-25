import express from 'express'
import { resolve } from 'path'

import logger from './lib/logger.js'
import { baseApp } from './lib/app.js'
import exampleContentController from './lib/controllers/example-content-controller.js'
import specRendererController from './lib/controllers/spec-renderer-controller.js'

export const capture = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)

export default async ({ pretty, examples, configPath, moduleRoot, cache } = {}) => {
  const app = baseApp({ moduleRoot })
  const config = (await import(resolve(process.cwd(), configPath))).default
  logger.info('CONFIG', config)
  if (examples) {
    app.use('/examples', exampleContentController)
  }

  app.use('/client', express.static(resolve(moduleRoot, 'dist')))

  app.get('/', capture(specRendererController({ pretty, cache, config, mountpath: app.mountpath })))
  logger.info('MOUNTPATH', app.mountpath)

  app.use((error, req, res, next) => {
    logger.error(error)
    res.status(500)
    res.render('5xx', { error })
  })

  return app
}
