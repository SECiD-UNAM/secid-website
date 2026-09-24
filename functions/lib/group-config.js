"use strict";
/**
 * Google Admin Groups configuration for SECiD
 * Maps platform roles and commissions to Google Workspace group emails
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GROUP_MAP = void 0;
exports.getDefaultGroup = getDefaultGroup;
exports.getMembersGroup = getMembersGroup;
exports.getAllGroups = getAllGroups;
exports.GROUP_MAP = {
    members: "miembros@secid.mx",
    board: "direccion@secid.mx",
    collaborators: "colaboradores@secid.mx",
    outreach: "divulgacion@secid.mx",
    finance: "finanzas@secid.mx",
};
/**
 * Returns the default group for new users (collaborators)
 */
function getDefaultGroup() {
    return exports.GROUP_MAP.collaborators;
}
/**
 * Returns the group email for approved members
 */
function getMembersGroup() {
    return exports.GROUP_MAP.members;
}
/**
 * Returns all group emails as an array
 */
function getAllGroups() {
    return Object.values(exports.GROUP_MAP);
}
//# sourceMappingURL=group-config.js.map