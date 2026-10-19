# Roadmap de ingeniería (post-lanzamiento)

Estado al 2026-10-19. El lanzamiento de `secid.mx` sobre Firebase se completó el
2026-10-18 (ver [LAUNCH-CHECKLIST.md](./LAUNCH-CHECKLIST.md)). Este documento
ordena lo que sigue. Los ítems de producto viven en
[features/todo.md](./features/todo.md); aquí va la plataforma: CI/CD, calidad,
deuda técnica y operaciones.

Convenciones: **(dev)** lo hace quien desarrolle (humano o asistente, ver
[CONTRIBUTING.md](../CONTRIBUTING.md)); **(owner)** requiere consola o
permisos que solo tiene el administrador. Cada ítem se cierra por PR a `main`.

## Bloque A — Arnés e2e y gates honestos (dev, 1–2 días) — EN CURSO

Contexto: hasta el 2026-10-18 CI nunca ejecutó un test e2e (el `global-setup`
fallaba y el paso tenía `continue-on-error`), y el proyecto `chromium` de
Playwright solo incluía 7 archivos por su `testMatch`.

- [ ] A1. Clasificar los 266 tests por causa de fallo: usuario sembrado,
      emulador, Stripe, selector roto, bug real.
- [ ] A2. PR del arnés: setup sin `dotenv`, `__dirname` ESM, imports JSON con
      atributos, `test.use` sin `defaultBrowserType`, `Test Summary` que falle
      de verdad, `testMatch` ampliado y dos proyectos: `smoke` (hidratación,
      home, login, signup, páginas públicas; bloqueante) y `full` (resto; no
      bloqueante hasta triarlo).
- [ ] A3. Añadir "E2E Tests (smoke)" a los checks requeridos de `main`.
      Criterio: un PR que rompa el signup se pone rojo solo.
- [ ] A4. Hacer pasar `full` contra emuladores en CI con `npm run seed`; lo que
      dependa de Stripe queda `skip` con motivo hasta que haya pagos.

## Bloque B — Calidad que hoy no se exige (dev, ~1 día)

- [ ] B5. `eslint --fix` repo-wide (4306 errores autofixables, casi todo
      formato) en un PR mecánico; después quitar el `continue-on-error` del
      lint en CI.
- [ ] B6. Umbrales de cobertura fijados al nivel actual (hoy están en 0);
      quitar `skip` a SignUpForm (29 tests), TwoFactorVerification (49), auth
      (13), jobs (20) y Button (10), una suite por PR (como LoginForm, PR #94).
- [ ] B7. Docs desactualizados: README (enlaces a `QUICKSTART.md`,
      `DEVELOPMENT.md`, `LICENSE` inexistentes; badge de `deploy.yml`),
      `AGENTS.md` (describe el sitio estático antiguo) y la tabla de entornos
      de `docs/DEPLOYMENT.md`. Sacar `functions/lib` compilado del repo.
- [x] B8. Umbrales de cobertura exigidos en CI: los 4 shards corren con
      `--coverage`, el job `Coverage` fusiona sus reportes
      (`scripts/ci/check-coverage.mjs`) y falla si bajan de
      `scripts/ci/coverage-thresholds.mjs`, la única fuente que también lee
      `vitest.config.ts`. Se quitó el paso de Codecov (sin token, nunca subió).

## Bloque C — Pasos del owner (~30 min en total)

- [ ] C8. Firebase → Authentication → Templates → "Customize action URL" →
      `https://secid.mx/es/auth/action`. Cierra #79 tras probar un
      restablecimiento real. (Runbook prod-cutover §5.1)
- [ ] C9. #83: IAM (`serviceAccountTokenCreator` de la SA de cómputo sobre sí
      misma, APIs `iamcredentials` y `admin`) y delegación de dominio en el
      Admin Console de Workspace. Después aprobar un miembro y verificar logs.
      (Runbook prod-cutover §6)
- [ ] C10. Billing → Account management: confirmar el correo de avisos de pago.
      El correo de prueba del presupuesto llega con el primer umbral.

## Bloque D — Aplazado por decisión del owner

- [ ] D11. Cloudflare: borrar los 4 NS residuales `ns-cloud-a*.googledomains.com`
      (solo el owner toca Cloudflare).
- [ ] D12. Duplicado de cuenta admin (`jalejandrobondi@gmail.com` vs
      `alejandrobondi@me.com`): preguntar, luego borrar o fusionar con
      `merge_requests`.
- [ ] D13. ~1 de noviembre de 2026: desactivar GitHub Pages y mergear PR #85.
- [ ] D14. Opcional: quitar `secid-mx.web.app` de CORS si ya no se usa.

## Bloque E — Deuda mayor (planear aparte)

- [ ] E15. Majors de dependencias pendientes de PR #92
      ([known-issues/npm-audit-2026-10-18.md](./known-issues/npm-audit-2026-10-18.md)):
      Vitest 5 primero (solo dev), Firebase Admin 14, Tailwind 4, y Astro 7
      cuando el e2e `smoke` sea bloqueante.
- [ ] E16. MCP de SECiD según
      [specs/secid-mcp-and-assistant-skill.md](./specs/secid-mcp-and-assistant-skill.md),
      solo si las operaciones de miembros se vuelven frecuentes. La skill
      `.claude/skills/secid-ops/` ya existe.
- [ ] E17. Un segundo mantenedor con permisos para poder exigir una revisión
      en `main` sin bloquear al único admin.

## Orden recomendado

A1–A3 primero (convierte CI en una red real), luego B5 y B6 en paralelo, C
cuando el owner pueda, E15 después de A3.

## Hecho (referencia)

Lanzamiento 2026-10-18: PRs #75–#99. Gobernanza: auto-merge activo, ramas se
borran al mergear, `main` exige Build, Lint, Secret Scanning, CodeQL, 4 shards
de unitarios y reglas de Firestore con la rama al día. Detalle en
[LAUNCH-CHECKLIST.md](./LAUNCH-CHECKLIST.md).
