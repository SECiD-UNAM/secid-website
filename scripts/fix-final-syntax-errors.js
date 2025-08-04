#!/usr/bin/env node

/**
 * Script to fix final syntax errors
 * Fixes corrupted strings and array literals
 */

import fs from 'fs';
import path from 'path';

const filesToFix = [
  { 
    file: 'src/lib/performance-monitor.ts',
    fixes: [
      { line: 95, find: "{ entryTypes: .largest-contentful-paint }", replace: "{ entryTypes: ['largest-contentful-paint'] }" },
      { line: 108, find: "{ entryTypes: .paint }", replace: "{ entryTypes: ['paint'] }" },
      { line: 152, find: "{ entryTypes: .first-input, .event }", replace: "{ entryTypes: ['first-input', 'event'] }" },
      { line: 207, find: "{ entryTypes: .layout-shift }", replace: "{ entryTypes: ['layout-shift'] }" },
      { line: 251, find: "{ entryTypes: .longtask }", replace: "{ entryTypes: ['longtask'] }" },
      { line: 272, find: "{ entryTypes: .navigation }", replace: "{ entryTypes: ['navigation'] }" }
    ]
  },
  {
    file: 'src/lib/session-manager.ts',
    fixes: [
      { line: 366, find: /document\[.removeEventListener.\]\('visibilitychange'/, replace: "document.removeEventListener('visibilitychange'" }
    ]
  },
  {
    file: 'src/lib/payments.ts',
    fixes: [
      { find: /customer\[.metadata.\]\.userId/, replace: "customer['metadata']?.userId" },
      { find: /payment_intent\[.metadata.\]/, replace: "payment_intent['metadata']" }
    ]
  },
  {
    file: 'src/lib/security-config.ts',
    fixes: [
      { find: /request\[.ip.\]/, replace: "request['ip']" }
    ]
  },
  {
    file: 'src/lib/stripe/stripe-webhooks.ts',
    fixes: [
      { find: /customer\[.email.\]/, replace: "customer['email']" },
      { find: /customer\[.name.\]/, replace: "customer['name']" }
    ]
  },
  {
    file: 'src/lib/validation/sanitization.ts',
    fixes: [
      { find: /\[.script.\]/, replace: "['script']" }
    ]
  },
  {
    file: 'src/lib/email-templates.ts',
    fixes: [
      { find: "path.split('').reduce", replace: "path.split('.').reduce" }
    ]
  },
  {
    file: 'src/lib/translations.ts',
    fixes: [
      { find: "const keys = path.split('');", replace: "const keys = path.split('.');" }
    ]
  }
];

async function fixSyntaxErrors() {
  console.log('🔧 Fixing final syntax errors...\n');
  
  let totalFixed = 0;
  
  for (const fileConfig of filesToFix) {
    const filePath = path.join(process.cwd(), fileConfig.file);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${fileConfig.file}`);
      continue;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    let fixCount = 0;
    
    for (const fix of fileConfig.fixes) {
      if (fix.line) {
        // Line-specific fix
        const lines = content.split('\n');
        if (lines[fix.line - 1] && lines[fix.line - 1].includes(fix.find)) {
          lines[fix.line - 1] = lines[fix.line - 1].replace(fix.find, fix.replace);
          content = lines.join('\n');
          fixCount++;
        }
      } else if (fix.find) {
        // Global fix
        const findPattern = typeof fix.find === 'string' ? fix.find : fix.find;
        const beforeLength = content.length;
        content = content.replace(new RegExp(findPattern, 'g'), fix.replace);
        if (content.length !== beforeLength) {
          fixCount++;
        }
      }
    }
    
    if (fixCount > 0) {
      fs.writeFileSync(filePath, content, 'utf8');
      totalFixed += fixCount;
      console.log(`✅ Fixed ${fixCount} issue(s) in ${fileConfig.file}`);
    } else {
      console.log(`ℹ️  No changes needed in ${fileConfig.file}`);
    }
  }
  
  console.log('\n📊 Summary:');
  console.log(`   Total issues fixed: ${totalFixed}`);
  console.log('\n✨ Final syntax errors fixed!');
}

// Run the script
fixSyntaxErrors().catch(console.error);