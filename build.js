#!/usr/bin/env node

/**
 * Build script for SECiD website
 * Processes template files with environment-specific variables
 */

const fs = require('fs');
const path = require('path');

// Environment configuration
const environments = {
  development: {
    SITE_URL: 'http://localhost:3000',
    ENVIRONMENT: 'development'
  },
  staging: {
    SITE_URL: 'https://staging-secid.github.io',
    ENVIRONMENT: 'staging'
  },
  production: {
    SITE_URL: 'https://secid.mx',
    ENVIRONMENT: 'production'
  }
};

// Get environment from command line argument or default to production
const env = process.argv[2] || 'production';
const config = environments[env];

if (!config) {
  console.error(`❌ Unknown environment: ${env}`);
  console.error(`Available environments: ${Object.keys(environments).join(', ')}`);
  process.exit(1);
}

console.log(`🔧 Building for environment: ${env}`);
console.log(`🌐 Site URL: ${config.SITE_URL}`);

// Template processing function
function processTemplate(templatePath, outputPath, variables) {
  if (!fs.existsSync(templatePath)) {
    console.warn(`⚠️  Template not found: ${templatePath}`);
    return;
  }

  let content = fs.readFileSync(templatePath, 'utf8');
  
  // Replace all template variables
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    content = content.replace(regex, value);
  });

  fs.writeFileSync(outputPath, content);
  console.log(`✅ Generated: ${outputPath}`);
}

// Process HTML templates (for canonical URLs and meta tags)
function processHTMLTemplate(filePath, variables) {
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  HTML file not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace canonical URLs
  content = content.replace(
    /(<link rel="canonical" href=")([^"]+)(")/g,
    `$1${variables.SITE_URL}${filePath.replace('.html', '.html').replace('index.html', '')}$3`
  );

  // Replace Open Graph URLs
  content = content.replace(
    /(<meta property="og:url" content=")([^"]+)(")/g,
    `$1${variables.SITE_URL}${filePath.replace('.html', '.html').replace('index.html', '')}$3`
  );

  // Replace Schema.org URLs in JSON-LD
  content = content.replace(
    /"url":\s*"[^"]+"/g,
    `"url": "${variables.SITE_URL}"`
  );

  fs.writeFileSync(filePath, content);
  console.log(`✅ Updated HTML: ${filePath}`);
}

// Main build process
try {
  // Process static templates
  processTemplate('robots.txt.template', 'robots.txt', config);
  processTemplate('sitemap.xml.template', 'sitemap.xml', config);

  // Process HTML files with environment-specific URLs
  const htmlFiles = ['index.html', 'aboutus.html', 'job-submission.html', 'journal-club.html'];
  htmlFiles.forEach(file => {
    processHTMLTemplate(file, config);
  });

  console.log(`🎉 Build completed successfully for ${env} environment!`);
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}