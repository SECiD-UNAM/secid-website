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
- [x] A5. Lo que A4 dejó en `skip`: (a) 13 suites heredadas marcadas
      "función no implementada" (~290 tests que buscan ~600 `data-testid`
      que la app no tiene; reescribir contra la UI real o borrar) — batch 1
      (auth/admin/dashboard/journey-B) hecho en PR #117: 5 suites reescritas,
      1 borrada; journey-B ya está reescrito contra el wizard real de
      `/es/signup` y corre en CI; batch 2 (eventos/jobs/comunidad/mobile)
      hecho en PR #119: 7 reescritas (44 tests), 1 borrada
      (learning-platform, la función no existe). El job sirve el build con
      el emulador de hosting (rewrites de `firebase.json`, puerto 5050) para
      que las rutas de detalle existan; job chromium bloqueante desde PR
      #119; falta (owner) añadirlo a los checks requeridos —
      runbooks/github-governance.md; (b) 3 suites de pagos siguen en `skip`
      hasta que haya Stripe; (c) ✅ hecho (PRs #114 y #115, 2026-10-19): los 53 usos de
      `admin.firestore.FieldValue`/`Timestamp` en `functions/src` vienen de
      `firebase-admin/firestore`, el emulador de functions corre en el job
      e2e (`--only auth,firestore,storage,functions`) y `onUserCreate` ya
      no da 500 (55 ejecuciones sin error en CI). Cerrado (a): `continue-on-error`
      quitado en PR #119.

## Bloque B — Calidad que hoy no se exige (dev, ~1 día)

- [x] B5. ESLint repo-wide (2026-10-19). PR #104 bajó de 2919 errores a 193 y
      arregló 2 `ReferenceError` reales en render. PR #121 cerró los 173 que
      quedaban (79 variables sin uso, 31 `label` a11y, 24 `require`, 23
      `jsx-key`, 4 `autofocus`, 3 `var`, 3 `html-has-lang`, 2
      `media-has-caption`, 2 `aria-role`, 1 `role-supports-aria-props`, 1
      `triple-slash`): `npm run lint` sale en 0 errores (1624 warnings, sin
      `--max-warnings`) y el paso de ESLint en CI ya es bloqueante
      (`continue-on-error` quitado). Hallazgo: el paso llevaba meses
      reventando con exit 2 (no fallando por errores) porque `eslint .`
      entraba en `functions/`, cuyo `.eslintrc.js` propio necesita
      `eslint-plugin-import` de `functions/node_modules`, que el job no
      instala; el `continue-on-error` lo tapaba. Ahora la config raíz ignora
      `functions/` y el job lo lintea aparte con sus deps
      (`npm run lint --prefix functions`, limpio). Código muerto borrado en vez de
      silenciado; a11y arreglada de verdad (11 `htmlFor`/`id`, combobox real
      en CompanyAutocomplete, prop `role` → `profileRole`). Overrides añadidos
      en `.eslintrc.cjs`: `*.astro` (`react/jsx-key` y
      `label-has-associated-control` off: plantillas sin React, `for=` en vez
      de `htmlFor`), snippet de Amplitude en `ModernLayout.astro` (`no-var`),
      `src/env.d.ts` (`triple-slash-reference`, `no-unused-vars`), scripts CJS
      (`scripts/**`, `build.js`, `run-tests.js`, `validate-schema.js`:
      `no-require-imports`), `tests/**` (`no-autofocus`) y
      `label-has-associated-control` con `depth: 3` global. 2 disables inline
      justificados (`CourseDetail` video, `GlobalSearch` autofocus).
- [x] B6. Cobertura y suites saltadas (2026-10-19). PR #105: umbrales en
      16/16/43/71 (líneas/sentencias/funciones/ramas, el piso medido) y bug de
      config corregido: `thresholds.global` es forma de Jest, Vitest la
      ignoraba, así que nunca se aplicaron. PR #106 SignUpForm (29→44 tests;
      arregló bug real: "año de graduación" vacío bloqueaba el formulario de
      verificación UNAM sin mostrar error), #107 TwoFactorVerification
      (49→54), #110 Button (10→13). #108 auth.test y #109 jobs.test borrados:
      los 33 tests describían APIs inexistentes y ya tienen suites propias.
