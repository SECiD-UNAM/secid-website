# Gobernanza del repo en GitHub

**Cuándo se usa:** para ver o cambiar qué checks bloquean `main`, activar o
desactivar auto-merge, o cuando un PR dice "base branch policy prohibits the
merge".

**Prerrequisitos:** `gh auth status` con permisos de admin del repo. Los
cambios de protección de rama son acciones del owner; Claude en modo auto
no puede ejecutarlas (el clasificador las bloquea), así que se corren con
el prefijo `!` desde la sesión o en una terminal.

## Estado vigente (2026-10-19)

- `main` solo cambia por PR; 0 revisiones requeridas (un solo admin,
  `enforce_admins` activo); rama al día obligatoria (`strict`).
- Auto-merge activo y borrado de ramas al mergear.
- Checks requeridos (nombres exactos de los jobs): Build Validation, Code
  Quality & Linting, Secret Scanning, CodeQL, Firestore Rules Tests, Unit &
  Integration Tests (shard 1/4 … 4/4), E2E Tests (smoke), Coverage (desde
  el 2026-10-19).
- Informativos (no bloquean): E2E Tests (chromium), Lighthouse, SAST,
  Dependency scan, claude-review.

## Pasos

Ver los checks requeridos:

```bash
gh api repos/SECiD-UNAM/secid-website/branches/main/protection/required_status_checks --jq '.contexts'
```

Añadir un check (ejemplo: `Coverage`, job de `ci.yml` creado en PR #113):

```bash
CUR=$(gh api repos/SECiD-UNAM/secid-website/branches/main/protection/required_status_checks --jq '.contexts')
NEW=$(echo "$CUR" | jq -c '. + ["Coverage"] | unique')
jq -n --argjson c "$NEW" '{strict:true, contexts:$c}' \
  | gh api -X PATCH repos/SECiD-UNAM/secid-website/branches/main/protection/required_status_checks --input -
```

Quitar un check: mismo comando con `del(.[] | select(. == "Nombre"))` en
lugar de `+ [...]`.

Auto-merge en un PR (lo hace Claude): `gh pr merge N --auto --merge`. Si el
PR está `BEHIND`: `gh pr update-branch N`. Si GitHub apagó el auto-merge
(pasa al actualizar la rama desde la web), se vuelve a activar con el mismo
comando.

## Cómo verificar

`gh pr view N --json mergeStateStatus` debe pasar de `BLOCKED` a `CLEAN`
cuando todos los requeridos están en verde; un check nuevo aparece en
`gh pr checks N` con la columna "required".

## Cómo revertir

Quitar el check con el comando de arriba. Un check requerido cuyo job deja
de existir en `ci.yml` bloquea todos los PR: quitarlo primero de la
protección y después del workflow.
