/**
 * Copy for the announcement composer (F20). Same inline es/en pattern as
 * the other admin components (SurveyAdminPage, newsletter-form-schema).
 */
export type Lang = 'es' | 'en';

const labels = {
  subject: { es: 'Asunto', en: 'Subject' },
  subjectPlaceholder: {
    es: 'Ej. Asamblea anual de SECiD',
    en: 'E.g. SECiD annual assembly',
  },
  body: { es: 'Cuerpo (markdown)', en: 'Body (markdown)' },
  bodyHelp: {
    es: 'Soporta **negritas**, *cursivas*, listas, encabezados (#) y ligas [texto](https://…). El HTML se muestra como texto.',
    en: 'Supports **bold**, *italics*, lists, headings (#) and links [text](https://…). HTML is shown as text.',
  },
  preview: { es: 'Vista previa', en: 'Preview' },
  previewEmpty: {
    es: 'Escribe el cuerpo para ver la vista previa.',
    en: 'Type the body to see the preview.',
  },
  audience: { es: 'Audiencia', en: 'Audience' },
  audienceAll: { es: 'Todos los miembros activos', en: 'All active members' },
  audienceCampus: { es: 'Por sede', en: 'By campus' },
  audienceGroup: { es: 'Por grupo RBAC', en: 'By RBAC group' },
  campus: { es: 'Sede', en: 'Campus' },
  group: { es: 'Grupo', en: 'Group' },
  language: { es: 'Idioma del correo', en: 'Email language' },
  sendTest: { es: 'Enviarme prueba', en: 'Send me a test' },
  send: { es: 'Enviar', en: 'Send' },
  sending: { es: 'Enviando…', en: 'Sending…' },
  counting: { es: 'Contando destinatarios…', en: 'Counting recipients…' },
  confirmTitle: { es: 'Confirmar envío', en: 'Confirm send' },
  confirmBody: {
    es: 'Se enviará «{subject}» a {count} destinatarios. Esta acción no se puede deshacer.',
    en: '"{subject}" will be sent to {count} recipients. This cannot be undone.',
  },
  confirmNone: {
    es: 'No hay destinatarios para esta audiencia.',
    en: 'There are no recipients for this audience.',
  },
  confirmSend: { es: 'Sí, enviar', en: 'Yes, send' },
  cancel: { es: 'Cancelar', en: 'Cancel' },
  sentOk: {
    es: 'Comunicado enviado a {count} destinatarios.',
    en: 'Announcement sent to {count} recipients.',
  },
  testOk: {
    es: 'Prueba enviada a tu correo.',
    en: 'Test sent to your email.',
  },
  errorGeneric: {
    es: 'No se pudo enviar. Intenta de nuevo.',
    en: 'Could not send. Please try again.',
  },
  errorDenied: {
    es: 'No tienes permiso para enviar comunicados.',
    en: 'You do not have permission to send announcements.',
  },
  validation: {
    es: 'Escribe un asunto y un cuerpo.',
    en: 'Enter a subject and a body.',
  },
  history: { es: 'Comunicados enviados', en: 'Sent announcements' },
  historyEmpty: {
    es: 'Aún no se ha enviado ningún comunicado.',
    en: 'No announcements have been sent yet.',
  },
  colSubject: { es: 'Asunto', en: 'Subject' },
  colDate: { es: 'Fecha', en: 'Date' },
  colAudience: { es: 'Audiencia', en: 'Audience' },
  colCount: { es: 'Destinatarios', en: 'Recipients' },
  colStatus: { es: 'Estado', en: 'Status' },
  statusSent: { es: 'Enviado', en: 'Sent' },
  statusFailed: { es: 'Falló', en: 'Failed' },
  audienceTest: { es: 'Prueba', en: 'Test' },
  volumeNote: {
    es: 'El correo sale por SMTP (~500 destinatarios/día). Ver docs/runbooks/communications.md.',
    en: 'Mail goes out over SMTP (~500 recipients/day). See docs/runbooks/communications.md.',
  },
} as const;

export type LabelKey = keyof typeof labels;

export function t(
  key: LabelKey,
  lang: Lang,
  vars: Record<string, string | number> = {}
): string {
  return Object.entries(vars).reduce<string>(
    (text, [name, value]) => text.replace(`{${name}}`, String(value)),
    labels[key][lang]
  );
}
