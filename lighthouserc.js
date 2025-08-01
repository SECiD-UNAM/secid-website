module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3000', 'http://localhost:3000/aboutus.html', 'http://localhost:3000/job-submission.html'],
      startServerCommand: 'npm run serve',
      startServerReadyPattern: 'Available on:',
      startServerReadyTimeout: 30000,
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        // Performance thresholds
        'first-contentful-paint': ['error', {maxNumericValue: 2000}],
        'largest-contentful-paint': ['error', {maxNumericValue: 2500}],
        'cumulative-layout-shift': ['error', {maxNumericValue: 0.1}],
        
        // SEO requirements
        'meta-description': 'error',
        'document-title': 'error',
        'html-has-lang': 'error',
        'meta-viewport': 'error',
        
        // Accessibility requirements
        'color-contrast': 'error',
        'aria-allowed-attr': 'error',
        'aria-required-attr': 'error',
        'button-name': 'error',
        'image-alt': 'error',
        'link-name': 'error',
        
        // PWA basics
        'installable-manifest': 'warn',
        'apple-touch-icon': 'warn',
        'maskable-icon': 'warn',
        
        // Best practices
        'uses-https': 'error',
        'external-anchors-use-rel-noopener': 'error',
        'no-vulnerable-libraries': 'error',
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
    server: {
      port: 9001,
      host: '0.0.0.0',
    },
  },
};