#!/usr/bin/env node

/**
 * Script to fix remaining bracket notation issues
 * Specifically targets notification settings and other complex patterns
 */

import fs from 'fs';
import path from 'path';

// Files with bracket notation issues from the error report
const targetFiles = [
  'src/components/analytics/AnalyticsDashboard.tsx',
  'src/components/assessment/AssessmentHistory.tsx',
  'src/components/assessment/AssessmentHub.tsx',
  'src/components/assessment/QuizEngine.tsx',
  'src/components/commissions/NLPDashboard.tsx',
  'src/components/notifications/NotificationCenter.tsx',
  'src/components/notifications/NotificationSettings.tsx'
];

function fixBracketNotation(content) {
  let fixed = content;
  let changeCount = 0;
  
  // Pattern 1: settings['section']['key'] => settings['section']?.['key']
  const nestedBrackets = /(\w+)\['([^']+)'\]\['([^']+)'\]/g;
  fixed = fixed.replace(nestedBrackets, (match, obj, key1, key2) => {
    changeCount++;
    return `${obj}['${key1}']?.['${key2}']`;
  });
  
  // Pattern 2: object['key1']['key2'] without optional chaining
  const chainedAccess = /(\w+)(\['[^']+'\]){2,}/g;
  fixed = fixed.replace(chainedAccess, (match) => {
    // Add ?. between bracket accesses if not present
    if (!match.includes('?.')) {
      changeCount++;
      return match.replace(/\]\[/g, ']?.[');
    }
    return match;
  });
  
  // Pattern 3: Fix specific notification settings patterns
  // notifications['channels']['email'] => notifications.channels?.email
  const notificationPattern = /(notifications|settings|preferences)\['(\w+)'\]\['(\w+)'\]/g;
  fixed = fixed.replace(notificationPattern, (match, obj, prop1, prop2) => {
    changeCount++;
    // Use dot notation with optional chaining for known safe properties
    return `${obj}.${prop1}?.${prop2}`;
  });
  
  // Pattern 4: Fix array index access after bracket notation
  // data['items'][0] => data['items']?.[0]
  const arrayIndexPattern = /(\w+)\['([^']+)'\]\[(\d+)\]/g;
  fixed = fixed.replace(arrayIndexPattern, (match, obj, key, index) => {
    changeCount++;
    return `${obj}['${key}']?.[${index}]`;
  });
  
  // Pattern 5: Fix computed property patterns
  // obj[key][subkey] => obj[key]?.[subkey]
  const computedPattern = /(\w+)\[(\w+)\]\[(\w+)\]/g;
  fixed = fixed.replace(computedPattern, (match, obj, key1, key2) => {
    // Don't modify if it's already safe
    if (match.includes('?.')) return match;
    changeCount++;
    return `${obj}[${key1}]?.[${key2}]`;
  });
  
  // Pattern 6: Fix template literal bracket access
  const templatePattern = /\[`([^`]+)`\]\[`([^`]+)`\]/g;
  fixed = fixed.replace(templatePattern, (match, key1, key2) => {
    changeCount++;
    return `[\`${key1}\`]?.[\`${key2}\`]`;
  });
  
  // Pattern 7: Fix specific assessment patterns
  // history['attempts']['total'] => history.attempts?.total
  const historyPattern = /(history|assessment|result)\['(\w+)'\]\['(\w+)'\]/g;
  fixed = fixed.replace(historyPattern, (match, obj, prop1, prop2) => {
    changeCount++;
    return `${obj}.${prop1}?.${prop2}`;
  });
  
  return { fixed, changeCount };
}

async function processFiles() {
  console.log('🔍 Processing files with bracket notation issues...\n');
  
  let totalFixed = 0;
  let filesFixed = 0;
  
  for (const relativePath of targetFiles) {
    const filePath = path.join(process.cwd(), relativePath);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${relativePath}`);
      continue;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const { fixed, changeCount } = fixBracketNotation(content);
    
    if (changeCount > 0) {
      fs.writeFileSync(filePath, fixed, 'utf8');
      filesFixed++;
      totalFixed += changeCount;
      console.log(`✅ Fixed ${changeCount} pattern(s) in ${relativePath}`);
    } else {
      console.log(`ℹ️  No changes needed in ${relativePath}`);
    }
  }
  
  console.log('\n📊 Summary:');
  console.log(`   Files processed: ${targetFiles.length}`);
  console.log(`   Files fixed: ${filesFixed}`);
  console.log(`   Total patterns fixed: ${totalFixed}`);
  console.log('\n✨ Remaining bracket notation patterns fixed!');
}

// Run the script
processFiles().catch(console.error);