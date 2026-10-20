# Runbook: comunicados y newsletter por correo

Cómo se manda correo masivo desde la plataforma (F20 comunicados a miembros,
F21 newsletter a suscriptores), qué límites tiene la salida SMTP y cómo
funcionan la confirmación y la baja del newsletter.

**Cuándo se usa:** hay que avisar algo a los miembros (asamblea, convocatoria,
cambio en la plataforma) o salió una edición del newsletter y toca enviarla.

**Prerrequisitos:** cuenta con el permiso RBAC correspondiente (ver tabla) y
sesión iniciada en secid.mx. Nada de esto toca la consola de GCP.

| Acción                        | Permiso RBAC (claim)               | Grupos por defecto                                  |
| ----------------------------- | ---------------------------------- | --------------------------------------------------- |
| Enviar comunicado a miembros  | `announcements:publish` (`ac:p.a`) | content-editor, newsletter-editor, admin (`*:*.a`)  |
| Enviar edición del newsletter | `newsletter:publish` (`nl:p.a`)    | newsletter-editor, content-editor, admin            |
| Ver la lista de suscriptores  | `newsletter:edit` (`nl:e.a`)       | newsletter-editor, content-editor, moderator, admin |

> El seed de grupos (`seedRbacGroups`) no sobrescribe grupos existentes. Si un
> grupo vivo no tiene `announcements:publish`, agrégalo desde **Admin →
> Grupos** (Comunicados: Publicar = Todos, Ver = Todos); el trigger
> `onGroupWrite` vuelve a resolver los claims y la persona debe cerrar y abrir
> sesión.

## Cómo se entrega el correo

Toda la salida pasa por la extensión `firestore-send-email`: las functions
escriben un documento en `mail/{id}` (`{ to, message: { subject, html } }`,
ver `functions/src/email-service.ts`) y la extensión lo manda por SMTP desde
`contacto@secid.mx` (Gmail / Google Workspace).

- **Límite práctico: ~500 destinatarios por día** en una cuenta de Workspace
  (el límite real de Google es por mensajes/relés y baja si hay rebotes). Con
  ~30 miembros sobra; al pasar de ~300 suscriptores conviene cambiar el relé.
- Las cuentas QA (`algo+qa@…`, `+test`, `+secidtest`) nunca reciben correo:
  `sendEmail`/`sendBatchEmails` las saltan.
- Un envío grande se escribe en lotes de 400 documentos (un batch de Firestore
  admite 500). La extensión procesa la cola a su ritmo; en la consola se ve en
  `mail/{id}.delivery.state`.

### Cambiar el relé a SendGrid o Resend

Mismo mecanismo, solo cambia la configuración de la extensión:

1. Crea la API key en el proveedor y verifica el dominio `secid.mx` (SPF +
   DKIM que el proveedor indique, en Cloudflare — lo hace el owner, ver
   `feedback_no_cloudflare`).
2. Firebase Console → Extensions → Trigger Email → Reconfigure →
   `SMTP_CONNECTION_URI`:
   - SendGrid: `smtps://apikey@smtp.sendgrid.net:465` y la key como
     `SMTP_PASSWORD`.
   - Resend: `smtps://resend@smtp.resend.com:465` y la key como
     `SMTP_PASSWORD`.
     `DEFAULT_FROM` sigue siendo `SECiD <contacto@secid.mx>`.
3. Manda una prueba (botón **Enviarme prueba** del composer) y revisa
   `mail/{id}.delivery` antes de un envío real.

Reversa: volver a poner la URI de Gmail en la misma pantalla.

## Comunicados a miembros (F20)

Pantalla: **Panel → Contenido → Comunicados**
(`/es/dashboard/admin/communications`). Backend: callable `sendAnnouncement`
(`functions/src/announcements.ts`); historial en `announcements/{id}`.

1. Escribe **asunto** y **cuerpo** en markdown (negritas, listas,
   encabezados, ligas `[texto](https://…)`). El HTML crudo se muestra como
   texto, nunca se interpreta. La vista previa es exactamente lo que llega.
2. Elige la **audiencia**: todos los miembros activos, una sede
   (`users.campus`) o un grupo RBAC (`rbac_user_groups`). Cuentan solo
   usuarios con `lifecycle.status = active`, correo en el perfil y
   `notificationSettings.email` distinto de `false`; las cuentas de empresa
   no entran.
3. **Enviarme prueba**: manda el comunicado solo a tu correo (aunque tengas
   los avisos apagados) y deja una fila "Prueba" en el historial.
4. **Enviar**: muestra el conteo real de destinatarios y pide confirmación;
   al confirmar se encola todo y aparece la fila con conteo y estado
   (`sent` / `failed` con el error).

