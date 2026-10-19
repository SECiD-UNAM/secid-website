# Runbooks de operación

Todo lo que no entra por un PR vive aquí: pasos de consola, workflows que se
lanzan a mano y cómo revertir. Cada runbook tiene **cuándo se usa**,
**prerrequisitos**, **pasos con comandos**, **cómo verificar** y **cómo
revertir**. Si un paso lo puede hacer un workflow, el runbook lo lanza desde
CI y deja la consola solo como respaldo.

| Runbook                                                        | Cuándo                                                        |
| -------------------------------------------------------------- | ------------------------------------------------------------- |
| [Corte a producción](./prod-cutover.md)                        | Pasar secid.mx de GitHub Pages a Firebase Hosting (una vez)   |
| [Facturación y presupuesto](./billing-and-budget.md)           | Alerta de gasto; qué hacer si el backend responde 503 en todo |
| [Respaldo y restauración de Firestore](./firestore-backup.md)  | Antes de cambios de reglas o datos; restaurar tras un error   |
| [Cambios en el backend compartido](./shared-backend-change.md) | Functions, reglas, índices o secretos: orden y guardias       |
| [Reversa de un deploy](./rollback.md)                          | Hosting roto, function rota, o volver a GitHub Pages          |
| [Gobernanza del repo](./github-governance.md)                  | Checks requeridos de `main`, auto-merge, PR bloqueado         |
| [Comunicados y newsletter](./communications.md)                | Mandar un comunicado o una edición; límite SMTP; opt-in/baja  |

Prerrequisitos comunes:

- `gh` autenticado con permisos de admin del repo (`gh auth status`).
- Acceso de Owner/Editor al proyecto GCP `secid-org` para los pasos de consola.
- Para comandos `gcloud`/`firebase` locales: `gcloud auth login` y `firebase login --reauth`
  (las sesiones caducan; el síntoma es `Reauthentication failed`).

Convenciones: el sitio de Hosting de producción se llama `secid-mx`
(`https://secid-mx.web.app`); el de beta es el sitio por defecto del
proyecto. Variables y secretos del repo: ver
[`../DEPLOYMENT.md`](../DEPLOYMENT.md#prerequisites). Tracking del
lanzamiento: [`../LAUNCH-CHECKLIST.md`](../LAUNCH-CHECKLIST.md).
