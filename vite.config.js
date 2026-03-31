import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [
      react(),
      {
        name: 'local-api',
        configureServer(server) {
          server.middlewares.use('/api/analyze', async (req, res) => {
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
            if (req.method === 'OPTIONS') { res.statusCode = 200; res.end(); return; }
            if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
            const apiKey = env.ANTHROPIC_API_KEY
            if (!apiKey) { res.statusCode = 500; res.end(JSON.stringify({ error: 'ANTHROPIC_API_KEY が設定されていません' })); return; }
            let body = ''
            req.on('data', chunk => { body += chunk })
            req.on('end', async () => {
              try {
                const parsed = JSON.parse(body)
                const response = await fetch('https://api.anthropic.com/v1/messages', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
                  body: JSON.stringify(parsed),
                })
                const text = await response.text()
                res.setHeader('Content-Type', 'application/json')
                res.statusCode = response.status
                res.end(text)
              } catch (e) {
                res.statusCode = 500
                res.end(JSON.stringify({ error: { message: e.message } }))
              }
            })
          })
        }
      }
    ],
  }
})
