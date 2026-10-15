# Checklist de lanzamiento: secid.mx en Firebase Hosting

Tracking del corte de producción con backend compartido (un solo proyecto
`secid-org` para beta y prod). El detalle técnico de cada paso está en
[`DEPLOYMENT.md` → Production cutover](./DEPLOYMENT.md#production-cutover).

Convención: `(owner)` = consola GCP/Firebase o GitHub, lo hace el dueño del
proyecto. `(dev)` = cambios en el repo, entran por PR.

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

## Fase 0: red de seguridad (owner, ~15 min, hacer ya)

- [ ] Alerta de presupuesto en GCP → Billing → Budgets & alerts (p. ej. $20/mes, avisos al 50/90/100%)
- [ ] Notificaciones de la cuenta de facturación al correo del owner
- [ ] Correo de prueba de la alerta recibido
- [ ] Export de Firestore antes de tocar reglas o datos:
      `gcloud firestore export gs://secid-org.appspot.com/backups/$(date +%F) --project secid-org`

## Fase 1: PR de endurecimiento (dev, 1–2 días) — `fix/shared-backend-hardening` → `feature/hub`

- [ ] Mismo grupo de concurrencia `firebase-backend` en los jobs de backend de `cd.yml` y `deploy-beta.yml`
- [ ] Orden de deploy: reglas + índices → storage → functions (hoy functions va primero, `cd.yml:132`)
- [ ] Guardia antes de `--force`: fallar si el deploy borraría una function que existe en el backend
- [ ] Una sola lista de orígenes CORS (hoy 3: `functions/src/env.ts`, `public-forms.ts`, `get-salary-stats.ts`) y agregar `https://secid-mx.web.app`
- [ ] Un solo default de `APP_URL` = `https://secid.mx` (`env.ts` usa beta, `linkedin-auth.ts` usa `secid.org`)
- [ ] Job `validate` de `cd.yml` con pruebas que sí fallan: Hosting 200, `/es/` 200, un callable responde, `/api/forms/contact` responde
- [ ] `npm run test:rules` corre en CI en cada PR a `main` y `feature/hub`
- [ ] Bandera `qa` en usuarios de prueba: sin correos de job-match, onboarding ni encuestas
- [ ] Renombrar secretos `STAGING_FIREBASE_*` → `FIREBASE_*` en ambos workflows (y `gh secret set`)
- [ ] Sección "Reglas de backend compartido" en `docs/DEPLOYMENT.md`
- [ ] CI en verde, deploy de beta OK con el nuevo orden, registro en beta sigue funcionando
- [ ] Merge a `feature/hub` (actualiza PR #1)

## Fase 2: consola, antes del merge (owner, ~30 min)

- [ ] Firebase Console → Hosting → Add another site → `secid-mx`
      (o `firebase hosting:sites:create secid-mx --project secid-org`)
- [ ] `gh variable set FIREBASE_PROD_HOSTING_SITE --body secid-mx`
- [ ] Auth → Settings → Authorized domains: `secid-mx.web.app`, `secid.mx`, `www.secid.mx`
- [ ] OAuth de Google y GitHub: callbacks siguen en `secid-org.firebaseapp.com` (no hay que cambiar nada)
- [ ] `gh variable set BACKEND_DEPLOYED_FROM_MAIN --body true` (**antes** del merge)
- [ ] `gh variable list` muestra las dos variables

## Fase 3: merge y prueba en `.web.app` (owner hace merge, dev verifica, ~1 h)

- [ ] Merge de PR #1 (por PR, nunca push directo a `main`)
- [ ] Run de `cd.yml` en verde: hosting + backend + validate
- [ ] En `https://secid-mx.web.app`:
  - [ ] `/es/` y `/en/` cargan
  - [ ] Una ruta dinámica (perfil de miembro, evento) carga
  - [ ] Login con email
  - [ ] Login con Google
  - [ ] Registro completo con cuenta `+test` marcada `qa`
  - [ ] Formulario de contacto y newsletter
- [ ] Beta (`beta.secid.mx`) sigue funcionando contra el backend desplegado por `main`
- [ ] Si algo falla: secid.mx no se afecta (DNS sigue en Pages); corregir con otro PR

## Fase 4: DNS (owner, ~20 min + propagación)

- [ ] Hosting → `secid-mx` → Add custom domain `secid.mx`
- [ ] Add custom domain `www.secid.mx` con redirección al apex
- [ ] Registros en Cloudflare con proxy apagado (nube gris) hasta que Firebase emita el certificado
- [ ] Certificado SSL activo en Firebase
- [ ] Pruebas de la Fase 3 repetidas sobre `https://secid.mx`
- [ ] Anotar aquí los registros DNS anteriores de GitHub Pages (plan de reversa):
      `_________________________________________`

## Fase 5: limpieza (1–2 semanas después)

- [ ] Desactivar GitHub Pages (Settings → Pages) y quitar el custom domain
- [ ] PR: borrar `static.yml` y el `public/CNAME` viejo
- [ ] Borrar la cuenta de prueba `artemiopadilla+secidtest0802@gmail.com`
- [ ] Opcional: quitar `secid-mx.web.app` de CORS si ya no se usa
- [ ] Actualizar la tabla de entornos en `docs/DEPLOYMENT.md` y `README.md`

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
