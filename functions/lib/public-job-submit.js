"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitPublicJob = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const db = admin.firestore();
const MAX_FIELD_LENGTH = 10000;
const MAX_ARRAY_LENGTH = 50;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function sanitize(str, maxLen = MAX_FIELD_LENGTH) {
    return str.replace(/<[^>]*>/g, "").trim().slice(0, maxLen);
}
function sanitizeArray(arr, maxLen = MAX_FIELD_LENGTH) {
    return arr.slice(0, MAX_ARRAY_LENGTH).map((item) => sanitize(item, maxLen));
}
function validateRequiredFields(data) {
    const requiredFields = [
        "title",
        "company",
        "description",
        "contactEmail",
        "contactName",
    ];
    for (const field of requiredFields) {
        const value = data[field];
        if (!value || (typeof value === "string" && value.trim().length === 0)) {
            throw new https_1.HttpsError("invalid-argument", `${field} is required`);
        }
    }
}
function validateEmailFormat(email) {
    if (!EMAIL_REGEX.test(email)) {
        throw new https_1.HttpsError("invalid-argument", "contactEmail is not a valid email address");
    }
}
function buildSanitizedDocument(data) {
    const doc = {
        title: sanitize(data.title, 200),
        company: sanitize(data.company, 200),
        description: sanitize(data.description),
        contactEmail: sanitize(data.contactEmail, 254),
        contactName: sanitize(data.contactName, 200),
        status: "pending_review",
        submittedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (data.salaryMin !== undefined) {
        doc.salaryMin = Number(data.salaryMin);
    }
    if (data.salaryMax !== undefined) {
        doc.salaryMax = Number(data.salaryMax);
    }
    if (data.salaryCurrency) {
        doc.salaryCurrency = sanitize(data.salaryCurrency, 10);
    }
    if (data.salaryPeriod) {
        doc.salaryPeriod = sanitize(data.salaryPeriod, 50);
    }
    if (Array.isArray(data.responsibilities) && data.responsibilities.length > 0) {
        doc.responsibilities = sanitizeArray(data.responsibilities);
    }
    if (Array.isArray(data.benefits) && data.benefits.length > 0) {
        doc.benefits = sanitizeArray(data.benefits);
    }
    if (Array.isArray(data.tags) && data.tags.length > 0) {
        doc.tags = sanitizeArray(data.tags, 100);
    }
    if (data.applicationMethod) {
        doc.applicationMethod = sanitize(data.applicationMethod, 50);
    }
    if (data.applicationUrl) {
        doc.applicationUrl = sanitize(data.applicationUrl, 2048);
    }
    if (data.applicationEmail) {
        doc.applicationEmail = sanitize(data.applicationEmail, 254);
    }
    if (data.applicationDeadline) {
        doc.applicationDeadline = sanitize(data.applicationDeadline, 50);
    }
    return doc;
}
exports.submitPublicJob = (0, https_1.onCall)(async (request) => {
    const data = request.data;
    validateRequiredFields(data);
    validateEmailFormat(data.contactEmail);
    const sanitizedDoc = buildSanitizedDocument(data);
    const docRef = await db.collection("public_job_submissions").add(sanitizedDoc);
    return { success: true, submissionId: docRef.id };
});
//# sourceMappingURL=public-job-submit.js.map