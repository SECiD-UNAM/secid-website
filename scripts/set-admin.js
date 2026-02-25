#!/usr/bin/env node

/**
 * Set a user as admin by email address.
 *
 * Usage:
 *   firebase use secid-org
 *   node scripts/set-admin.js <email>
 *
 * Example:
 *   node scripts/set-admin.js artemio@secid.mx
 */

const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const email = process.argv[2];

if (!email) {
  console.error('Usage: node scripts/set-admin.js <email>');
  process.exit(1);
}

async function setAdmin() {
  // Find user by email
  const snapshot = await db.collection('users').where('email', '==', email).limit(1).get();

  if (snapshot.empty) {
    console.log(`No user found with email: ${email}`);
    console.log('Make sure the user has signed up first, then try again.');
    process.exit(1);
  }

  const userDoc = snapshot.docs[0];
  const uid = userDoc.id;
  const data = userDoc.data();

  console.log(`Found user: ${data.displayName || data.firstName || 'N/A'} (${uid})`);
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
