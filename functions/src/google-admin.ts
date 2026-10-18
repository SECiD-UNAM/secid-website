/**
 * Google Admin SDK integration for SECiD
 * Uses domain-wide delegation to manage Google Workspace Groups
 *
 * How auth works (keyless domain-wide delegation, issue #83):
 * Gen2 functions run on Cloud Run with the Compute Engine default service
 * account and no private key, so the ADC client cannot impersonate a
 * Workspace user by itself (`clientOptions.subject` fails with "Not
 * Authorized to access this resource/api"). Instead we:
 *   1. ask the IAM Credentials API to sign a JWT *as the runtime SA*
 *      (`projects/-/serviceAccounts/{SA}:signJwt`) with `sub` = the
 *      Workspace admin to impersonate and the Directory scopes;
 *   2. exchange that assertion at the OAuth token endpoint with the
 *      `jwt-bearer` grant for a delegated access token;
 *   3. build the Directory client with that token (cached until ~5 min
 *      before expiry).
 *
 * Setup required (one-time, see docs/runbooks/prod-cutover.md):
 * 1. Grant the runtime SA `roles/iam.serviceAccountTokenCreator` on itself
 *    and enable `iamcredentials.googleapis.com` (infra/runtime_iam.tf).
 * 2. Google Admin Console → Security → API controls → Domain-wide
 *    delegation: add the SA's OAuth client ID with the scopes
 *    admin.directory.group and admin.directory.group.member.
 * 3. Set ADMIN_EMAIL (Workspace admin to impersonate). Optional:
 *    GOOGLE_GROUPS_SA_EMAIL to sign as a different SA than the runtime one.
 */

import { google } from 'googleapis';
import type { GoogleAuth } from 'google-auth-library';
import * as admin from 'firebase-admin';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const JWT_BEARER_GRANT = 'urn:ietf:params:oauth:grant-type:jwt-bearer';
const TOKEN_LIFETIME_SECONDS = 3600;
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

const DIRECTORY_SCOPES = [
  'https://www.googleapis.com/auth/admin.directory.group',
  'https://www.googleapis.com/auth/admin.directory.group.member',
];
const SHEETS_SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

interface DelegatedToken {
  accessToken: string;
  expiresAt: number;
}

// Keyed by the space-separated scope string (one token per scope set).
const tokenCache = new Map<string, DelegatedToken>();

// The admin email to impersonate for API calls
function getAdminEmail(): string {
  const config = admin.app().options;
  // Try environment variable first, then fall back
  return (
    process.env.ADMIN_EMAIL ||
    (config as any)?.admin?.email ||
    'contacto@secid.mx'
  );
}

/**
 * Service account that signs the delegation JWT. Defaults to the runtime
 * identity reported by ADC (the Compute default SA on gen2).
 */
async function resolveServiceAccountEmail(auth: GoogleAuth): Promise<string> {
  const override = process.env.GOOGLE_GROUPS_SA_EMAIL;
  if (override) return override;
  const credentials = await auth.getCredentials();
  if (!credentials.client_email) {
    throw new Error(
      'Could not resolve the runtime service account email from ADC; ' +
        'set GOOGLE_GROUPS_SA_EMAIL'
    );
  }
  return credentials.client_email;
}

/**
 * Sign the domain-wide-delegation assertion through the IAM Credentials
 * API. Requires roles/iam.serviceAccountTokenCreator on `saEmail`.
 */
async function signDelegationJwt(
  auth: GoogleAuth,
  saEmail: string,
  subject: string,
  scopes: string[]
): Promise<string> {
  const iat = Math.floor(Date.now() / 1000);
  const payload = {
    iss: saEmail,
    sub: subject,
    scope: scopes.join(' '),
    aud: TOKEN_URL,
    iat,
    exp: iat + TOKEN_LIFETIME_SECONDS,
  };
  const iamcredentials = google.iamcredentials({ version: 'v1', auth });
  const response = await iamcredentials.projects.serviceAccounts.signJwt({
    name: `projects/-/serviceAccounts/${saEmail}`,
    requestBody: { payload: JSON.stringify(payload) },
  });
  if (!response.data.signedJwt) {
    throw new Error('IAM Credentials signJwt returned no signedJwt');
  }
  return response.data.signedJwt;
}

/**
 * Exchange the signed assertion for a delegated access token.
 */
