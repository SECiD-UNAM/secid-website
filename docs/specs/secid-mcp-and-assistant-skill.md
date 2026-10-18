# Spec: MCP de SECiD + skill para coding assistants

Estado: propuesta (2026-10-18, post-lanzamiento). No bloquea nada.

## Problema

Operar la plataforma desde un asistente (Claude Code hoy) funciona, pero a
mano: token de `gcloud`, llamadas REST a Identity Toolkit y Firestore,
recordar qué colecciones referencian a un miembro, qué acciones puede hacer
el asistente y cuáles son del owner. Hoy eso vive en el historial de la
sesión y en `docs/runbooks/`. Dos piezas lo hacen repetible:

1. **Un MCP de SECiD** (servidor) con operaciones de dominio, no de
   infraestructura.
2. **Una skill** (documento de procedimiento que carga el asistente) para
   lo que no merece servidor: convenciones, límites y recetas.

## 1. MCP de SECiD

### Alcance (v1, solo admin)

| Herramienta                          | Qué hace                                                                                                                               | Hoy equivale a                  |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `members.list_pending`               | Solicitudes con `lifecycle.status=pending`                                                                                             | query REST a `users`            |
| `members.get`                        | Ficha completa: `users/{uid}`, Auth, `member_surveys`, `numero_cuenta_index`, `email_alias`, `rbac_user_groups`                        | 6 lecturas a mano               |
| `members.approve` / `members.reject` | Mismo efecto que el panel de admin (dispara los correos)                                                                               | clic en el panel                |
| `members.delete`                     | Auth + `users` + `member_surveys` + `numero_cuenta_index` + `email_alias` + `rbac_user_groups` + subcolecciones, en orden, con dry-run | secuencia manual del 2026-10-18 |
| `members.find_duplicates`            | Por email normalizado, `numeroCuenta` y nombre                                                                                         | script ad hoc                   |
| `members.merge`                      | Crea `merge_requests` y deja que `onMergeRequestApproved` haga el trabajo                                                              | flujo existente                 |
| `ops.verify_user_delete_trigger`     | Usuario Auth desechable sin doc → borrar → leer logs de `onUserDelete`                                                                 | receta del runbook              |

Fuera de alcance v1: operar como usuario final (login, registro,
formularios). Para eso ya sirve el navegador (Playwright / Chrome) y es
donde se detectan los bugs reales de UI.

### Diseño

- Node + `@modelcontextprotocol/sdk`, stdio, en `tools/secid-mcp/` del
  repo; reutiliza los módulos de `functions/src/` (merge-engine,
  email-service) en lugar de duplicar lógica.
- Auth: Application Default Credentials del operador (`gcloud auth
application-default login`), nunca una service account con clave.
  El servidor exige que el usuario autenticado tenga `role=admin` en
  `users/{uid}` para las operaciones de escritura.
- Toda operación destructiva acepta `dryRun` (por defecto `true`) y
  devuelve el plan; el asistente debe mostrarlo y repetir con
  `dryRun=false` solo tras confirmación humana.
- Auditoría: cada escritura deja un doc en `admin_audit_log` (quién, qué,
  uids, timestamp) igual que `merge_audit_log`.
- Registro en `.mcp.json` junto al de Playwright.

### Riesgos

- Expone borrados: mitigado con dry-run, auditoría y rol admin.
- Deriva respecto al panel: aprobar/rechazar debe llamar al mismo código
  (callable o módulo compartido), no reimplementar.

### Estimación

2 días: 1 de servidor + 1 de pruebas contra el emulador (`npm run dev`).

## 2. Skill para coding assistants

Carpeta `.claude/skills/secid-ops/` (formato SKILL.md, portable a Codex o
Cursor como `AGENTS.md` enlazado). Contenido:

- Cómo autenticarse y leer/escribir por REST (token de `gcloud`, cabecera
  `x-goog-user-project`, gotcha de zsh con `"$VAR:..."`).
- Mapa de colecciones por miembro (la lista de `members.delete`).
- Reglas: `main` solo por PR; el backend lo despliega `main`; qué niega el
  clasificador y lo corre el owner con `!`; Cloudflare no se toca.
- Recetas: verificar `onUserDelete`, backup de Firestore, redeploy de un
  run de `cd.yml`, comprobar índices en `CREATING`.
- Enlaces a los runbooks en lugar de copiarlos.

Estimación: medio día; casi todo ya está escrito en `docs/runbooks/` y
`docs/LAUNCH-CHECKLIST.md`.

## Orden sugerido

Primero la skill (barata, cubre el 80 % del valor), después el MCP si las
operaciones de miembros se vuelven frecuentes.
