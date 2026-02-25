/**
 * Google Admin SDK integration for SECiD
 * Uses domain-wide delegation to manage Google Workspace Groups
 *
 * Setup required (one-time):
 * 1. Enable domain-wide delegation on the Firebase service account
 * 2. In Google Admin Console → Security → API Controls → Domain-wide delegation:
 *    - Add the service account's client ID
 *    - Scopes: admin.directory.group, admin.directory.group.member
 * 3. Set admin email: firebase functions:config:set admin.email="artemio@secid.mx"
 */

import {google} from "googleapis";
import * as admin from "firebase-admin";

// The admin email to impersonate for API calls
function getAdminEmail(): string {
  const config = admin.app().options;
  // Try environment variable first, then fall back
  return process.env.ADMIN_EMAIL ||
    (config as any)?.admin?.email ||
    "contacto@secid.mx";
}

/**
 * Get authenticated Google Admin SDK client using domain-wide delegation
 */
async function getAdminClient() {
  const auth = new google.auth.GoogleAuth({
    scopes: [
      "https://www.googleapis.com/auth/admin.directory.group",
      "https://www.googleapis.com/auth/admin.directory.group.member",
      "https://www.googleapis.com/auth/spreadsheets",
    ],
    clientOptions: {
      subject: getAdminEmail(),
    },
  });

  return google.admin({version: "directory_v1", auth});
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
  role: string = "MEMBER"
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
    console.error(`Error adding ${memberEmail} to ${groupEmail}:`, error?.message);
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
    console.error(`Error removing ${memberEmail} from ${groupEmail}:`, error?.message);
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
            email: member.email || "",
            role: member.role || "MEMBER",
            status: member.status || "ACTIVE",
            type: member.type || "USER",
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
      domain: "secid.mx",
      maxResults: 100,
    });

    if (!response.data.groups) return [];

    return response.data.groups.map((group) => ({
      email: group.email || "",
      name: group.name || "",
      description: group.description || "",
      directMembersCount: group.directMembersCount || "0",
    }));
  } catch (error: any) {
    console.error("Error listing groups:", error?.message);
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
  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    clientOptions: {
      subject: getAdminEmail(),
    },
  });

  const sheets = google.sheets({version: "v4", auth});

  // Create new spreadsheet
  const spreadsheet = await sheets.spreadsheets.create({
    requestBody: {
      properties: {title},
      sheets: [{properties: {title: "Directorio"}}],
    },
  });

  const spreadsheetId = spreadsheet.data.spreadsheetId!;

  // Write data
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Directorio!A1",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [headers, ...data],
    },
  });

  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
}
