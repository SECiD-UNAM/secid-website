# Runbook: corte de secid.mx a Firebase Hosting

**Cuándo:** una sola vez, para que `secid.mx` sirva la app Astro desde
Firebase Hosting en lugar del sitio legado en GitHub Pages. Después de esto
los deploys de prod son automáticos (`cd.yml` en cada push a `main`).

**Tiempo:** ~1 h de trabajo activo + espera del certificado (minutos a horas).

**Prerrequisitos**

- PR de endurecimiento mergeado en `feature/hub` (`cutover.yml` debe existir ahí).
- [Alerta de presupuesto](./billing-and-budget.md) configurada.
- [Respaldo de Firestore](./firestore-backup.md) reciente.
- Acceso a Cloudflare para la zona `secid.mx`.

## 1. Sitio de Hosting, dominios autorizados, variables (CI)

```bash
gh workflow run cutover.yml --ref feature/hub \
  -f site_id=secid-mx \
  -f custom_domains=secid.mx,www.secid.mx \
  -f backend_from_main=true
gh run watch $(gh run list --workflow cutover.yml --limit 1 --json databaseId -q '.[0].databaseId')
```

Abre el resumen del run (`gh run view <id> --web`). Debe listar:

- Hosting site `secid-mx` → `https://secid-mx.web.app`
- Auth authorized domains con `secid-mx.web.app`, `secid.mx`, `www.secid.mx`
- Variables `FIREBASE_PROD_HOSTING_SITE=secid-mx` y `BACKEND_DEPLOYED_FROM_MAIN=true`
- Por cada dominio, los **registros DNS** que pide Firebase (guárdalos para el paso 4)

Si alguna sección dice **MANUAL**, la service account no tiene ese permiso;
el resumen trae el paso de consola exacto. Equivalentes manuales:

| Paso                 | Consola / comando                                                                                                       |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Sitio de Hosting     | `firebase hosting:sites:create secid-mx --project secid-org`                                                            |
| Dominios autorizados | Firebase Console → Authentication → Settings → Authorized domains → Add                                                 |
| Variables            | `gh variable set FIREBASE_PROD_HOSTING_SITE --body secid-mx` y `gh variable set BACKEND_DEPLOYED_FROM_MAIN --body true` |
| Dominio custom       | Firebase Console → Hosting → `secid-mx` → Add custom domain                                                             |

Verificar: `gh variable list` muestra las dos variables.

Lo que pasó el 2026-10-18 (run 39093945487): sitio, dominios de Auth y
dominios custom salieron bien desde CI; **el paso de variables siempre
cae a MANUAL** porque el `GITHUB_TOKEN` de Actions no puede escribir
variables del repo (HTTP 403 `Resource not accessible by integration`).
Cuenta con correr los dos `gh variable set` de la tabla desde tu máquina.

Para leer el estado desde local sin `firebase login`, las APIs aceptan el
token de `gcloud` si mandas el proyecto de cuota:

```bash
TOKEN=$(gcloud auth print-access-token)
H=(-H "Authorization: Bearer $TOKEN" -H "x-goog-user-project: secid-org")
curl -sS "${H[@]}" https://firebasehosting.googleapis.com/v1beta1/projects/secid-org/sites/secid-mx/customDomains \
  | jq -r '.customDomains[] | "\(.name|split("/")[-1])\t\(.hostState)\t\(.ownershipState)\t\(.certState)"'
```

Los registros descubiertos y deseados de ese run están copiados en la
Fase 4 del [checklist](../LAUNCH-CHECKLIST.md).

`backend_from_main=true` hace que `deploy-beta.yml` deje de desplegar
functions/reglas y que `cd.yml` lo haga. Se pone **antes** del merge a `main`
para que nunca haya dos deployers.

## 1b. Dominios de la clave de reCAPTCHA (owner, 1 comando)

