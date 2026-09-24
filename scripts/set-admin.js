#!/usr/bin/env node

/**
 * Set a user as admin by email address.
 *
 * Usage:
 *   node scripts/set-admin.js <email>
 *
 * Example:
 *   node scripts/set-admin.js artemio@secid.mx
 *
 * Requires: firebase login (uses Application Default Credentials)
 */

import { createRequire } from 'module';
import { execSync } from 'child_process';

const require = createRequire(import.meta.url);
const admin = require('../functions/node_modules/firebase-admin');

const email = process.argv[2];

if (!email) {
  console.error('Usage: node scripts/set-admin.js <email>');
  process.exit(1);
}

// Get project ID from .firebaserc or firebase CLI
function getProjectId() {
  // Try GCLOUD_PROJECT env var first
  if (process.env.GCLOUD_PROJECT) return process.env.GCLOUD_PROJECT;

  try {
    const result = execSync('npx firebase-tools use', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const match = result.match(/Active Project:\s+(\S+)/);
    if (match) return match[1];
  } catch {}

  // Fallback: read .firebaserc
  try {
    const fs = require('fs');
    const rc = JSON.parse(
      fs.readFileSync(new URL('../.firebaserc', import.meta.url), 'utf8')
    );
    return rc.projects?.default;
  } catch {}

  return null;
}

const projectId = getProjectId();

if (!projectId) {
  console.error('Could not determine Firebase project ID.');
  console.error('Run: firebase use secid-org');
  process.exit(1);
}

console.log(`Using project: ${projectId}`);

// Initialize with Application Default Credentials
// These are set by: gcloud auth application-default login
// Or by setting GOOGLE_APPLICATION_CREDENTIALS to a service account key
if (!admin.apps.length) {
  admin.initializeApp({ projectId });
}

const db = admin.firestore();

async function setAdmin() {
  const snapshot = await db
    .collection('users')
    .where('email', '==', email)
    .limit(1)
    .get();

  if (snapshot.empty) {
    console.log(`No user found with email: ${email}`);
    console.log('Make sure the user has signed up first, then try again.');
    process.exit(1);
  }

  const userDoc = snapshot.docs[0];
  const uid = userDoc.id;
  const data = userDoc.data();

  console.log(
    `Found user: ${data.displayName || data.firstName || 'N/A'} (${uid})`
  );
  console.log(`Current role: ${data.role}`);

  await userDoc.ref.update({
    role: 'admin',
    'lifecycle.status': 'active',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`✅ ${email} is now an admin`);
}

setAdmin()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err.message);
    process.exit(1);
  });
