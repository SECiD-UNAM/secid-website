# Guía de contribución

Cómo se trabaja en este repo: ramas, commits, entorno local, tests, CI y
qué no hacer. Las convenciones de código viven en [`CLAUDE.md`](./CLAUDE.md);
los entornos y el deploy en [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md).

## Ramas y entornos

| Rama                         | Despliega a            | Workflow          |
| ---------------------------- | ---------------------- | ----------------- |
| `feature/hub`                | https://beta.secid.mx  | `deploy-beta.yml` |
| `main`                       | https://secid.mx       | `cd.yml`          |
| `{type}/{short-description}` | nada (rama de trabajo) | CI en el PR       |

- **`main` solo cambia por PR.** Está protegida: nada de push directo ni
  merge local, ni siquiera para admins.
- Beta y producción comparten **un solo backend** (proyecto Firebase
  `secid-org`: Auth, Firestore, Storage, Functions). Solo el frontend es
  distinto. Hoy el backend lo despliega `main` (variable
  `BACKEND_DEPLOYED_FROM_MAIN=true`); ver el runbook
  [`docs/runbooks/shared-backend-change.md`](./docs/runbooks/shared-backend-change.md).
- Ramas de trabajo: `{type}/{short-description}` con `type` en
  `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `ci`
  (ej. `fix/admin-members-mapper-status`). Parten de `origin/main`.
- Commits: [Conventional Commits](https://www.conventionalcommits.org/)
  (`feat(auth): ...`, `fix(build): ...`, `docs: ...`, `test(auth): ...`).
  Un PR pequeño y enfocado por cambio.

## Entorno local

Node `>=22.12` (el repo fija `22.12.0` en `.nvmrc`; Vitest 5 no corre en Node 20). Los emuladores de
Firebase necesitan Java 21.

```bash
nvm use                    # lee .nvmrc
npm ci                     # dependencias de la raíz
npm run functions:install  # dependencias de functions/
cp .env.example .env       # valores locales; nunca se versiona
npm run dev                # Astro + emuladores + watcher de functions (concurrente)
```

`npm run dev` levanta Astro en `localhost:4321` y los emuladores de Auth
(9099), Firestore (8088), Functions (5001) y Storage (9199), con UI en
`localhost:4000`. Los datos se importan y exportan desde `./emulator-data`.

```bash
npm run emulator:start   # solo los emuladores
npm run seed             # datos de prueba en el emulador
npm run emulator:clean   # borrar ./emulator-data
```

Las pruebas destructivas van en los emuladores, no en beta: beta escribe en
la misma base que producción.

## Tests

```bash
npm test                      # unit + integration + build (Vitest)
npm run test:unit             # tests/unit
npm run test:integration      # tests/integration
npm run coverage              # con reporte de cobertura
npm run test:e2e              # Playwright (ver tests/E2E_TESTING_GUIDE.md)
npm run test:mobile           # suite móvil (scripts/mobile-test.sh)
```

Las reglas de Firestore (`tests/rules/`) se prueban contra el emulador;
sin él las suites se saltan en silencio, así que hay que levantarlo:

```bash
npx firebase emulators:exec --only firestore --project secid-rules-test \
  "npm run test:rules"
