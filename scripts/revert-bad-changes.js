#!/usr/bin/env node

/**
 * Script to revert bad changes from previous script
 * Fixes incorrect syntax modifications
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

async function revertBadChanges() {
  console.log('🔧 Reverting incorrect syntax changes...\n');
  
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
    
    // Fix 1: Revert switch(variable: any) back to switch(variable)
    content = content.replace(/switch\s*\(([^:)]+):\s*any\s*\)/g, (match, variable) => {
      fixCount++;
      return `switch(${variable})`;
    });
    
    // Fix 2: Revert if(variable: any) back to if(variable)
    content = content.replace(/if\s*\(([^:)]+):\s*any\s*\)/g, (match, condition) => {
      fixCount++;
      return `if(${condition})`;
    });
    
    // Fix 3: Revert while(variable: any) back to while(variable)
    content = content.replace(/while\s*\(([^:)]+):\s*any\s*\)/g, (match, condition) => {
      fixCount++;
      return `while(${condition})`;
    });
    
    // Fix 4: Revert for(variable: any) back to for(variable)
    content = content.replace(/for\s*\(([^:)]+):\s*any\s*\)/g, (match, condition) => {
      fixCount++;
      return `for(${condition})`;
    });
    
    // Fix 5: Fix property access with incorrect colons
    // Like: SearchSuggestion.type should be SearchSuggestion['type']
    content = content.replace(/(\w+)\.type\b/g, (match, obj) => {
      // Only fix if it's accessing a property called 'type' on an interface/type
      if (obj.match(/^[A-Z]/) && content.includes(`interface ${obj}`) || content.includes(`type ${obj}`)) {
        fixCount++;
        return `${obj}['type']`;
      }
      return match;
    });
    
    // Fix 6: Fix incorrect analytics patterns
    content = content.replace(/if\(analytics:\s*any\)/g, () => {
      fixCount++;
      return 'if(analytics)';
    });
    
    content = content.replace(/if\((\w+):\s*any\)/g, (match, variable) => {
      fixCount++;
      return `if(${variable})`;
    });
    
    // Fix 7: Fix incorrect optional parameter syntax
    content = content.replace(/,\s*if\(([^)]+)\)/g, (match, condition) => {
      // This is likely meant to be a conditional check, not a parameter
      fixCount++;
      return `;\n    if(${condition})`;
    });
    
    // Write back if changed
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      filesFixed++;
      totalFixed += fixCount;
      console.log(`✅ Fixed ${fixCount} issue(s) in ${file}`);
    }
  }
  
  console.log('\n📊 Summary:');
  console.log(`   Files scanned: ${files.length}`);
  console.log(`   Files fixed: ${filesFixed}`);
  console.log(`   Total issues fixed: ${totalFixed}`);
  console.log('\n✨ Incorrect syntax reverted!');
}

// Run the script
revertBadChanges().catch(console.error);