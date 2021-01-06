import express from 'express'
import { resolve, join, dirname } from 'path'

import { fileURLToPath } from 'url'
import logger from './lib/logger.js'
import { baseApp } from './lib/app.js'
import exampleContentController from './lib/controllers/example-content-controller.js'
import specRendererController from './lib/controllers/spec-renderer-controller.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

export const capture = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)

const appLink = app => (path = '.') => join(app.mountpath, path)

const provideCookieToClient = (req, res, next) => {
  if (process.env.ASB_REQUEST_COOKIE_NAME && process.env.ASB_REQUEST_COOKIE_VALUE) {
    res.cookie(process.env.ASB_REQUEST_COOKIE_NAME, process.env.ASB_REQUEST_COOKIE_VALUE, { domain: process.env.ASB_REQUEST_COOKIE_DOMAIN })
  }
  next()
}

export default async ({ pretty, examples, configPath } = {}) => {
  const app = baseApp({ moduleRoot: __dirname })

  Object.assign(app.locals, { pretty, mountpath: app.mountpath, appLink: appLink(app) })

  const configDefaults = { services: [] }
  const loadedConfig = (await import(resolve(process.cwd(), configPath))).default
  const config = Object.assign({}, configDefaults, loadedConfig)

  logger.info('CONFIG', config)

  if (examples) {
    app.use('/examples', exampleContentController)
  }

  app.use('/client', express.static(resolve(__dirname, 'dist')))

  app.get('/', provideCookieToClient, capture(specRendererController({ config })))

  app.use((error, req, res, next) => {
    logger.error(error)
    res.status(500)
    res.render('5xx', { error })
  })

  return app
}
