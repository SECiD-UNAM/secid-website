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

`backend_from_main=true` hace que `deploy-beta.yml` deje de desplegar
functions/reglas y que `cd.yml` lo haga. Se pone **antes** del merge a `main`
para que nunca haya dos deployers.

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