Verificar: la fila en el historial, y `mail/` llenándose en la consola. Si el
estado es `failed`, el error está en el doc `announcements/{id}` y en los logs
de `sendAnnouncement`.

Revertir: no hay forma de retirar correo ya encolado; si la extensión aún no
lo procesó, borrar los docs `mail/` pendientes desde la consola.

## Newsletter a suscriptores (F21)

### Alta con doble opt-in

1. El formulario público (`/es/newsletter`) llama a `POST /api/forms/newsletter`
   (rate limit por IP + CAPTCHA). La function escribe `newsletter/{id}` con
   `status: 'pending'` y `confirmTokenHash` (sha256 del token; el token solo
   viaja en el correo) y manda el correo de confirmación.
2. El enlace `/api/newsletter/confirm?token=…` (`confirmNewsletter`) abre
   una página corta en el idioma del suscriptor con el botón **Confirmar
   suscripción**; el botón hace un POST que pone `status: 'confirmed'` y
   `confirmedAt`. Abrir el enlace sin pulsar no cambia nada (los escáneres
   de correo corporativo visitan todos los enlaces). El hash se conserva
   para que un segundo clic diga "ya estaba confirmada" en vez de fallar;
   solo actúa sobre docs `pending`, se cambia en cada nueva alta y se borra
   al darse de baja.
3. Si alguien vuelve a mandar el formulario con un correo ya confirmado no
   pasa nada (no se puede usar el formulario para molestar a un suscriptor);
   si estaba pendiente o dado de baja, se genera un token nuevo y se reenvía
   la confirmación.

**Docs anteriores a F21** no tienen `status`: se tratan como confirmados
(entraron por el mismo formulario y nunca recibieron nada). Si se quiere
pedirles confirmación, ponerles `status: 'pending'` desde la consola y
reenviar manualmente — no hay herramienta para eso hoy.

### Baja

Cada correo de newsletter lleva un enlace propio
`/api/newsletter/unsubscribe?token=…` (`unsubscribeNewsletter`) con el
`unsubscribeToken` del suscriptor (aleatorio, estable entre ediciones; a los
docs antiguos se les genera en el primer envío), en el pie del correo y en
las cabeceras `List-Unsubscribe` / `List-Unsubscribe-Post` (campo `headers`
del doc `mail/`), para que Gmail y compañía muestren su propio botón de
baja. Al abrirlo muestra el botón **Cancelar suscripción**; el POST (del
botón o del one-click del cliente de correo) pone `status: 'unsubscribed'`
en **todos** los docs de ese correo (antes de F21 el formulario creaba un doc
por envío, así que un correo puede tener varios) y es idempotente. El envío
excluye cualquier correo que tenga al menos un doc `unsubscribed`, aunque
conserve un doc antiguo sin `status`; si vuelve a suscribirse, confirmar
pone `confirmed` en todos sus docs. Los correos se comparan sin espacios y
en minúsculas. La lista solo la leen quienes tienen `newsletter:edit`.

### Enviar una edición

Pantalla: **Panel → Newsletter → editar la edición**
(`/es/dashboard/newsletter/edit/{id}`), sección **Enviar a suscriptores**.
Backend: callable `sendNewsletterIssue({ issueId, dryRun?, force? })`
(`functions/src/newsletter-send.ts`).

1. Guarda la edición primero: se manda el `content` guardado en Firestore
   (HTML, pasado por una lista blanca de etiquetas: sin `script`, estilos ni
   `javascript:`).
2. **Enviar a suscriptores** muestra cuántos suscriptores confirmados (o
   antiguos sin `status`) recibirán el correo, uno por dirección, y pide
   confirmación.
3. Al confirmar, la function reclama la edición en una transacción
   (`sendingAt`, `sendingBy`, `sendRun`): un segundo clic o otra persona
   editora recibe "being sent right now" mientras dura el envío (hasta 5
   min, el timeout de la function). Al terminar guarda `sentAt`,
   `recipientCount`, `sentBy` y `sentRun` (solo la function puede
   escribirlos). Un segundo envío de la misma edición se rechaza; el botón
   **Volver a enviar** lo hace explícitamente con `force: true`.
4. Los docs `mail/` llevan id determinista
   `{issueId}_{run}_{sha256(correo)[0..16]}`. Si un envío falla a medias
   (un lote lanza error, timeout), la edición queda sin `sentAt` y con el
   reclamo liberado; **repetir el envío** solo escribe los docs que faltan,
   nadie recibe la edición dos veces. `force` empieza un `run` nuevo (ids
   nuevos), por eso sí vuelve a mandar.

Verificar: el texto "Último envío: … a N suscriptores" en la sección y los
docs `mail/`. Si una edición se queda con `sendingAt` (la function murió
sin liberar el reclamo), a los 5 minutos se considera abandonado y se puede
volver a enviar. Revertir: igual que los comunicados.
