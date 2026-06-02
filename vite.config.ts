import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';
import tailwindcss from '@tailwindcss/vite';

import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    TanStackRouterVite(),
    react(),
    tailwindcss(),
    tsconfigPaths(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icon.svg'],
      workbox: {
        maximumFileSizeToCacheInBytes: 5000000 // 5 MB
      },
      manifest: {
        name: 'DataML',
        short_name: 'DataML',
        description: 'Composez, entraînez, exportez.',
        theme_color: '#3b3ff5',
        background_color: '#000000',
        display: 'standalone',
        icons: [
          {
            src: 'icon.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: 'icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
          }
        ]
      }
    }),
  ],
  optimizeDeps: {
    include: [
      'lucide-react',
      'recharts',
      'mermaid',
      '@monaco-editor/react',
      'react-markdown',
      'react-syntax-highlighter'
    ]
  }
});
