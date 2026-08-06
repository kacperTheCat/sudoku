import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Relative base so the built app works from any subpath (e.g. GitHub Pages
// project sites at https://<user>.github.io/<repo>/) without hardcoding the
// repo name.
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Registration is done manually via the virtual:pwa-register/react
      // hook (useAppUpdate) so we can show our own overlay before reloading,
      // instead of the plugin's silent auto-injected script.
      injectRegister: null,
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'icon-source.svg'],
      manifest: {
        name: 'Sudoku',
        short_name: 'Sudoku',
        description: 'Gra w sudoku z zapisem postępu — generuj planszę i graj offline.',
        theme_color: '#6d28d9',
        background_color: '#14151a',
        display: 'standalone',
        // Honored by Android when installed standalone. iOS Safari/PWA has
        // no orientation-lock API at all, so the CSS landscape overlay in
        // index.css is the real fallback there (and for any non-installed
        // browser tab, where this hint is ignored everywhere).
        orientation: 'portrait',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
    }),
  ],
});
