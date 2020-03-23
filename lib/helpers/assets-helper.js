import { resolve } from 'path'
import express from 'express'
import logger from '../logger.js'
/**
 * serves static files from node_modules on a public prefix path.
 * `/node_modules will be replaced by the prefix. By default it will be replaced
 * with `/vendor`.
 */
export const provideAsset = (assetPath, { app, prefix = '/vendor', root = 'node_modules', resolveRoot }) => {
  const publicPath = assetPath.replace(new RegExp(`^/?${root}(/.*)$`), `${prefix}$1`)

  try {
    const fullAssetPath = resolve(resolveRoot, assetPath)
    logger.info(`providing "${assetPath}" as "${publicPath}"`)

    app.use(publicPath, express.static(fullAssetPath))
    return { publicPath }
  } catch (e) {
    logger.error('cannot resolve asset file', e.message)
  }
}
