import fs from 'fs'
import { resolve, join } from 'path'
import express from 'express'
import cors from 'cors'

const packageInfo = JSON.parse(fs.readFileSync(resolve(process.cwd(), 'package.json')))

const originalHost = req => `${req.protocol}://${req.headers['x-forwarded-host'] || req.headers.host}`
const fullQualified = (req, mountpath = '', host = null) => path => new URL(join(mountpath, path), host || originalHost(req))

const router = express()
router.use((req, _, next) => {
  console.log('HEADERSXXXX', req.headers)
  next()
})
router.get('/.well-known/home', (req, res) => {
  const fq = fullQualified(req, router.mountpath)

  res.header('Content-Type', 'application/hal+json')
  res.header('Cache-Control', 'public, max-age=300')

  res.json({
    _links: {
      self: {
        href: fq('./.well-known/home')
      },
      info: {
        href: fq('./.well-known/info')
      },
      specs: {
        href: fq('./.well-known/specs')
      }
    }
  })
})

router.get('/.well-known/info', (req, res) => {
  res.header('Content-Type', 'application/hal+json')
  res.header('Cache-Control', 'public, max-age=300')

  res.json({
    name: packageInfo.name,
    description: packageInfo.description,
    version: '0.2.5' // packageInfo.version
  })
})

router.get('/.well-known/specs', (req, res) => {
  const fq = fullQualified(req, router.mountpath)

  res.header('Content-Type', 'application/hal+json')
  res.header('Cache-Control', 'public, max-age=300')

  res.json({
    _links: {
      0.1: {
        href: fq('./.well-known/specs/docs-and-versioning-example-0.1.yml')
      },
      '0.3.4': {
        href: fq('./.well-known/specs/docs-and-versioning-example-0.3.yml')
      },
      '0.3.5-alpha': {
        href: fq('./.well-known/specs/docs-and-versioning-example-0.3.yml')
      },
      '0.2.5-alpha.1': {
        href: fq('./.well-known/specs/docs-and-versioning-example-0.2.yml')
      }
    }
  })
})

router.use('/.well-known/specs', cors({ origin: '*' }), express.static(resolve(process.cwd(), 'examples/example-service-api')))

export default router
