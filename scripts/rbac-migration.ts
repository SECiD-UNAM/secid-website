/**
 * One-time migration script for RBAC.
 * Run via: npx ts-node scripts/rbac-migration.ts
 *
 * Prerequisites:
 *   - Set GOOGLE_APPLICATION_CREDENTIALS env var to a service account key file
 *   - Replace ADMIN_UID below with the actual admin user ID
 *
 * Backfills:
 *   1. newsletter_archive docs: adds createdBy, status, createdAt, updatedAt
 *   2. spotlights docs: adds createdBy, updatedAt
 *
 * Uses a known admin UID for createdBy backfill. Safe to run multiple times
 * (skips docs that already have createdBy).
 */
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const ADMIN_UID = 'REPLACE_WITH_ADMIN_UID'; // Set before running
const BATCH_LIMIT = 500; // Firestore batch limit

async function backfillNewsletters(
  db: FirebaseFirestore.Firestore,
): Promise<void> {
  const snapshot = await db.collection('newsletter_archive').get();
  let batch = db.batch();
  let count = 0;
  let batchCount = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (!data.createdBy) {
      batch.update(doc.ref, {
        createdBy: ADMIN_UID,
        status: data.status || 'published',
        createdAt: data.publishedAt || new Date(),
        updatedAt: data.publishedAt || new Date(),
      });
      count++;
      batchCount++;

      if (batchCount >= BATCH_LIMIT) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  if (count > 0) {
    console.log(`Backfilled ${count} newsletter docs`);
  } else {
    console.log('No newsletter docs need backfill');
  }
}

async function backfillSpotlights(
  db: FirebaseFirestore.Firestore,
): Promise<void> {
  const snapshot = await db.collection('spotlights').get();
  let batch = db.batch();
  let count = 0;
  let batchCount = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (!data.createdBy) {
      batch.update(doc.ref, {
        createdBy: ADMIN_UID,
        updatedAt: data.publishedAt || new Date(),
      });
      count++;
      batchCount++;

      if (batchCount >= BATCH_LIMIT) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  if (count > 0) {
    console.log(`Backfilled ${count} spotlight docs`);
  } else {
    console.log('No spotlight docs need backfill');
  }
}

async function main(): Promise<void> {
  if (ADMIN_UID === 'REPLACE_WITH_ADMIN_UID') {
    console.error(
      'ERROR: Replace ADMIN_UID with an actual admin user ID before running.',
    );
    process.exit(1);
  }

  // Initialize with default credentials (use GOOGLE_APPLICATION_CREDENTIALS env var)
  initializeApp();
  const db = getFirestore();

  console.log('Starting RBAC migration backfill...');
  await backfillNewsletters(db);
  await backfillSpotlights(db);
  console.log('Migration complete');
}

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
