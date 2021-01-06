import fetch from 'node-fetch'

export default function (url, options, timeout = 500) {
  return Promise.race([
    fetch(url, options)
      .then(res => {
        if (!res.ok) {
          throw new Error(`fetching ${url}: ${res.statusText}`)
        }

        return res
      }),
    new Promise((resolve, reject) =>
      setTimeout(() => reject(new Error('timeout')), timeout)
    )
  ])
}
