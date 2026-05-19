/**
 * Fix company membership for a user.
 * - Creates missing company doc if needed
 * - Sets profile.companyId to current job's company
 * - Clears old profile.companyId
 * - Recalculates memberCount on affected companies
 *
 * Usage: node scripts/fix-company-membership.mjs <userEmail>
 * Requires: GOOGLE_APPLICATION_CREDENTIALS or gcloud auth
 */

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const PROJECT_ID = 'secid-org';
initializeApp({ projectId: PROJECT_ID, credential: applicationDefault() });
const db = getFirestore();

const email = process.argv[2];
if (!email) {
  console.error('Usage: node scripts/fix-company-membership.mjs <userEmail>');
  process.exit(1);
}

function slugify(text) {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function main() {
  // Find user by email
  const usersSnap = await db.collection('users').where('email', '==', email).get();
  if (usersSnap.empty) {
    console.error(`User not found: ${email}`);
    process.exit(1);
  }

  const userDoc = usersSnap.docs[0];
  const uid = userDoc.id;
  const userData = userDoc.data();
  console.log(`\nFound user: ${userData.displayName || userData.firstName} (${uid})`);
  console.log(`Current profile.companyId: ${userData.profile?.companyId || 'none'}`);
  console.log(`Current profile.company: ${userData.profile?.company || 'none'}`);

  // Get work history
  const roles = userData.experience?.previousRoles || [];
  console.log(`\nWork history (${roles.length} entries):`);
  for (const r of roles) {
    console.log(`  - ${r.company} | companyId: ${r.companyId || 'MISSING'} | current: ${r.current}`);
  }

  const currentRole = roles.find(r => r.current);
  console.log(`\nCurrent job: ${currentRole?.company || 'none'}`);

  // Fix unlinked companies in work history
  let changed = false;
  const allCompanies = await db.collection('companies').get();
  const companyMap = new Map();
  allCompanies.docs.forEach(d => companyMap.set(d.data().name?.toLowerCase(), { id: d.id, ...d.data() }));

  for (const role of roles) {
    if (role.company && !role.companyId) {
      const nameLC = role.company.toLowerCase();
      const existing = companyMap.get(nameLC);
      if (existing) {
        console.log(`  Linking "${role.company}" → ${existing.id}`);
        role.companyId = existing.id;
        changed = true;
      } else {
        // Create the company
        const domain = nameLC.replace(/[^a-z0-9]+/g, '') + '.com';
        const newRef = db.collection('companies').doc();
        await newRef.set({
          name: role.company,
          domain,
          slug: slugify(role.company),
          memberCount: 0,
          createdBy: uid,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          pendingReview: true,
        });
        console.log(`  Created "${role.company}" → ${newRef.id} (pending review)`);
        role.companyId = newRef.id;
        companyMap.set(nameLC, { id: newRef.id });
        changed = true;
      }
    }
  }

  // Determine new companyId
  const newCompanyId = currentRole?.companyId || null;
  const oldCompanyId = userData.profile?.companyId || null;

  console.log(`\nOld companyId: ${oldCompanyId}`);
  console.log(`New companyId: ${newCompanyId}`);

  // Update user doc
  const updates = {
    'experience.previousRoles': roles,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (currentRole) {
    updates['profile.company'] = currentRole.company;
    updates['profile.position'] = currentRole.position;
    updates['currentCompany'] = currentRole.company;
    updates['currentPosition'] = currentRole.position;
    updates['experience.currentRole'] = currentRole.position;
  }

  if (newCompanyId) {
    updates['profile.companyId'] = newCompanyId;
  } else if (oldCompanyId) {
    updates['profile.companyId'] = FieldValue.delete();
  }

  await db.collection('users').doc(uid).update(updates);
  console.log('\nUser doc updated.');

  // Fix memberCounts
  if (oldCompanyId && oldCompanyId !== newCompanyId) {
    try {
      await db.collection('companies').doc(oldCompanyId).update({
        memberCount: FieldValue.increment(-1),
      });
      const oldName = allCompanies.docs.find(d => d.id === oldCompanyId)?.data()?.name;
      console.log(`Decremented memberCount on ${oldName || oldCompanyId}`);
    } catch (e) {
      console.warn(`Could not decrement old company: ${e.message}`);
    }
  }

  if (newCompanyId && newCompanyId !== oldCompanyId) {
    try {
      await db.collection('companies').doc(newCompanyId).update({
        memberCount: FieldValue.increment(1),
      });
      const newName = companyMap.get(currentRole?.company?.toLowerCase())?.name || newCompanyId;
      console.log(`Incremented memberCount on ${newName}`);
    } catch (e) {
      console.warn(`Could not increment new company: ${e.message}`);
    }
  }

  console.log('\nDone! Refresh the companies page to see changes.');
}

main().catch(console.error);
