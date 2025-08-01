#!/usr/bin/env node

/**
 * Schema.org structured data validator for SECiD website
 * Validates JSON-LD structured data in HTML files
 */

const fs = require('fs');
const path = require('path');

// Simple JSON-LD validation
function validateJSONLD(content, filePath) {
  const errors = [];
  const warnings = [];
  
  // Extract JSON-LD scripts
  const jsonLdRegex = /<script[^>]*type=["\']application\/ld\+json["\'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  let hasJsonLd = false;
  
  while ((match = jsonLdRegex.exec(content)) !== null) {
    hasJsonLd = true;
    const jsonContent = match[1].trim();
    
    try {
      const data = JSON.parse(jsonContent);
      
      // Validate required Schema.org fields
      if (data['@context'] !== 'https://schema.org') {
        errors.push(`Invalid @context: expected 'https://schema.org', got '${data['@context']}'`);
      }
      
      if (!data['@type']) {
        errors.push('Missing required @type field');
      }
      
      // Organization-specific validation
      if (data['@type'] === 'Organization') {
        const requiredFields = ['name', 'url', 'description', 'email'];
        requiredFields.forEach(field => {
          if (!data[field]) {
            errors.push(`Missing required Organization field: ${field}`);
          }
        });
        
        // Validate URL format
        if (data.url && !data.url.match(/^https?:\/\/.+/)) {
          errors.push(`Invalid URL format: ${data.url}`);
        }
        
        // Validate email format
        if (data.email && !data.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
          errors.push(`Invalid email format: ${data.email}`);
        }
        
        // Check for recommended fields
        const recommendedFields = ['logo', 'foundingLocation', 'parentOrganization', 'sameAs'];
        recommendedFields.forEach(field => {
          if (!data[field]) {
            warnings.push(`Missing recommended Organization field: ${field}`);
          }
        });
      }
      
      console.log(`✅ Valid JSON-LD found in ${filePath}`);
      
    } catch (error) {
      errors.push(`Invalid JSON-LD syntax: ${error.message}`);
    }
  }
  
  if (!hasJsonLd) {
    warnings.push(`No JSON-LD structured data found in ${filePath}`);
  }
  
  return { errors, warnings };
}

// Main validation function
function validateSchemaInFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return { errors: [`File not found: ${filePath}`], warnings: [] };
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  return validateJSONLD(content, filePath);
}

// Validate all HTML files
function validateAllFiles() {
  const htmlFiles = ['index.html', 'aboutus.html', 'job-submission.html'];
  let totalErrors = 0;
  let totalWarnings = 0;
  
  console.log('🔍 Validating Schema.org structured data...\n');
  
  htmlFiles.forEach(file => {
    const { errors, warnings } = validateSchemaInFile(file);
    
    if (errors.length > 0) {
      console.log(`❌ Errors in ${file}:`);
      errors.forEach(error => console.log(`   • ${error}`));
      totalErrors += errors.length;
    }
    
    if (warnings.length > 0) {
      console.log(`⚠️  Warnings in ${file}:`);
      warnings.forEach(warning => console.log(`   • ${warning}`));
      totalWarnings += warnings.length;
    }
    
    if (errors.length === 0 && warnings.length === 0) {
      console.log(`✅ ${file} - No issues found`);
    }
    
    console.log('');
  });
  
  // Summary
  console.log('📊 Validation Summary:');
  console.log(`   Errors: ${totalErrors}`);
  console.log(`   Warnings: ${totalWarnings}`);
  
  if (totalErrors > 0) {
    console.log('\n❌ Schema validation failed!');
    process.exit(1);
  } else {
    console.log('\n✅ Schema validation passed!');
  }
}

// CLI interface
if (require.main === module) {
  const filePath = process.argv[2];
  
  if (filePath) {
    const { errors, warnings } = validateSchemaInFile(filePath);
    
    if (errors.length > 0) {
      console.error('❌ Schema validation errors:');
      errors.forEach(error => console.error(`   • ${error}`));
      process.exit(1);
    }
    
    if (warnings.length > 0) {
      console.warn('⚠️  Schema validation warnings:');
      warnings.forEach(warning => console.warn(`   • ${warning}`));
    }
    
    console.log('✅ Schema validation passed!');
  } else {
    validateAllFiles();
  }
}

module.exports = { validateSchemaInFile, validateAllFiles };