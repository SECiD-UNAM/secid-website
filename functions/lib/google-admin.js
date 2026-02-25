"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.addMemberToGroup = addMemberToGroup;
exports.removeMemberFromGroup = removeMemberFromGroup;
exports.removeMemberFromAllGroups = removeMemberFromAllGroups;
exports.listGroupMembers = listGroupMembers;
exports.listAllGroups = listAllGroups;
exports.getMemberGroups = getMemberGroups;
exports.exportToGoogleSheets = exportToGoogleSheets;
const googleapis_1 = require("googleapis");
const admin = require("firebase-admin");
// The admin email to impersonate for API calls
function getAdminEmail() {
    var _a;
    const config = admin.app().options;
    // Try environment variable first, then fall back
    return process.env.ADMIN_EMAIL ||
        ((_a = config === null || config === void 0 ? void 0 : config.admin) === null || _a === void 0 ? void 0 : _a.email) ||
        "contacto@secid.mx";
}
/**
 * Get authenticated Google Admin SDK client using domain-wide delegation
 */
async function getAdminClient() {
    const auth = new googleapis_1.google.auth.GoogleAuth({
        scopes: [
            "https://www.googleapis.com/auth/admin.directory.group",
            "https://www.googleapis.com/auth/admin.directory.group.member",
            "https://www.googleapis.com/auth/spreadsheets",
        ],
        clientOptions: {
            subject: getAdminEmail(),
        },
    });
    return googleapis_1.google.admin({ version: "directory_v1", auth });
}
/**
 * Add a member to a Google Group
 */
async function addMemberToGroup(groupEmail, memberEmail, role = "MEMBER") {
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
    }
    catch (error) {
        // Member already exists is not an error
        if ((error === null || error === void 0 ? void 0 : error.code) === 409) {
            console.log(`${memberEmail} already in ${groupEmail}`);
            return true;
        }
        console.error(`Error adding ${memberEmail} to ${groupEmail}:`, error === null || error === void 0 ? void 0 : error.message);
        return false;
    }
}
/**
 * Remove a member from a Google Group
 */
async function removeMemberFromGroup(groupEmail, memberEmail) {
    try {
        const client = await getAdminClient();
        await client.members.delete({
            groupKey: groupEmail,
            memberKey: memberEmail,
        });
        console.log(`Removed ${memberEmail} from ${groupEmail}`);
        return true;
    }
    catch (error) {
        // Member not found is not an error
        if ((error === null || error === void 0 ? void 0 : error.code) === 404) {
            console.log(`${memberEmail} not in ${groupEmail}`);
            return true;
        }
        console.error(`Error removing ${memberEmail} from ${groupEmail}:`, error === null || error === void 0 ? void 0 : error.message);
        return false;
    }
}
/**
 * Remove a member from all Google Groups
 */
async function removeMemberFromAllGroups(memberEmail, groupEmails) {
    await Promise.all(groupEmails.map((group) => removeMemberFromGroup(group, memberEmail)));
}
/**
 * List all members of a Google Group
 */
async function listGroupMembers(groupEmail) {
    try {
        const client = await getAdminClient();
        const members = [];
        let pageToken;
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
    }
    catch (error) {
        console.error(`Error listing members of ${groupEmail}:`, error === null || error === void 0 ? void 0 : error.message);
        return [];
    }
}
/**
 * List all Google Groups in the domain
 */
async function listAllGroups() {
    try {
        const client = await getAdminClient();
        const response = await client.groups.list({
            domain: "secid.mx",
            maxResults: 100,
        });
        if (!response.data.groups)
            return [];
        return response.data.groups.map((group) => ({
            email: group.email || "",
            name: group.name || "",
            description: group.description || "",
            directMembersCount: group.directMembersCount || "0",
        }));
    }
    catch (error) {
        console.error("Error listing groups:", error === null || error === void 0 ? void 0 : error.message);
        return [];
    }
}
/**
 * Get all groups a member belongs to
 */
async function getMemberGroups(memberEmail, allGroupEmails) {
    const memberGroups = [];
    for (const groupEmail of allGroupEmails) {
        try {
            const client = await getAdminClient();
            await client.members.get({
                groupKey: groupEmail,
                memberKey: memberEmail,
            });
            memberGroups.push(groupEmail);
        }
        catch (_a) {
            // Member not in this group
        }
    }
    return memberGroups;
}
/**
 * Export data to Google Sheets
 */
async function exportToGoogleSheets(data, headers, title) {
    const auth = new googleapis_1.google.auth.GoogleAuth({
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
        clientOptions: {
            subject: getAdminEmail(),
        },
    });
    const sheets = googleapis_1.google.sheets({ version: "v4", auth });
    // Create new spreadsheet
    const spreadsheet = await sheets.spreadsheets.create({
        requestBody: {
            properties: { title },
            sheets: [{ properties: { title: "Directorio" } }],
        },
    });
    const spreadsheetId = spreadsheet.data.spreadsheetId;
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
//# sourceMappingURL=google-admin.js.map