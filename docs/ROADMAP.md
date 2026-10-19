# Roadmap de ingeniería (post-lanzamiento)

Estado al 2026-10-19. El lanzamiento de `secid.mx` sobre Firebase se completó el
2026-10-18 (ver [LAUNCH-CHECKLIST.md](./LAUNCH-CHECKLIST.md)). Este documento
ordena lo que sigue. Los ítems de producto viven en
[features/todo.md](./features/todo.md); aquí va la plataforma: CI/CD, calidad,
deuda técnica y operaciones.

Convenciones: **(dev)** lo hace quien desarrolle (humano o asistente, ver
[CONTRIBUTING.md](../CONTRIBUTING.md)); **(owner)** requiere consola o
permisos que solo tiene el administrador. Cada ítem se cierra por PR a `main`.

## Bloque A — Arnés e2e y gates honestos (dev, 1–2 días) — EN CURSO

Contexto: hasta el 2026-10-18 CI nunca ejecutó un test e2e (el `global-setup`
fallaba y el paso tenía `continue-on-error`), y el proyecto `chromium` de
Playwright solo incluía 7 archivos por su `testMatch`.

- [x] A1. Corrida completa 2026-10-19 contra `astro preview`: 266/266 fallan.
      Firmas: timeouts esperando UI autenticada (621), `localStorage` leído
      antes de navegar (141), URL/selectores viejos (~60). Causa común:
      suites heredadas que asumen usuarios sembrados, emulador y Stripe.
      `homepage.spec.ts`: 5/7 fallan por selectores antiguos.
- [x] A2. PR #101 mergeado 2026-10-19 (8eb267c), arnés: setup sin `dotenv`, `__dirname` ESM, imports JSON con
      atributos, `test.use` sin `defaultBrowserType`, `Test Summary` que falle
      de verdad, `testMatch` ampliado y dos proyectos: `smoke` (hidratación,
      home, login, signup, páginas públicas; bloqueante) y `full` (resto; no
      bloqueante hasta triarlo).
- [x] A3. "E2E Tests (smoke)" añadido a los checks requeridos de `main` el 2026-10-19 (10 contextos, strict).
      Criterio: un PR que rompa el signup se pone rojo solo.
- [x] A4. PR #111 (2026-10-19): el job `E2E Tests (chromium)` corre contra
      emuladores (auth, firestore, storage) con `npm run seed` reescrito
      (REST + `Bearer owner`, cuentas fijas admin/member1/member2/company) y
      publica una tabla de pass-rate en el summary. Resultado: 479 tests →
      53 pasan, 0 fallan, 426 `skip` con motivo (antes: 8/457/14). Sigue
      `continue-on-error` hasta que A5 reduzca los skips.
- [ ] A5. Lo que A4 dejó en `skip`: (a) 13 suites heredadas marcadas
      "función no implementada" (~290 tests que buscan ~600 `data-testid`
      que la app no tiene; reescribir contra la UI real o borrar); (b) 3
      suites de pagos hasta que haya Stripe; (c) journey-B necesita el
      emulador de functions, bloqueado porque el stub de firebase-admin del
      emulador no expone `admin.firestore.FieldValue` y `onUserCreate` da
      500 → cambiar los ~53 usos en `functions/src` a
      `import { FieldValue } from 'firebase-admin/firestore'`. Al cerrar (a)
      y (c): quitar `continue-on-error` y volver el job bloqueante.

## Bloque B — Calidad que hoy no se exige (dev, ~1 día)

- [ ] B5. ESLint repo-wide: PR #104 (2026-10-19) bajó de 2919 errores a 193 y
      arregló 2 `ReferenceError` reales en render. Quedan 193 que necesitan
      criterio (97 variables sin uso, 43 a11y, 26 `require` en scripts, 23
      `jsx-key` falsos positivos en `.astro`, 3 `var` del snippet de Amplitude,
      1 `triple-slash` de Astro). Falta: resolverlos o acotarlos por override y
      quitar el `continue-on-error` del lint en CI.
