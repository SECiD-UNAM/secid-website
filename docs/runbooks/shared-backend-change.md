# Runbook: cambios en el backend compartido

Un solo backend (functions, reglas de Firestore, índices, reglas de Storage)
sirve a beta y a producción. Lo despliega **una sola rama**, elegida por la
variable del repo `BACKEND_DEPLOYED_FROM_MAIN`:

| Valor       | Quién despliega el backend        | Quién no                |
| ----------- | --------------------------------- | ----------------------- |
| sin definir | `feature/hub` (`deploy-beta.yml`) | `cd.yml` salta el job   |
| `true`      | `main` (`cd.yml`)                 | `deploy-beta.yml` salta |

```bash
gh variable list                                   # ver
gh variable set BACKEND_DEPLOYED_FROM_MAIN --body true
gh variable delete BACKEND_DEPLOYED_FROM_MAIN      # devolverlo a beta
```

## Publicar un cambio de backend (cuando `main` lo despliega)

1. Rama desde `main` con **solo** el cambio de backend. Debe ser aditivo:
   campos opcionales, callables nuevos, reglas que permiten más. Quitar o
   restringir solo cuando ningún frontend desplegado lo use.
2. PR a `main`. CI corre los tests de reglas con emulador
   (`Firestore Rules Tests`); si una regla rompe un camino existente, falla ahí.
3. Merge → `cd.yml` despliega reglas → storage → functions y corre el smoke test.
4. `git checkout feature/hub && git merge main && git push` para que beta
   tenga el mismo backend y el frontend pueda usarlo.

## Borrar una function a propósito

`scripts/ci/check-function-deletions.mjs` hace fallar el deploy si la rama
dejó de exportar una function desplegada (evita que una rama atrasada borre
algo que la otra usa). Para un borrado intencional, lanza el deploy con la
excepción explícita:

```bash
gh variable set ALLOW_FUNCTION_DELETIONS --body "nombreFn1,nombreFn2"
gh workflow run cd.yml --ref main            # o deploy-beta.yml --ref feature/hub, según quién despliega
# cuando el run esté verde:
gh variable delete ALLOW_FUNCTION_DELETIONS
```

Ambos workflows pasan la variable al step "Refuse to delete functions";
sin ella, cualquier borrado hace fallar el deploy antes de tocar nada.

## Renombrar secretos `STAGING_*` → sin prefijo (opcional, sin downtime)

Los workflows leen `FIREBASE_X` y, si no existe, `STAGING_FIREBASE_X`.

```bash
# ejemplo para uno; repetir por cada fila de la tabla en docs/DEPLOYMENT.md
gh secret set FIREBASE_API_KEY --body "<valor>"
# lanzar un deploy y confirmarlo verde; luego
gh secret delete STAGING_FIREBASE_API_KEY
```

Los valores están en Firebase Console → Project settings → General → Your apps.

## Cuentas de prueba

Usa `tu-correo+qa@…` (o `+secidtest`, `+test`). `functions/src/email-service.ts`
no les encola correos automáticos (bienvenida, job-match, cambios de
estatus). Beta escribe datos reales: pruebas destructivas solo en
emuladores (`npm run dev`). Borra las cuentas de prueba al terminar
(Firebase Console → Authentication → usuario → Delete).

## Verificar después de cualquier deploy de backend

```bash
scripts/ci/smoke-test.sh https://beta.secid.mx https://us-central1-secid-org.cloudfunctions.net
scripts/ci/smoke-test.sh https://secid-mx.web.app https://us-central1-secid-org.cloudfunctions.net
```
