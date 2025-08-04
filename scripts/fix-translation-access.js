#!/usr/bin/env node

/**
 * Script to fix dynamic translation access patterns
 * Converts translations[lang] to type-safe access
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

async function fixTranslationAccess() {
  console.log('🔍 Scanning for dynamic translation access patterns...\n');
  
  // Find all TypeScript and TSX files
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
    
    // Pattern 1: translations[lang] or translations[language]
    const translationArrayAccess = /translations\[(lang|language|currentLang|selectedLang|userLang)\]/g;
    if (translationArrayAccess.test(content)) {
      content = content.replace(translationArrayAccess, (match, varName) => {
        fixCount++;
        return `getTranslation(${varName})`;
      });
    }
    
    // Pattern 2: translations[someVar] where someVar could be any variable
    const genericArrayAccess = /translations\[([a-zA-Z_$][a-zA-Z0-9_$]*)\]/g;
    if (genericArrayAccess.test(content)) {
      content = content.replace(genericArrayAccess, (match, varName) => {
        // Check if it's a known language variable pattern
        if (varName.toLowerCase().includes('lang') || 
            varName.toLowerCase().includes('locale')) {
          fixCount++;
          return `getTranslation(${varName} as Language)`;
        }
        return match; // Keep unchanged if not a language variable
      });
    }
    
    // Pattern 3: translations['es'] or translations["en"]
    const literalAccess = /translations\[['"]+(es|en)['"]+\]/g;
    if (literalAccess.test(content)) {
      content = content.replace(literalAccess, (match, lang) => {
        fixCount++;
        return `translations.${lang}`;
      });
    }
    
    // Pattern 4: Fix t[key] patterns in translation contexts
    const tKeyAccess = /\bt\[([a-zA-Z_$][a-zA-Z0-9_$]*)\]/g;
    const hasTranslationContext = content.includes('useTranslations') || 
                                  content.includes('getTranslations') ||
                                  content.includes('translations');
    
    if (hasTranslationContext && tKeyAccess.test(content)) {
      // Only in files that clearly use translations
      content = content.replace(tKeyAccess, (match, key) => {
        // Check if this looks like a translation key access
        if (content.includes(`const t = `) || content.includes(`const { t }`) || content.includes(`t.`)) {
          fixCount++;
          return `safeTranslationAccess(t, ${key})`;
        }
        return match;
      });
    }
    
    // Add imports if we made changes and they're needed
    if (fixCount > 0) {
      // Check if we need to add getTranslation import
      if (content.includes('getTranslation(') && !content.includes('import { getTranslation')) {
        const importRegex = /import .* from ['"]@\/lib\/translations['"]/;
        if (importRegex.test(content)) {
          // Add to existing import
          content = content.replace(importRegex, (match) => {
            if (!match.includes('getTranslation')) {
              return match.replace('import {', 'import { getTranslation,');
            }
            return match;
          });
        } else {
          // Add new import after other imports
          const lastImportMatch = content.match(/import .*;\n/g);
          if (lastImportMatch) {
            const lastImport = lastImportMatch[lastImportMatch.length - 1];
            const insertPos = content.indexOf(lastImport) + lastImport.length;
            content = content.slice(0, insertPos) + 
                     `import { getTranslation } from '@/lib/translations';\n` + 
                     content.slice(insertPos);
          }
        }
      }
      
      // Check if we need to add Language type import
      if (content.includes('as Language') && !content.includes('import type { Language')) {
        const importRegex = /import .* from ['"]@\/types['"]/;
        if (importRegex.test(content)) {
          // Check if Language is already imported
          if (!content.includes('Language')) {
            content = content.replace(/import type \{([^}]+)\} from ['"]@\/types['"]/, (match, types) => {
              return `import type { ${types}, Language } from '@/types'`;
            });
          }
        } else {
          // Add new import
          const lastImportMatch = content.match(/import .*;\n/g);
          if (lastImportMatch) {
            const lastImport = lastImportMatch[lastImportMatch.length - 1];
            const insertPos = content.indexOf(lastImport) + lastImport.length;
            content = content.slice(0, insertPos) + 
                     `import type { Language } from '@/types';\n` + 
                     content.slice(insertPos);
          }
        }
      }
      
      // Check if we need safeTranslationAccess
      if (content.includes('safeTranslationAccess(') && !content.includes('import { safeTranslationAccess')) {
        const importRegex = /import .* from ['"]@\/lib\/translations['"]/;
        if (importRegex.test(content)) {
          // Add to existing import
          content = content.replace(importRegex, (match) => {
            if (!match.includes('safeTranslationAccess')) {
              return match.replace('import {', 'import { safeTranslationAccess,');
            }
            return match;
          });
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
  console.log('\n✨ Translation access patterns fixed!');
}

// Run the script
fixTranslationAccess().catch(console.error);