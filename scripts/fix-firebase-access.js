#!/usr/bin/env node

/**
 * Script to fix Firebase document property access patterns
 * Converts dot notation to bracket notation for index signature properties
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Patterns to identify Firebase document access
const firebasePatterns = [
  // Common Firebase document variables
  /\b(data|doc|document|snapshot|invoice|metadata|subscription|payment|user|profile|member|job|event|forum)\./g,
  // Specific Firebase access patterns
  /\b(doc\.data\(\))\./g,
  /\b(snapshot\.data\(\))\./g,
];

// Properties that commonly come from index signatures
const indexProperties = [
  'timestamp', 'type', 'userId', 'userEmail', 'metadata', 'description',
  'customer_rfc', 'billing_address', 'items', 'subtotal', 'iva', 'total',
  'planId', 'billingCycle', 'commissionType', 'current_period_end',
  'NODE_ENV', 'status', 'createdAt', 'updatedAt', 'name', 'email',
  'role', 'permissions', 'settings', 'preferences', 'data', 'error',
  'message', 'code', 'details', 'result', 'response', 'request'
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  const changes = [];

  // Fix property access from index signatures
  indexProperties.forEach(prop => {
    // Pattern: object.property -> object['property']
    const dotPattern = new RegExp(`([a-zA-Z_$][a-zA-Z0-9_$]*)\\.${prop}\\b`, 'g');
    
    content = content.replace(dotPattern, (match, obj) => {
      // Skip if it's a type declaration or import
      if (obj === 'import' || obj === 'export' || obj === 'type' || obj === 'interface') {
        return match;
      }
      
      // Skip if it's part of a longer property chain that's already fixed
      if (match.includes("['") || match.includes('["')) {
        return match;
      }

      // Skip common non-Firebase objects
      if (['console', 'process', 'window', 'document', 'Math', 'Date', 'Array', 'Object', 'String', 'Number'].includes(obj)) {
        return match;
      }

      modified = true;
      const replacement = `${obj}['${prop}']`;
      changes.push(`  ${match} → ${replacement}`);
      return replacement;
    });
  });

  // Fix nested property access: data.metadata.something -> data['metadata']['something']
  const nestedPattern = /([a-zA-Z_$][a-zA-Z0-9_$]*)\.([a-zA-Z_$][a-zA-Z0-9_$]*?)\.([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
  
  content = content.replace(nestedPattern, (match, obj, prop1, prop2) => {
    if (indexProperties.includes(prop1) || indexProperties.includes(prop2)) {
      // Skip if already using bracket notation
      if (match.includes("['") || match.includes('["')) {
        return match;
      }
      
      // Skip common non-Firebase objects
      if (['console', 'process', 'window', 'document'].includes(obj)) {
        return match;
      }

      modified = true;
      let replacement = obj;
      
      if (indexProperties.includes(prop1)) {
        replacement += `['${prop1}']`;
      } else {
        replacement += `.${prop1}`;
      }
      
      if (indexProperties.includes(prop2)) {
        replacement += `['${prop2}']`;
      } else {
        replacement += `.${prop2}`;
      }
      
      if (replacement !== match) {
        changes.push(`  ${match} → ${replacement}`);
      }
      return replacement;
    }
    return match;
  });

  // Fix specific Firebase patterns
  const firebaseAccessPattern = /\b(data|doc|document|snapshot|invoice|metadata|subscription|payment)\.([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
  
  content = content.replace(firebaseAccessPattern, (match, obj, prop) => {
    // Skip if already using bracket notation
    if (match.includes("['") || match.includes('["')) {
      return match;
    }
    
    // Always use bracket notation for Firebase document access
    modified = true;
    const replacement = `${obj}['${prop}']`;
    changes.push(`  ${match} → ${replacement}`);
    return replacement;
  });

  // Fix process.env access
  content = content.replace(/process\.env\.([A-Z_]+)/g, (match, envVar) => {
    modified = true;
    const replacement = `process.env['${envVar}']`;
    changes.push(`  ${match} → ${replacement}`);
    return replacement;
  });

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Fixed ${filePath}`);
    changes.forEach(change => console.log(change));
    return 1;
  }

  return 0;
}

async function main() {
  console.log('🔍 Scanning for Firebase property access patterns to fix...\n');

  const filePatterns = [
    'src/**/*.ts',
    'src/**/*.tsx',
    '!src/**/*.test.ts',
    '!src/**/*.test.tsx',
    '!src/**/*.spec.ts',
    '!src/**/*.spec.tsx',
  ];

  let totalFixed = 0;
  let totalFiles = 0;

  for (const pattern of filePatterns) {
    const files = await glob(pattern, { 
      ignore: ['**/node_modules/**', '**/dist/**', '**/.next/**']
    });

    for (const file of files) {
      totalFiles++;
      totalFixed += processFile(file);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Files scanned: ${totalFiles}`);
  console.log(`   Files fixed: ${totalFixed}`);
  console.log('\n✨ Firebase property access patterns fixed!');
}

// Run the script
main().catch(console.error);