- [x] B6. Cobertura y suites saltadas (2026-10-19). PR #105: umbrales en
      16/16/43/71 (líneas/sentencias/funciones/ramas, el piso medido) y bug de
      config corregido: `thresholds.global` es forma de Jest, Vitest la
      ignoraba, así que nunca se aplicaron. PR #106 SignUpForm (29→44 tests;
      arregló bug real: "año de graduación" vacío bloqueaba el formulario de
      verificación UNAM sin mostrar error), #107 TwoFactorVerification
      (49→54), #110 Button (10→13). #108 auth.test y #109 jobs.test borrados:
      los 33 tests describían APIs inexistentes y ya tienen suites propias.
      Pendiente (follow-up): CI corre vitest por shards sin `--coverage`, así
      que el umbral no se evalúa en CI y codecov sube un lcov que no existe.
- [x] B7. PR #103 (2026-10-19): README, `AGENTS.md` y `docs/DEPLOYMENT.md`
      actualizados; `functions/lib` fuera del repo (el `predeploy` de
      `firebase.json` lo recompila en cada deploy).

## Bloque C — Pasos del owner (~30 min en total)

- [ ] C8. Firebase → Authentication → Templates → "Customize action URL" →
      `https://secid.mx/es/auth/action`. Cierra #79 tras probar un
      restablecimiento real. (Runbook prod-cutover §5.1)
- [ ] C9. #83: IAM (`serviceAccountTokenCreator` de la SA de cómputo sobre sí
      misma, APIs `iamcredentials` y `admin`) y delegación de dominio en el
      Admin Console de Workspace. Después aprobar un miembro y verificar logs.
      (Runbook prod-cutover §6)
- [ ] C10. Billing → Account management: confirmar el correo de avisos de pago.
      El correo de prueba del presupuesto llega con el primer umbral.
- [ ] C11. Añadir un archivo `LICENSE` (package.json dice MIT; GitHub no detecta
      licencia). Decisión del owner sobre la licencia.

## Bloque D — Aplazado por decisión del owner

- [ ] D12. Cloudflare: borrar los 4 NS residuales `ns-cloud-a*.googledomains.com`
      (solo el owner toca Cloudflare).
- [ ] D13. Duplicado de cuenta admin (`jalejandrobondi@gmail.com` vs
      `alejandrobondi@me.com`): preguntar, luego borrar o fusionar con
      `merge_requests`.
- [ ] D14. ~1 de noviembre de 2026: desactivar GitHub Pages y mergear PR #85.
- [ ] D15. Opcional: quitar `secid-mx.web.app` de CORS si ya no se usa.

## Bloque E — Deuda mayor (planear aparte)

- [ ] E16. Majors de dependencias pendientes de PR #92
      ([known-issues/npm-audit-2026-10-18.md](./known-issues/npm-audit-2026-10-18.md)):
      Vitest 5 primero (solo dev), Firebase Admin 14, Tailwind 4, y Astro 7
      cuando el e2e `smoke` sea bloqueante.
- [ ] E17. MCP de SECiD según
      [specs/secid-mcp-and-assistant-skill.md](./specs/secid-mcp-and-assistant-skill.md),
      solo si las operaciones de miembros se vuelven frecuentes. La skill
      `.claude/skills/secid-ops/` ya existe.
- [ ] E18. Un segundo mantenedor con permisos para poder exigir una revisión
      en `main` sin bloquear al único admin.

## Bloque F — Notificaciones y comunicados (dev, 2–4 días; diagnóstico 2026-10-19)

Estado real hoy:

- Correo transaccional **sí funciona**: extensión `firestore-send-email`
  activa (colección `mail`, SMTP Gmail de contacto@secid.mx), 15/15
  entregas `SUCCESS`. Disparadores en `functions/src/index.ts`: bienvenida
  (`onUserDocCreated`), "nueva solicitud pendiente" a admins, aprobado /
  rechazado / cambio de estatus (`onMemberStatusChange`) y job-match
  (`onNewJobPosted`, `matchJobsForUser`). Las cuentas QA por plus-tag no
  reciben correo.