Los formularios públicos (`/api/forms/contact`, `/api/forms/newsletter`)
verifican reCAPTCHA v3 en el servidor. La clave es de reCAPTCHA
**Enterprise** (`secid-website`, `6Lf0GPss…`) y solo acepta tokens de los
dominios que tiene registrados. Si el dominio de prod no está, cada envío
responde `400 captcha_failed` y en los logs de la función aparece
`errorCodes: [ 'browser-error' ]` (pasó el 2026-10-18 con
`secid-mx.web.app`).

```bash
gcloud recaptcha keys list --project secid-org --format='value(name,webSettings.allowedDomains)'
gcloud recaptcha keys update 6Lf0GPssAAAAAMXkNpzJDzISkep0YRM14GmKCPSB --project secid-org --web \
  --domains=secid.mx,www.secid.mx,beta.secid.mx,secid-mx.web.app,localhost
```

Verificar: enviar el formulario de contacto en `https://<site>.web.app/es/contact`
y ver `200` en `gcloud logging read 'resource.labels.service_name="sendcontactmessage"'`.

Diagnóstico de otros rechazos (log `[public-forms] CAPTCHA rejected`):

| errorCodes / score       | Causa                                                                                                  | Arreglo                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `browser-error`          | dominio no registrado en la clave                                                                      | comando de arriba                                                  |
| `invalid-input-secret`   | `RECAPTCHA_SECRET_KEY` no es un secreto válido                                                         | ver abajo: secreto legacy de la clave                              |
| `incorrect-captcha-sol`  | el secreto es válido pero de **otra** clave: el token lo emitió `6Lf0GPss…` y el secreto no es el suyo | ver abajo: secreto legacy de la clave                              |
| `invalid-input-response` | token caducado o falso                                                                                 | normal en pruebas con curl; el sitio real manda token fresco       |
| `score < 0.5`            | tráfico sospechoso (automatización)                                                                    | probar a mano; ajustar `CAPTCHA_MIN_SCORE` si hay falsos positivos |

Secreto legacy de la clave Enterprise (lo que debe estar en
`STAGING_RECAPTCHA_SECRET_KEY` / `RECAPTCHA_SECRET_KEY` del repo). Solo
el owner; no lo pegues en ningún sitio:

```bash
TOKEN=$(gcloud auth print-access-token)
LEGACY=$(curl -sS -H "Authorization: Bearer $TOKEN" -H "x-goog-user-project: secid-org" \
  "https://recaptchaenterprise.googleapis.com/v1/projects/secid-org/keys/6Lf0GPssAAAAAMXkNpzJDzISkep0YRM14GmKCPSB:retrieveLegacySecretKey" \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['legacySecretKey'])")
# ¿coincide con lo desplegado?
DEPLOYED=$(gcloud run services describe sendcontactmessage --region us-central1 --project secid-org --format=json \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print(next(e['value'] for e in d['spec']['template']['spec']['containers'][0]['env'] if e['name']=='RECAPTCHA_SECRET_KEY'))")
[ "$LEGACY" = "$DEPLOYED" ] && echo IGUALES || echo DIFERENTES
# si DIFERENTES:
gh secret set STAGING_RECAPTCHA_SECRET_KEY --body "$LEGACY"
gh run rerun $(gh run list --workflow cd.yml --limit 1 --json databaseId -q '.[0].databaseId')   # redespliega functions con el secret nuevo
```

Desde PR #81 la función **no usa `siteverify`** cuando `RECAPTCHA_SITE_KEY`
está en su env (lo escriben `cd.yml` / `deploy-beta.yml`): verifica con la
API de evaluación de reCAPTCHA Enterprise autenticada como su propia
cuenta de servicio. Ese camino necesita, una vez:

```bash
gcloud projects add-iam-policy-binding secid-org \
  --member serviceAccount:706604039024-compute@developer.gserviceaccount.com \
  --role roles/recaptchaenterprise.agent
```

### Roles de las cuentas de servicio de runtime (una vez por proyecto)

