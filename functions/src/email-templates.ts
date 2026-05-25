/**
 * Email templates for onboarding lifecycle notifications.
 *
 * Plain HTML strings. Trigger Email extension writes to `mail/` and
 * sends via SMTP. Same visual language as the existing alternate-email
 * and job-match templates: SECiD gradient header, button CTA, footer.
 *
 * Locale: default 'es'. Pass `lang: 'en'` for English.
 */

type Lang = 'es' | 'en';

/**
 * Escape HTML entities so user-controlled values can't smuggle markup
 * into the rendered email (e.g. <script>, <img onerror>, attacker-set
 * displayName). Email clients vary in how they handle scripts but
 * <img onerror>, <a href="javascript:">, and CSS-based exfil all work
 * in enough clients to matter. Apply to every interpolated string
 * that originated from user input or from a Firestore doc that may
 * have been written by a user (QA pass §10.8 fallout).
 */
function escapeHtml(s: string | undefined | null): string {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface BaseTemplateParams {
  title: string;
  bodyHtml: string;
  ctaHref?: string;
  ctaLabel?: string;
  footnote?: string;
}

/**
 * Shared shell — every onboarding email goes through here so visual
 * tweaks land in one place.
 */
function shell({
  title,
  bodyHtml,
  ctaHref,
  ctaLabel,
  footnote,
}: BaseTemplateParams): string {
  const cta =
    ctaHref && ctaLabel
      ? `<p style="text-align:center; margin:24px 0;">
           <a href="${ctaHref}" style="display:inline-block; padding:12px 24px; background:#003B5C; color:#fff; text-decoration:none; border-radius:8px; font-weight:600;">${ctaLabel}</a>
         </p>`
      : '';
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; background:#f5f5f5; margin:0; padding:20px;">
  <div style="max-width:600px; margin:0 auto; background:#fff; border-radius:12px; overflow:hidden;">
    <div style="background:linear-gradient(135deg,#003B5C,#C4A24C); padding:30px; text-align:center; color:#fff;">
      <h1 style="margin:0; font-size:24px;">SECiD</h1>
    </div>
    <div style="padding:30px;">
      <h2 style="margin:0 0 16px; font-size:20px; color:#003B5C;">${title}</h2>
      ${bodyHtml}
      ${cta}
      ${footnote ? `<p style="font-size:12px; color:#999; margin-top:24px;">${footnote}</p>` : ''}
    </div>
    <div style="padding:20px 30px; text-align:center; color:#999; font-size:12px; background:#fafafa;">
      <p style="margin:0;">SECiD — Sociedad de Egresados en Ciencia de Datos, UNAM</p>
    </div>
  </div>
</body>
</html>`;
}

const t = <T extends Record<Lang, string>>(strings: T, lang: Lang): string =>
  strings[lang] ?? strings.es;

interface WelcomeParams {
  recipientName: string;
  onboardingUrl: string;
  lang?: Lang;
}

/**
 * §0.1 #1 — Welcome email enviado por onUserDocCreated cuando se crea
 * el doc de Firestore (después de signup).
 */
export function generateWelcomeEmail(params: WelcomeParams): {
  subject: string;
  html: string;
} {
  const lang = params.lang ?? 'es';
  const subject = t(
    {
      es: '¡Bienvenido a SECiD! Completa tu perfil',
      en: 'Welcome to SECiD! Complete your profile',
    },
    lang
  );
  const greeting = t(
    {
      es: `Hola${params.recipientName ? ` ${escapeHtml(params.recipientName)}` : ''},`,
      en: `Hi${params.recipientName ? ` ${escapeHtml(params.recipientName)}` : ''},`,
    },
    lang
  );
  const body = t(
    {
      es: `Gracias por unirte a SECiD, la Sociedad de Egresados en Ciencia de Datos de la UNAM. Para acceder a todas las funciones (jobs, mentoría, foros, eventos), completa tu perfil y verifica tu cuenta UNAM.`,
      en: `Thanks for joining SECiD, the UNAM Data Science Alumni Society. To unlock all features (jobs, mentorship, forums, events), please complete your profile and verify your UNAM account.`,
    },
    lang
  );
  const ctaLabel = t(
    { es: 'Completar mi perfil', en: 'Complete my profile' },
    lang
  );
  const footnote = t(
    {
      es: 'Si no creaste esta cuenta, puedes ignorar este correo.',
      en: 'If you did not create this account, you can ignore this email.',
    },
    lang
  );
  return {
    subject,
    html: shell({
      title: subject,
      bodyHtml: `<p>${greeting}</p><p>${body}</p>`,
      ctaHref: params.onboardingUrl,
      ctaLabel,
      footnote,
    }),
  };
}

interface AdminPendingParams {
  memberName: string;
  memberEmail: string;
  numeroCuenta?: string;
  registrationType?: string;
  adminPanelUrl: string;
}

/**
 * §0.1 #2 — Admin notification cuando una solicitud entra en `pending`.
 * Va al ADMIN_EMAIL, default `contacto@secid.mx`.
 */
export function generateAdminPendingNotif(params: AdminPendingParams): {
  subject: string;
  html: string;
} {
  // Subject is plain text in all clients, so no escape needed; HTML body
  // interpolations DO need escapeHtml() — email + numeroCuenta + type are
  // user-controlled values from the Firestore user doc.
  const subject = `Nueva solicitud pendiente: ${params.memberName || params.memberEmail}`;
  const details = `
    <ul style="line-height:1.8;">
      <li><strong>Email</strong>: ${escapeHtml(params.memberEmail)}</li>
      ${params.numeroCuenta ? `<li><strong>Número de cuenta</strong>: ${escapeHtml(params.numeroCuenta)}</li>` : ''}
      ${params.registrationType ? `<li><strong>Tipo</strong>: ${escapeHtml(params.registrationType)}</li>` : ''}
    </ul>`;
  return {
    subject,
    html: shell({
      title: 'Nueva solicitud de membresía',
      bodyHtml: `<p>Un usuario completó el onboarding y su solicitud está pendiente de revisión.</p>${details}`,
      ctaHref: params.adminPanelUrl,
      ctaLabel: 'Revisar en el panel de admin',
      footnote:
        'Este correo se envió automáticamente al detectar el cambio de estado del usuario.',
    }),
  };
}

interface ApprovedParams {
  recipientName: string;
  dashboardUrl: string;
  lang?: Lang;
}

/**
 * §0.1 #3 — Email al user cuando admin aprueba la membresía
 * (pending → active).
 */
export function generateApprovedEmail(params: ApprovedParams): {
  subject: string;
  html: string;
} {
  const lang = params.lang ?? 'es';
  const subject = t(
    {
      es: '¡Tu solicitud fue aprobada! Bienvenido oficialmente a SECiD',
      en: 'Your application was approved! Welcome to SECiD',
    },
    lang
  );
  const greeting = t(
    {
      es: `Hola${params.recipientName ? ` ${escapeHtml(params.recipientName)}` : ''},`,
      en: `Hi${params.recipientName ? ` ${escapeHtml(params.recipientName)}` : ''},`,
    },
    lang
  );
  const body = t(
    {
      es: `Ya eres miembro oficial de SECiD. Tienes acceso completo al directorio, foros, jobs, eventos y mentoría. Te agregamos al grupo de miembros para recibir comunicados.`,
      en: `You are now an official SECiD member. You have full access to the directory, forums, jobs, events, and mentorship. We have added you to the members group for announcements.`,
    },
    lang
  );
  const ctaLabel = t({ es: 'Ir al dashboard', en: 'Go to dashboard' }, lang);
  return {
    subject,
    html: shell({
      title: subject,
      bodyHtml: `<p>${greeting}</p><p>${body}</p>`,
      ctaHref: params.dashboardUrl,
      ctaLabel,
    }),
  };
}

interface RejectedParams {
  recipientName: string;
  reason?: string;
  contactEmail: string;
  lang?: Lang;
}

/**
 * Email al user cuando admin rechaza/regresa a colaborador.
 */
export function generateRejectedEmail(params: RejectedParams): {
  subject: string;
  html: string;
} {
  const lang = params.lang ?? 'es';
  const subject = t(
    {
      es: 'Tu solicitud de membresía requiere más información',
      en: 'Your membership application needs more information',
    },
    lang
  );
  const greeting = t(
    {
      es: `Hola${params.recipientName ? ` ${escapeHtml(params.recipientName)}` : ''},`,
      en: `Hi${params.recipientName ? ` ${escapeHtml(params.recipientName)}` : ''},`,
    },
    lang
  );
  const body = t(
    {
      es: `Tu solicitud no pudo ser aprobada en esta ocasión. ${params.reason ? `Motivo: ${escapeHtml(params.reason)}.` : ''} Si crees que es un error, escríbenos a ${escapeHtml(params.contactEmail)} y revisamos.`,
      en: `Your application could not be approved at this time. ${params.reason ? `Reason: ${escapeHtml(params.reason)}.` : ''} If you believe this is an error, write to ${escapeHtml(params.contactEmail)} and we'll review.`,
    },
    lang
  );
  return {
    subject,
    html: shell({
      title: subject,
      bodyHtml: `<p>${greeting}</p><p>${body}</p>`,
    }),
  };
}

