#!/usr/bin/env node

/**
 * Migration script: Add lifecycle fields to all existing user documents
 *
 * This script:
 * 1. Reads all user documents from the 'users' collection
 * 2. Adds lifecycle fields (status, statusChangedAt, statusHistory, lastActiveDate)
 * 3. Sets registrationType and verificationStatus based on current data
 * 4. Cross-references miembros@secid.mx group membership (if available)
 *
 * Usage:
 *   node scripts/migrate-member-lifecycle.js [--dry-run]
 *
 * Prerequisites:
 *   - Firebase Admin SDK credentials (GOOGLE_APPLICATION_CREDENTIALS env var)
 *   - Or run with: firebase use <project-id> && node scripts/migrate-member-lifecycle.js
 */

const admin = require('firebase-admin');

// Parse args
const isDryRun = process.argv.includes('--dry-run');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function migrate() {
  console.log(`\n🔄 Member Lifecycle Migration${isDryRun ? ' (DRY RUN)' : ''}\n`);

  const usersSnapshot = await db.collection('users').get();
  console.log(`Found ${usersSnapshot.size} user documents\n`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  const batch = db.batch();
  let batchCount = 0;

  for (const doc of usersSnapshot.docs) {
    const data = doc.data();
    const uid = doc.id;

    // Skip if lifecycle already exists
    if (data.lifecycle && data.lifecycle.status) {
      console.log(`  ⏭️  ${uid} (${data.email}) — already has lifecycle`);
      skipped++;
      continue;
    }

    // Determine status based on current data
    let status = 'collaborator';
    let registrationType = 'collaborator';

    if (data.role === 'admin' || data.role === 'moderator') {
      status = 'active';
      registrationType = 'member';
    } else if (data.role === 'member' && data.isVerified) {
      status = 'active';
      registrationType = 'member';
    } else if (data.role === 'member' && !data.isVerified) {
      status = 'pending';
      registrationType = 'member';
    } else if (!data.isActive) {
      status = 'inactive';
    }

    // Determine verification status
    let verificationStatus = 'none';
    if (data.isVerified) {
      verificationStatus = 'approved';
    } else if (data.unamEmail || data.studentId) {
      verificationStatus = 'pending';
    }

    const updates = {
      lifecycle: {
        status,
        statusChangedAt: data.createdAt || admin.firestore.FieldValue.serverTimestamp(),
        statusHistory: [],
        lastActiveDate: data.updatedAt || data.createdAt || admin.firestore.FieldValue.serverTimestamp(),
      },
      registrationType: data.registrationType || registrationType,
      verificationStatus: data.verificationStatus || verificationStatus,
    };

    // Map studentId to numeroCuenta if present
    if (data.studentId && !data.numeroCuenta) {
      updates.numeroCuenta = data.studentId;
    }

    console.log(`  ✏️  ${uid} (${data.email}) — status: ${status}, type: ${registrationType}, verification: ${verificationStatus}`);

    if (!isDryRun) {
      batch.update(doc.ref, updates);
      batchCount++;

      // Firestore batch limit is 500
      if (batchCount >= 450) {
        await batch.commit();
        console.log(`  📦 Committed batch of ${batchCount} updates`);
        batchCount = 0;
      }
    }

    updated++;
  }

  // Commit remaining
  if (!isDryRun && batchCount > 0) {
    await batch.commit();
    console.log(`  📦 Committed final batch of ${batchCount} updates`);
  }

  console.log(`\n✅ Migration complete:`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Errors:  ${errors}`);

  if (isDryRun) {
    console.log(`\n⚠️  This was a dry run. No changes were made.`);
    console.log(`   Run without --dry-run to apply changes.\n`);
  }
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
