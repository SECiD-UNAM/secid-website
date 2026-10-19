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

- [x] A1. Corrida completa 2026-10-19 contra `astro preview`: 266/266 fallan.
      Firmas: timeouts esperando UI autenticada (621), `localStorage` leído
      antes de navegar (141), URL/selectores viejos (~60). Causa común:
      suites heredadas que asumen usuarios sembrados, emulador y Stripe.
      `homepage.spec.ts`: 5/7 fallan por selectores antiguos.
- [x] A2. PR #101 mergeado 2026-10-19 (8eb267c), arnés: setup sin `dotenv`, `__dirname` ESM, imports JSON con
      atributos, `test.use` sin `defaultBrowserType`, `Test Summary` que falle
      de verdad, `testMatch` ampliado y dos proyectos: `smoke` (hidratación,
      home, login, signup, páginas públicas; bloqueante) y `full` (resto; no
      bloqueante hasta triarlo).
- [x] A3. "E2E Tests (smoke)" añadido a los checks requeridos de `main` el 2026-10-19 (10 contextos, strict).
      Criterio: un PR que rompa el signup se pone rojo solo.
- [ ] A4. Hacer pasar `full` contra emuladores en CI con `npm run seed`; lo que
      dependa de Stripe queda `skip` con motivo hasta que haya pagos.

## Bloque B — Calidad que hoy no se exige (dev, ~1 día)

- [ ] B5. ESLint repo-wide: PR #104 (2026-10-19) bajó de 2919 errores a 193 y
      arregló 2 `ReferenceError` reales en render. Quedan 193 que necesitan
      criterio (97 variables sin uso, 43 a11y, 26 `require` en scripts, 23
      `jsx-key` falsos positivos en `.astro`, 3 `var` del snippet de Amplitude,
      1 `triple-slash` de Astro). Falta: resolverlos o acotarlos por override y
      quitar el `continue-on-error` del lint en CI.
- [x] B6. Cobertura y suites saltadas (2026-10-19). PR #105: umbrales en
      16/16/43/71 (líneas/sentencias/funciones/ramas, el piso medido) y bug de
      config corregido: `thresholds.global` es forma de Jest, Vitest la
      ignoraba, así que nunca se aplicaron. PR #106 SignUpForm (29→44 tests;
      arregló bug real: "año de graduación" vacío bloqueaba el formulario de
      verificación UNAM sin mostrar error), #107 TwoFactorVerification
      (49→54), #110 Button (10→13). #108 auth.test y #109 jobs.test borrados:
      los 33 tests describían APIs inexistentes y ya tienen suites propias.
      Pendiente (follow-up): CI corre vitest por shards sin `--coverage`, así
      que el umbral no se evalúa en CI y codecov sube un lcov que no existe.
- [x] B7. PR #103 (2026-10-19): README, `AGENTS.md` y `docs/DEPLOYMENT.md`
      actualizados; `functions/lib` fuera del repo (el `predeploy` de
      `firebase.json` lo recompila en cada deploy).

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
- [ ] C11. Añadir un archivo `LICENSE` (package.json dice MIT; GitHub no detecta
      licencia). Decisión del owner sobre la licencia.

## Bloque D — Aplazado por decisión del owner

- [ ] D12. Cloudflare: borrar los 4 NS residuales `ns-cloud-a*.googledomains.com`
      (solo el owner toca Cloudflare).
- [ ] D13. Duplicado de cuenta admin (`jalejandrobondi@gmail.com` vs
      `alejandrobondi@me.com`): preguntar, luego borrar o fusionar con
      `merge_requests`.
- [ ] D14. ~1 de noviembre de 2026: desactivar GitHub Pages y mergear PR #85.
- [ ] D15. Opcional: quitar `secid-mx.web.app` de CORS si ya no se usa.

## Bloque E — Deuda mayor (planear aparte)

- [ ] E16. Majors de dependencias pendientes de PR #92
      ([known-issues/npm-audit-2026-10-18.md](./known-issues/npm-audit-2026-10-18.md)):
      Vitest 5 primero (solo dev), Firebase Admin 14, Tailwind 4, y Astro 7
      cuando el e2e `smoke` sea bloqueante.
- [ ] E17. MCP de SECiD según
      [specs/secid-mcp-and-assistant-skill.md](./specs/secid-mcp-and-assistant-skill.md),
      solo si las operaciones de miembros se vuelven frecuentes. La skill
      `.claude/skills/secid-ops/` ya existe.
- [ ] E18. Un segundo mantenedor con permisos para poder exigir una revisión
      en `main` sin bloquear al único admin.

## Orden recomendado

A1–A3 primero (convierte CI en una red real), luego B5 y B6 en paralelo, C
cuando el owner pueda, E16 después de A3.

## Hecho (referencia)

Lanzamiento 2026-10-18: PRs #75–#99. Gobernanza: auto-merge activo, ramas se
borran al mergear, `main` exige Build, Lint, Secret Scanning, CodeQL, 4 shards
de unitarios y reglas de Firestore con la rama al día. Detalle en
[LAUNCH-CHECKLIST.md](./LAUNCH-CHECKLIST.md).
