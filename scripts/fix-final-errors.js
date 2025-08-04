#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

let totalFixed = 0;
const fixedFiles = [];

// Fix 1: Add missing import statement in MemberDirectory.tsx
const memberDirPath = path.join(__dirname, '../src/components/directory/MemberDirectory.tsx');
if (fs.existsSync(memberDirPath)) {
  let content = fs.readFileSync(memberDirPath, 'utf8');
  
  // Add missing import { before MemberProfile
  content = content.replace(
    /import React, { useState, useEffect, useMemo } from 'react';\nimport { useAuth } from '@\/contexts\/AuthContext';\n  MemberProfile,/,
    `import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type {
  MemberProfile,`
  );
  
  fs.writeFileSync(memberDirPath, content);
  fixedFiles.push('src/components/directory/MemberDirectory.tsx');
  totalFixed++;
}

// Fix 2: Add missing import statement in SubscriptionManager.tsx
const subManagerPath = path.join(__dirname, '../src/components/payments/SubscriptionManager.tsx');
if (fs.existsSync(subManagerPath)) {
  let content = fs.readFileSync(subManagerPath, 'utf8');
  
  // Add missing import type { before UserSubscription
  content = content.replace(
    /import React, { useState, useEffect } from 'react';\nimport { useTranslations } from '..\/..\/hooks\/useTranslations';\n  UserSubscription,/,
    `import React, { useState, useEffect } from 'react';
import { useTranslations } from '../../hooks/useTranslations';
import type {
  UserSubscription,`
  );
  
  fs.writeFileSync(subManagerPath, content);
  fixedFiles.push('src/components/payments/SubscriptionManager.tsx');
  totalFixed++;
}

// Fix 3: Fix invalid property access syntax in messaging.ts
const messagingPath = path.join(__dirname, '../src/lib/messaging.ts');
if (fs.existsSync(messagingPath)) {
  let content = fs.readFileSync(messagingPath, 'utf8');
  
  // Fix all instances of 'metadata['property']' to use proper dot notation
  const propertyAccessPatterns = [
    { pattern: /'metadata\['unreadCount'\]'/, replacement: 'metadata: { unreadCount' },
    { pattern: /'metadata\['readBy'\]'/, replacement: 'metadata: { readBy' },
    { pattern: /'metadata\['deletedBy'\]'/, replacement: 'metadata: { deletedBy' },
    { pattern: /'metadata\['archivedBy'\]'/, replacement: 'metadata: { archivedBy' },
    { pattern: /'metadata\['participants'\]'/, replacement: 'metadata: { participants' },
    { pattern: /'metadata\['lastMessage'\]'/, replacement: 'metadata: { lastMessage' },
    { pattern: /'metadata\['typingUsers'\]'/, replacement: 'metadata: { typingUsers' }
  ];
  
  let fixCount = 0;
  propertyAccessPatterns.forEach(({ pattern, replacement }) => {
    if (pattern.test(content)) {
      content = content.replace(pattern, replacement);
      fixCount++;
    }
  });
  
  // Fix the specific bracket notation issues in updateDoc calls
  // Example: 'metadata['unreadCount']': { ... } should be metadata: { unreadCount: { ... } }
  content = content.replace(
    /'metadata\[['"]unreadCount['"]\]': {/g,
    'metadata: { unreadCount: {'
  );
  
  content = content.replace(
    /'metadata\[['"]readBy['"]\]': {/g,
    'metadata: { readBy: {'
  );
  
  content = content.replace(
    /'metadata\[['"]deletedBy['"]\]': {/g,
    'metadata: { deletedBy: {'
  );
  
  content = content.replace(
    /'metadata\[['"]archivedBy['"]\]': {/g,
    'metadata: { archivedBy: {'
  );
  
  content = content.replace(
    /'metadata\[['"]participants['"]\]': arrayUnion/g,
    'metadata: { participants: arrayUnion'
  );
  
  content = content.replace(
    /'metadata\[['"]lastMessage['"]\]': {/g,
    'metadata: { lastMessage: {'
  );
  
  content = content.replace(
    /'metadata\[['"]typingUsers['"]\]': arrayUnion/g,
    'metadata: { typingUsers: arrayUnion'
  );
  
  // Fix closing brackets for nested metadata objects
  // After the above replacements, we need to add closing } for metadata objects
  // This is complex, so let's be more specific about the updateDoc patterns
  
  // Let me re-read the file to understand the exact pattern
  const lines = content.split('\n');
  const newLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // Fix the specific pattern where we have quoted property access
    if (line.includes("'metadata['") || line.includes('"metadata["')) {
      line = line.replace(/'metadata\['(\w+)'\]':/g, 'metadata: { $1:');
      line = line.replace(/"metadata\['(\w+)'\]":/g, 'metadata: { $1:');
      line = line.replace(/'metadata\["(\w+)"\]':/g, 'metadata: { $1:');
      line = line.replace(/"metadata\["(\w+)"\]":/g, 'metadata: { $1:');
      
      // Need to add closing } at the right place
      // Check if this is part of an updateDoc call
      if (lines[i-1] && lines[i-1].includes('updateDoc(')) {
        // Find the corresponding closing line
        let j = i + 1;
        let braceCount = 1;
        while (j < lines.length && braceCount > 0) {
          if (lines[j].includes('{')) braceCount++;
          if (lines[j].includes('}')) braceCount--;
          if (braceCount === 0 && !lines[j].includes('}}')) {
            lines[j] = lines[j].replace('}', '}}');
            break;
          }
          j++;
        }
      }
    }
    
    newLines.push(line);
  }
  
  content = newLines.join('\n');
  
  fs.writeFileSync(messagingPath, content);
  fixedFiles.push('src/lib/messaging.ts');
  totalFixed++;
}

console.log(`✅ Fixed ${totalFixed} files:`);
fixedFiles.forEach(file => console.log(`   - ${file}`));