```

Hay archivos de test rotos puestos en cuarentena en el `exclude` de
`vitest.config.ts` (ver `docs/known-issues/`). No añadir más ahí: arregla
el test o deja el archivo fuera del PR.

### Política de tests

- **Todo cambio en `src/` o `functions/` lleva tests** (TDD: primero el
  test que falla, luego el código). Si de verdad no aplica, el PR lo
  explica en su checklist.
- Cambios en reglas (`firestore.rules`, `storage.rules`) llevan su caso en
  `tests/rules/`.
- Docs, i18n y actualizaciones de parche de dependencias no necesitan
  tests nuevos y pueden auto-mergearse con los checks en verde.

## Lint, formato y hooks

```bash
npm run type-check   # tsc --noEmit
npm run lint         # ESLint (.ts, .tsx, .js, .jsx, .astro)
npm run lint:fix
npm run format       # Prettier en todo el repo
npm run format:check
```

El hook de pre-commit (Husky + lint-staged, `.husky/pre-commit` y
`.lintstagedrc.json`) corre ESLint `--fix` y Prettier sobre los archivos en
stage y después `npm run type-check` en todo el proyecto. Si falla, el
commit no se crea; no lo saltes con `--no-verify`.

## CI y checks obligatorios en `main`

`.github/workflows/ci.yml` corre en cada PR hacia `main`, `develop` y
`feature/hub`:

| Job                       | Qué hace                                            | Bloquea |
| ------------------------- | --------------------------------------------------- | ------- |
| Code Quality & Linting    | `type-check`, ESLint (solo informa), `format:check` | sí      |
| Unit & Integration Tests  | `vitest run` en 4 shards                            | sí      |
| Firestore Rules Tests     | `tests/rules` contra el emulador                    | sí      |
| Build Validation          | `astro build` (+ build de functions, solo informa)  | sí      |
| E2E Tests                 | Playwright en Chromium                              | no      |
| Dependency Security Check | `npm audit`                                         | no      |
| Test Summary              | resumen de los jobs anteriores                      | sí      |

`security.yml` añade Secret Scanning, CodeQL y Semgrep en PRs a `main`.

**Checks obligatorios en `main`** (branch protection): `Build Validation`,
`Code Quality & Linting`, `Secret Scanning`, `CodeQL`, `Test Summary` y
`Firestore Rules Tests`. La rama **debe estar al día con `main`**
(`git merge origin/main` o rebase) o GitHub no deja mergear.

Nota: en CI, ESLint usa `continue-on-error`, así que un error de lint no
pone el check en rojo. El hook de pre-commit es la barrera real: mantén
`npm run lint` en verde igualmente.

### Auto-merge

El repo tiene auto-merge activado y borra la rama al mergear. Con el PR
abierto:

```bash
gh pr merge <N> --auto --merge
```

GitHub mergea solo cuando todos los checks obligatorios pasan. Úsalo para
docs, i18n y parches de dependencias; para cambios de código espera a que
alguien más lo haya mirado.

## Dónde vive cada cosa

| Qué                       | Dónde                                                       |
| ------------------------- | ----------------------------------------------------------- |
| Specs de features         | `docs/specs/{feature-name}.md`                              |
| ADRs                      | `docs/adr/ADR-{NNN}-{title}.md` (se crea con el primer ADR) |
| Reviews de QA / seguridad | `docs/reviews/{feature-name}-review.md`                     |
| Runbooks de operación     | `docs/runbooks/` (índice en `docs/runbooks/README.md`)      |
| Checklist de lanzamiento  | `docs/LAUNCH-CHECKLIST.md`                                  |
| Problemas conocidos       | `docs/known-issues/`                                        |
| Infraestructura (IaC)     | `infra/`                                                    |

Si tu cambio toca un paso de operación (deploy, reglas, secretos,
respaldos), actualiza el runbook en el mismo PR.

## Trabajar con asistentes de código

- [`CLAUDE.md`](./CLAUDE.md) es el contexto del repo para Claude Code y
  otros asistentes: arquitectura, comandos, convenciones y el sistema de
  agentes (Prometeo / Forja / Centinela).
- [`.claude/skills/secid-ops/SKILL.md`](./.claude/skills/secid-ops/SKILL.md)
  describe cómo opera un asistente el backend compartido (Auth, Firestore,
  Functions) y qué acciones son solo del dueño del proyecto. Léelo antes de
  pedirle a un asistente que toque datos.
- Los asistentes siguen las mismas reglas que las personas: rama propia,
  PR a `main`, tests, y nada de datos de producción sin aprobación.

## Qué no hacer

- **Push directo o merge local a `main`.** Siempre PR; `main` despliega
  producción.
- **Secretos en el repo.** Claves, tokens y JSON de service accounts van en
  GitHub Secrets o en `.env` local (ignorado). Secret Scanning lo revisa,
  pero un secreto en el historial ya está filtrado.
- **Tocar datos de producción sin aprobación del dueño.** Beta y prod
  comparten Auth y Firestore: una prueba "en beta" borra o modifica datos
  reales. Usa los emuladores y cuentas QA con plus-tag (`nombre+qa@...`).
- **Cambios de DNS o Cloudflare para `secid.mx`.** Los hace el dueño del
  proyecto; no hay workflow ni script para ello.
- **Desactivar checks, saltarse hooks o ampliar la cuarentena de tests**
  para que un PR pase.
