"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onUserNumeroCuentaChange = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const db = admin.firestore();
exports.onUserNumeroCuentaChange = (0, firestore_1.onDocumentWritten)("users/{userId}", async (event) => {
    var _a, _b, _c, _d, _e, _f;
    const beforeData = (_b = (_a = event.data) === null || _a === void 0 ? void 0 : _a.before) === null || _b === void 0 ? void 0 : _b.data();
    const afterData = (_d = (_c = event.data) === null || _c === void 0 ? void 0 : _c.after) === null || _d === void 0 ? void 0 : _d.data();
    const userId = event.params.userId;
    const oldNumeroCuenta = beforeData === null || beforeData === void 0 ? void 0 : beforeData.numeroCuenta;
    const newNumeroCuenta = afterData === null || afterData === void 0 ? void 0 : afterData.numeroCuenta;
    // No change in numeroCuenta — skip to avoid unnecessary work on routine updates
    if (oldNumeroCuenta === newNumeroCuenta)
        return;
    // If old numeroCuenta was removed or changed, delete old index entry
    if (oldNumeroCuenta) {
        const oldIndexRef = db.collection("numero_cuenta_index").doc(oldNumeroCuenta);
        const oldIndexSnap = await oldIndexRef.get();
        if (oldIndexSnap.exists && ((_e = oldIndexSnap.data()) === null || _e === void 0 ? void 0 : _e.uid) === userId) {
            await oldIndexRef.delete();
            console.log(`Deleted index for numeroCuenta ${oldNumeroCuenta} (user ${userId})`);
        }
    }
    // If new numeroCuenta is set, create/update index entry
    if (newNumeroCuenta) {
        const indexRef = db.collection("numero_cuenta_index").doc(newNumeroCuenta);
        const indexSnap = await indexRef.get();
        if (indexSnap.exists) {
            const existingUid = (_f = indexSnap.data()) === null || _f === void 0 ? void 0 : _f.uid;
            if (existingUid && existingUid !== userId) {
                // Conflict: different user already owns this numeroCuenta
                console.warn(`numeroCuenta conflict: ${newNumeroCuenta} owned by ${existingUid}, ` +
                    `attempted by ${userId}`);
                await db.collection("users").doc(userId).update({
                    numeroCuentaConflict: {
                        existingUid,
                        numeroCuenta: newNumeroCuenta,
                        detectedAt: admin.firestore.FieldValue.serverTimestamp(),
                    },
                });
                return;
            }
        }
        // No conflict — upsert the index
        const displayName = (afterData === null || afterData === void 0 ? void 0 : afterData.displayName) ||
            `${(afterData === null || afterData === void 0 ? void 0 : afterData.firstName) || ""} ${(afterData === null || afterData === void 0 ? void 0 : afterData.lastName) || ""}`.trim() ||
            (afterData === null || afterData === void 0 ? void 0 : afterData.email) || "";
        await indexRef.set({ uid: userId, displayName });
        console.log(`Indexed numeroCuenta ${newNumeroCuenta} → ${userId}`);
    }
});
//# sourceMappingURL=numero-cuenta-index.js.map