- [x] B7. PR #103 (2026-10-19): README, `AGENTS.md` y `docs/DEPLOYMENT.md`
      actualizados; `functions/lib` fuera del repo (el `predeploy` de
      `firebase.json` lo recompila en cada deploy).
- [x] B8. PR #113 (2026-10-19): umbrales de cobertura exigidos en CI. Los 4
      shards corren con `--coverage`, el job `Coverage` fusiona sus reportes
      (`scripts/ci/check-coverage.mjs`) y falla si bajan de
      `scripts/ci/coverage-thresholds.mjs`, la única fuente que también lee
      `vitest.config.ts`. Probado en rojo a propósito (run 39203140147).
      Hoy mide 72.2 / 46.9 / 17.2 / 17.2 (ramas/funciones/líneas/sentencias).
      Se quitó el paso de Codecov (sin token, nunca subió nada).
      `Coverage` es check requerido de `main` desde el 2026-10-19 (11
      contextos; [runbooks/github-governance.md](./runbooks/github-governance.md)).

- [x] B9. TruffleHog fallaba en cada push a `main` con "BASE and HEAD
      commits are the same" (base `origin/main` == HEAD). Ahora en push usa
      `github.event.before`, en PR la base del PR y en schedule/dispatch
      escanea el repo completo.

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
- [x] C11. Archivo `LICENSE` (MIT, titular SECiD — Sociedad de Egresados en
      Ciencia de Datos, UNAM) añadido por PR; coincide con `package.json`.

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
      ([known-issues/npm-audit-2026-10-18.md](./known-issues/npm-audit-2026-10-18.md)).
      Fase 1 hecha (PR #133, 2026-10-19): Vitest 1 → 5 (solo dev; un solo
      `vite` 7 en el árbol, `sequence.concurrent` apagado, umbrales de
      cobertura re-medidos en `scripts/ci/coverage-thresholds.mjs` porque
      el remapeo AST de coverage-v8 cuenta las funciones y ramas reales de
      los archivos sin pruebas) y Firebase Admin 13 → 14 (API modular en
      todas las functions). `npm audit`: raíz 22 → 16, functions 10 → 4.
      Fase 2 pendiente: Astro 7 + `@astrojs/node` 11 (las únicas
      advertencias del runtime de producción) y Tailwind 4, cuando el e2e
      `smoke` sea bloqueante.
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

- [x] F19. Avisos que faltan sobre la tubería que ya funciona (1 día):
      correo al admin por cada `contactMessages` nuevo (trigger
      `onDocumentCreated`), confirmación al registrarse a un evento y
      recordatorio 24 h antes (`onSchedule` diario leyendo
      `events/{id}/registrations`). Plantillas en `email-templates.ts`.
      Respetar `notificationSettings.email`.
      Hecho en PR #130: `functions/src/notifications.ts` con
      `onContactMessageCreated` (al `ADMIN_EMAIL`, remitente como Reply-To),
      `onEventRegistrationEmail` (confirmación es/en con fecha, lugar o liga
      y enlace al evento) y `sendEventReminders` (diario 09:00 CDMX, ventana
      [+24 h, +48 h), marca `reminderSentAt`). Todo best-effort, respeta
      `notificationSettings.email` y el salto de cuentas QA.
