## Qué

<!-- Una o dos frases: qué cambia este PR. -->

## Por qué

<!-- Contexto y motivación. Enlaza el issue: Closes #NNN -->

## Cómo probarlo

<!-- Pasos para verificarlo en local: comandos, ruta, cuenta QA. -->

## Checklist

- [ ] Tests añadidos o actualizados (cambios en `src/` o `functions/` los
      llevan siempre). Si no aplica, explica por qué:
- [ ] `npm run type-check` y `npm run lint` en verde
- [ ] Docs o runbook actualizados si el cambio lo requiere
- [ ] Sin secretos, claves ni datos personales en el diff
- [ ] Si hay UI: textos en `es` y `en` (`src/i18n/`)
- [ ] La rama está al día con `main`

## Backend compartido

- [ ] **Afecta al backend compartido (Firestore/Auth/Functions/Storage).**
      Beta y producción usan el mismo proyecto `secid-org`, así que el cambio
      llega a ambos a la vez. Si está marcado, describe el impacto en beta
      (qué datos o flujos cambian, si es aditivo, cómo se revierte) y sigue
      `docs/runbooks/shared-backend-change.md`:

<!-- Impacto en beta: -->
