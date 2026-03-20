#!/usr/bin/env node

/**
 * Backfill companies collection from member profiles.
 *
 * This script:
 * 1. Creates company docs in the 'companies' collection from the COMPANY_MAP
 * 2. Fetches logos from Logo.dev (with Google favicon fallback) and uploads to Storage
 * 3. Links member profiles to company docs via profile.companyId
 * 4. Recomputes memberCount on each company doc
 *
 * Usage:
 *   node scripts/backfill-companies.cjs --dry-run          # Preview only
 *   node scripts/backfill-companies.cjs --skip-logos        # Create docs without logos
 *   node scripts/backfill-companies.cjs                     # Full run
 *
 * Prerequisites:
 *   - Firebase CLI logged in (`firebase login`)
 *   - Optional: LOGO_DEV_API_TOKEN env var for Logo.dev
 */

const path = require("path");
const admin = require(path.resolve(__dirname, "../functions/node_modules/firebase-admin"));
const fs = require("fs");
const https = require("https");

// --- Config ---
const PROJECT_ID = "secid-org";
const FIREBASE_CONFIG_PATH = path.join(
  process.env.HOME || process.env.USERPROFILE,
  ".config/configstore/firebase-tools.json"
);

// --- Company Map ---
// Entries with `normalizedTo` are case-variant aliases — skipped during company creation,
// used during member linking to map the alias to the canonical company name.
const COMPANY_MAP = {
  'BBVA': { domain: 'bbva.com', industry: 'Finanzas', location: 'Ciudad de México' },
  'Bbva': { normalizedTo: 'BBVA' },
  'Algorithia': { domain: 'algorithia.com', industry: 'Tecnología', location: 'Ciudad de México' },
  'coppel': { domain: 'coppel.com', industry: 'Retail', location: 'Culiacán' },
  'Uber': { domain: 'uber.com', industry: 'Tecnología', location: 'Global' },
  'The Coca Cola Company': { domain: 'coca-colacompany.com', industry: 'Consumo', location: 'Global' },
  'Datateam': { domain: 'datateam.com.mx', industry: 'Tecnología', location: 'Ciudad de México' },
  'Planet Fitness México': { domain: 'planetfitness.com', industry: 'Fitness', location: 'Ciudad de México' },
  'Cognodata': { domain: 'cognodata.com', industry: 'Tecnología', location: 'Madrid' },
  'Arkham Technologies Inc.': { domain: 'arkham.com', industry: 'Tecnología', location: 'Ciudad de México' },
  'Secretaria de Finanzas de la CDMX': { domain: 'finanzas.cdmx.gob.mx', industry: 'Gobierno', location: 'Ciudad de México' },
  'El puerto de liverpool': { domain: 'liverpool.com.mx', industry: 'Retail', location: 'Ciudad de México' },
  'Banorte': { domain: 'banorte.com', industry: 'Finanzas', location: 'Monterrey' },
  'Oracle': { domain: 'oracle.com', industry: 'Tecnología', location: 'Global' },
  'XalDigital': { domain: 'xaldigital.com', industry: 'Tecnología', location: 'Ciudad de México' },
  'J.D. Power': { domain: 'jdpower.com', industry: 'Consultoría', location: 'Global' },
  'Circulo': { domain: 'circulodecredito.com.mx', industry: 'Finanzas', location: 'Ciudad de México' },
  'Kuona': { domain: 'kuona.ai', industry: 'Tecnología', location: 'Ciudad de México' },
  'Microsoft': { domain: 'microsoft.com', industry: 'Tecnología', location: 'Global' },
  'NielsenIQ': { domain: 'nielseniq.com', industry: 'Datos', location: 'Global' },
  'Universal Pictures International': { domain: 'universalpictures.com', industry: 'Entretenimiento', location: 'Global' },
};

// --- Parse args ---
const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const skipLogos = args.includes("--skip-logos");

