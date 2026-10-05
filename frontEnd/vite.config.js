import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // '' = also load variables without the VITE_ prefix (keeps the key out of the browser bundle)
  const env = loadEnv(mode, process.cwd(), '')
  const resumeKey = (env.APILAYER_RESUME_KEY || '').trim()

  if (!resumeKey) {
    console.warn('⚠ APILAYER_RESUME_KEY is not set. Add it to .env next to vite.config.js and restart.')
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    base: '/',
    server: {
      proxy: {
        // Must come BEFORE '/api' so it matches first
        '/api/resume-parser': {
          target: 'https://api.apilayer.com',
          changeOrigin: true,
          rewrite: () => '/resume_parser/upload',
          // A placeholder avoids a crash on an undefined header; APILayer will answer 401 instead
          headers: { apikey: resumeKey || 'missing-key' },
          configure: (proxy) => {
            proxy.on('error', (err) => console.error('[resume-parser proxy]', err.message))
            proxy.on('proxyReq', (proxyReq, req) =>
              console.log(
                '[resume-parser proxy] key loaded:', Boolean(resumeKey),
                '| upload size:', req.headers['content-length'] || 'unknown', 'bytes'
              )
            )
            proxy.on('proxyRes', (proxyRes) => {
              const chunks = []
              proxyRes.on('data', (c) => chunks.push(c))
              proxyRes.on('end', () =>
                console.log(
                  '[resume-parser proxy] APILayer replied', proxyRes.statusCode,
                  Buffer.concat(chunks).toString().slice(0, 300)
                )
              )
            })
          },
        },

        // Everything else under /api goes to your Python backend
        '/api': {
          target: 'https://remopdf-backend.onrender.com/api',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
