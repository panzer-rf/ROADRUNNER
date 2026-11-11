import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['road-runner.svg'],
      manifest: {
        name: 'ROADRUNNER — Smart Delivery Mapping',
        short_name: 'ROADRUNNER',
        description: 'Mapa colaborativo de ubicaciones difíciles para repartidores de Molise.',
        theme_color: '#0c1412',
        background_color: '#0c1412',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ]
})
