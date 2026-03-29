#!/usr/bin/env node

/**
 * Script to check if the specific TypeScript syntax errors are resolved
 * Focus on TS1005 (comma expected) and TS1109 (Expression expected) errors
 */

import { execSync } from 'child_process';

console.log('🔍 Checking for TypeScript syntax errors...\n');

try {
  // Run TypeScript compiler and capture output
  const output = execSync('npx tsc --noEmit', {
    encoding: 'utf8',
    stdio: 'pipe',
  });

  console.log('✅ No TypeScript errors found!');
} catch (error) {
  const output = error.stdout || error.stderr || '';

  // Count specific syntax errors that were originally reported
  const ts1005Errors = (output.match(/error TS1005:/g) || []).length;
  const ts1109Errors = (output.match(/error TS1109:/g) || []).length;
  const totalSyntaxErrors = ts1005Errors + ts1109Errors;

  // Count all errors
  const allErrors = (output.match(/error TS\d+:/g) || []).length;

  console.log(`📊 TypeScript Error Summary:`);
  console.log(`   • TS1005 (comma expected): ${ts1005Errors}`);
  console.log(`   • TS1109 (expression expected): ${ts1109Errors}`);
  console.log(`   • Total syntax errors: ${totalSyntaxErrors}`);
  console.log(`   • Total all errors: ${allErrors}\n`);

  if (totalSyntaxErrors === 0) {
    console.log('✅ SUCCESS: All original syntax errors have been fixed!');
    console.log(`ℹ️  ${allErrors} other errors remain (not syntax errors)`);
  } else {
    console.log('❌ FAILURE: Some syntax errors still remain');

    // Show remaining syntax errors
    const syntaxErrorLines = output
      .split('\n')
      .filter(
        (line) =>
          line.includes('error TS1005:') || line.includes('error TS1109:')
      );

    console.log('\n🔍 Remaining syntax errors:');
    syntaxErrorLines.forEach((line) => console.log(`   ${line}`));
  }
}
