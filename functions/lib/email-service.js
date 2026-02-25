"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = sendEmail;
exports.sendBatchEmails = sendBatchEmails;
exports.generateJobMatchEmail = generateJobMatchEmail;
const admin = require("firebase-admin");
/**
 * Writes an email document to the 'mail' collection.
 * Firebase Trigger Email extension picks these up and sends via configured SMTP/SendGrid.
 */
async function sendEmail({ to, subject, html }) {
    const docRef = await admin.firestore().collection("mail").add({
        to,
        message: {
            subject,
            html,
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return docRef.id;
}
/**
 * Send email to multiple recipients (batch)
 */
async function sendBatchEmails(emails) {
    const batch = admin.firestore().batch();
    const mailCollection = admin.firestore().collection("mail");
    for (const email of emails) {
        const docRef = mailCollection.doc();
        batch.set(docRef, {
            to: email.to,
            message: {
                subject: email.subject,
                html: email.html,
            },
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
    await batch.commit();
}
/**
 * Generate job match notification email HTML
 */
function generateJobMatchEmail(params) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #003B5C, #C4A24C); padding: 30px; text-align: center; color: white; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .match-badge { display: inline-block; padding: 6px 16px; background: ${params.matchScore >= 80 ? "#22c55e" : params.matchScore >= 60 ? "#eab308" : "#3b82f6"}; color: white; border-radius: 20px; font-weight: 600; margin-bottom: 16px; }
    .job-card { background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 16px 0; }
    .job-title { font-size: 18px; font-weight: 600; color: #003B5C; margin: 0 0 8px; }
    .company { color: #666; margin: 0 0 12px; }
    .btn { display: inline-block; padding: 12px 24px; background: #003B5C; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; }
    .footer { padding: 20px 30px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>SECiD - Nueva Oportunidad</h1>
    </div>
    <div class="content">
      <p>Hola ${params.recipientName},</p>
      <span class="match-badge">${params.matchScore}% Match</span>
      <div class="job-card">
        <p class="job-title">${params.jobTitle}</p>
        <p class="company">${params.company}</p>
      </div>
      <p>Encontramos una nueva oportunidad laboral que coincide con tu perfil.</p>
      <a href="${params.jobUrl}" class="btn">Ver Oportunidad</a>
    </div>
    <div class="footer">
      <p>SECiD - Sociedad de Egresados en Ciencia de Datos, UNAM</p>
      <p>Recibiste este correo porque tienes alertas de empleo activadas.</p>
    </div>
  </div>
</body>
</html>`;
}
//# sourceMappingURL=email-service.js.map