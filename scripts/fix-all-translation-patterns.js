#!/usr/bin/env node

/**
 * Comprehensive script to fix ALL translation pattern issues
 * Handles both simple and complex bracket notation in translation keys
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

async function fixAllTranslationPatterns() {
  console.log('🔍 Scanning for ALL translation pattern issues...\n');
  
  // Find all TypeScript, TSX, and Astro files
  const files = await glob('src/**/*.{ts,tsx,astro}', {
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
    
    // Pattern 1: t('key['subkey']', fallback) => t('key.subkey', fallback)
    // Handles cases with fallback values
    content = content.replace(/t\((['"])([^'"]*)\[(['"])([^'"]+)\3\]([^'"]*)\1([^)]*)\)/g, 
      (match, quote1, prefix, quote2, key, suffix, rest) => {
        fixCount++;
        const cleanPrefix = prefix.replace(/\[['"]|['"]\]/g, '.');
        const cleanSuffix = suffix.replace(/\[['"]|['"]\]/g, '.').replace(/^\./, '');
        const fullKey = cleanPrefix + key + (cleanSuffix ? '.' + cleanSuffix : '');
        return `t(${quote1}${fullKey}${quote1}${rest})`;
      }
    );
    
    // Pattern 2: t.key['subkey'] => t.key.subkey (outside function calls)
    content = content.replace(/\bt\.([a-zA-Z_]\w*)\[(['"])([^'"]+)\2\]/g, (match, key1, quote, key2) => {
      fixCount++;
      return `t.${key1}.${key2}`;
    });
    
    // Pattern 3: translations['lang']['section'] => getTranslation(lang).section
    content = content.replace(/translations\[(['"])?(en|es)\1?\]\[(['"])([^'"]+)\3\]/g, 
      (match, q1, lang, q2, section) => {
        fixCount++;
        return `getTranslation('${lang}').${section}`;
      }
    );
    
    // Pattern 4: t('section.key['subkey']') => t('section.key.subkey')
    content = content.replace(/t\((['"])([^'"]*?)\.([^'"]*?)\[(['"])([^'"]+)\4\]([^'"]*?)\1\)/g,
      (match, quote, prefix, middle, innerQuote, key, suffix) => {
        fixCount++;
        const result = `t(${quote}${prefix}.${middle}.${key}${suffix}${quote})`;
        return result;
      }
    );
    
    // Pattern 5: Clean up any double dots or leading/trailing dots
    content = content.replace(/t\((['"])([^'"]*?)\1/g, (match, quote, key) => {
      const cleanedKey = key
        .replace(/\.{2,}/g, '.')  // Remove double dots
        .replace(/^\./, '')        // Remove leading dot
        .replace(/\.$/, '');       // Remove trailing dot
      
      if (cleanedKey !== key) {
        fixCount++;
        return `t(${quote}${cleanedKey}${quote}`;
      }
      return match;
    });
    
    // Pattern 6: Fix any remaining bracket notation in strings
    // Like: 'notifications['type'].something' => 'notifications.type.something'
    content = content.replace(/(['"])([^'"]*?)\[(['"])([^'"]+)\3\]([^'"]*?)\1/g,
      (match, outerQuote, prefix, innerQuote, key, suffix) => {
        // Only fix if it looks like a translation key (contains dots or known prefixes)
        if (prefix.includes('.') || prefix.startsWith('notifications') || 
            prefix.startsWith('admin') || prefix.startsWith('forum') ||
            prefix.startsWith('analytics') || prefix.startsWith('assessment')) {
          fixCount++;
          return `${outerQuote}${prefix}.${key}${suffix}${outerQuote}`;
        }
        return match;
      }
    );
    
    // Pattern 7: Add missing imports if needed
    if (fixCount > 0 && content.includes('getTranslation(')) {
      if (!content.includes('import { getTranslation')) {
        // Check if we already have a translations import
        const hasTranslationsImport = /import .* from ['"]@\/lib\/translations['"]/.test(content);
        
        if (!hasTranslationsImport) {
          // Add the import after other imports
          const lastImportMatch = content.match(/^import .*;\n/gm);
          if (lastImportMatch) {
            const lastImport = lastImportMatch[lastImportMatch.length - 1];
            const insertPos = content.indexOf(lastImport) + lastImport.length;
            content = content.slice(0, insertPos) + 
                     `import { getTranslation } from '@/lib/translations';\n` + 
                     content.slice(insertPos);
            fixCount++;
          }
        }
      }
    }
    
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
  console.log('\n✨ All translation patterns fixed!');
}

// Run the script
fixAllTranslationPatterns().catch(console.error);