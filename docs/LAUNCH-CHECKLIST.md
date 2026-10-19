# Checklist de lanzamiento: secid.mx en Firebase Hosting

Tracking del corte de producción con backend compartido (un solo proyecto
`secid-org` para beta y prod). El detalle técnico de cada paso está en
[`DEPLOYMENT.md` → Production cutover](./DEPLOYMENT.md#production-cutover).
**Todo paso de operador tiene su runbook en [`runbooks/`](./runbooks/README.md)**
con comandos, verificación y reversa; este archivo solo lleva el track.

Convención: `(owner)` = consola GCP/Firebase o GitHub, lo hace el dueño del
proyecto. `(dev)` = cambios en el repo, entran por PR. `(CI)` = lo hace el
workflow `Production Cutover` (`.github/workflows/cutover.yml`, se lanza a
mano desde Actions → Run workflow) con la misma service account que ya
despliega; si le falta un permiso, imprime el paso manual en el resumen.

Nombre del sitio de prod asumido: `secid-mx` (`https://secid-mx.web.app`).
Si se usa otro, reemplazarlo en todo el documento.

---

## Ya hecho (2026-09-24 → 2026-10-14)

- [x] Backend restaurado: cuenta de facturación activada, functions responden
- [x] Rol `roles/cloudscheduler.admin` para la SA de deploy
- [x] Guardia de cuota de CPU en `functions/src/init.ts` (`cpu: 'gcf_gen1'`)
- [x] Fix de open redirect en login/signup (`src/lib/auth/safe-redirect.ts`)
- [x] `cd.yml` despliega a Firebase Hosting, no a GitHub Pages
- [x] `deploy-beta.yml` respeta `BACKEND_DEPLOYED_FROM_MAIN`
- [x] `infra.yml` se salta hasta que exista el bootstrap
- [x] Branch protection en `main`: solo por PR, 4 checks obligatorios
- [x] PR #1 (`feature/hub` → `main`) con todos los checks en verde
- [x] Nuevo miembro completó su registro en beta

---

## Fase 0: red de seguridad (owner, ~15 min, hacer ya) — runbooks [billing-and-budget](./runbooks/billing-and-budget.md), [firestore-backup](./runbooks/firestore-backup.md)

- [x] (owner) Alerta de presupuesto en GCP (runbook §A) — creada 2026-10-18 por CLI: `secid-org monthly`, 400 MXN/mes, umbrales 50/90/100 %, correo a admins de facturación (id `fd5dd63b-f849-4152-81a0-b3c2dc9629be`)
- [ ] (owner) Notificaciones de la cuenta de facturación (runbook §B) — consola: Billing → Account management → confirmar que al menos un correo leído recibe avisos de pago
- [ ] (owner) Correo de prueba de la alerta recibido — GCP no manda correo al crear el presupuesto y evalúa los umbrales solo unas veces al día, así que no se puede forzar al momento; se verifica con el primer umbral (50 % = 200 MXN) o editando la alerta a 1 MXN un día y restaurándola (runbook §A)
- [x] (dev) Workflow `Firestore Backup` (`.github/workflows/firestore-backup.yml`): semanal + a demanda
- [x] (owner, una vez) la SA de deploy tiene `roles/datastore.importExportAdmin` — otorgado 2026-10-18 (el run 38665050186 del 2026-10-15 había fallado con `PERMISSION_DENIED`; el primer reintento tras el grant también falló por propagación de IAM, ~2 min después ya pasó):
      `gcloud projects add-iam-policy-binding secid-org --member serviceAccount:firebase-adminsdk-fbsvc@secid-org.iam.gserviceaccount.com --role roles/datastore.importExportAdmin`
- [x] (CI) `gh workflow run firestore-backup.yml --ref feature/hub -f label=pre-cutover` en verde — run 39086251312, export en `gs://secid-org.firebasestorage.app/firestore-backups/2026-10-18T0122Z-pre-cutover/`

## Fase 1: PR de endurecimiento (dev, 1–2 días) — `fix/shared-backend-hardening` → `feature/hub`

- [x] Mismo grupo de concurrencia `firebase-backend` en los jobs de backend de `cd.yml` y `deploy-beta.yml` (el de beta ahora es un job aparte, para que el `cancel-in-progress` de beta no mate un deploy de prod)
- [x] `cd.yml` solo despliega backend con `BACKEND_DEPLOYED_FROM_MAIN=true`; `deploy-beta.yml` solo sin ella. Nunca hay dos deployers
- [x] Orden de deploy: reglas + índices → storage → functions
- [x] Guardia antes de `--force`: `scripts/ci/check-function-deletions.mjs` falla si el deploy borraría una function desplegada (`ALLOW_FUNCTION_DELETIONS=a,b` para borrados intencionales)
- [x] Una sola lista de orígenes CORS (`isAllowedOrigin` en `functions/src/env.ts`) con `https://secid-mx.web.app`
- [x] Un solo default de `APP_URL` = `https://secid.mx` (`env.ts` y `linkedin-auth.ts`)
- [x] Job `validate` de `cd.yml` = `scripts/ci/smoke-test.sh` contra `<site>.web.app` + functions: locales, rewrite dinámico, headers de seguridad, `/api/forms/*`, un callable. Falla de verdad. (Contra `secid.mx` solo avisa hasta la Fase 4)
- [x] Tests de reglas en CI: job `Firestore Rules Tests` con emulador. Hallazgo: **nunca habían corrido** (el `skipIf` se evaluaba antes de la sonda); corregido, 15/15 pasan
- [x] Cuentas QA por plus-tag (`+qa`, `+secidtest`, `+test`): `email-service.ts` no les encola correo (bienvenida, job-match, cambios de estatus, lotes)
- [x] Secretos: los workflows leen `FIREBASE_*` y caen a `STAGING_FIREBASE_*`. Renombrar es opcional y sin downtime (owner: `gh secret set FIREBASE_X --body ...` y luego borrar el viejo)
- [x] Sección "Shared-backend rules" en `docs/DEPLOYMENT.md`
- [x] Workflow `Production Cutover` (`cutover.yml`) para la Fase 2 y la Fase 4 desde CI
- [x] PR #75 `fix/shared-backend-hardening` → `feature/hub` en verde (13 checks) y mergeado 2026-10-15 (`7225aac`)
- [x] Deploy Beta OK con el nuevo orden (hosting + backend, guardia de borrado pasó); smoke test 12/12 contra beta
- [x] Merge a `feature/hub` (PR #1 actualizado)

## Fase 2: sitio de prod + dominios autorizados + variables (CI, ~5 min; antes del merge) — runbook [prod-cutover §1](./runbooks/prod-cutover.md)

- [x] (owner) Actions → `Production Cutover` → Run workflow con `site_id=secid-mx`, `custom_domains=secid.mx,www.secid.mx`, `backend_from_main=true` — run 39093945487 (2026-10-18), verde
- [x] (CI) Sitio de Hosting `secid-mx` creado → https://secid-mx.web.app (responde 404 hasta el primer deploy de `cd.yml`)
- [x] (CI) Auth authorized domains incluyen `secid-mx.web.app`, `secid.mx`, `www.secid.mx` — verificado por API: beta.secid.mx, localhost, secid-mx.web.app, secid-org.firebaseapp.com, secid-org.web.app, secid.mx, www.secid.mx
- [x] (CI) `FIREBASE_PROD_HOSTING_SITE=secid-mx` y `BACKEND_DEPLOYED_FROM_MAIN=true` — el paso de CI falló (`GITHUB_TOKEN` no puede escribir variables: HTTP 403 "Resource not accessible by integration"); hecho con el fallback `gh variable set` desde local
- [x] (CI) Dominios `secid.mx` y `www.secid.mx` solicitados en el sitio (`hostState=HOST_MISMATCH`, `ownershipState=OWNERSHIP_MISSING`: esperan DNS); registros copiados a la Fase 4
- [x] (owner) Revisar el resumen del run: solo "Repo variables — MANUAL", resuelto arriba
- [x] (owner) OAuth de Google y GitHub: callbacks siguen en `secid-org.firebaseapp.com` (no hay que cambiar nada)
- [x] (owner) Clave de reCAPTCHA Enterprise `secid-website` — hecho por el owner 2026-10-18 con el comando de abajo (verificado: el formulario de contacto pasa; ver Fase 3): añadir `secid-mx.web.app` y `www.secid.mx` a los dominios permitidos (hoy: secid.mx, beta.secid.mx, localhost) — descubierto 2026-10-18 en la prueba del formulario de contacto; comando en [prod-cutover §1b](./runbooks/prod-cutover.md); PR #80 lo añade a `cutover.yml` como paso con fallback MANUAL. Me lo niega el clasificador: `gcloud recaptcha keys update 6Lf0GPssAAAAAMXkNpzJDzISkep0YRM14GmKCPSB --project secid-org --web --domains=secid.mx,www.secid.mx,beta.secid.mx,secid-mx.web.app,localhost`
- [x] `gh variable list` muestra las dos variables (2026-10-18 03:33 UTC). Desde este momento `deploy-beta.yml` ya NO despliega backend; lo hará `cd.yml` al mergear PR #1

## Fase 3: merge y prueba en `.web.app` (owner hace merge, dev verifica, ~1 h) — runbook [prod-cutover §2–3](./runbooks/prod-cutover.md)

- [x] Merge de PR #1 (por PR, nunca push directo a `main`) — mergeado 2026-10-18 03:43 UTC, merge commit b8a91fa
- [x] Run de `cd.yml` en verde: hosting + backend + validate (el smoke test ya cubre locales, rewrite dinámico, headers, `/api/forms/*` y un callable) — run 39094640657: guard `deployed: 27, exported locally: 27 / OK`, smoke test aprobado en secid-mx.web.app, aviso esperado en secid.mx (DNS aún en Pages). `https://secid-mx.web.app/es/` sirve `build-sha=b8a91fa`
- [x] A mano en `https://secid-mx.web.app`:
  - [x] Login con email — 2026-10-18 OK tras crear contraseña con "¿Olvidaste tu contraseña?" (la cuenta del owner solo tenía Google). Hallazgos: el formulario no mapeaba `auth/invalid-credential` → PR #77 (mergeado, ab808c6); el enlace de restablecer abre la página genérica `secid-org.firebaseapp.com/__/auth/action` porque el sitio no tiene handler propio → issue de seguimiento (post-lanzamiento)
  - [x] Login con Google — 2026-10-18 OK en secid-mx.web.app
  - [x] Registro completo con una cuenta `+qa` — 2026-10-18 OK en secid-mx.web.app con `artemiopadilla+qa@gmail.com` (uid `fSR9sRWj4UXW7cypeCOcCX4Q2o62`, proveedor password; el owner tecleó la contraseña, el resto lo hizo Claude desde Chrome). Evidencia: usuario en Auth; `users/{uid}` con numeroCuenta 300000001, sede Otro, `verificationStatus=pending`, `role=collaborator`; `completeRegistration` 200; encuesta en `member_surveys/{uid}`; correo de bienvenida **saltado** por ser QA (`[email] skipped for QA account`); correo "Nueva solicitud pendiente" al admin recibido (su enlace apunta a secid.mx: 404 hasta la Fase 4, esperado); panel y "Mi Perfil" cargan. Pendiente menor: clic en el correo de verificación de Firebase Auth (la cuenta sigue `emailVerified=false`). Hallazgos → issues: errores de hidratación de React (#418/#423/#425) en signup y dashboard; `onUserDocCreated` falla al añadir al grupo colaboradores@secid.mx (`Admin SDK API has not been used in project… or it is disabled`; API habilitada hoy, falta verificar en el próximo alta); al cerrar sesión en una pestaña, otra pestaña abierta con la sesión anterior la vuelve a escribir y "gana" (solo afecta a navegadores compartidos)
  - [x] Enviar el formulario de contacto — 2026-10-18 OK en secid-mx.web.app tras PR #81 (verificación con la API de reCAPTCHA Enterprise) + rol `recaptchaenterprise.agent` en la SA de runtime: función 200, documento nuevo en `contactMessages` (05:12 UTC). Historia: llevaba roto desde el 25-may en beta y prod (clave Enterprise + endpoint legacy `siteverify` → `incorrect-captcha-sol`; antes además faltaba `secid-mx.web.app` en los dominios de la clave → `browser-error`). Newsletter usa la misma ruta, así que también queda arreglado
- [x] Beta (`beta.secid.mx`) sigue funcionando contra el backend desplegado por `main` — smoke test local aprobado tras el deploy de prod; beta sirve `build-sha=793e8b6`
- [x] Si algo falla: secid.mx no se afecta (DNS sigue en Pages); corregir con otro PR — no hizo falta: lo que falló (contacto, mensaje de login) se corrigió con PR #77/#78/#81 antes del DNS

## Fase 4: DNS (owner, ~20 min + propagación) — runbook [prod-cutover §4](./runbooks/prod-cutover.md), reversa en [rollback §C](./runbooks/rollback.md)

- [x] Registros DNS actuales (descubiertos por Firebase el 2026-10-18, plan de reversa): - `secid.mx` A → 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153 (GitHub Pages) - `www.secid.mx` A → 104.21.28.15, 172.67.170.40 y AAAA → 2606:4700:3036::6815:1c0f, 2606:4700:3037::ac43:aa28 (IPs del proxy de Cloudflare; el origen real está detrás) - TXT que se conservan: `google-site-verification=vUD6e8cmWAEjaLUSYC3paK6QsCzsTBahTeGYBAVteos`, `v=spf1 include:_spf.google.com ~all`
- [x] Poner en Cloudflare, con proxy apagado (nube gris) hasta que Firebase emita el certificado — hecho 2026-10-18 ~06:00 UTC (primer intento en el panel del registrador no surtió efecto: los NS son de Cloudflare; `www` quedó un rato con proxy naranja y se corrigió a DNS only). Quedan 4 NS residuales `ns-cloud-a*.googledomains.com` en la raíz: borrar cuando se pueda: - `secid.mx`: quitar los 4 A de GitHub Pages; añadir A `199.36.158.100`; añadir TXT `hosting-site=secid-mx` - `www.secid.mx`: quitar A/AAAA; añadir CNAME → `secid-mx.web.app` - No tocar los TXT de verificación de Google ni el SPF
- [x] `hostState=HOST_ACTIVE` y `ownershipState=OWNERSHIP_ACTIVE` para `secid.mx` y `www.secid.mx` (leído por API, 06:09 UTC); certificado emitido por Google Trust Services (notBefore 05:13 UTC, tipo TEMPORARY/CERT_PROPAGATING mientras llega el definitivo); `https://secid.mx` respondió 200 desde las 06:28 UTC
- [x] `scripts/ci/smoke-test.sh https://secid.mx https://us-central1-secid-org.cloudfunctions.net` pasa — 2026-10-18 06:31 UTC; `secid.mx` y `www.secid.mx` sirven `build-sha=0475b38`
- [x] Login y registro probados sobre `https://secid.mx` — login con Google OK por el owner 2026-10-18; flujo de email verificado por Claude desde Chrome en `secid.mx/es/login` (envío con contraseña inválida a propósito → Firebase Auth responde y se muestra el mensaje mapeado de PR #77; el camino positivo de email ya pasó en `secid-mx.web.app` con el mismo build y backend, y no depende del dominio). Registro: probado en `.web.app` (misma app)
- [ ] (owner, SOLO el owner: Cloudflare no lo toca Claude) Cloudflare: borrar los 4 NS residuales `ns-cloud-a1..a4.googledomains.com` en la raíz de `secid.mx` (herencia de Google Domains; no afectan al servicio, solo limpieza)
- [x] (dev) PR: quitar el `|| echo ::warning` del check de `secid.mx` en `cd.yml` → `validate` falla si prod no sirve el build — PR #76 (`fix/validate-secid-mx-hard`) mergeado por el owner 2026-10-18 18:41 UTC (ac7ac8f); run 39155294693 de `cd.yml` en verde con el check duro ("Check secid.mx serves this build" OK)

## Fase 5: limpieza (1–2 semanas después) — runbook [prod-cutover §5](./runbooks/prod-cutover.md)

- [ ] Desactivar GitHub Pages (Settings → Pages) y quitar el custom domain
- [ ] PR: borrar el `public/CNAME` viejo (`static.yml` ya no existía; Pages está en modo workflow sin despliegues desde marzo) — listo en borrador: PR #85, mergear tras desactivar Pages
- [x] Borrar la cuenta de prueba `artemiopadilla+secidtest0802@gmail.com` (uid `pc1FbpU8YtZndJ9K6LnDmlzbWIs1`) — borrada 2026-10-18 19:25 UTC (Auth + `users/{uid}`), aprobado por el owner
- [x] (hecho 2026-10-18 19:25 UTC: Auth, `users/{uid}`, `member_surveys/{uid}` y `numero_cuenta_index/300000001`) Borrar la cuenta QA del lanzamiento `artemiopadilla+qa@gmail.com` (uid `fSR9sRWj4UXW7cypeCOcCX4Q2o62`, solicitud pendiente de membresía: rechazar o borrar, no aprobar) y su `member_surveys/{uid}`
- [x] (hecho 2026-10-18 19:25 UTC; `kotom` y `EXmlbmwR` tenían Auth + doc, los otros tres solo doc) Limpiar cuentas basura detectadas en el panel de admin el 2026-10-18 (Auth + `users/{uid}`): `kotom83154@nuitx.com` (QA de mayo, uid `GFaWlLZbOSNCqHbtM1Vhvo3dqbk1`, ¡verificación aprobada!), `gcpmap-probe-9605be7ef69ba722be9b@example.com` ×2 (`E2a51HHDvMSfnoExo0bHUSWYyWx2`, `EXmlbmwRFkUwF5rRqXa1QkgVUNu1`), `gcpmap-dp-df2d0476cd9f5ec67ace@example.com` (`Vi3ICe5Vu1QoSKCNRvXipAVS0wu1`), `gcpmap-probe-367e9e8c3e0c7cae9b05@example.com` (`BTV4aX9vB1gqk5wsIfVIeNYlRz82`)
- [ ] (owner: preguntarle a él) Resolver duplicados: `jalejandrobondi@gmail.com` tiene dos cuentas admin — datos 2026-10-18: `nDpgqaFm…` = Auth Google jalejandrobondi@gmail.com, último login 2026-04-03, y es la que apunta `numero_cuenta_index/314634825`; `pScvueLK…` = Auth **alejandrobondi@me.com** (otro buzón, no un alias; importada 2026-02-25, nunca ha iniciado sesión, con claims RBAC `member`). Ambos docs `users` idénticos. Si confirma que no usa el `@me.com`: borrar `pScvueLK` en Auth + doc; si lo usa, fusionar con `merge_requests` (archiva la fuente y crea `email_alias`). El stub de `luis.morales130702@gmail.com` (`dHivtgBs…`, solo doc, sin Auth) ya se borró el 2026-10-18 (`nDpgqaFmiweL4zXtV08DVjllxbP2` y `pScvueLKGiPqT18sfPWEztkZNh03`); `luis.morales130702@gmail.com` tiene un stub sin nombre (`dHivtgBs9Pd2HUsbknw07r0A2qP2`) además de su cuenta real (`fmJmXgOQGETpkZQEUCs4JXJxys42`, pendiente de aprobación desde el 22-sep-2026)
- [x] (borrado 2026-10-18 19:26 UTC, Auth + doc; `email_alias/artemiopadilla@ciencias.unam.mx` → cuenta principal del owner se conserva) Revisar el stub `users/aHlVPULyTNPTnwUh6h8RPWdBx203` (Auth: `artemiopadilla@ciencias.unam.mx`, correo alterno del owner; doc casi vacío que aparece como "Miembro" sin correo en el panel)
- [ ] Opcional: quitar `secid-mx.web.app` de CORS si ya no se usa
- [x] (dev) Tabla de entornos y sección de deploy actualizadas en `docs/DEPLOYMENT.md` y `README.md` (sin GitHub Pages ni `staging`)

---

## Seguimiento post-lanzamiento (no bloquea el lanzamiento; hallazgos del 2026-10-18)

> El plan ordenado de siguientes pasos (bloques A–E, dueños, orden) está en [docs/ROADMAP.md](./ROADMAP.md); esta sección es el registro ítem por ítem.

- [x] Solicitud real pendiente desde el 22-sep-2026: Luis Enrique Morales Flores (`fmJmXgOQGETpkZQEUCs4JXJxys42`) — APROBADA 2026-10-18 21:55 UTC por decisión del owner, ejecutada por Claude desde el panel (Estado → Activo = `updateMemberStatus`: `lifecycle.status=active`, `role=member`, `verificationStatus=approved`, `isVerified=true`)
- [x] (dev) BUG hallado al aprobar — PR #88 mergeado 2026-10-18 (735619c), deploy cd.yml 39172339590 en verde; verificado en `secid.mx`: `?status=pending` → 0 miembros, filtro Activo → 31 con verificación "Aprobado", título corregido. Era: la tabla de admin mostraba a TODOS como "Pendiente" / "Sin verificar" (36 filas con `?status=pending`) porque `src/lib/members/mapper.ts` no copia `lifecycle` ni `verificationStatus`/`isVerified` al `MemberProfile`; además `admin/members/index.astro` tiene `Gesti\u00f3n` escapado literal en título y h1 → PR en curso
- [ ] (owner) Fase 0 §B y correo de prueba del presupuesto (arriba) — siguen abiertos
- [ ] Issue #79 — código hecho: PR #95 mergeado 2026-10-18 (`/es|en/auth/action`, 9 tests). Falta (owner, consola): Firebase → Authentication → Templates → "Customize action URL" → `https://secid.mx/es/auth/action` (runbook prod-cutover §5.1)
- [x] Issue #82 — CERRADO 2026-10-18: PR #97 desplegado y verificado en producción con Playwright (0 errores de hidratación en `/es/signup`, `/en/signup`, `/es/login`, `/es/`). Causa: `@playform/compress` (html-minifier-terser) borraba los `<!-- -->` que React usa entre nodos de texto; PR #97 (`HTML: false` + e2e `tests/e2e/hydration.spec.ts`, rojo→verde contra `astro preview` local). El dashboard solo tiene islands `client:only`, no hidrata
- [x] Issue #86 (cerrado): `onUserDelete` (gen1, corre como `secid-org@appspot.gserviceaccount.com`) — IAM `roles/datastore.user` otorgado por el owner 2026-10-18 19:30 UTC (runbook prod-cutover + `infra/runtime_iam.tf`); segundo fallo (índice de colección-grupo `applications.applicantId`) resuelto con PR #87 mergeado 2026-10-18 (`cd.yml` run 39161186760). Verificado 20:03 UTC: borrar un usuario Auth desechable → `status: 'ok'`, `User data cleaned up`
- [ ] Issue #83 — código hecho: PR #96 mergeado 2026-10-18 (delegación sin clave vía IAM Credentials `signJwt`, 10 tests, runbook prod-cutover §6, `infra/runtime_iam.tf`). Falta (owner): (a) `gcloud services enable iamcredentials.googleapis.com admin.googleapis.com --project secid-org` y `gcloud iam service-accounts add-iam-policy-binding 706604039024-compute@developer.gserviceaccount.com --member serviceAccount:706604039024-compute@developer.gserviceaccount.com --role roles/iam.serviceAccountTokenCreator --project secid-org`; (b) Workspace Admin Console → Seguridad → Controles de API → Delegación de dominio → client ID de la SA (`gcloud iam service-accounts describe 706604039024-compute@developer.gserviceaccount.com --project secid-org --format='value(oauth2ClientId)'`) con scopes `admin.directory.group` y `admin.directory.group.member`; luego aprobar un miembro y revisar logs
- [x] PR #80 mergeado 2026-10-18: paso de dominios reCAPTCHA en `cutover.yml`, por si se repite el cutover
- [x] (dev) `lint-staged` ignora `.ts/.tsx` ("No staged files match any configured task"): los fallos de Prettier llegan a CI — PR #89 mergeado 2026-10-18 (11d9446)
- [x] (dev) ESLint de `functions/`: eran 1263 errores de formato (eslint-config-google vs Prettier), no un plugin faltante — PR #90 (eslint-config-prettier, 0 errores) mergeado 2026-10-18 (24fc6f5). Colateral (sigue abierto): `functions/lib/` compilado está versionado y desactualizado respecto a `src/` → gitignorar o regenerar en PR aparte
- [x] (dev) Suite `LoginForm` en `describe.skip` en `main`; falla entera al activarla — PR #94 mergeado 2026-10-18 (38 tests en verde, sin bug en el componente; eran aserciones obsoletas)
- [x] (resuelto 2026-10-18 22:57 UTC: el owner regeneró `CLAUDE_CODE_OAUTH_TOKEN`; rerun de la revisión del PR #92 en verde, 3 turnos) El check `claude-review` (no requerido) fallaba en todos los PRs desde el 2026-10-18 03:48 UTC. CORRECCIÓN: el workflow ya usa OAuth (`CLAUDE_CODE_OAUTH_TOKEN`, fijado 2026-03-26); el `ANTHROPIC_API_KEY` vacío es normal. Misma configuración y mismo SHA de la action pasaban hasta las 03:39; desde entonces 19 fallos idénticos (1 turno, 2 s, coste 0 = la API rechaza la primera llamada), incluido un rerun a las 23:30. Causa más probable: token OAuth revocado/caducado (o límite de uso de la suscripción). Fix: `claude setup-token` y `gh secret set CLAUDE_CODE_OAUTH_TOKEN`. El token OIDC de GitHub Actions no sirve para Anthropic
- [x] (dev) Dependabot reporta 63 vulnerabilidades en `main` (7 críticas, 30 altas) — PR #92 mergeado 2026-10-18 (sin majors): raíz 37→22, prod 21→13, functions 51→10; build, type-check y 1115 tests unitarios en verde. Lo que queda exige majors (astro 7, vitest 5, tailwind 4; detalle en `docs/known-issues/npm-audit-2026-10-18.md`). Falta merge del owner
- [ ] Roadmap (no bloquea): MCP de SECiD + skill para coding assistants — spec en `docs/specs/secid-mcp-and-assistant-skill.md`, ítems en `docs/features/todo.md`. Skill `.claude/skills/secid-ops/` mergeada en PR #91 (2f3b729; probada con agente nuevo: 4 lecturas vs 17 sin skill); el MCP queda para después
- [x] (dev) Opcional: alerta/monitoreo de uptime para `https://secid.mx` (el smoke test solo corre en cada deploy) — PR #93 mergeado 2026-10-18 (`uptime.yml` cada 15 min, abre/cierra issue `incident`)
- [x] Gobernanza del repo (2026-10-18, por API con permiso del owner): `allow_auto_merge=true`, `delete_branch_on_merge=true`; protección de `main` ahora exige Build Validation, Code Quality & Linting, Secret Scanning, CodeQL, **Test Summary** (unitarios ×4 + lint + build) y **Firestore Rules Tests**, con `strict` (rama al día). E2E se añadirá al gate cuando corra de verdad. Pendiente: CONTRIBUTING.md + plantilla de PR + CODEOWNERS (PR en curso)
- [ ] (dev) Hallazgo 2026-10-18: la suite e2e de Playwright no arranca en local ni en CI: el job falla en `global-setup` por `dotenv` (no es dependencia) y `__dirname` en ESM, y aparece verde por `continue-on-error` → 0 tests e2e ejecutados. PR en curso: cargador de env sin dotenv, `__dirname` ESM, imports JSON con atributos, `test.use` sin `defaultBrowserType`; 266 tests listados

## Reglas de trabajo con backend compartido (desde la Fase 3)

1. Solo `main` despliega el backend (functions, reglas, índices, storage).
2. Cambio de backend: primero PR chico a `main`, luego merge de `main` a `feature/hub`.
3. Los cambios de backend solo agregan (campos opcionales, callables nuevos, reglas más permisivas). Quitar o restringir solo cuando ningún frontend lo use.
4. Beta usa datos reales: nada de pruebas destructivas ahí. Usar emuladores (`npm run dev`).
5. Si aparece `Quota exceeded for total allowable CPU`: revisar primero `functions/src/init.ts`.

## Cuándo replantear

- **Proyecto de staging aparte:** un cambio de backend rompe prod por no tener dónde probarlo, o beta ensucia datos / manda correos a miembros.
- **Supabase:** dos o más de: caídas de GCP aun con alertas, consultas lentas o caras, el equipo prefiere SQL, presupuesto fijo ~$25/mes. Antes de decidir, piloto de 1 semana con un solo módulo.