async function exchangeJwtForToken(signedJwt: string): Promise<DelegatedToken> {
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: JWT_BEARER_GRANT,
      assertion: signedJwt,
    }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Token exchange failed (${response.status}): ${detail}`);
  }
  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };
  return {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

function isFresh(token: DelegatedToken | undefined): token is DelegatedToken {
  return !!token && token.expiresAt - REFRESH_MARGIN_MS > Date.now();
}

/**
 * Delegated access token for `scopes`, impersonating the admin email.
 * Cached until ~5 minutes before expiry.
 */
async function getDelegatedAccessToken(scopes: string[]): Promise<string> {
  const cacheKey = scopes.join(' ');
  const cached = tokenCache.get(cacheKey);
  if (isFresh(cached)) return cached.accessToken;

  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  const saEmail = await resolveServiceAccountEmail(auth);
  const signedJwt = await signDelegationJwt(
    auth,
    saEmail,
    getAdminEmail(),
    scopes
  );
  const token = await exchangeJwtForToken(signedJwt);
  tokenCache.set(cacheKey, token);
  return token.accessToken;
}

/**
 * OAuth2 client carrying a delegated access token for `scopes`.
 */
async function getDelegatedAuth(scopes: string[]) {
  const accessToken = await getDelegatedAccessToken(scopes);
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return auth;
}

/**
 * Get authenticated Google Admin SDK client using domain-wide delegation
 */
async function getAdminClient() {
  const auth = await getDelegatedAuth(DIRECTORY_SCOPES);
  return google.admin({ version: 'directory_v1', auth });
}

export interface GroupMember {
  email: string;
  role: string; // OWNER, MANAGER, MEMBER
  status: string;
  type: string;
}

export interface GoogleGroup {
  email: string;
  name: string;
  description: string;
  directMembersCount: string;
}

/**
 * Add a member to a Google Group
 */
export async function addMemberToGroup(
  groupEmail: string,
  memberEmail: string,
  role: string = 'MEMBER'
): Promise<boolean> {
  try {
    const client = await getAdminClient();
    await client.members.insert({
      groupKey: groupEmail,
      requestBody: {
        email: memberEmail,
        role: role,
      },
    });
    console.log(`Added ${memberEmail} to ${groupEmail}`);
    return true;
  } catch (error: any) {
    // Member already exists is not an error
    if (error?.code === 409) {
      console.log(`${memberEmail} already in ${groupEmail}`);
      return true;
    }
    console.error(
      `Error adding ${memberEmail} to ${groupEmail}:`,
      error?.message
    );
    return false;
  }
}

/**
 * Remove a member from a Google Group
 */
export async function removeMemberFromGroup(
  groupEmail: string,
  memberEmail: string
): Promise<boolean> {
  try {
    const client = await getAdminClient();
    await client.members.delete({
      groupKey: groupEmail,
      memberKey: memberEmail,
    });
    console.log(`Removed ${memberEmail} from ${groupEmail}`);
    return true;
  } catch (error: any) {
    // Member not found is not an error
    if (error?.code === 404) {
      console.log(`${memberEmail} not in ${groupEmail}`);
      return true;
    }
    console.error(
      `Error removing ${memberEmail} from ${groupEmail}:`,
      error?.message
    );
    return false;
  }
}

/**
 * Remove a member from all Google Groups
 */
export async function removeMemberFromAllGroups(
  memberEmail: string,
  groupEmails: string[]
): Promise<void> {
  await Promise.all(
    groupEmails.map((group) => removeMemberFromGroup(group, memberEmail))
  );
}

/**
 * List all members of a Google Group
 */
export async function listGroupMembers(
  groupEmail: string
): Promise<GroupMember[]> {
  try {
    const client = await getAdminClient();
    const members: GroupMember[] = [];
    let pageToken: string | undefined;

    do {
      const response = await client.members.list({
        groupKey: groupEmail,
        maxResults: 200,
        pageToken,
      });

      if (response.data.members) {
        for (const member of response.data.members) {
          members.push({
            email: member.email || '',
            role: member.role || 'MEMBER',
            status: member.status || 'ACTIVE',
            type: member.type || 'USER',
          });
        }
      }

      pageToken = response.data.nextPageToken || undefined;
    } while (pageToken);

    return members;
  } catch (error: any) {
    console.error(`Error listing members of ${groupEmail}:`, error?.message);
    return [];
  }
}

/**
 * List all Google Groups in the domain
 */
export async function listAllGroups(): Promise<GoogleGroup[]> {
  try {
    const client = await getAdminClient();
    const response = await client.groups.list({
      domain: 'secid.mx',
      maxResults: 100,
    });

    if (!response.data.groups) return [];

    return response.data.groups.map((group) => ({
      email: group.email || '',
      name: group.name || '',
      description: group.description || '',
      directMembersCount: group.directMembersCount || '0',
    }));
  } catch (error: any) {
    console.error('Error listing groups:', error?.message);
    return [];
  }
}

/**
 * Get all groups a member belongs to
 */
export async function getMemberGroups(
  memberEmail: string,
  allGroupEmails: string[]
): Promise<string[]> {
  const memberGroups: string[] = [];

  for (const groupEmail of allGroupEmails) {
    try {
      const client = await getAdminClient();
      await client.members.get({
        groupKey: groupEmail,
        memberKey: memberEmail,
      });
      memberGroups.push(groupEmail);
    } catch {
      // Member not in this group
    }
  }

  return memberGroups;
}

/**
 * Export data to Google Sheets
 */
export async function exportToGoogleSheets(
  data: any[][],
  headers: string[],
  title: string
): Promise<string> {
  const auth = await getDelegatedAuth(SHEETS_SCOPES);
  const sheets = google.sheets({ version: 'v4', auth });

  // Create new spreadsheet
  const spreadsheet = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title },
      sheets: [{ properties: { title: 'Directorio' } }],
    },
  });

  const spreadsheetId = spreadsheet.data.spreadsheetId!;

  // Write data
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'Directorio!A1',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [headers, ...data],
    },
  });

  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
}
