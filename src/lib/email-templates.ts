import type {
  NotificationType,
  NotificationCategory,
  EmailTemplate,
} from '../types';

// Email template variables interface
interface TemplateVariables {
  [key: string]: any;
  user?: {
    name: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  site?: {
    name: string;
    url: string;
    logoUrl: string;
    supportEmail: string;
  };
}

// Base email styles
const emailStyles = {
  container: `
    max-width: 600px;
    margin: 0 auto;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    line-height: 1.6;
    color: #333333;
  `,
  header: `
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 40px 30px;
    text-align: center;
    color: white;
  `,
  logo: `
    max-width: 150px;
    height: auto;
    margin-bottom: 20px;
  `,
  title: `
    font-size: 24px;
    font-weight: 600;
    margin: 0;
    text-shadow: 0 1px 3px rgba(0,0,0,0.3);
  `,
  content: `
    background: white;
    padding: 40px 30px;
  `,
  button: `
    display: inline-block;
    background: #667eea;
    color: white;
    padding: 15px 30px;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 600;
    margin: 20px 0;
    text-align: center;
  `,
  footer: `
    background: #f8f9fa;
    padding: 30px;
    text-align: center;
    font-size: 14px;
    color: #666666;
    border-top: 1px solid #e9ecef;
  `,
  unsubscribe: `
    color: #999999;
    font-size: 12px;
    margin-top: 20px;
  `,
};

// Base HTML template
function createBaseTemplate(
  title: string,
  content: string,
  variables: TemplateVariables,
  options: {
    showUnsubscribe?: boolean;
    actionButton?: { text: string; url: string };
  } = {}
): string {
  const { site, user } = variables;
  const { showUnsubscribe = true, actionButton } = options;

  return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        * { box-sizing: border-box; }
        body { 
            margin: 0; 
            padding: 20px; 
            background-color: #f4f6f8;
            ${emailStyles.container}
        }
        .email-container { 
            background: white; 
            border-radius: 12px; 
            overflow: hidden; 
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        .header { ${emailStyles.header} }
        .logo { ${emailStyles.logo} }
        .title { ${emailStyles.title} }
        .content { ${emailStyles.content} }
        .button { ${emailStyles.button} }
        .footer { ${emailStyles.footer} }
        .unsubscribe { ${emailStyles.unsubscribe} }
        .notification-badge {
            background: #ff4757;
            color: white;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
            display: inline-block;
            margin-left: 10px;
        }
        .priority-urgent { border-left: 4px solid #ff4757; padding-left: 16px; }
        .priority-high { border-left: 4px solid #ffa502; padding-left: 16px; }
        .priority-normal { border-left: 4px solid #3742fa; padding-left: 16px; }
        .priority-low { border-left: 4px solid #747d8c; padding-left: 16px; }
        
        @media (max-width: 600px) {
            body { padding: 10px; }
            .header, .content, .footer { padding: 20px; }
            .title { font-size: 20px; }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            ${site?.logoUrl ? `<img src="${site.logoUrl}" alt="${site?.name || 'SECiD'}" class="logo">` : ''}
            <h1 class="title">${title}</h1>
        </div>
        
        <div class="content">
            ${content}
            
            ${
              actionButton
                ? `
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${actionButton.url}" class="button">${actionButton.text}</a>
                </div>
            `
                : ''
            }
        </div>
        
        <div class="footer">
            <p><strong>${site?.name || 'SECiD - Sociedad de Egresados en Ciencia de Datos'}</strong></p>
            <p>Conectando a la comunidad de científicos de datos de la UNAM</p>
            
            ${
              showUnsubscribe
                ? `
                <div class="unsubscribe">
                    <p>
                        Si no deseas recibir más notificaciones de este tipo, puedes 
                        <a href="${site?.url || ''}/unsubscribe?token=${user?.email || ''}">darte de baja aquí</a> 
                        o <a href="${site?.url || ''}/settings/notifications">gestionar tus preferencias</a>.
                    </p>
                </div>
            `
                : ''
            }
        </div>
    </div>
</body>
</html>
  `.trim();
}

// Template functions for each notification type
const templates: Record<
  NotificationType,
  (variables: TemplateVariables) => EmailTemplate
> = {
  job_match: (variables) => ({
    id: 'job_match',
    name: 'Job Match Notification',
    subject: `🎯 Nueva oportunidad laboral: ${variables?.job?.title || 'Trabajo'} en ${variables?.job?.company || 'Empresa'}`,
    htmlContent: createBaseTemplate(
      '¡Encontramos un trabajo perfecto para ti!',
      `
        <div class="priority-normal">
          <h2 style="color: #667eea; margin-top: 0;">💼 ${variables?.job?.title || 'Nuevo Trabajo'}</h2>
          <p><strong>Empresa:</strong> ${variables?.job?.company || 'No especificada'}</p>
          <p><strong>Ubicación:</strong> ${variables?.job?.location || 'No especificada'}</p>
          <p><strong>Tipo:</strong> ${variables?.job?.type || 'No especificado'}</p>
          <p><strong>Nivel:</strong> ${variables?.job?.level || 'No especificado'}</p>
          
          ${
            variables?.job?.description
              ? `
            <h3>Descripción del puesto:</h3>
            <p>${variables.job.description}</p>
          `
              : ''
          }
          
          ${
            variables?.job?.salaryRange
              ? `
            <p><strong>Rango salarial:</strong> $${variables.job.salaryRange.min} - $${variables.job.salaryRange.max} ${variables.job.salaryRange.currency}</p>
          `
              : ''
          }
          
          <p>Este trabajo coincide con tu perfil y preferencias. ¡No pierdas esta oportunidad!</p>
        </div>
      `,
      variables,
      {
        actionButton: {
          text: 'Ver Trabajo Completo',
          url: `${variables?.site?.url || ''}/jobs/${variables?.job?.id || ''}`,
        },
      }
    ),
    textContent: `
¡Nueva oportunidad laboral para ti!

${variables?.job?.title || 'Nuevo Trabajo'} en ${variables?.job?.company || 'Empresa'}
Ubicación: ${variables?.job?.location || 'No especificada'}
Tipo: ${variables?.job?.type || 'No especificado'}

Este trabajo coincide con tu perfil. Visita ${variables?.site?.url || ''}/jobs/${variables?.job?.id || ''} para más detalles.

--
SECiD - Sociedad de Egresados en Ciencia de Datos
    `.trim(),
    variables: [
      'user.name',
      'user.email',
      'job.title',
      'job.company',
      'job.location',
      'job.type',
      'job.level',
      'job.description',
      'job.salaryRange',
      'job.id',
      'site.url',
      'site.name',
    ],
    category: 'jobs',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),

  event_reminder: (variables) => ({
    id: 'event_reminder',
    name: 'Event Reminder',
    subject: `🗓️ Recordatorio: ${variables?.event?.title || 'Evento'} ${variables?.event?.timeUntil || 'pronto'}`,
    htmlContent: createBaseTemplate(
      'Recordatorio de Evento',
      `
        <div class="priority-high">
          <h2 style="color: #ffa502; margin-top: 0;">📅 ${variables?.event?.title || 'Evento Próximo'}</h2>
          <p><strong>Fecha y hora:</strong> ${variables?.event?.date || 'Por confirmar'}</p>
          <p><strong>Ubicación:</strong> ${variables?.event?.location || (variables?.event?.isVirtual ? '🌐 Evento virtual' : 'Por confirmar')}</p>
          
          ${
            variables?.event?.description
              ? `
            <h3>Descripción:</h3>
            <p>${variables.event.description}</p>
          `
              : ''
          }
          
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #856404;">
              <strong>⏰ ${variables?.event?.timeUntil || 'El evento está próximo'}</strong>
            </p>
          </div>
          
          <p>No olvides prepararte para este evento. ¡Te esperamos!</p>
        </div>
      `,
      variables,
      {
        actionButton: {
          text: 'Ver Detalles del Evento',
          url: `${variables?.site?.url || ''}/events/${variables?.event?.id || ''}`,
        },
      }
    ),
    textContent: `
Recordatorio de Evento

${variables?.event?.title || 'Evento Próximo'}
Fecha: ${variables?.event?.date || 'Por confirmar'}
Ubicación: ${variables?.event?.location || (variables?.event?.isVirtual ? 'Evento virtual' : 'Por confirmar')}

${variables?.event?.timeUntil || 'El evento está próximo'}

Más información: ${variables?.site?.url || ''}/events/${variables?.event?.id || ''}

--
SECiD - Sociedad de Egresados en Ciencia de Datos
    `.trim(),
    variables: [
      'user.name',
      'event.title',
      'event.date',
      'event.location',
      'event.isVirtual',
      'event.description',
      'event.timeUntil',
      'event.id',
      'site.url',
    ],
    category: 'events',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),

  mentorship_request: (variables) => ({
    id: 'mentorship_request',
    name: 'Mentorship Request',
    subject: `🤝 Nueva solicitud de mentoría de ${variables?.mentee?.name || 'un miembro'}`,
    htmlContent: createBaseTemplate(
      '¡Alguien quiere que seas su mentor!',
      `
        <div class="priority-normal">
          <h2 style="color: #5f27cd; margin-top: 0;">🎓 Solicitud de Mentoría</h2>
          <p>Hola ${variables?.user?.name || ''},</p>
          
          <p><strong>${variables?.mentee?.name || 'Un miembro'}</strong> te ha enviado una solicitud para que seas su mentor.</p>
          
          ${
            variables?.mentee?.background
              ? `
            <h3>Información del solicitante:</h3>
            <ul>
              <li><strong>Nombre:</strong> ${variables.mentee.name}</li>
              <li><strong>Nivel:</strong> ${variables.mentee.currentLevel || 'No especificado'}</li>
              <li><strong>Experiencia:</strong> ${variables.mentee.background.yearsOfExperience || 0} años</li>
              <li><strong>Rol actual:</strong> ${variables.mentee.background.currentRole || 'No especificado'}</li>
            </ul>
          `
              : ''
          }
          
          ${
            variables['request']?.message
              ? `
            <h3>Mensaje personal:</h3>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; font-style: italic;">
              "${variables['request']['message']}"
            </div>
          `
              : ''
          }
          
          ${
            variables['request']?.goals
              ? `
            <h3>Objetivos de mentoría:</h3>
            <ul>
              ${variables['request'].goals.map((goal: string) => `<li>${goal}</li>`).join('')}
            </ul>
          `
              : ''
          }
          
          <p>Puedes revisar el perfil completo y responder a la solicitud desde tu panel de mentoría.</p>
        </div>
      `,
      variables,
      {
        actionButton: {
          text: 'Revisar Solicitud',
          url: `${variables?.site?.url || ''}/mentorship/requests/${variables['request']?.id || ''}`,
        },
      }
    ),
    textContent: `
Nueva Solicitud de Mentoría

${variables?.mentee?.name || 'Un miembro'} quiere que seas su mentor.

${variables['request']?.message ? `Mensaje: "${variables['request']['message']}"` : ''}

Revisa la solicitud completa: ${variables?.site?.url || ''}/mentorship/requests/${variables['request']?.id || ''}

--
SECiD - Sociedad de Egresados en Ciencia de Datos
    `.trim(),
    variables: [
      'user.name',
      'mentee.name',
      'mentee.currentLevel',
      'mentee.background',
      'request.message',
      'request.goals',
      'request.id',
      'site.url',
    ],
    category: 'mentorship',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),

  message_received: (variables) => ({
    id: 'message_received',
    name: 'Message Received',
    subject: `💬 Nuevo mensaje de ${variables?.sender?.name || 'un miembro'}`,
    htmlContent: createBaseTemplate(
      'Tienes un nuevo mensaje',
      `
        <div class="priority-normal">
          <h2 style="color: #3742fa; margin-top: 0;">💬 Nuevo Mensaje</h2>
          <p>Hola ${variables?.user?.name || ''},</p>
          
          <p>Has recibido un nuevo mensaje de <strong>${variables?.sender?.name || 'un miembro'}</strong>.</p>
          
          ${
            variables['message']?.content
              ? `
            <div style="background: #f8f9fa; border-left: 4px solid #3742fa; padding: 15px; margin: 20px 0;">
              <p style="margin: 0;">${variables['message'].content}</p>
            </div>
          `
              : ''
          }
          
          <p>Responde desde tu panel de mensajes para continuar la conversación.</p>
        </div>
      `,
      variables,
      {
        actionButton: {
          text: 'Ver Mensaje',
          url: `${variables?.site?.url || ''}/messages/${variables['message']?.conversationId || ''}`,
        },
      }
    ),
    textContent: `
Nuevo Mensaje

De: ${variables?.sender?.name || 'Un miembro'}

${variables['message']?.content || ''}

Responder: ${variables?.site?.url || ''}/messages/${variables['message']?.conversationId || ''}

--
SECiD - Sociedad de Egresados en Ciencia de Datos
    `.trim(),
    variables: [
      'user.name',
      'sender.name',
      'message.content',
      'message.conversationId',
      'site.url',
    ],
    category: 'messages',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),

  forum_mention: (variables) => ({
    id: 'forum_mention',
    name: 'Forum Mention',
    subject: `@${variables?.user?.name || 'usuario'} te mencionaron en el foro`,
    htmlContent: createBaseTemplate(
      'Te mencionaron en el foro',
      `
        <div class="priority-normal">
          <h2 style="color: #2ed573; margin-top: 0;">💬 Mención en el Foro</h2>
          <p>Hola ${variables?.user?.name || ''},</p>
          
          <p><strong>${variables?.author?.name || 'Un miembro'}</strong> te mencionó en el tema: <strong>"${variables?.topic?.title || 'Tema del foro'}"</strong></p>
          
          ${
            variables?.post?.content
              ? `
            <div style="background: #f8f9fa; border: 1px solid #e9ecef; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0;">${variables.post.content}</p>
            </div>
          `
              : ''
          }
          
          <p>Únete a la conversación y comparte tu perspectiva.</p>
        </div>
      `,
      variables,
      {
        actionButton: {
          text: 'Ver en el Foro',
          url: `${variables?.site?.url || ''}/forum/topics/${variables?.topic?.id || ''}#post-${variables?.post?.id || ''}`,
        },
      }
    ),
    textContent: `
Mención en el Foro

${variables?.author?.name || 'Un miembro'} te mencionó en: "${variables?.topic?.title || 'Tema del foro'}"

${variables?.post?.content || ''}

Ver: ${variables?.site?.url || ''}/forum/topics/${variables?.topic?.id || ''}

--
SECiD - Sociedad de Egresados en Ciencia de Datos
    `.trim(),
    variables: [
      'user.name',
      'author.name',
      'topic.title',
      'topic.id',
      'post.content',
      'post.id',
      'site.url',
    ],
    category: 'forum',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),

  security_alert: (variables) => ({
    id: 'security_alert',
    name: 'Security Alert',
    subject: `🔒 Alerta de seguridad en tu cuenta de SECiD`,
    htmlContent: createBaseTemplate(
      'Alerta de Seguridad',
      `
        <div class="priority-urgent">
          <h2 style="color: #ff4757; margin-top: 0;">🔒 Alerta de Seguridad</h2>
          <p>Hola ${variables?.user?.name || ''},</p>
          
          <div style="background: #fff5f5; border: 1px solid #fed7d7; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #c53030;">
              <strong>⚠️ Actividad sospechosa detectada en tu cuenta</strong>
            </p>
          </div>
          
          <p><strong>Tipo de actividad:</strong> ${variables?.alert?.type || 'Actividad no autorizada'}</p>
          <p><strong>Fecha y hora:</strong> ${variables?.alert?.timestamp || 'Ahora mismo'}</p>
          <p><strong>Ubicación:</strong> ${variables?.alert?.location || 'No disponible'}</p>
          <p><strong>Dispositivo:</strong> ${variables?.alert?.device || 'No disponible'}</p>
          
          <h3>¿Qué hacer ahora?</h3>
          <ul>
            <li>Si reconoces esta actividad, puedes ignorar este mensaje</li>
            <li>Si NO reconoces esta actividad, cambia tu contraseña inmediatamente</li>
            <li>Revisa y revoca el acceso de dispositivos desconocidos</li>
            <li>Habilita la autenticación de dos factores si no la tienes activa</li>
          </ul>
          
          <p>Tu seguridad es nuestra prioridad. Si tienes alguna pregunta, contacta a nuestro equipo de soporte.</p>
        </div>
      `,
      variables,
      {
        actionButton: {
          text: 'Revisar Cuenta',
          url: `${variables?.site?.url || ''}/settings/security`,
        },
        showUnsubscribe: false,
      }
    ),
    textContent: `
ALERTA DE SEGURIDAD

Actividad sospechosa detectada en tu cuenta.

Tipo: ${variables?.alert?.type || 'Actividad no autorizada'}
Fecha: ${variables?.alert?.timestamp || 'Ahora mismo'}
Ubicación: ${variables?.alert?.location || 'No disponible'}

Si NO reconoces esta actividad, cambia tu contraseña inmediatamente:
${variables?.site?.url || ''}/settings/security

--
SECiD - Sociedad de Egresados en Ciencia de Datos
    `.trim(),
    variables: [
      'user.name',
      'alert.type',
      'alert.timestamp',
      'alert.location',
      'alert.device',
      'site.url',
    ],
    category: 'security',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),

  // Add more notification types...
  job_application: (variables) => templates.job_match(variables),
  job_expiring: (variables) => templates.job_match(variables),
  event_update: (variables) => templates.event_reminder(variables),
  event_cancelled: (variables) => templates.event_reminder(variables),
  message_reply: (variables) => templates.message_received(variables),
  connection_request: (variables) => templates.mentorship_request(variables),
  connection_accepted: (variables) => templates.mentorship_request(variables),
  mentorship_accepted: (variables) => templates.mentorship_request(variables),
  mentorship_session: (variables) => templates.mentorship_request(variables),
  forum_reply: (variables) => templates.forum_mention(variables),
  forum_topic_update: (variables) => templates.forum_mention(variables),
  badge_earned: (variables) => templates.forum_mention(variables),
  achievement_unlocked: (variables) => templates.forum_mention(variables),
  profile_view: (variables) => templates.message_received(variables),
  newsletter: (variables) => templates.message_received(variables),
  system_announcement: (variables) => templates.security_alert(variables),
  maintenance: (variables) => templates.security_alert(variables),
  payment_reminder: (variables) => templates.security_alert(variables),
  membership_expiring: (variables) => templates.security_alert(variables),
  data_export_ready: (variables) => templates.message_received(variables),
};

// Main function to get email template
export function getEmailTemplate(
  type: NotificationType,
  variables: TemplateVariables = {}
): EmailTemplate {
  // Default site variables
  const defaultVariables: TemplateVariables = {
    site: {
      name: 'SECiD',
      url: (process.env.SITE_URL as string) || 'https://secid.unam.mx',
      logoUrl: `${(process.env.SITE_URL as string) || 'https://secid.unam.mx'}/images/logo.png`,
      supportEmail: 'soporte@secid.unam.mx',
    },
    ...variables,
  };

  const templateFn = templates[type];
  if (!templateFn) {
    throw new Error(`Email template not found for notification type: ${type}`);
  }

  return templateFn(defaultVariables);
}

// Function to render template with variables
export function renderEmailTemplate(
  template: EmailTemplate,
  variables: TemplateVariables
): { subject: string; htmlContent: string; textContent: string } {
  let { subject, htmlContent, textContent } = template;

  // Replace variables in template
  template.variables.forEach((variable) => {
    const value = getNestedValue(variables, variable);
    if (value !== undefined) {
      const placeholder = `{{${variable}}}`;
      subject = subject.replace(new RegExp(placeholder, 'g'), String(value));
      htmlContent = htmlContent.replace(
        new RegExp(placeholder, 'g'),
        String(value)
      );
      textContent = textContent.replace(
        new RegExp(placeholder, 'g'),
        String(value)
      );
    }
  });

  return { subject, htmlContent, textContent };
}

// Helper function to get nested object values
function getNestedValue(obj: any, path: string): any {
  return path.split('').reduce((current, key) => current?.[key], obj);
}

// Email digest template
export function createEmailDigest(
  notifications: Array<{
    type: NotificationType;
    title: string;
    message: string;
    createdAt: Date;
    actionUrl?: string;
  }>,
  variables: TemplateVariables,
  frequency: 'daily' | 'weekly' | 'monthly'
): EmailTemplate {
  const frequencyText = {
    daily: 'diario',
    weekly: 'semanal',
    monthly: 'mensual',
  };

  const groupedNotifications = notifications.reduce(
    (acc, notification) => {
      const category = getCategoryFromType(notification.type);
      if (!acc[category]) acc[category] = [];
      acc[category].push(notification);
      return acc;
    },
    {} as Record<string, typeof notifications>
  );

  const categoryNames = {
    jobs: '💼 Empleos',
    events: '📅 Eventos',
    messages: '💬 Mensajes',
    connections: '🤝 Conexiones',
    mentorship: '🎓 Mentoría',
    forum: '💭 Foro',
    achievements: '🏆 Logros',
    system: '⚙️ Sistema',
    security: '🔒 Seguridad',
    billing: '💳 Facturación',
  };

  const contentSections = Object.entries(groupedNotifications)
    .map(
      ([category, categoryNotifications]) => `
    <div style="margin-bottom: 30px;">
      <h3 style="color: #667eea; border-bottom: 2px solid #e9ecef; padding-bottom: 10px;">
        ${categoryNames[category as keyof typeof categoryNames] || category}
        <span class="notification-badge">${categoryNotifications.length}</span>
      </h3>
      ${categoryNotifications
        .map(
          (notification) => `
        <div style="border: 1px solid #e9ecef; padding: 15px; margin: 10px 0; border-radius: 8px; background: #f8f9fa;">
          <h4 style="margin: 0 0 10px 0; color: #333;">${notification.title}</h4>
          <p style="margin: 0 0 10px 0; color: #666;">${notification['message']}</p>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <small style="color: #999;">${notification['createdAt'].toLocaleDateString('es-ES')}</small>
            ${notification.actionUrl ? `<a href="${notification.actionUrl}" style="color: #667eea; text-decoration: none; font-weight: 600;">Ver más →</a>` : ''}
          </div>
        </div>
      `
        )
        .join('')}
    </div>
  `
    )
    .join('');

  return {
    id: `digest_${frequency}`,
    name: `Email Digest - ${frequency}`,
    subject: `📧 Resumen ${frequencyText[frequency]} de SECiD - ${notifications.length} notificaciones`,
    htmlContent: createBaseTemplate(
      `Resumen ${frequencyText[frequency]} de notificaciones`,
      `
        <p>Hola ${variables?.user?.name || ''},</p>
        <p>Aquí tienes un resumen de las <strong>${notifications.length} notificaciones</strong> que has recibido.</p>
        
        ${contentSections}
        
        <div style="background: #f0f4ff; border: 1px solid #c3dafe; padding: 20px; border-radius: 8px; margin: 30px 0; text-align: center;">
          <p style="margin: 0; color: #1e40af;">
            💡 <strong>Consejo:</strong> Puedes gestionar tus preferencias de notificaciones para recibir solo lo que te interesa.
          </p>
        </div>
      `,
      variables,
      {
        actionButton: {
          text: 'Ver Todas las Notificaciones',
          url: `${variables?.site?.url || ''}/notifications`,
        },
      }
    ),
    textContent: `
Resumen ${frequencyText[frequency]} de SECiD

Has recibido ${notifications.length} notificaciones:

${Object.entries(groupedNotifications)
  .map(
    ([category, categoryNotifications]) => `
${categoryNames[category as keyof typeof categoryNames] || category} (${categoryNotifications.length}):
${categoryNotifications.map((n) => `- ${n.title}`).join('\n')}
`
  )
  .join('\n')}

Ver todas: ${variables?.site?.url || ''}/notifications

--
SECiD - Sociedad de Egresados en Ciencia de Datos
    `.trim(),
    variables: ['user.name', 'site.url', 'site.name'],
    category: 'system',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// Helper function (you might want to import this from notifications.ts)
function getCategoryFromType(type: NotificationType): NotificationCategory {
  const categoryMap: Record<string, NotificationCategory> = {
    job_: 'jobs',
    event_: 'events',
    message_: 'messages',
    connection_: 'connections',
    mentorship_: 'mentorship',
    forum_: 'forum',
    badge_: 'achievements',
    achievement_: 'achievements',
    profile_: 'system',
    newsletter: 'system',
    system_: 'system',
    maintenance: 'system',
    security_: 'security',
    payment_: 'billing',
    membership_: 'billing',
    data_: 'system',
  };

  const prefix = Object.keys(categoryMap).find((prefix) =>
    type.startsWith(prefix)
  );
  return prefix ? categoryMap[prefix] : 'system';
}

// Export all templates for admin/testing purposes
export const allTemplates = templates;
