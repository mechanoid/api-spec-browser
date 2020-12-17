#!/usr/bin/env node
import arg from 'arg'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import apiSpecBrowser from '../index.js'
import logger from '../lib/logger.js'

dotenv.config()

const __dirname = dirname(fileURLToPath(import.meta.url))
const moduleRoot = resolve(__dirname, '..')

const isProduction = _ => process.env.NODE_ENV === 'production'

const helpInstructions = (options, aliases) => `
  The api-spec-browser should provide a convenient switch
  between different API Specs and their available versions.

  Following Command Line Options are available:

${Object.entries(options).map(([key, item]) =>
  `${key}: ${item.type === Boolean ? `(${item.type.name})` : item.type.name} - ${item.description}`)
  .join('\n')}

  Available Aliases for the above described options:

${Object.entries(aliases).map(([key, alias]) => `${key}: ${alias}`).join('\n')}
`

const cliOptions = {
  '--help': { type: Boolean, description: 'shows instructions' },
  '--port': { type: Number, description: 'option to pass the server port, where the app should be served' },
  '--pretty': { type: Boolean, description: 'enables HTML pretty printing' },
  '--with-examples': { type: Boolean, description: 'also mounts the examples in development mode. Not available in production' },
  '--config': { type: String, description: 'provide a content config to the spec browser.' },
  '--cache': { type: Boolean, description: 'enables caching of the hypermedia documents' },
  '--cookie': { type: String, description: 'a cookie to send while fetching the specs' }
}

const argAliases = {
  '-v': '--verbose',
  '-p': '--port',
  '-y': '--pretty',
  '-c': '--config',
  '-k': '--cookie'
}

const cliArgs = Object
  .entries(cliOptions)
  .reduce((result, [key, item]) =>
    Object.assign({}, result, { [key]: item.type }), {})

const args = arg(Object.assign({}, cliArgs, argAliases))

if (args['--help']) {
  console.log(helpInstructions(cliOptions, argAliases))
  process.exit(0)
}

const pretty = args['--pretty'] || !isProduction()
const cache = args['--cache'] || isProduction()
const port = args['--port'] || process.env.PORT
const examples = args['--with-examples'] || process.env.ASB_ENABLE_EXAMPLES
const configPath = args['--config'] || process.env.ASB_CONFIG_PATH || './Apispecbrowserfile.js'
const cookie = args['--cookie']

if (cookie) {
  process.env.ASB_REQUEST_COOKIE = cookie
}

apiSpecBrowser({ pretty, examples, configPath, moduleRoot, cache, cookie })
  .then(app => {
    const server = app.listen(port, _ => {
      logger.info(`started server at http://localhost:${server.address().port}`)
    })
  })
  .catch(e => {
    console.error(e)
  })
