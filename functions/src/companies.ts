import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { FieldValue } from "firebase-admin/firestore";
import * as admin from "firebase-admin";

const db = admin.firestore();

export const onMemberCompanyChange = onDocumentUpdated(
  "users/{userId}",
  async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();

    if (!beforeData || !afterData) return null;

    // Skip writes from the backfill script
    if (afterData._backfill) return null;

    const oldCompanyId = beforeData.profile?.companyId;
    const newCompanyId = afterData.profile?.companyId;

    // No change in company
    if (oldCompanyId === newCompanyId) return null;

    const batch = db.batch();

    // Decrement old company's memberCount
    if (oldCompanyId) {
      const oldRef = db.collection("companies").doc(oldCompanyId);
      batch.update(oldRef, { memberCount: FieldValue.increment(-1) });
    }

    // Increment new company's memberCount
    if (newCompanyId) {
      const newRef = db.collection("companies").doc(newCompanyId);
      batch.update(newRef, { memberCount: FieldValue.increment(1) });
    }

    await batch.commit();
    return null;
  }
);

