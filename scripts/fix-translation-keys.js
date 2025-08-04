#!/usr/bin/env node

/**
 * Script to fix translation key patterns
 * Converts bracket notation in translation keys to dot notation
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

async function fixTranslationKeys() {
  console.log('🔍 Scanning for incorrect translation key patterns...\n');
  
  // Find all TypeScript and TSX files
  const files = await glob('src/**/*.{ts,tsx}', {
    ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'],
    cwd: process.cwd()
  });
  
  let totalFixed = 0;
  let filesFixed = 0;
  
  for (const file of files) {
    const filePath = path.join(process.cwd(), file);
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    let fixCount = 0;
    
    // Pattern 1: Fix t('key['subkey']) to t('key.subkey')
    // Matches: t('notifications['settings'].title')
    const tFunctionBrackets = /t\(['"]([^'"]*)\[['"]([^'"]*)['"]\]([^'"]*)['"]\)/g;
    content = content.replace(tFunctionBrackets, (match, prefix, key, suffix) => {
      fixCount++;
      // Remove brackets and quotes, use dot notation
      const cleanPrefix = prefix.replace(/\['|'\]/g, '.');
      const cleanSuffix = suffix.replace(/\['|'\]|\./g, '').replace(/^\./, '');
      if (cleanSuffix) {
        return `t('${cleanPrefix}${key}.${cleanSuffix}')`;
      }
      return `t('${cleanPrefix}${key}')`;
    });
    
    // Pattern 2: Fix nested bracket notation in t() calls
    // Matches: t('notifications['settings']['description']')
    const nestedBracketsInT = /t\(['"]([^'"]*)\['([^']+)'\](?:\??\.)?\['([^']+)'\]['"]\)/g;
    content = content.replace(nestedBracketsInT, (match, prefix, key1, key2) => {
      fixCount++;
      const cleanPrefix = prefix.replace(/\[|\]/g, '');
      return `t('${cleanPrefix ? cleanPrefix + '.' : ''}${key1}.${key2}')`;
    });
    
    // Pattern 3: Simple bracket to dot notation in t() calls
    // Matches: t('object['property']')
    const simpleBracketInT = /t\(['"](\w+)\['(\w+)'\]['"]\)/g;
    content = content.replace(simpleBracketInT, (match, obj, prop) => {
      fixCount++;
      return `t('${obj}.${prop}')`;
    });
    
    // Pattern 4: Fix any remaining bracket notation with optional chaining
    // Matches: t('something['key']?.['other']')
    const optionalChainingInT = /t\(['"]([^'"]*)\??\.\[['"]([^'"]+)['"]\]['"]\)/g;
    content = content.replace(optionalChainingInT, (match, prefix, key) => {
      fixCount++;
      const cleanPrefix = prefix.replace(/\['|'\]|\??\./g, '.').replace(/\.+/g, '.').replace(/\.$/, '');
      return `t('${cleanPrefix}.${key}')`;
    });
    
    // Pattern 5: Clean up any double dots that might have been created
    content = content.replace(/t\(['"]([^'"]*?)\.{2,}([^'"]*?)['"]\)/g, (match, prefix, suffix) => {
      fixCount++;
      return `t('${prefix}.${suffix}')`;
    });
    
    // Pattern 6: Fix t.key['subkey'] patterns (outside of function calls)
    const tDotBracket = /\bt\.(\w+)\['(\w+)'\]/g;
    content = content.replace(tDotBracket, (match, key1, key2) => {
      fixCount++;
      return `t.${key1}.${key2}`;
    });
    
    // Write back if changed
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      filesFixed++;
      totalFixed += fixCount;
      console.log(`✅ Fixed ${fixCount} pattern(s) in ${file}`);
    }
  }
  
  console.log('\n📊 Summary:');
  console.log(`   Files scanned: ${files.length}`);
  console.log(`   Files fixed: ${filesFixed}`);
  console.log(`   Total patterns fixed: ${totalFixed}`);
  console.log('\n✨ Translation key patterns fixed!');
}

// Run the script
fixTranslationKeys().catch(console.error);