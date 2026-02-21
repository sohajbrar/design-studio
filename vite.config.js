import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const isVercel = process.env.VERCEL === '1'

function apiDevPlugin() {
  return {
    name: 'api-dev-proxy',
    configureServer(server) {
      const env = loadEnv('development', process.cwd(), '')
      Object.keys(env).forEach((key) => {
        if (!process.env[key]) process.env[key] = env[key]
      })

      const proxyRoute = (route, modulePath) => {
        server.middlewares.use(route, async (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405
            return res.end(JSON.stringify({ error: 'Method not allowed' }))
          }
          let body = ''
          req.on('data', (chunk) => { body += chunk })
          req.on('end', async () => {
            try {
              const { default: handler } = await server.ssrLoadModule(modulePath)
              const parsed = JSON.parse(body)
              const fakeReq = { method: 'POST', body: parsed }
              const fakeRes = {
                _status: 200,
                _data: null,
                status(code) { this._status = code; return this },
                json(data) { this._data = data; return this },
              }
              await handler(fakeReq, fakeRes)
              res.statusCode = fakeRes._status
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(fakeRes._data))
            } catch (err) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: err.message }))
            }
          })
        })
      }

      const proxyRawRoute = (route, modulePath) => {
        server.middlewares.use(route, async (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405
            return res.end(JSON.stringify({ error: 'Method not allowed' }))
          }
          const chunks = []
          req.on('data', (chunk) => chunks.push(chunk))
          req.on('end', async () => {
            try {
              const { default: handler } = await server.ssrLoadModule(modulePath)
              const buf = Buffer.concat(chunks)
              const fakeReq = {
                method: 'POST',
                headers: req.headers,
                [Symbol.asyncIterator]: async function* () { yield buf },
              }
              const fakeRes = {
                _status: 200,
                _data: null,
                status(code) { this._status = code; return this },
                json(data) { this._data = data; return this },
              }
              await handler(fakeReq, fakeRes)
              res.statusCode = fakeRes._status
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(fakeRes._data))
            } catch (err) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: err.message }))
            }
          })
        })
      }

      proxyRoute('/api/ai/generate', '/api/ai/generate.js')
      proxyRoute('/api/ai/chat', '/api/ai/chat.js')
      proxyRoute('/api/ai/refine', '/api/ai/refine.js')
      proxyRoute('/api/ai/voiceover', '/api/ai/voiceover.js')
      proxyRoute('/api/projects/save', '/api/projects/save.js')
      proxyRoute('/api/projects/load', '/api/projects/load.js')
      proxyRawRoute('/api/projects/upload', '/api/projects/upload.js')
    },
  }
}

export default defineConfig({
  base: isVercel ? '/' : '/design-studio/',
  plugins: [react(), apiDevPlugin()],
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
})
