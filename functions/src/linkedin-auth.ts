import { onRequest, onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { FieldValue } from "firebase-admin/firestore";
import * as admin from "firebase-admin";
import * as crypto from "crypto";

const linkedinClientId = defineSecret("LINKEDIN_CLIENT_ID");
const linkedinClientSecret = defineSecret("LINKEDIN_CLIENT_SECRET");

const LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";
const LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const LINKEDIN_USERINFO_URL = "https://api.linkedin.com/v2/userinfo";
const LINKEDIN_VERIFY_URL =
  "https://api.linkedin.com/v2/memberVerifications?q=member";

function getCallbackUrl(req: { headers: Record<string, string | string[] | undefined> }): string {
  const host = req.headers["x-forwarded-host"] || req.headers["host"];
  const protocol = req.headers["x-forwarded-proto"] || "https";
  const hostStr = Array.isArray(host) ? host[0] : host;
  const protoStr = Array.isArray(protocol) ? protocol[0] : protocol;
  return `${protoStr}://${hostStr}/linkedinAuthCallback`;
}

function getAppUrl(): string {
  return process.env.APP_URL || "https://secid.org";
}

/**
 * Step 1: Redirect the user to LinkedIn's OAuth authorize page.
 *
 * Client hits this URL to start the OAuth flow. An optional `returnUrl`
 * query parameter is encoded in the OAuth state so we can redirect the
 * user back to the right page after authentication completes.
 */
export const linkedinAuthRedirect = onRequest(
  { secrets: [linkedinClientId], cors: true },
  (req, res) => {
    const callbackUrl = getCallbackUrl(req);
    const state = Buffer.from(
      JSON.stringify({
        returnUrl: (req.query.returnUrl as string) || "/",
      }),
    ).toString("base64");

    const params = new URLSearchParams({
      response_type: "code",
      client_id: linkedinClientId.value(),
      redirect_uri: callbackUrl,
      scope: "openid profile email",
      state,
    });

    res.redirect(`${LINKEDIN_AUTH_URL}?${params.toString()}`);
  },
);

/**
 * Step 2: LinkedIn redirects here after the user authorizes.
 *
 * This function:
 *  1. Exchanges the auth code for an access token
 *  2. Fetches the user profile from LinkedIn's userinfo endpoint
 *  3. Finds or creates a Firebase Auth user (auto-merge by email)
 *  4. Optionally checks LinkedIn verification status
 *  5. Generates a Firebase custom token
 *  6. Redirects back to the app with the token as a URL parameter
 */
export const linkedinAuthCallback = onRequest(
  { secrets: [linkedinClientId, linkedinClientSecret], cors: true },
  async (req, res) => {
    const { code, error } = req.query;
    const stateParam = req.query.state as string | undefined;
    const appUrl = getAppUrl();

    if (error || !code) {
      res.redirect(`${appUrl}/es/login?error=linkedin_denied`);
      return;
    }

    let returnUrl = "/";
    if (stateParam) {
      try {
        const stateData = JSON.parse(
          Buffer.from(stateParam, "base64").toString(),
        );
        returnUrl = stateData.returnUrl || "/";
        // Prevent open redirect — only allow relative paths
        if (/^https?:\/\//i.test(returnUrl) || returnUrl.startsWith("//")) {
          returnUrl = "/";
        }
      } catch {
        // Malformed state is non-fatal; default returnUrl is fine.
      }
    }

    const db = admin.firestore();
    const auth = admin.auth();

    try {
      // --- Exchange code for access token ---
      const tokenRes = await fetch(LINKEDIN_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: code as string,
          redirect_uri: getCallbackUrl(req),
          client_id: linkedinClientId.value(),
          client_secret: linkedinClientSecret.value(),
        }).toString(),
      });

      if (!tokenRes.ok) {
        console.error(
          "LinkedIn token exchange failed:",
          await tokenRes.text(),
        );
        res.redirect(`${appUrl}/es/login?error=linkedin_token`);
        return;
      }

      const tokenData = (await tokenRes.json()) as { access_token: string };
      const accessToken = tokenData.access_token;

      // --- Fetch LinkedIn user profile ---
      const profileRes = await fetch(LINKEDIN_USERINFO_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!profileRes.ok) {
        console.error(
          "LinkedIn profile fetch failed:",
          await profileRes.text(),
        );
        res.redirect(`${appUrl}/es/login?error=linkedin_profile`);
        return;
      }

      interface LinkedInProfile {
        email?: string;
        name?: string;
        given_name?: string;
        family_name?: string;
        picture?: string;
      }

      const profile = (await profileRes.json()) as LinkedInProfile;
      const email = profile.email;
      const displayName =
        profile.name ||
        `${profile.given_name || ""} ${profile.family_name || ""}`.trim();
      const photoURL = profile.picture;

      if (!email) {
        res.redirect(`${appUrl}/es/login?error=linkedin_no_email`);
        return;
      }

      // --- Find or create Firebase user (auto-merge by email) ---
      let firebaseUser: admin.auth.UserRecord;
      try {
        firebaseUser = await auth.getUserByEmail(email);
        await auth.updateUser(firebaseUser.uid, {
          displayName: displayName || firebaseUser.displayName,
          photoURL: photoURL || firebaseUser.photoURL,
        });
      } catch (err: unknown) {
        const authError = err as { code?: string };
        if (authError.code === "auth/user-not-found") {
          firebaseUser = await auth.createUser({
            email,
            displayName,
            photoURL,
            emailVerified: true,
          });
        } else {
          throw err;
        }
      }

      // --- Update Firestore user doc ---
      const userRef = db.doc(`users/${firebaseUser.uid}`);
      await userRef.set(
        {
          lastLogin: FieldValue.serverTimestamp(),
          lastLoginProvider: "linkedin",
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      // --- Check LinkedIn verification (if API product available) ---
      try {
        const verifyRes = await fetch(LINKEDIN_VERIFY_URL, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "LinkedIn-Version": "202401",
          },
        });
        if (verifyRes.ok) {
          const verifyData = (await verifyRes.json()) as {
            elements?: unknown[];
          };
          const verified =
            Array.isArray(verifyData.elements) &&
            verifyData.elements.length > 0;
          await userRef.set(
            {
              linkedinVerified: verified,
              linkedinVerifiedAt: FieldValue.serverTimestamp(),
            },
            { merge: true },
          );
        }
      } catch (e) {
        console.warn("LinkedIn verification check skipped:", e);
      }

      // --- Generate custom token and store via short-lived code ---
      const customToken = await auth.createCustomToken(firebaseUser.uid);
      const code = crypto.randomBytes(32).toString("hex");
      const db = admin.firestore();

      await db
        .collection("linkedin_auth_codes")
        .doc(code)
        .set({
          token: customToken,
          createdAt: FieldValue.serverTimestamp(),
          expiresAt: new Date(Date.now() + 60_000), // 60 seconds
          used: false,
        });

      res.redirect(
        `${appUrl}/es/login?linkedinCode=${encodeURIComponent(code)}&returnUrl=${encodeURIComponent(returnUrl)}`,
      );
    } catch (err) {
      console.error("LinkedIn auth error:", err);
      res.redirect(`${appUrl}/es/login?error=linkedin_server`);
    }
  },
);

/**
 * Step 3: Client exchanges a short-lived code for the custom token.
 * The code is single-use and expires after 60 seconds.
 */
export const exchangeLinkedInCode = onCall<{ code: string }>(
  async (request) => {
    const { code } = request.data;
    if (!code || typeof code !== "string") {
      throw new HttpsError("invalid-argument", "Code is required");
    }

    const db = admin.firestore();
    const codeRef = db.collection("linkedin_auth_codes").doc(code);
    const codeDoc = await codeRef.get();

    if (!codeDoc.exists) {
      throw new HttpsError("not-found", "Invalid or expired code");
    }

    const data = codeDoc.data()!;

    if (data.used) {
      throw new HttpsError("already-exists", "Code already used");
    }

    if (data.expiresAt.toDate() < new Date()) {
      await codeRef.delete();
      throw new HttpsError("deadline-exceeded", "Code expired");
    }

    // Mark as used and return token
    await codeRef.update({ used: true });

    // Clean up — delete after returning
    codeRef.delete().catch(() => {});

    return { token: data.token };
  },
);
