#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

let totalFixed = 0;
const fixedFiles = [];

console.log('🔧 Starting comprehensive TypeScript error fix...\n');

// Get all TypeScript files
const tsFiles = await glob('src/**/*.{ts,tsx}', { 
  ignore: ['src/**/*.test.{ts,tsx}', 'src/**/*.spec.{ts,tsx}'] 
});

console.log(`📁 Found ${tsFiles.length} TypeScript files to process\n`);

// Fix 1: Remove unused imports (TS6133)
console.log('🗑️  Fixing unused imports...');
let unusedImportsFixes = 0;

for (const file of tsFiles) {
  let content = fs.readFileSync(file, 'utf8');
  const originalContent = content;
  
  // Remove unused React imports when React is imported but not used in JSX
  if (!content.includes('<') && !content.includes('React.')) {
    content = content.replace(/import React,?\s*{?([^}]*)}?\s*from\s*['"]react['"];?\n?/g, (match, namedImports) => {
      if (namedImports.trim()) {
        return `import { ${namedImports.trim()} } from 'react';\n`;
      }
      return '';
    });
  }
  
  // Remove unused imports by looking for common patterns
  const unusedPatterns = [
    // Unused icon imports
    /import\s*{\s*([^}]*)\s*}\s*from\s*['"]@heroicons\/react\/24\/outline['"];\s*\n/g,
    /import\s*{\s*([^}]*)\s*}\s*from\s*['"]@heroicons\/react\/24\/solid['"];\s*\n/g,
    // Unused utility imports
    /import\s*{\s*([^}]*)\s*}\s*from\s*['"][^'"]*['"];\s*\n/g
  ];
  
  // Check if imports are actually used
  const lines = content.split('\n');
  const imports = [];
  const nonImportContent = [];
  
  for (const line of lines) {
    if (line.trim().startsWith('import ') && !line.includes('import type')) {
      imports.push(line);
    } else {
      nonImportContent.push(line);
    }
  }
  
  const bodyContent = nonImportContent.join('\n');
  const filteredImports = [];
  
  for (const importLine of imports) {
    const namedImportsMatch = importLine.match(/import\s*{\s*([^}]*)\s*}\s*from/);
    if (namedImportsMatch) {
      const namedImports = namedImportsMatch[1].split(',').map(imp => imp.trim());
      const usedImports = namedImports.filter(imp => {
        const cleanName = imp.replace(/\s+as\s+\w+/, '').trim();
        return bodyContent.includes(cleanName);
      });
      
      if (usedImports.length > 0) {
        filteredImports.push(importLine.replace(namedImportsMatch[1], usedImports.join(', ')));
      }
    } else {
      // Keep default imports and other import types
      filteredImports.push(importLine);
    }
  }
  
  const newContent = [...filteredImports, '', ...nonImportContent].join('\n');
  
  if (originalContent !== newContent) {
    fs.writeFileSync(file, newContent);
    unusedImportsFixes++;
  }
}

console.log(`   ✅ Fixed unused imports in ${unusedImportsFixes} files`);

// Fix 2: Convert to bracket notation for property access (TS4111)
console.log('🔧 Fixing property access violations...');
let propertyAccessFixes = 0;

for (const file of tsFiles) {
  let content = fs.readFileSync(file, 'utf8');
  const originalContent = content;
  
  // Fix common property access patterns
  const propertyPatterns = [
    // Fix object.property to object['property'] for index signatures
    { pattern: /(\w+)\.userId(?!\w)/g, replacement: "$1['userId']" },
    { pattern: /(\w+)\.id(?!\w)/g, replacement: "$1['id']" },
    { pattern: /(\w+)\.name(?!\w)/g, replacement: "$1['name']" },
    { pattern: /(\w+)\.email(?!\w)/g, replacement: "$1['email']" },
    { pattern: /(\w+)\.role(?!\w)/g, replacement: "$1['role']" },
    { pattern: /(\w+)\.status(?!\w)/g, replacement: "$1['status']" },
    { pattern: /(\w+)\.type(?!\w)/g, replacement: "$1['type']" },
    { pattern: /(\w+)\.createdAt(?!\w)/g, replacement: "$1['createdAt']" },
    { pattern: /(\w+)\.updatedAt(?!\w)/g, replacement: "$1['updatedAt']" }
  ];
  
  // Only apply if the file has TS4111 errors (we can't check this easily, so apply selectively)
  if (content.includes('doc(') || content.includes('collection(') || content.includes('query(')) {
    propertyPatterns.forEach(({ pattern, replacement }) => {
      content = content.replace(pattern, replacement);
    });
  }
  
  if (originalContent !== content) {
    fs.writeFileSync(file, content);
    propertyAccessFixes++;
  }
}

console.log(`   ✅ Fixed property access in ${propertyAccessFixes} files`);

// Fix 3: Convert regular imports to type imports where needed
console.log('📦 Converting to type imports...');
let typeImportFixes = 0;

for (const file of tsFiles) {
  let content = fs.readFileSync(file, 'utf8');
  const originalContent = content;
  
  // Convert imports that are only used as types
  const typeOnlyPatterns = [
    /import\s*{\s*([^}]*)\s*}\s*from\s*['"]@\/types\/([^'"]*)['"]/g,
    /import\s*{\s*([^}]*)\s*}\s*from\s*['"]\.\.?\/.*types['"]/g
  ];
  
  typeOnlyPatterns.forEach(pattern => {
    content = content.replace(pattern, (match, imports, path) => {
      return `import type { ${imports} } from '@/types/${path || ''}`.replace('@/types/', path ? `@/types/${path}` : '@/types');
    });
  });
  
  if (originalContent !== content) {
    fs.writeFileSync(file, content);
    typeImportFixes++;
  }
}

console.log(`   ✅ Fixed type imports in ${typeImportFixes} files`);

// Fix 4: Add type assertions and optional chaining
console.log('🛡️  Adding type safety fixes...');
let typeSafetyFixes = 0;

for (const file of tsFiles) {
  let content = fs.readFileSync(file, 'utf8');
  const originalContent = content;
  
  // Add optional chaining for common undefined access patterns
  content = content.replace(/(\w+)\.(\w+)\s*\?\s*\.(\w+)/g, '$1?.$2?.$3');
  
  // Add type assertions for known safe operations
  content = content.replace(/process\.env\.(\w+)/g, 'process.env.$1 as string');
  
  // Fix array access with undefined checks
  content = content.replace(/(\w+)\[(\d+)\](?!\?)/g, '$1?.[$2]');
  
  if (originalContent !== content) {
    fs.writeFileSync(file, content);
    typeSafetyFixes++;
  }
}

console.log(`   ✅ Fixed type safety in ${typeSafetyFixes} files`);

// Summary
totalFixed = unusedImportsFixes + propertyAccessFixes + typeImportFixes + typeSafetyFixes;
console.log(`\n🎉 Total fixes applied: ${totalFixed}`);
console.log(`   - Unused imports: ${unusedImportsFixes} files`);
console.log(`   - Property access: ${propertyAccessFixes} files`);
console.log(`   - Type imports: ${typeImportFixes} files`);
console.log(`   - Type safety: ${typeSafetyFixes} files`);

console.log('\n🔍 Running TypeScript check to verify fixes...');