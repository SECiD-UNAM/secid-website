import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import compress from '@playform/compress';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  site: process.env.SITE_URL || 'https://secid.mx',
  base: process.env.NODE_ENV === 'production' ? '' : '/',

  // Static by default, server-rendered for routes with `export const prerender = false`
  output: 'static',
  adapter: node({
    mode: 'standalone',
  }),

  // Build configuration
  build: {
    format: 'directory',
    assets: 'assets',
  },

  // Integrations
  integrations: [
    react(),
    // Tailwind CSS processed via PostCSS (postcss.config.cjs)
    sitemap({
      i18n: {
        defaultLocale: 'es',
        locales: {
          es: 'es-MX',
          en: 'en-US',
        },
      },
    }),
    compress({
      CSS: true,
      HTML: true,
      Image: true,
      JavaScript: true,
      SVG: true,
    }),
  ],

  // Vite configuration
  vite: {
    ssr: {
      external: ['firebase', 'firebase-admin'],
    },
    build: {
      rollupOptions: {
        external: ['sharp'],
      },
    },
    optimizeDeps: {
      exclude: [
        'firebase',
        'firebase/app',
        'firebase/auth',
        'firebase/firestore',
        'firebase/storage',
      ],
    },
  },

  // i18n configuration
  i18n: {
    defaultLocale: 'es',
    locales: ['es', 'en'],
    routing: {
      prefixDefaultLocale: true,
    },
  },

  // Markdown configuration
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
      langs: ['js', 'ts', 'jsx', 'tsx', 'json', 'css', 'html', 'bash'],
      wrap: true,
    },
  },

  // Prefetch configuration for better performance
  prefetch: {
    prefetchAll: false,
    defaultStrategy: 'viewport',
  },
});
