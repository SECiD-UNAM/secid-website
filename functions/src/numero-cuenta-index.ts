import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

const db = admin.firestore();

export const onUserNumeroCuentaChange = onDocumentWritten(
  "users/{userId}",
  async (event) => {
    const beforeData = event.data?.before?.data();
    const afterData = event.data?.after?.data();
    const userId = event.params.userId;

    const oldNumeroCuenta = beforeData?.numeroCuenta as string | undefined;
    const newNumeroCuenta = afterData?.numeroCuenta as string | undefined;

    // No change in numeroCuenta — skip to avoid unnecessary work on routine updates
    if (oldNumeroCuenta === newNumeroCuenta) return;

    // If old numeroCuenta was removed or changed, delete old index entry
    if (oldNumeroCuenta) {
      const oldIndexRef = db.collection("numero_cuenta_index").doc(oldNumeroCuenta);
      const oldIndexSnap = await oldIndexRef.get();
      if (oldIndexSnap.exists && oldIndexSnap.data()?.uid === userId) {
        await oldIndexRef.delete();
        console.log(`Deleted index for numeroCuenta ${oldNumeroCuenta} (user ${userId})`);
      }
    }

    // If new numeroCuenta is set, create/update index entry
    if (newNumeroCuenta) {
      const indexRef = db.collection("numero_cuenta_index").doc(newNumeroCuenta);
      const indexSnap = await indexRef.get();

      if (indexSnap.exists) {
        const existingUid = indexSnap.data()?.uid;
        if (existingUid && existingUid !== userId) {
          // Conflict: different user already owns this numeroCuenta
          console.warn(
            `numeroCuenta conflict: ${newNumeroCuenta} owned by ${existingUid}, ` +
            `attempted by ${userId}`
          );
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
      const displayName = afterData?.displayName ||
        `${afterData?.firstName || ""} ${afterData?.lastName || ""}`.trim() ||
        afterData?.email || "";

      await indexRef.set({ uid: userId, displayName });
      console.log(`Indexed numeroCuenta ${newNumeroCuenta} → ${userId}`);
    }
  }
);
