# Runbook: reversa de un deploy

Primero decide **qué** se rompió. El smoke test lo separa en segundos:

```bash
scripts/ci/smoke-test.sh https://secid-mx.web.app https://us-central1-secid-org.cloudfunctions.net
```

- Falla la sección `Hosting` → frontend (A).
- Falla la sección `Backend` → functions o reglas (B).
- Todo falla con 503 → proyecto GCP, no código: [billing-and-budget.md](./billing-and-budget.md).

## A. Frontend (Hosting)

Firebase guarda las versiones anteriores del sitio. Reversa inmediata, sin
build:

```bash
firebase login --reauth
firebase hosting:channel:list --site secid-mx --project secid-org   # opcional, ver versiones
firebase hosting:rollback --site secid-mx --project secid-org        # vuelve a la versión anterior
```

(Para beta: `--site <id del sitio por defecto>`; lo muestra
`firebase hosting:sites:list --project secid-org`.)

Después, arregla en código con un PR; el siguiente deploy vuelve a avanzar.

## B. Backend (functions / reglas)

No hay "rollback" de un botón: se redespliega el commit bueno.

1. Identifica el último deploy bueno: `gh run list --workflow cd.yml --limit 5`.
2. Revierte el PR malo en `main` (`gh pr revert` o botón _Revert_ en GitHub) y
   mergea el PR de reversa. `cd.yml` redespliega reglas → storage → functions.
3. Si una **regla** dejó a los usuarios sin acceso y no puedes esperar al
   CI, despliega las reglas del commit bueno a mano:

```bash
git checkout <commit-bueno> -- firestore.rules storage.rules firestore.indexes.json
firebase deploy --only firestore:rules,firestore:indexes,storage --project secid-org
git checkout -- firestore.rules storage.rules firestore.indexes.json
```

4. Si una **function** rompe el registro, el equivalente manual:

```bash
git checkout <commit-bueno>
cd functions && npm ci && cd ..
firebase deploy --only functions:completeRegistration --project secid-org
git checkout -
```

Los datos no se revierten solos: si el deploy malo corrompió documentos,
ver [firestore-backup.md](./firestore-backup.md#restaurar).

## C. Volver a GitHub Pages (solo durante el corte)

Mientras GitHub Pages siga activo, basta con restaurar en Cloudflare los
registros DNS anotados en el paso 4.1 de [prod-cutover.md](./prod-cutover.md).
Propaga en minutos. Cuando Pages ya esté desactivado, esta opción deja de
existir: usa A.

## Después de cualquier reversa

- Repite el smoke test.
- Abre un issue con el run que falló (`gh run view <id> --web`) y el commit
  revertido, para que el arreglo entre por PR con tests.
