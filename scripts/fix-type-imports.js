#!/usr/bin/env node

/**
 * Script to automatically fix TypeScript type-only imports
 * Converts `import { Type }` to `import type { Type }` where appropriate
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Patterns to identify type-only imports
const typePatterns = [
  // Common type/interface names
  /import\s+\{([^}]*(?:Type|Interface|Props|Options|Config|Schema|Model|Data|State|Context|Params|Response|Request|Payload)[^}]*)\}\s+from/g,
  // Imports from type files
  /import\s+\{([^}]+)\}\s+from\s+['"]\.\.?\/types\//g,
  // Known type imports
  /import\s+\{([^}]*(?:UserProfile|MemberProfile|AdminUser|ForumTopic|JobPosting|Event)[^}]*)\}\s+from/g,
];

// Files to process
const filePatterns = [
  'src/**/*.ts',
  'src/**/*.tsx',
  '!src/**/*.test.ts',
  '!src/**/*.test.tsx',
  '!src/**/*.spec.ts',
  '!src/**/*.spec.tsx',
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  let changes = [];

  // Check each import statement
  const importRegex = /import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g;
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    const imports = match[1];
    const source = match[2];
    const fullImport = match[0];

    // Check if this is likely a type-only import
    let isTypeOnly = false;

    // Check if importing from a types directory
    if (source.includes('/types/') || source.endsWith('.types')) {
      isTypeOnly = true;
    }

    // Check if all imports are type-like names
    const importNames = imports.split(',').map(i => i.trim());
    const allTypeLike = importNames.every(name => {
      // Remove 'as' aliases
      const baseName = name.split(/\s+as\s+/)[0].trim();
      return /^[A-Z]/.test(baseName) && // Starts with capital
             !['React', 'Component', 'Fragment'].includes(baseName); // Not React exports
    });

    if (allTypeLike && source.startsWith('.')) {
      // Check if the source file exists and contains only type exports
      const sourcePath = path.resolve(path.dirname(filePath), source);
      if (sourcePath.includes('/types/') || sourcePath.includes('/interfaces/')) {
        isTypeOnly = true;
      }
    }

    // Convert to type-only import if needed
    if (isTypeOnly && !fullImport.includes('import type')) {
      const newImport = fullImport.replace('import {', 'import type {');
      content = content.replace(fullImport, newImport);
      modified = true;
      changes.push(`  ${fullImport} → ${newImport}`);
    }
  }

  // Also fix mixed imports (both types and values)
  const mixedImportRegex = /import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g;
  content = content.replace(mixedImportRegex, (match, imports, source) => {
    if (match.includes('import type')) return match;

    const importList = imports.split(',').map(i => i.trim());
    const types = [];
    const values = [];

    importList.forEach(imp => {
      const baseName = imp.split(/\s+as\s+/)[0].trim();
      
      // Heuristic: uppercase first letter and certain patterns indicate types
      if (/^[A-Z]/.test(baseName) && 
          !['React', 'Component', 'Fragment', 'useState', 'useEffect'].includes(baseName) &&
          (baseName.endsWith('Type') || 
           baseName.endsWith('Interface') || 
           baseName.endsWith('Props') ||
           baseName.includes('Config') ||
           source.includes('/types/'))) {
        types.push(imp);
      } else {
        values.push(imp);
      }
    });

    // If we have both types and values, split into two imports
    if (types.length > 0 && values.length > 0) {
      const result = [];
      if (values.length > 0) {
        result.push(`import { ${values.join(', ')} } from '${source}'`);
      }
      if (types.length > 0) {
        result.push(`import type { ${types.join(', ')} } from '${source}'`);
      }
      if (result.length === 2) {
        modified = true;
        changes.push(`  Split mixed import from '${source}'`);
      }
      return result.join(';\n');
    }

    return match;
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
  console.log('🔍 Scanning for type-only imports to fix...\n');

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
  console.log('\n✨ Type imports fixed!');
}

// Run the script
main();