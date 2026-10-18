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
- [ ] (owner) Correo de prueba de la alerta recibido — GCP no manda correo al crear el presupuesto; se verifica con el primer umbral o editando la alerta a 1 MXN un momento (runbook §A)
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

- [ ] (owner) Actions → `Production Cutover` → Run workflow con `site_id=secid-mx`, `custom_domains=secid.mx,www.secid.mx`, `backend_from_main=true`
- [ ] (CI) Sitio de Hosting `secid-mx` creado → https://secid-mx.web.app
- [ ] (CI) Auth authorized domains incluyen `secid-mx.web.app`, `secid.mx`, `www.secid.mx`
- [ ] (CI) `FIREBASE_PROD_HOSTING_SITE=secid-mx` y `BACKEND_DEPLOYED_FROM_MAIN=true` (fallback: `gh variable set ...`, el resumen del run lo imprime)
- [ ] (CI) Dominios `secid.mx` y `www.secid.mx` solicitados en el sitio; el resumen del run muestra los registros DNS para la Fase 4 (no cambian nada todavía)
- [ ] (owner) Revisar el resumen del run: si algún paso dice MANUAL, hacerlo en consola como indica
- [ ] (owner) OAuth de Google y GitHub: callbacks siguen en `secid-org.firebaseapp.com` (no hay que cambiar nada)
- [ ] `gh variable list` muestra las dos variables

## Fase 3: merge y prueba en `.web.app` (owner hace merge, dev verifica, ~1 h) — runbook [prod-cutover §2–3](./runbooks/prod-cutover.md)

- [ ] Merge de PR #1 (por PR, nunca push directo a `main`)
- [ ] Run de `cd.yml` en verde: hosting + backend + validate (el smoke test ya cubre locales, rewrite dinámico, headers, `/api/forms/*` y un callable)
- [ ] A mano en `https://secid-mx.web.app`:
  - [ ] Login con email
  - [ ] Login con Google
  - [ ] Registro completo con una cuenta `+qa` (no recibe correos automáticos; verificación de email sí llega porque la manda Firebase Auth, no nosotros)
  - [ ] Enviar el formulario de contacto
- [ ] Beta (`beta.secid.mx`) sigue funcionando contra el backend desplegado por `main`
- [ ] Si algo falla: secid.mx no se afecta (DNS sigue en Pages); corregir con otro PR

## Fase 4: DNS (owner, ~20 min + propagación) — runbook [prod-cutover §4](./runbooks/prod-cutover.md), reversa en [rollback §C](./runbooks/rollback.md)

- [ ] Anotar aquí los registros DNS actuales de `secid.mx` y `www` en Cloudflare (plan de reversa, apuntan a GitHub Pages):
      `_________________________________________`
- [ ] Poner en Cloudflare los registros que imprimió `Production Cutover` (Fase 2), con proxy apagado (nube gris) hasta que Firebase emita el certificado
- [ ] Re-lanzar `Production Cutover` (mismos inputs): `hostState` debe llegar a `HOST_ACTIVE` para `secid.mx` y `www.secid.mx`
- [ ] `scripts/ci/smoke-test.sh https://secid.mx https://us-central1-secid-org.cloudfunctions.net` pasa
- [ ] Login y registro probados sobre `https://secid.mx`
- [ ] (dev) PR: quitar el `|| echo ::warning` del check de `secid.mx` en `cd.yml` → `validate` falla si prod no sirve el build

## Fase 5: limpieza (1–2 semanas después) — runbook [prod-cutover §5](./runbooks/prod-cutover.md)

- [ ] Desactivar GitHub Pages (Settings → Pages) y quitar el custom domain
- [ ] PR: borrar `static.yml` y el `public/CNAME` viejo
- [ ] Borrar la cuenta de prueba `artemiopadilla+secidtest0802@gmail.com`
- [ ] Opcional: quitar `secid-mx.web.app` de CORS si ya no se usa
- [x] (dev) Tabla de entornos y sección de deploy actualizadas en `docs/DEPLOYMENT.md` y `README.md` (sin GitHub Pages ni `staging`)

---

## Reglas de trabajo con backend compartido (desde la Fase 3)

1. Solo `main` despliega el backend (functions, reglas, índices, storage).
2. Cambio de backend: primero PR chico a `main`, luego merge de `main` a `feature/hub`.
3. Los cambios de backend solo agregan (campos opcionales, callables nuevos, reglas más permisivas). Quitar o restringir solo cuando ningún frontend lo use.
4. Beta usa datos reales: nada de pruebas destructivas ahí. Usar emuladores (`npm run dev`).
5. Si aparece `Quota exceeded for total allowable CPU`: revisar primero `functions/src/init.ts`.

## Cuándo replantear

- **Proyecto de staging aparte:** un cambio de backend rompe prod por no tener dónde probarlo, o beta ensucia datos / manda correos a miembros.
- **Supabase:** dos o más de: caídas de GCP aun con alertas, consultas lentas o caras, el equipo prefiere SQL, presupuesto fijo ~$25/mes. Antes de decidir, piloto de 1 semana con un solo módulo.