Las funciones **gen2** corren como `706604039024-compute@developer.gserviceaccount.com`
(tiene `datastore.user`, `firebaseauth.admin`, `recaptchaenterprise.agent`,
`eventarc.eventReceiver`, `run.invoker`). La única **gen1** (`onUserDelete`,
trigger de Auth) corre como `secid-org@appspot.gserviceaccount.com`, que se
quedó sin roles al retirarle Editor: sin esto el borrado de usuarios deja
`users/{uid}` huérfanos (`PERMISSION_DENIED` en los logs; issue #86). Fix:

```bash
gcloud projects add-iam-policy-binding secid-org \
  --member serviceAccount:secid-org@appspot.gserviceaccount.com \
  --role roles/datastore.user
```

Verificación sin ruido: crear un usuario Auth desechable **sin** documento
(`POST identitytoolkit…/projects/secid-org/accounts {"email":…,"disabled":true}`),
esperar ~2 min de propagación de IAM, borrarlo (`accounts:delete`) y buscar
`User data cleaned up for <uid>` en `gcloud functions logs read onUserDelete --region us-central1`.
Ambos bindings están también en `infra/runtime_iam.tf`.

Log de la función: `[captcha] rejected { action, backend, reason, score }`
cuando rechaza; `[captcha] verify error` (403) si falta el rol. Para
reproducir un token real sin navegador a mano:
`node <script Playwright> | curl …/assessments` (ver historial del
2026-10-18 en el checklist; un navegador headless puntúa ~0.1, así que el
score bajo en esa prueba es normal, lo que importa es `valid: true`).

## 2. Merge a `main`

`main` solo cambia por PR (branch protection). Mergea el PR de promoción
(`feature/hub` → `main`) desde GitHub o:

```bash
gh pr merge <número> --merge
gh run watch $(gh run list --workflow cd.yml --limit 1 --json databaseId -q '.[0].databaseId')
```

`cd.yml` despliega Hosting a `secid-mx`, luego el backend (reglas → storage →
functions) y corre el smoke test contra `https://secid-mx.web.app`. Si el
job `validate` falla, **nada cambió para los visitantes** (el DNS sigue en
Pages): corrige con otro PR.

## 3. Pruebas manuales en `https://secid-mx.web.app`

- Login con email y con Google.
- Registro completo con una cuenta `tu-correo+qa@…` (no recibe correos
  automáticos nuestros; la verificación de email sí llega, la manda Firebase Auth).
- Formulario de contacto.
- Beta (`https://beta.secid.mx`) sigue funcionando (mismo backend).

## 4. DNS en Cloudflare (el momento del cambio real)

1. **Anota los registros actuales** de `secid.mx` y `www` (apuntan a GitHub
   Pages). Son el plan de reversa.
2. Reemplázalos por los registros del paso 1, con proxy **apagado** (nube
   gris) hasta que Firebase emita el certificado.
3. Espera el certificado. Re-lanza el workflow del paso 1 con los mismos
   inputs: `hostState` debe ser `HOST_ACTIVE` para ambos dominios.
4. Verifica:

```bash
scripts/ci/smoke-test.sh https://secid.mx https://us-central1-secid-org.cloudfunctions.net
```

y repite login + registro sobre `https://secid.mx`.

5. Cuando esté estable, puedes volver a encender el proxy de Cloudflare
   (opcional; Firebase ya da CDN y TLS).

## 5. Después (1–2 semanas)

- GitHub → Settings → Pages: quitar el custom domain y desactivar Pages.
- PR: quitar `public/CNAME`; en `cd.yml`, convertir el check de `secid.mx`
  del job `validate` en fallo duro (quitar el `|| echo ::warning`).
- Borrar cuentas de prueba (Firebase Console → Authentication).

## Reversa

- **Antes del paso 4:** no hay nada que revertir; `secid.mx` nunca cambió.
- **Después del paso 4:** vuelve a poner en Cloudflare los registros
  anotados en 4.1. Propaga en minutos. GitHub Pages sigue sirviendo el sitio
  legado mientras no lo desactives (paso 5).
- Backend: ver [rollback.md](./rollback.md).