- **No existe** correo para: confirmación de registro a eventos ni
  recordatorios (`EventRegistrationForm` solo escribe en Firestore; hoy hay
  0 eventos y 0 registros), aviso al admin de mensajes de contacto
  (`contactMessages` se guarda y nadie se entera), envío del newsletter
  (`newsletter_archive` solo publica en web; `newsletter` guarda
  suscriptores, 5 hoy, sin ningún envío), ni comunicados/anuncios a
  miembros (no hay composer; el canal real son los Google Groups
  miembros@/colaboradores@/direccion@ que sincroniza #83).
- Notificaciones in-app: `src/lib/notifications.ts` + `NotificationCenter`
  son un cascarón: llaman a callables `sendNotification`,
  `sendBulkNotifications` y `scheduleNotification` que no existen en
  functions, escriben en una colección raíz `notifications` que las reglas
  no permiten (solo `users/{uid}/notifications`), y el centro hace polling
  cada 30 s. `NotificationSettings` guarda preferencias (digest por correo,
  push) que nada lee. Push (FCM) sin `PUBLIC_FIREBASE_VAPID_KEY`.
- Panel de community manager: no existe. Admin tiene usuarios, directorio,
  moderación (cola + reportes), fusión, analytics y configuración. RBAC ya
  define `content-editor` y `newsletter-editor` sin UI que los use.

- [ ] F19. Avisos que faltan sobre la tubería que ya funciona (1 día):
      correo al admin por cada `contactMessages` nuevo (trigger
      `onDocumentCreated`), confirmación al registrarse a un evento y
      recordatorio 24 h antes (`onSchedule` diario leyendo
      `events/{id}/registrations`). Plantillas en `email-templates.ts`.
      Respetar `notificationSettings.email`.
- [ ] F20. Comunicados a miembros (1–2 días): composer en admin
      (`/dashboard/admin/communications`) para rol `content-editor` /
      `newsletter-editor`: asunto, cuerpo (markdown), audiencia (todos los
      activos / por sede / por grupo RBAC), vista previa, "enviarme prueba"
      y envío. Backend: callable `sendAnnouncement` que escribe lotes en
      `mail` (`sendBatchEmails`) y guarda el registro en `announcements`
      con conteo y estado. Reusar la plantilla base de `email-templates.ts`.
      Nota de volumen: el SMTP de Gmail limita ~500 destinatarios/día; con
      31 miembros alcanza, pero al pasar de ~300 conviene migrar a SendGrid
      o Resend (misma extensión, cambiar `SMTP_CONNECTION_URI`).
- [ ] F21. Newsletter por correo (½ día, después de F20): botón "enviar a
      suscriptores" en `NewsletterFormPage` usando el mismo callable con la
      audiencia `newsletter` (suscriptores confirmados) y enlace de baja
      (`unsubscribe` firmado). Hoy el formulario público acepta altas sin
      doble opt-in; añadir confirmación por correo antes de enviar nada.
- [ ] F22. Notificaciones in-app (1 día, opcional): o se borran
      `NotificationCenter`/`notifications.ts` y su página de settings, o se
      conectan de verdad: escribir en `users/{uid}/notifications` desde los
      mismos triggers de F19/F20, `onSnapshot` en el centro (quitar
      polling), y `notificationSettings` dentro del doc del usuario. Push
      FCM solo si alguien lo pide (VAPID + service worker).

## Orden recomendado

A1–A3 primero (convierte CI en una red real), luego B5 y B6 en paralelo, C
cuando el owner pueda, E16 después de A3. F19 en cuanto haya eventos o
mensajes de contacto reales; F20 antes del primer comunicado masivo.

## Hecho (referencia)

Lanzamiento 2026-10-18: PRs #75–#99. Gobernanza: auto-merge activo, ramas se
borran al mergear, `main` exige Build, Lint, Secret Scanning, CodeQL, 4 shards
de unitarios y reglas de Firestore con la rama al día. Detalle en
[LAUNCH-CHECKLIST.md](./LAUNCH-CHECKLIST.md).
