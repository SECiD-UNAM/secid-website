import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import compress from '@playform/compress';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: process.env.SITE_URL || 'https://secid.mx',
  base: process.env.NODE_ENV === 'production' ? '' : '/',

  // Static by default, server-rendered for routes with `export const prerender = false`
  output: 'static',
  adapter: node({
    mode: 'standalone',
  }),

  // Astro 7 changed the default from `true` (HTML-aware) to `'jsx'`, which
  // also strips whitespace between inline elements. Keep the HTML-aware
  // behaviour so rendered markup stays identical to the Astro 6 output.
  compressHTML: true,

  // Build configuration
  build: {
    format: 'directory',
    assets: 'assets',
  },

  // Integrations
  integrations: [
    react(),
    // Tailwind CSS 4 runs as a Vite plugin (vite.plugins below); only
    // cssnano is left in postcss.config.cjs.
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
      // html-minifier-terser strips the `<!-- -->` text-node separators React
      // emits inside prerendered islands, so the client saw different text
      // nodes and threw hydration errors #425/#418/#423 on /signup (issue
      // #82). Astro's own compressHTML (`true` above) already minifies safely.
      HTML: false,
      Image: true,
      JavaScript: true,
      SVG: true,
    }),
  ],

  // Vite configuration
  vite: {
    plugins: [tailwindcss()],
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
