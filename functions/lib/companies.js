"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serveLogo = exports.onMemberCompanyChange = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const https_1 = require("firebase-functions/v2/https");
const firestore_2 = require("firebase-admin/firestore");
const admin = require("firebase-admin");
const db = admin.firestore();
exports.onMemberCompanyChange = (0, firestore_1.onDocumentUpdated)('users/{userId}', async (event) => {
    var _a, _b, _c, _d;
    const beforeData = (_a = event.data) === null || _a === void 0 ? void 0 : _a.before.data();
    const afterData = (_b = event.data) === null || _b === void 0 ? void 0 : _b.after.data();
    if (!beforeData || !afterData)
        return null;
    // Skip writes from the backfill script
    if (afterData._backfill)
        return null;
    const oldCompanyId = (_c = beforeData.profile) === null || _c === void 0 ? void 0 : _c.companyId;
    const newCompanyId = (_d = afterData.profile) === null || _d === void 0 ? void 0 : _d.companyId;
    // No change in company
    if (oldCompanyId === newCompanyId)
        return null;
    const batch = db.batch();
    // Decrement old company's memberCount
    if (oldCompanyId) {
        const oldRef = db.collection('companies').doc(oldCompanyId);
        batch.update(oldRef, { memberCount: firestore_2.FieldValue.increment(-1) });
    }
    // Increment new company's memberCount
    if (newCompanyId) {
        const newRef = db.collection('companies').doc(newCompanyId);
        batch.update(newRef, { memberCount: firestore_2.FieldValue.increment(1) });
    }
    await batch.commit();
    return null;
});
/**
 * Serve company logos via Firebase Hosting CDN.
 * URL pattern: /logos/{companyId}
 * Firebase Hosting caches the response at the CDN edge for 1 hour.
 */
exports.serveLogo = (0, https_1.onRequest)({ region: 'us-central1' }, async (req, res) => {
    var _a;
    // Extract companyId from path: /logos/{companyId}
    const parts = req.path.split('/').filter(Boolean);
    const companyId = parts[1]; // parts[0] = 'logos'
    if (!companyId) {
        res.status(400).send('Missing companyId');
        return;
    }
    try {
        // Look up the company's logoUrl from Firestore
        const companyDoc = await admin
            .firestore()
            .collection('companies')
            .doc(companyId)
            .get();
        if (!companyDoc.exists) {
            res.status(404).send('Company not found');
            return;
        }
        const logoUrl = (_a = companyDoc.data()) === null || _a === void 0 ? void 0 : _a.logoUrl;
        if (!logoUrl) {
            res.status(404).send('No logo');
            return;
        }
        // Set CDN cache headers: cache at edge for 1 hour, browser for 10 min
        res.set('Cache-Control', 'public, max-age=600, s-maxage=3600');
        // Redirect to the Storage URL (CDN caches the redirect target)
        res.redirect(302, logoUrl);
    }
    catch (error) {
        console.error('Error serving logo:', error);
        res.status(500).send('Error');
    }
});
//# sourceMappingURL=companies.js.map