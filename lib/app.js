import { resolve } from 'path'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import 'pug'

export const baseApp = ({ moduleRoot }) => {
  const app = express()

  app.use(helmet())
  app.use(morgan('combined'))
  app.set('view engine', 'pug')
  app.set('views', resolve(moduleRoot, 'views'))

  app.use('/client/js/vendor', express.static(resolve(moduleRoot, 'dist/js')))
  app.use('/client/js', express.static(resolve(moduleRoot, 'client/js')))
  app.use('/client/css', express.static(resolve(moduleRoot, 'dist/css')))

  return app
}
