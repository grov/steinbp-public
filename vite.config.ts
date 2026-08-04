import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'SteinBP — Beer Pong Tournament',
        short_name: 'SteinBP',
        description: 'Gestion de tournois de beer pong',
        theme_color: '#f97316',
        background_color: '#09090b',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Ne jamais détourner le panel PocketBase (/_/) ni l'API (/api/) :
        // ces chemins doivent toujours passer par le serveur, jamais par le
        // service worker (sinon la navigation vers /_/ renvoie l'app à la
        // place du panel admin).
        navigateFallbackDenylist: [/^\/_\//, /^\/api\//],
      },
    }),
  ],
  resolve: {
    alias: { '@': '/src' },
  },
})
