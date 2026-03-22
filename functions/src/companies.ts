import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { onRequest } from "firebase-functions/v2/https";
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

/**
 * Serve company logos via Firebase Hosting CDN.
 * URL pattern: /logos/{companyId}
 * Firebase Hosting caches the response at the CDN edge for 1 hour.
 */
export const serveLogo = onRequest(
  { region: "us-central1" },
  async (req, res) => {
    // Extract companyId from path: /logos/{companyId}
    const parts = req.path.split("/").filter(Boolean);
    const companyId = parts[1]; // parts[0] = 'logos'

    if (!companyId) {
      res.status(400).send("Missing companyId");
      return;
    }

    try {
      // Look up the company's logoUrl from Firestore
      const companyDoc = await admin
        .firestore()
        .collection("companies")
        .doc(companyId)
        .get();

      if (!companyDoc.exists) {
        res.status(404).send("Company not found");
        return;
      }

      const logoUrl = companyDoc.data()?.logoUrl;
      if (!logoUrl) {
        res.status(404).send("No logo");
        return;
      }

      // Set CDN cache headers: cache at edge for 1 hour, browser for 10 min
      res.set("Cache-Control", "public, max-age=600, s-maxage=3600");

      // Redirect to the Storage URL (CDN caches the redirect target)
      res.redirect(302, logoUrl);
    } catch (error) {
      console.error("Error serving logo:", error);
      res.status(500).send("Error");
    }
  }
);