- [x] F20. Comunicados a miembros (1–2 días): composer en admin
      (`/dashboard/admin/communications`) para rol `content-editor` /
      `newsletter-editor`: asunto, cuerpo (markdown), audiencia (todos los
      activos / por sede / por grupo RBAC), vista previa, "enviarme prueba"
      y envío. Backend: callable `sendAnnouncement` que escribe lotes en
      `mail` (`sendBatchEmails`) y guarda el registro en `announcements`
      con conteo y estado. Reusar la plantilla base de `email-templates.ts`.
      Nota de volumen: el SMTP de Gmail limita ~500 destinatarios/día; con
      31 miembros alcanza, pero al pasar de ~300 conviene migrar a SendGrid
      o Resend (misma extensión, cambiar `SMTP_CONNECTION_URI`).
      Hecho en PR #132: callable `sendAnnouncement`
      (`functions/src/announcements.ts`, audiencias `all_active`,
      `campus`, `rbac_group` y `test`, `dryRun` para el conteo, lotes de
      400, registro en `announcements/{id}`), renderer de markdown sin HTML crudo
      (`functions/src/markdown.ts`, compartido con la vista previa), nuevo
      recurso RBAC `announcements` con `announcements:publish` (`ac:p.a`)
      en `content-editor` y `newsletter-editor`, página
      `/es|en/dashboard/admin/communications` y enlace "Comunicados" en el
      panel. Pendiente al desplegar: añadir el permiso a los docs vivos de
      `rbac_groups` (el seed no sobrescribe grupos existentes).
- [x] F21. Newsletter por correo (½ día, después de F20): botón "enviar a
      suscriptores" en `NewsletterFormPage` usando el mismo callable con la
      audiencia `newsletter` (suscriptores confirmados) y enlace de baja
      (`unsubscribe` firmado). Hoy el formulario público acepta altas sin
      doble opt-in; añadir confirmación por correo antes de enviar nada.
      Hecho en PR #136: doble opt-in en `subscribeNewsletter` (doc
      `pending` + `confirmTokenHash`, correo de confirmación), endpoints
      públicos `confirmNewsletter` y `unsubscribeNewsletter`
      (`/api/newsletter/confirm|unsubscribe`, token de baja por suscriptor),
      callable `sendNewsletterIssue` (`functions/src/newsletter-send.ts`,
      `newsletter:publish`, HTML saneado + enlace de baja, `sentAt` /
      `recipientCount` en la edición, segundo envío solo con `force`),
      panel "Enviar a suscriptores" en el editor, reglas (`newsletter` solo
      legible con `nl:e.a`; recibo de envío no escribible desde cliente) y
      runbook `docs/runbooks/communications.md`. Los docs sin `status`
      (anteriores) cuentan como confirmados.
- [ ] F22. Notificaciones in-app (1 día, opcional): o se borran
      `NotificationCenter`/`notifications.ts` y su página de settings, o se
      conectan de verdad: escribir en `users/{uid}/notifications` desde los
      mismos triggers de F19/F20, `onSnapshot` en el centro (quitar
      polling), y `notificationSettings` dentro del doc del usuario. Push
      FCM solo si alguien lo pide (VAPID + service worker).

## Bloque G — Bugs funcionales que destapó el e2e (dev, 1–2 días; hallados 2026-10-19 en PR #119)

Los flujos existen en la UI pero fallan contra las reglas de Firestore, así
que en prod un miembro no puede completarlos. Ninguno tiene test porque el
submit se dejó sin ejercitar a propósito hasta arreglarlo; cada fix debe
llegar con su e2e contra emuladores (ya hay arnés, seed y job bloqueante).

- [x] G23. PR #122 (2026-10-19): el payload del modal ya cumple las reglas
      (`status:'submitted'`, `jobId`, `createdAt==request.time`, en
      `src/lib/jobs/applicationPayload.ts`), nueva regla owner-only para
      `users/{uid}/applications` (solo puede retirar, nunca cambiar el
      estado) y el tracker de `/es/dashboard/applications` entiende
      `submitted`/`withdrawn`. Test de reglas + e2e con submit completo.
      Antes: el modal escribía `status:'pending'` sin `jobId` ni
      `createdAt` y la subcolección no tenía regla → denegado.
