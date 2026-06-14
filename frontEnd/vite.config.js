import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import obfuscatorPlugin from 'vite-plugin-javascript-obfuscator'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    obfuscatorPlugin({
      apply: 'build', 
      include: ['src/**/*.jsx', 'src/**/*.js', 'src/**/*.ts', 'src/**/*.tsx'],
      exclude: [/node_modules/],
      options: {
        compact: true,
        // Turn this OFF to stop the freezing
        controlFlowFlattening: false, 
        stringArray: true,
        stringArrayEncoding: ['base64'],
        disableConsoleOutput: true,
        // Turn this OFF to stop the freezing
        selfDefending: false, 
      }
    })
  ],
  build: {
    sourcemap: false, 
  }
})