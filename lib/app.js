import { resolve } from 'path'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import 'pug'

import { provideAsset } from './helpers/assets-helper.js'

export const baseApp = ({ moduleRoot }) => {
  const app = express()

  app.use(helmet())
  app.use(morgan('combined'))
  app.set('view engine', 'pug')
  app.set('views', resolve(moduleRoot, 'views'))

  const redoc = provideAsset('node_modules/redoc/bundles/redoc.standalone.js', {
    app,
    root: 'node_modules',
    prefix: '/assets/vendor',
    resolveRoot: moduleRoot
  })

  app.use('/client/js', express.static(resolve(moduleRoot, 'client/js')))
  app.use('/client/css', express.static(resolve(__dirname, 'dist/css')))

  app.locals.assets = {}
  app.locals.assets.vendor = { redoc } // make assetPaths availabel in views

  return app
}