interface StatusChangeParams {
  recipientName: string;
  newStatus: 'suspended' | 'deactivated' | 'alumni';
  contactEmail: string;
  lang?: Lang;
}

/**
 * Email para cambios de estado tardíos (suspend/deactivate/alumni).
 */
export function generateStatusChangeEmail(params: StatusChangeParams): {
  subject: string;
  html: string;
} {
  const lang = params.lang ?? 'es';
  const greeting = t(
    {
      es: `Hola${params.recipientName ? ` ${escapeHtml(params.recipientName)}` : ''},`,
      en: `Hi${params.recipientName ? ` ${escapeHtml(params.recipientName)}` : ''},`,
    },
    lang
  );
  const subjects: Record<typeof params.newStatus, Record<Lang, string>> = {
    suspended: {
      es: 'Tu cuenta SECiD fue suspendida',
      en: 'Your SECiD account was suspended',
    },
    deactivated: {
      es: 'Tu cuenta SECiD fue desactivada',
      en: 'Your SECiD account was deactivated',
    },
    alumni: {
      es: 'Tu estatus en SECiD cambió a alumni',
      en: 'Your SECiD status changed to alumni',
    },
  };
  const bodies: Record<typeof params.newStatus, Record<Lang, string>> = {
    suspended: {
      es: `Tu cuenta fue suspendida. Esto significa que no podrás acceder al dashboard hasta nuevo aviso. Si crees que es un error, escríbenos a ${params.contactEmail}.`,
      en: `Your account was suspended. You will not be able to access the dashboard until further notice. If you believe this is an error, write to ${params.contactEmail}.`,
    },
    deactivated: {
      es: `Tu cuenta fue desactivada. Si quieres reactivarla, escríbenos a ${params.contactEmail}.`,
      en: `Your account was deactivated. If you want to reactivate it, write to ${params.contactEmail}.`,
    },
    alumni: {
      es: `Tu estatus cambió a alumni. Sigues teniendo acceso al directorio y comunicados generales, pero ya no perteneces al grupo de miembros activos.`,
      en: `Your status changed to alumni. You retain access to the directory and general announcements, but you no longer belong to the active members group.`,
    },
  };
  const subject = subjects[params.newStatus][lang];
  const body = bodies[params.newStatus][lang];
  return {
    subject,
    html: shell({
      title: subject,
      bodyHtml: `<p>${greeting}</p><p>${body}</p>`,
    }),
  };
}
