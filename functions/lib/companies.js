"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onMemberCompanyChange = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
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
//# sourceMappingURL=companies.js.map