// --- Firebase CLI OAuth credentials (public, embedded in the CLI) ---
const FIREBASE_CLIENT_ID = "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com";
const FIREBASE_CLIENT_SECRET = "j9iVZfS8kkCEFUPaAeJV0sAi";

let tempADCPath = null;

if (!admin.apps.length) {
  const firebaseConfig = JSON.parse(fs.readFileSync(FIREBASE_CONFIG_PATH, "utf-8"));
  const refreshToken = firebaseConfig.tokens && firebaseConfig.tokens.refresh_token;
  if (!refreshToken) {
    console.error("No refresh token found. Run: firebase login --reauth");
    process.exit(1);
  }

  const adcPayload = {
    type: "authorized_user",
    client_id: FIREBASE_CLIENT_ID,
    client_secret: FIREBASE_CLIENT_SECRET,
    refresh_token: refreshToken,
  };
  tempADCPath = path.resolve(__dirname, "../tmp/.adc-temp.json");
  fs.writeFileSync(tempADCPath, JSON.stringify(adcPayload));
  process.env.GOOGLE_APPLICATION_CREDENTIALS = tempADCPath;

  admin.initializeApp({ projectId: PROJECT_ID });
}

const db = admin.firestore();
const bucket = admin.storage().bucket(`${PROJECT_ID}.firebasestorage.app`);

// --- Helpers ---

/**
 * Build the canonical company name lookup: lowercased key -> canonical name.
 * Handles normalizedTo aliases so "bbva" maps to "BBVA".
 */
function buildNameLookup() {
  const lookup = {};
  for (const [name, entry] of Object.entries(COMPANY_MAP)) {
    if (entry.normalizedTo) {
      lookup[name.toLowerCase()] = entry.normalizedTo;
    } else {
      lookup[name.toLowerCase()] = name;
    }
  }
  return lookup;
}

/**
 * Fetch a URL and return the response body as a Buffer.
 * Follows up to 3 redirects. Rejects on non-2xx status.
 */
function fetchBuffer(url, maxRedirects = 3) {
  return new Promise((resolve, reject) => {
    const doRequest = (currentUrl, redirectsLeft) => {
      const protocol = currentUrl.startsWith("https") ? https : require("http");
      protocol.get(currentUrl, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          if (redirectsLeft <= 0) {
            reject(new Error(`Too many redirects for ${url}`));
            return;
          }
          doRequest(res.headers.location, redirectsLeft - 1);
          return;
        }
        if (res.statusCode < 200 || res.statusCode >= 300) {
          res.resume();
          reject(new Error(`HTTP ${res.statusCode} for ${currentUrl}`));
          return;
        }
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => resolve(Buffer.concat(chunks)));
        res.on("error", reject);
      }).on("error", reject);
    };
    doRequest(url, maxRedirects);
  });
}

/**
 * Attempt to fetch a company logo:
 *  1. Logo.dev (if LOGO_DEV_API_TOKEN is set)
 *  2. Google Favicons fallback (128px)
 *
 * Returns the image Buffer or null if both fail.
 */
async function fetchLogo(domain) {
  const logoDevToken = process.env.LOGO_DEV_API_TOKEN;

  // Try Logo.dev first
  if (logoDevToken) {
    try {
      const url = `https://img.logo.dev/${domain}?token=${logoDevToken}&format=png`;
      const buf = await fetchBuffer(url);
      if (buf.length > 100) return buf; // sanity: must be a real image
    } catch {
      // fall through to favicon
    }
  }

  // Google favicon fallback
  try {
    const url = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    const buf = await fetchBuffer(url);
    if (buf.length > 100) return buf;
  } catch {
    // give up
  }

  return null;
}

/**
 * Upload a logo buffer to Firebase Storage and return the public URL.
 */
async function uploadLogo(companyId, buffer) {
  const filePath = `companies/${companyId}/logo.png`;
  const file = bucket.file(filePath);
  await file.save(buffer, {
    metadata: { contentType: "image/png" },
    public: true,
  });
  return file.publicUrl();
}

// --- Main ---

