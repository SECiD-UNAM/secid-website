# Runbook: respaldo y restauración de Firestore

**Cuándo respaldar:** antes de cualquier cambio de reglas que restrinja
acceso, antes de scripts de migración de datos (`scripts/migrate-*.mjs`), y
antes del corte a producción. Además corre solo cada domingo 08:00 UTC.

El respaldo va al bucket de Storage del proyecto, carpeta
`firestore-backups/<fecha>-<etiqueta>/`. Son unos MB; borra los viejos desde
la consola de Storage si crecen.

## Respaldar (CI, 1 clic)

```bash
gh workflow run firestore-backup.yml --ref feature/hub -f label=pre-cutover
gh run watch $(gh run list --workflow firestore-backup.yml --limit 1 --json databaseId -q '.[0].databaseId')
```

El resumen del run imprime la ruta `gs://…` y el comando de restauración.

Si el run falla con un error de permisos, la service account de deploy no
tiene `roles/datastore.importExportAdmin`. Dáselo una vez (Owner del
proyecto) y vuelve a lanzar:

```bash
gcloud projects add-iam-policy-binding secid-org \
  --member serviceAccount:firebase-adminsdk-fbsvc@secid-org.iam.gserviceaccount.com \
  --role roles/datastore.importExportAdmin
```

## Respaldar (manual)

```bash
gcloud auth login
BUCKET=$(gcloud storage ls --project secid-org | grep -E 'appspot|firebasestorage' | head -1)
gcloud firestore export "${BUCKET}firestore-backups/$(date -u +%F)-manual" --project secid-org
```

## Restaurar

Una importación **sobrescribe** los documentos que existan con el mismo id
y no borra los que se crearon después del respaldo. Para una colección:

```bash
gcloud firestore import gs://<bucket>/firestore-backups/<carpeta> \
  --collection-ids=users --project secid-org
```

Para todo:

```bash
gcloud firestore import gs://<bucket>/firestore-backups/<carpeta> --project secid-org
```

Antes de restaurar en producción, haz un respaldo nuevo (para poder volver
al estado "malo" si la restauración empeora las cosas) y avisa en el canal
del equipo: los listeners en tiempo real del sitio verán los cambios al
instante.

## Verificar

- `gcloud storage ls gs://<bucket>/firestore-backups/` muestra la carpeta.
- Tras una restauración, abre un perfil de miembro en beta y confirma que
  los datos esperados están.
