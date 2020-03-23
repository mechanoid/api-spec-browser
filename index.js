import express from 'express'
import { resolve } from 'path'

import { baseApp } from './lib/app.js'
import exampleContentController from './lib/controllers/example-content-controller.js'
import specRendererController from './lib/controllers/spec-renderer-controller.js'

export default async ({ pretty, examples, configPath, moduleRoot, cache } = {}) => {
  const app = baseApp({ moduleRoot })
  const config = (await import(resolve(process.cwd(), configPath))).default

  if (examples) {
    app.use('/examples', exampleContentController)
  }

  app.use('/assets', express.static('./assets'))

  app.get('/', specRendererController({ pretty, cache, config }))

  return app
}