async function backfillCompanies() {
  console.log(`\n========================================`);
  console.log(`  SECiD Company Backfill`);
  console.log(`  Mode: ${isDryRun ? "DRY RUN" : "LIVE"}${skipLogos ? " (skip logos)" : ""}`);
  console.log(`========================================\n`);

  const nameLookup = buildNameLookup();
  const canonicalEntries = Object.entries(COMPANY_MAP).filter(([, v]) => !v.normalizedTo);

  // Track companyId by canonical name for member linking
  const companyIdByName = {};
  // Track memberCount per companyId
  const memberCountByCompanyId = {};

  // --------------------------------------------------
  // Phase 1: Create company documents
  // --------------------------------------------------
  console.log(`--- Phase 1: Create company documents (${canonicalEntries.length} companies) ---\n`);

  let companiesCreated = 0;
  let companiesSkipped = 0;
  let companiesErrored = 0;
  let logosFetched = 0;

  for (const [name, entry] of canonicalEntries) {
    try {
      // Idempotency: check if a company with this domain already exists
      const existing = await db
        .collection("companies")
        .where("domain", "==", entry.domain)
        .limit(1)
        .get();

      if (!existing.empty) {
        const existingDoc = existing.docs[0];
        companyIdByName[name] = existingDoc.id;
        memberCountByCompanyId[existingDoc.id] = 0;
        console.log(`  SKIP  ${name} — already exists (${existingDoc.id})`);
        companiesSkipped++;
        continue;
      }

      if (isDryRun) {
        console.log(`  WOULD CREATE  ${name} (${entry.domain}, ${entry.industry}, ${entry.location})`);
        companyIdByName[name] = `dry-run-${name}`;
        companiesCreated++;
        continue;
      }

      // Create the company document
      const now = admin.firestore.FieldValue.serverTimestamp();
      const docRef = db.collection("companies").doc();
      const companyDoc = {
        name,
        domain: entry.domain,
        industry: entry.industry || "",
        location: entry.location || "",
        memberCount: 0,
        createdBy: "backfill-script",
        createdAt: now,
        updatedAt: now,
        pendingReview: false,
      };

      await docRef.set(companyDoc);
      companyIdByName[name] = docRef.id;
      memberCountByCompanyId[docRef.id] = 0;
      console.log(`  OK    ${name} -> ${docRef.id}`);
      companiesCreated++;

      // Fetch and upload logo
      if (!skipLogos) {
        const logoBuf = await fetchLogo(entry.domain);
        if (logoBuf) {
          const logoUrl = await uploadLogo(docRef.id, logoBuf);
          await docRef.update({ logoUrl });
          console.log(`  LOGO  ${name} -> ${logoUrl}`);
          logosFetched++;
        } else {
          console.log(`  LOGO  ${name} -> no logo found`);
        }
      }
    } catch (err) {
      console.error(`  ERROR ${name}: ${err.message}`);
      companiesErrored++;
    }
  }

  console.log(`\n  Companies: ${companiesCreated} created, ${companiesSkipped} skipped, ${companiesErrored} errors`);
  if (!skipLogos && !isDryRun) {
    console.log(`  Logos: ${logosFetched} fetched`);
  }

  // --------------------------------------------------
  // Phase 2: Link members to companies
  // --------------------------------------------------
  console.log(`\n--- Phase 2: Link members to company docs ---\n`);

  const usersSnapshot = await db.collection("users").get();
  let membersLinked = 0;
  let membersUnmatched = 0;
  let membersNoCompany = 0;
  let membersAlreadyLinked = 0;

  for (const userDoc of usersSnapshot.docs) {
    const data = userDoc.data();
    const companyName = data.profile?.company || data.currentCompany || "";

    if (!companyName) {
      membersNoCompany++;
      continue;
    }

    // Check if already linked
    if (data.profile?.companyId) {
      membersAlreadyLinked++;
      // Still count for memberCount recomputation
      const existingCompanyId = data.profile.companyId;
      if (memberCountByCompanyId[existingCompanyId] !== undefined) {
        memberCountByCompanyId[existingCompanyId]++;
      }
      continue;
    }

    // Match against COMPANY_MAP (case-insensitive)
    const canonicalName = nameLookup[companyName.toLowerCase()];
    if (!canonicalName) {
      console.log(`  UNMATCHED  ${data.displayName || userDoc.id} — company "${companyName}" not in COMPANY_MAP`);
      membersUnmatched++;
      continue;
    }

    const companyId = companyIdByName[canonicalName];
    if (!companyId) {
      console.log(`  WARN  ${data.displayName || userDoc.id} — canonical "${canonicalName}" has no companyId`);
      membersUnmatched++;
      continue;
    }

    if (isDryRun) {
      console.log(`  WOULD LINK  ${data.displayName || userDoc.id} -> ${canonicalName} (${companyId})`);
      membersLinked++;
      if (memberCountByCompanyId[companyId] !== undefined) {
        memberCountByCompanyId[companyId]++;
      }
      continue;
    }

    // Update the member doc with companyId and _backfill flag
    await db.collection("users").doc(userDoc.id).update({
      "profile.companyId": companyId,
      _backfill: true,
    });

    console.log(`  LINK  ${data.displayName || userDoc.id} -> ${canonicalName} (${companyId})`);
    membersLinked++;

    if (memberCountByCompanyId[companyId] !== undefined) {
      memberCountByCompanyId[companyId]++;
    }
  }

  console.log(`\n  Members: ${membersLinked} linked, ${membersAlreadyLinked} already linked, ${membersNoCompany} no company, ${membersUnmatched} unmatched`);

  // --------------------------------------------------
  // Phase 3: Recompute memberCount on each company
  // --------------------------------------------------
  console.log(`\n--- Phase 3: Recompute memberCount ---\n`);

  let countsUpdated = 0;

  for (const [name, companyId] of Object.entries(companyIdByName)) {
    if (isDryRun) {
      const count = memberCountByCompanyId[companyId] || 0;
      console.log(`  WOULD SET  ${name} memberCount = ${count}`);
      countsUpdated++;
      continue;
    }

    // Direct count: query all users with this companyId
    const memberSnapshot = await db
      .collection("users")
      .where("profile.companyId", "==", companyId)
      .get();

    const count = memberSnapshot.size;
    await db.collection("companies").doc(companyId).update({ memberCount: count });
    console.log(`  SET   ${name} memberCount = ${count}`);
    countsUpdated++;
  }

  console.log(`\n  Counts updated: ${countsUpdated}`);

  // --------------------------------------------------
  // Summary
  // --------------------------------------------------
  console.log(`\n========================================`);
  console.log(`  Summary`);
  console.log(`========================================`);
  console.log(`  Companies created:  ${companiesCreated}`);
  console.log(`  Companies skipped:  ${companiesSkipped}`);
  console.log(`  Companies errors:   ${companiesErrored}`);
  console.log(`  Members linked:     ${membersLinked}`);
  console.log(`  Members already:    ${membersAlreadyLinked}`);
  console.log(`  Members no company: ${membersNoCompany}`);
  console.log(`  Members unmatched:  ${membersUnmatched}`);
  console.log(`  Counts updated:     ${countsUpdated}`);
  if (!skipLogos && !isDryRun) {
    console.log(`  Logos fetched:      ${logosFetched}`);
  }

  if (isDryRun) {
    console.log(`\n  This was a DRY RUN. No changes were made.`);
    console.log(`  Run without --dry-run to apply.\n`);
  } else {
    console.log(`\n  Backfill complete.\n`);
  }
}

backfillCompanies()
  .then(() => {
    if (tempADCPath && fs.existsSync(tempADCPath)) fs.unlinkSync(tempADCPath);
    process.exit(0);
  })
  .catch((err) => {
    if (tempADCPath && fs.existsSync(tempADCPath)) fs.unlinkSync(tempADCPath);
    console.error("Backfill failed:", err);
    process.exit(1);
  });
