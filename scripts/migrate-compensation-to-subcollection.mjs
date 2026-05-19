/**
 * Migration: Move compensation data from user doc work history entries
 * to users/{uid}/compensation/{roleId} sub-collection.
 *
 * Usage:
 *   cd functions && node ../scripts/migrate-compensation-to-subcollection.mjs          # dry run
 *   cd functions && node ../scripts/migrate-compensation-to-subcollection.mjs --execute # apply
 *
 * Requires: gcloud auth application-default login
 */

const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const PROJECT_ID = 'secid-org';
const isDryRun = !process.argv.includes('--execute');

initializeApp({ projectId: PROJECT_ID, credential: applicationDefault() });
const db = getFirestore();

async function main() {
  console.log(`\n${isDryRun ? '🔍 DRY RUN' : '🚀 EXECUTING'} — Migrate compensation to sub-collection\n`);

  const usersSnap = await db.collection('users').get();
  let totalMigrated = 0;
  let totalSkipped = 0;
  let usersAffected = 0;

  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id;
    const data = userDoc.data();
    const roles = data.experience?.previousRoles;

    if (!roles || !Array.isArray(roles)) continue;

    const rolesToMigrate = roles.filter((r) => r.compensation && r.compensation.monthlyGross);

    if (rolesToMigrate.length === 0) continue;

    usersAffected++;
    const displayName = data.displayName || data.email || uid;
    console.log(`\n👤 ${displayName} (${uid}) — ${rolesToMigrate.length} entries`);

    for (const role of rolesToMigrate) {
      const roleId = role.id;
      if (!roleId) {
        console.log(`  ⚠️  Skipping role without ID at ${role.company}`);
        totalSkipped++;
        continue;
      }

      const comp = role.compensation;
      const compDoc = {
        roleId,
        monthlyGross: comp.monthlyGross,
        currency: comp.currency || 'MXN',
        country: comp.country || 'MX',
        ...(comp.fiscalRegime && { fiscalRegime: comp.fiscalRegime }),
        ...(comp.annualBonus && { annualBonus: comp.annualBonus }),
        ...(comp.annualBonusType && { annualBonusType: comp.annualBonusType }),
        ...(comp.signOnBonus && { signOnBonus: comp.signOnBonus }),
        ...(comp.stockAnnualValue && { stockAnnualValue: comp.stockAnnualValue }),
        ...(comp.benefits?.length > 0 && { benefits: comp.benefits }),
        updatedAt: FieldValue.serverTimestamp(),
      };

      console.log(`  📝 ${role.company} — ${role.position} — $${comp.monthlyGross} ${comp.currency || 'MXN'}`);

      if (!isDryRun) {
        // Write to sub-collection
        await db.collection('users').doc(uid).collection('compensation').doc(roleId).set(compDoc);
      }

      totalMigrated++;
    }

    // Remove compensation from work history entries
    if (!isDryRun) {
      const updatedRoles = roles.map((r) => {
        if (r.compensation) {
          const { compensation, ...rest } = r;
          return rest;
        }
        return r;
      });
      await db.collection('users').doc(uid).update({
        'experience.previousRoles': updatedRoles,
      });
      console.log(`  ✅ Cleaned compensation from ${rolesToMigrate.length} work history entries`);
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Users affected: ${usersAffected}`);
  console.log(`Entries migrated: ${totalMigrated}`);
  console.log(`Entries skipped: ${totalSkipped}`);
  console.log(`Mode: ${isDryRun ? 'DRY RUN (use --execute to apply)' : 'EXECUTED'}`);
  console.log(`${'='.repeat(50)}\n`);
}

main().catch(console.error);