- [x] G24. PR #125 (2026-10-19): el registro incluye `eventId` y se guarda
      en `events/{id}/registrations/{uid}` (lo que `EventDetail` lee y
      borra); el contador `currentAttendees` lo mantienen las functions
      `onEventRegistrationCreated`/`Deleted` (`functions/src/event-attendees.ts`,
      transacción, nunca < 0); regla owner-only para
      `users/{uid}/registeredEvents`; el seed da a los miembros los claims
      RBAC reales (sin `rbac` en el token, toda regla con `hasRBACDeny`
      deniega). Tests de reglas, unit del trigger y e2e registro + cancelación.
      Antes: sin `eventId` e incrementando el evento desde el cliente →
      denegado. Pendiente aparte: la lectura de registrations honra
      `ev:v.a` (cualquier miembro ve nombre y correo de otros inscritos) y
      `users/{uid}/savedEvents` sigue sin regla.
- [x] G27. PR #129 (2026-10-19): la lectura de `events/{id}/registrations`
      ya no honra `ev:v.a` (lo tiene todo miembro) sino `ev:e.a`, el mismo
      permiso que la edición del evento: solo el dueño del registro, el
      creador del evento, editores de eventos y admin leen nombre y correo
      de los inscritos; un miembro solo puede consultar sus propios
      registros (`where userId == uid`).
      `users/{uid}/savedEvents/{eventId}` tiene regla owner-only
      (read/create/delete con la forma que escribe `EventDetail`, `eventId`
      igual al path, `savedAt == request.time`), así que "Guardar evento"
      funciona. Tests de reglas RED-first (`groupToken()`/`adminToken()` en
      el harness) y e2e guardar/quitar del webinar sembrado.
      Antes: cualquier miembro listaba todos los inscritos de cualquier
      evento, y guardar un evento fallaba en silencio.
- [ ] G25. Foros: `forum_categories`, `forum_topics` y `forum_posts` no
      tienen reglas, así que solo se ven las 6 categorías integradas y
      `/es/forum/category/{slug}` muestra "Error al cargar los datos".
      Decidir si los foros se lanzan (reglas + seed + e2e) o se ocultan del
      menú hasta entonces.
- [x] G26. PR #126 (2026-10-19): el filtro de ubicación se aplica en el
      cliente (`src/lib/jobs/location.ts`, coincidencia normalizada por
      palabra: "Guadalajara, Jalisco" ⇐ `guadalajara`, "Ciudad de México,
      CDMX" ⇐ `cdmx`, `remote` también por `locationType`), como el resto
      de facetas de `JobFirestoreAdapter`. Sin campo nuevo ni backfill: el
      `where('location','==', slug)` nunca coincidía con el texto libre y
      además habría necesitado un índice compuesto inexistente. Unit del
      matcher + e2e por ciudad.

## Orden recomendado (actualizado 2026-10-19, tras A4/B6)

Dev, en este orden y cada paso un PR con auto-merge:

1. ~~B8~~ hecho (PR #113).
2. ~~A5(c)~~ hecho (PRs #114, #115).
3. ~~A5(a)~~ hecho (PRs #117 y #119); `continue-on-error` quitado del job
   chromium en PR #119; falta (owner) hacerlo requerido en `main`.
4. ~~B5~~ hecho (PR #121); lint bloqueante en CI.
5. ~~G23 → G24 → G26~~ hecho (PRs #122, #125, #126); G25 es decisión de
   producto (lanzar foros u ocultarlos).
6. F19 → F20 → F21 (3–4 días) cuando haya eventos, mensajes de contacto o
   un comunicado real que mandar; F22 solo si se decide conservar el centro
   de notificaciones.
7. E16 fase 2 (Tailwind 4, Astro 7; la fase 1 — Vitest 5 y Firebase Admin
   14 — ya está en PR #133) después del paso 3, cuando el e2e completo sea
   bloqueante y pueda detectar regresiones de los majors.

Owner, cuando pueda (C8–C11, ~30 min) y en su fecha (D12–D15). E17/E18 sin
fecha.

## Hecho (referencia)

Lanzamiento 2026-10-18: PRs #75–#99. Gobernanza: auto-merge activo, ramas se
borran al mergear, `main` exige Build, Lint, Secret Scanning, CodeQL, 4 shards
de unitarios y reglas de Firestore con la rama al día. Detalle en
[LAUNCH-CHECKLIST.md](./LAUNCH-CHECKLIST.md).
