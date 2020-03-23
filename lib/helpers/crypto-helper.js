import crypto from 'crypto'

const sha256Args = (...args) => {
  const hash = crypto.createHash('sha256')
  for (const arg in args) {
    hash.update(arg)
  }
  return hash.digest('hex')
}

export { sha256Args }
