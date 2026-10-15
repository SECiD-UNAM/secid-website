# SECiD — Plan de validación y mejora de user journeys (v3)

**Fecha**: 2026-05-24
**Target**: `beta.secid.mx` @ `feature/hub` (commit `30fb5d4` o posterior)
**Autor**: Claude + Artemio
**Reemplaza**: v1 (chat 2026-05-24 mañana), v2 (chat 2026-05-24 tarde)

---

## TL;DR

Plan completo para validar y mejorar todos los user journeys de SECiD antes de promover `feature/hub → main`. Tres innovaciones vs. v2:

1. **Cobertura completa** — v2 cubría 13 journeys; v3 cubre 22 (faltaban: assessments, salary insights, spotlights, resources, journal club, gamification, learning paths, onboarding multi-step real, recruiter/colaborador paths, notification center).
2. **Phase de seguridad/abuse** (nueva) — verificar que RBAC, rules y endpoints aguantan ataques básicos (auth bypass, rule bypass, IDOR, CSRF).
3. **Criterios "Done"/Ship gate** explícitos — qué tiene que pasar para que se autorice el merge a main, con riesgo y rollback documentado.

**Esfuerzo total estimado**: 10-14 h reales de trabajo distribuidas en ~3 días. Phase 0 (3 h) es prerequisito de todo lo demás.

---

## 1. Evaluación honesta de v2

### Lo que v2 hizo bien

- Estructura Phase 0 → 1 → 2 → 3 es sólida y la mantengo
- Identificó las 3 notificaciones faltantes como bloqueo de UX real
- Cross-cutting checks (mobile, perf, a11y) en una Phase aparte
- Backlog de mejoras como output explícito

### Gaps que v3 cierra

| #   | Gap en v2                                                                                                                                            | Cómo lo arregla v3                                                                                          |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 1   | "Expected" vago — sin assertions concretas                                                                                                           | Cada paso lista assertions verificables (HTTP code, Firestore doc shape, console clean, UI element visible) |
| 2   | Faltan ~9 journeys (assessments, salary, spotlights, resources, journal-club, gamification, learning, onboarding wizard real, recruiter/colaborador) | §6 cubre las 22 journeys con prioridad P0/P1/P2                                                             |
| 3   | Sin testing de seguridad                                                                                                                             | §10 Phase nueva: intentos de bypass de rules, RBAC, CORS, rate limit                                        |
| 4   | Test data informal                                                                                                                                   | §4 inventario explícito con cómo crear/resetear                                                             |
| 5   | Solo mobile mencionado; sin browser matrix                                                                                                           | §5 matriz Chrome/Safari/Firefox × Desktop/Tablet/Mobile                                                     |
| 6   | Performance "≥70 perf" sin presupuesto                                                                                                               | §9.2 budgets concretos LCP/CLS/TBT por page type                                                            |
| 7   | A11y una línea, sin WCAG específico                                                                                                                  | §9.3 WCAG 2.1 AA criteria con tools por categoría                                                           |
| 8   | Sin definición de "done"                                                                                                                             | §13 Ship gate con criteria por severidad                                                                    |
| 9   | Sin priorización de riesgo                                                                                                                           | §6 prioriza P0 (bloqueador), P1 (importante), P2 (nice-to-have)                                             |
| 10  | Phase 3 sin issue template                                                                                                                           | §12.2 plantilla                                                                                             |
| 11  | Tiempos optimistas                                                                                                                                   | §3 estimaciones revisadas (10-14 h vs. 6-8)                                                                 |
| 12  | Sin plan de rollback                                                                                                                                 | §14 procedure si algo se rompe                                                                              |
| 13  | Onboarding tratado como un paso ("complete registration") cuando es wizard de 8+ steps                                                               | §6.B2 detalla cada step del wizard                                                                          |
| 14  | No menciona NotificationCenter component existente                                                                                                   | §6.O cubre notif inbox in-app                                                                               |

---

## 2. Objetivos del plan

1. **Validar** que cada user journey funciona end-to-end en beta antes de promover a producción.
2. **Identificar y filar** todo bug, gap UX, problema a11y, o regresión vs comportamiento esperado.
3. **Cerrar las brechas de mayor impacto** (notificaciones de onboarding) antes de testear, para que la validación cubra el comportamiento real esperado en producción — no el intermedio.
4. **Documentar evidencia** suficiente para que cualquier observador pueda reproducir y revisar el resultado.
5. **Definir el ship-gate** que autoriza la promoción a `main`.

### No-objetivos

- Reescribir features que funcionan pero podrían ser mejores (eso va al backlog, no se arregla aquí).
- Cubrir 100% de combinaciones de RBAC (cubrimos los roles principales: BASIC, MEMBER, ADMIN, ALUMNI).
- Test de carga / stress (separado).
- Migrar a Playwright automatizado (handoff documentado en §15, ejecución separada).

---

## 3. Calendarización y esfuerzo

| Phase                                                 | Esfuerzo    | Bloquea a | Owner                    |
| ----------------------------------------------------- | ----------- | --------- | ------------------------ |
| Phase 0 — implementar gaps (notif, admin badge, etc.) | 2-3 h       | Phase 1   | Claude (con OK del user) |
| Phase 1 — verificar 13 journeys P0/P1                 | 4-5 h       | Phase 3   | Claude vía chrome        |
| Phase 2 — verificar 9 journeys P2                     | 2-3 h       | —         | Claude (delegable)       |
| Phase 3 — cross-cutting (mobile, perf, a11y, i18n)    | 1-2 h       | Ship gate | Claude                   |
| Phase 4 — seguridad / abuse                           | 1-2 h       | Ship gate | Claude                   |
| Phase 5 — backlog grooming + filing                   | en paralelo | —         | Claude                   |
| **Total**                                             | **10-14 h** |           |                          |

Distribución recomendada: día 1 = Phase 0 + 1, día 2 = Phases 2-4, día 3 = remediación urgente + backlog.

---

## 4. Inventario de test data

### 4.1 Cuentas (en beta)

| Rol                | Email                                           | Estado                                  | Notas                                          |
| ------------------ | ----------------------------------------------- | --------------------------------------- | ---------------------------------------------- |
| Admin / canónica   | `artemiopadilla@gmail.com`                      | `active`, `isVerified=true`, admin RBAC | reuso de QA prev; tiene foto + perfil completo |
| Alias canónica     | `artemiopadilla@ciencias.unam.mx`               | alias de la anterior                    | verifica `useResolvedProfile`                  |
| Nuevo signup email | `qa-secid-<YYYYMMDD-HHmm>@mailinator.com`       | nueva                                   | crear al momento; descartable                  |
| Nuevo signup OAuth | usar cuenta Google de prueba existente del user | nueva                                   | una vez creada, borrar al final                |
| Member pendiente   | crear durante §6.B y dejar sin aprobar          | `pending`                               | validar empty/limited state                    |
| Member rechazado   | crear y rechazar                                | `collaborator` (downgrade)              | validar mensaje de rechazo                     |
| Alumni             | crear y mover a alumni                          | `alumni`                                | validar Group sync                             |
| Suspended          | crear y suspender                               | `suspended`                             | validar bloqueo de login                       |

### 4.2 Otros recursos

- **numeroCuenta de prueba**: el user provee uno (o usar random + manejar reject).
- **PDF de proof**: un PDF genérico de 1 página, < 5MB.
- **LinkedIn PDF**: export real del LinkedIn del user para probar `parseLinkedinPdf`.
- **Job posting test**: título + descripción genéricos; aprobado por admin al final.
- **Forum post test**: txt corto para crear y borrar al final.

### 4.3 Cómo dejar el ambiente limpio después

- Borrar las cuentas test desde Firebase Auth Console
- Borrar docs huérfanos: `users/{test_uid}`, `email_alias/qa-*`, jobs/posts de prueba
- Cancelar suscripción del email QA en `/newsletter` collection

---

## 5. Matriz de navegadores y dispositivos

| Layer               | Mínimo (P0)                       | Recomendado (P1)   | Nice (P2) |
| ------------------- | --------------------------------- | ------------------ | --------- |
| **Desktop browser** | Chrome estable (claude-in-chrome) | + Safari + Firefox | + Edge    |
| **Mobile emulator** | iPhone 12 (DevTools)              | + Pixel 5          | + iPad    |
| **Real device**     | tu teléfono actual                | —                  | —         |
| **OS**              | macOS / iOS                       | + Android          | —         |

Cualquier journey P0 debe pasar en **Chrome desktop + iPhone 12 emulator** como mínimo. Falla en cualquiera de los dos = bloqueador.

---

## 6. Journeys — verificación detallada

### Convención

Cada journey tiene: **Goal**, **Prioridad** (P0/P1/P2), **Pre-condiciones**, **Pasos con assertions**, **Notas de riesgo**. P0 = bloqueador de ship. P1 = importante, ship con caveat. P2 = nice-to-have, no bloquea ship.

---

### A. Visitante público (P0)

**Goal**: usuario sin cuenta puede navegar y entender qué es SECiD.

| Paso | URL                                             | Assertion                                                                                             |
| ---- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| A1   | `/`                                             | Hero visible, CTA "Únete" funciona, sin console errors                                                |
| A2   | `/es/about-us`                                  | Render OK                                                                                             |
| A3   | `/es/faq`                                       | Render OK; secciones expanden                                                                         |
| A4   | `/es/help`                                      | Render OK                                                                                             |
| A5   | `/es/terms`, `/es/privacy`, `/es/cookies`       | Render OK; links activos                                                                              |
| A6   | `/es/blog`                                      | Lista de posts published; NO drafts; orden por fecha                                                  |
| A7   | `/es/blog/<slug>`                               | Post completo; meta OG/twitter; comentarios (si hay)                                                  |
| A8   | `/es/events`                                    | Lista pública de eventos; filtro upcoming/past                                                        |
| A9   | `/es/events/[id]`                               | Detalle público de evento                                                                             |
| A10  | `/es/calendar`                                  | Vista de calendario carga; eventos visibles                                                           |
| A11  | `/es/journal-club`                              | Lista carga; orden cronológico                                                                        |
| A12  | `/es/companies`                                 | Directorio público; filtros                                                                           |
| A13  | `/es/companies/[slug]`                          | Perfil público de empresa                                                                             |
| A14  | `/es/commissions`                               | Lista (públicas hasta nuevo aviso)                                                                    |
| A15  | `/es/members` (si público) o `/es/members/[id]` | Perfil de un miembro (público o tras login según privacy)                                             |
| A16  | `/es/cv/<slug>`                                 | CV viewer completo (R2) — 10+ secciones                                                               |
| A17  | `/es/spotlights`                                | Si público, lista carga                                                                               |
| A18  | `/es/resources`                                 | Si público, lista carga                                                                               |
| A19  | `/es/jobs`                                      | Job board público; filtros                                                                            |
| A20  | `/es/post-job`                                  | Form de submit público (recruiter sin cuenta)                                                         |
| A21  | `/es/newsletter`                                | Suscribir — POST `/api/forms/newsletter` 200; doc en Firestore con `ipHash`; CAPTCHA token en payload |
| A22  | `/es/contact`                                   | Mensaje — POST `/api/forms/contact` 200; doc Firestore                                                |
| A23  | `/es/pricing`                                   | (beta-only) Carga en beta; en prod debe redirect / 404                                                |
| A24  | `/es/foo-bar-404`                               | Página 404 amigable                                                                                   |
| A25  | Switch ES↔EN top nav                           | URL cambia a `/en/...`; contenido localizado                                                          |

**Riesgo**: regresión por R2 (CV viewer 2400→422), S4 (newsletter+contact endpoints), #17 (blog drafts). Estos son los puntos de mayor blast radius.

---

### B. Signup nuevo miembro — path "alumno UNAM" (P0)

**Goal**: nueva persona se registra, verifica email, completa onboarding, espera aprobación, es aprobada, accede full.

**Pre**: sesión limpia (incógnito). Phase 0 completa (notificaciones existen).

| Paso | Acción                                                                                                    | Assertion                                                                              |
| ---- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| B1   | `/es/signup` → llenar email + password + nombre + accept terms                                            | redirect a `/es/verify-email`                                                          |
| B2   | Firebase Auth Console                                                                                     | user existe; `emailVerified=false`; `disabled=false`                                   |
| B3   | Firestore `users/{uid}`                                                                                   | doc creado por `onUserCreate` trigger; campos default; `lifecycle.status=collaborator` |
| B4   | Recibir email "Verifica tu correo" (Firebase default)                                                     | llega a mailinator; sender = noreply firebase (o custom si 0.4 hecho)                  |
| B5   | **Recibir email "Bienvenido a SECiD"** (Phase 0)                                                          | llega; copy + branding correctos; link a `/es/onboarding`                              |
| B6   | Click link verify del paso B4                                                                             | redirect a dashboard; `emailVerified=true`                                             |
| B7   | `/es/dashboard` con BASIC tier                                                                            | sidebar limitado; banner "completa tu perfil"; sin acceso a /jobs/new, /forums/new     |
| B8   | Click "Completar perfil" → `/es/onboarding`                                                               | wizard arranca en step 1 (Welcome)                                                     |
| B9   | **Wizard step 1**: WelcomeStep                                                                            | acepta y avanza                                                                        |
| B10  | **Wizard step 2**: ProfileSetup (foto, headline, bio)                                                     | guarda parcial; avanza                                                                 |
| B11  | **Wizard step 3**: choose registration type → "Alumno UNAM"                                               | avanza al path member                                                                  |
| B12  | **Wizard step 4 (member)**: numeroCuenta + nivel académico + campus + generación + año + upload PDF proof | callable `completeRegistration` → 200; doc users/{uid} actualizado                     |
| B13  | Firestore `numero_cuenta_index/{numeroCuenta}`                                                            | creado por `onUserNumeroCuentaChange` trigger                                          |
| B14  | **Wizard step 5**: InterestsSelection                                                                     | selección persiste                                                                     |
| B15  | **Wizard step 6**: OnboardingSkills                                                                       | persiste                                                                               |
| B16  | **Wizard step 7**: GoalsDefinition                                                                        | persiste                                                                               |
| B17  | **Wizard step 8**: ConnectionSuggestions                                                                  | lista de miembros sugeridos; "seguir" funciona                                         |
| B18  | **Wizard step 9**: OnboardingComplete                                                                     | mensaje de éxito; redirect dashboard; `lifecycle.status=pending`                       |
| B19  | **Admin recibe email "Nueva solicitud pendiente"** (Phase 0)                                              | llega a `contacto@secid.mx` con link al admin panel                                    |
| B20  | Cambio de sesión a admin → `/admin/users`                                                                 | **badge muestra "N pendientes"** (Phase 0); filtro funciona                            |
| B21  | Admin abre el user en review                                                                              | ve doc completo + proof PDF; botones Aprobar/Rechazar                                  |
| B22  | Admin click Aprobar                                                                                       | `lifecycle.status=active`; `isVerified=true`; `lifecycle.statusChangedAt` set          |
| B23  | `onMemberStatusChange` trigger                                                                            | Google Group sync: add to `miembros@`, remove de `colaboradores@`                      |
| B24  | **User recibe email "Aprobado"** (Phase 0)                                                                | llega; link al dashboard                                                               |
| B25  | User recarga dashboard                                                                                    | sidebar full; banner "completa tu perfil" desaparece; tier badge = MEMBER              |
| B26  | User accede a `/es/dashboard/settings` tab Cuentas                                                        | sección "Correo alterno" visible (gated por isVerified)                                |
| B27  | Verificar audit log                                                                                       | si existe collection `audit_log`, entry con la aprobación                              |

**Riesgo**: el path completo nunca se ha validado end-to-end con todas las notificaciones. Detectar dónde se rompe la cadena.

---

### C. Signup nuevo — path "colaborador" (P1)

Variante de B sin verificación UNAM. Pasos clave que cambian:

- B11: elige "Colaborador"
- B12: se salta numeroCuenta + proof; solo bio + área de interés
- Status final puede ir directo a `collaborator` activo sin admin approval (o requerir approval según política — verificar)

**Validar**: ¿la política está clara? ¿el user puede acceder a algo o queda en limbo?

---

### D. Signup nuevo — path "recruiter" (P1)

Variante de B para empresa que quiere postear jobs. Pasos clave:

- B11: elige "Recruiter"
- B12: companyName + companyPosition + companyWebsite
- `_skipGroupSync` flag se pone (vimos en onMemberStatusChange) para evitar Google Group default
- Acceso debe permitir `/es/dashboard/jobs/new` pero no acceso a foros de miembros

**Validar**: separación de permisos clara; jobs posteados entran en moderación.

---

### E. Signup OAuth (Google / GitHub / LinkedIn) (P0)

Por cada provider:
| Paso | Acción | Assertion |
|---|---|---|
| E1 | `/es/signup` → click provider | OAuth redirect → callback → sesión activa |
| E2 | Firestore `users/{uid}` | doc creado; email + photoURL del provider; `emailVerified=true` (OAuth implica verificado) |
| E3 | Email "Bienvenido" (Phase 0) | llega |
| E4 | Sigue desde B7 (onboarding wizard) | mismo flujo |
| E5 | Caso especial LinkedIn: probar import CV en onboarding | `parseLinkedinPdf` callable funciona; populates skills/exp/edu |

**Riesgo**: OAuth secrets en GitHub Secrets pueden no estar configurados para beta; verificar antes.

---

### F. Login y password reset (P0)

| Paso | Acción                                               | Assertion                                                       |
| ---- | ---------------------------------------------------- | --------------------------------------------------------------- |
| F1   | `/es/login` con cuenta existente                     | redirect a `/es/dashboard`                                      |
| F2   | Wrong password                                       | error inline; no leak                                           |
| F3   | Email inexistente                                    | error inline; no leak de si email existe (anti-enumeration)     |
| F4   | Click "Olvidé mi password" → ingresar email → submit | email de reset llega (template Firebase default)                |
| F5   | Click link reset → nuevo password → submit           | password cambiado; login funciona con nuevo                     |
| F6   | Login con cuenta sin verificar                       | bloqueo + CTA "verifica tu correo"; opción de reenvío           |
| F7   | Login con cuenta `pending`                           | acceso BASIC tier (puede ver dashboard limitado)                |
| F8   | Login con cuenta `suspended`                         | bloqueo con mensaje claro y contacto                            |
| F9   | "Recordarme" checkbox                                | sesión persiste tras cerrar browser; sin marcar = sesión expira |

---

### G. Multi-email identity (P0)

Cubierto en Plan v1 §1.4 + §1.5. Resumen:
| Paso | Assertion |
|---|---|
| G1 | Member añade correo alterno → `requestAlternateEmail` 200; email enviado |
| G2 | Toast verdadero para email ya en uso + audit log |
| G3 | Rate limit dispara al 6º intento |
| G4 | Click link → `confirmAlternateEmail` con transacción (B4) → `alternateEmails[]` + `email_alias` doc creados |
| G5 | Replay del mismo link → "ya usado" (transacción) |
| G6 | Login con alias → avatar canónico (useResolvedProfile) |

---

### H. Dashboard: profile (P0)

| Paso | URL                                                  | Assertion                                              |
| ---- | ---------------------------------------------------- | ------------------------------------------------------ |
| H1   | `/es/dashboard/profile/edit`                         | form precarga datos actuales                           |
| H2   | Editar bio, foto upload, skills, links sociales      | upload Storage; persiste; refleja en `/members/<slug>` |
| H3   | Toggle privacidad: público / solo miembros / privado | otros usuarios ven respetando el setting               |
| H4   | Borrar foto                                          | reemplaza por default; persiste                        |

---

### I. Dashboard: jobs (P0)

| Paso | Acción                                       | Assertion                                                                    |
| ---- | -------------------------------------------- | ---------------------------------------------------------------------------- |
| I1   | `/es/dashboard/jobs` lista + filtros         | filtros aplican; paginación funciona                                         |
| I2   | `/es/dashboard/jobs/[id]` detalle            | render; CTA Apply visible                                                    |
| I3   | Apply                                        | doc en `jobApplications` con uid + jobId; aparece en /dashboard/applications |
| I4   | `/es/dashboard/jobs/new` (recruiter o admin) | form valida; job entra `pending`                                             |
| I5   | Admin aprueba job                            | aparece en lista pública /jobs                                               |
| I6   | `onNewJobPosted` trigger                     | users con match preference reciben email                                     |
| I7   | `/es/dashboard/applications`                 | lista las apps del user                                                      |

---

### J. Dashboard: events (P0)

| Paso | Acción                            | Assertion                                          |
| ---- | --------------------------------- | -------------------------------------------------- |
| J1   | `/es/dashboard/events`            | lista + filtros                                    |
| J2   | `/es/dashboard/events/detail`     | detalle                                            |
| J3   | RSVP gratis                       | doc en `eventRegistrations`; aparece en /my-events |
| J4   | `/es/dashboard/events/new` (host) | crear evento; preview; publish                     |
| J5   | RSVP con pago                     | skip por `payments` beta flag                      |
| J6   | Cancelar RSVP                     | doc removido; spot libera                          |

---

### K. Dashboard: forums (P1)

| Paso | Acción                      | Assertion               |
| ---- | --------------------------- | ----------------------- |
| K1   | `/es/dashboard/forums`      | categorías              |
| K2   | `/es/forum/category/[slug]` | posts                   |
| K3   | `/es/forum/new-topic`       | crear post              |
| K4   | `/es/forum/topic/[slug]`    | thread + replies        |
| K5   | `/es/forum/search?q=...`    | search returns relevant |
| K6   | Upvote / downvote           | conteo actualiza        |
| K7   | Reportar                    | doc en mod queue        |

---

### L. Dashboard: mentorship (P1)

| Paso | Acción                              | Assertion                                         |
| ---- | ----------------------------------- | ------------------------------------------------- |
| L1   | `/es/dashboard/mentorship` overview | tabs                                              |
| L2   | `/es/mentorship/browse`             | lista mentores + filtros                          |
| L3   | Request session con mentor X        | doc en `mentorship_requests`; mentor recibe notif |
| L4   | Mentor accepts                      | sesión confirmada; calendar entry                 |
| L5   | Sesión completada → feedback        | persiste                                          |
| L6   | Editar perfil mentee/mentor         | persiste                                          |

---

### M. Dashboard: messaging / DMs (P1)

| Paso | Acción                         | Assertion                                 |
| ---- | ------------------------------ | ----------------------------------------- |
| M1   | `/es/dashboard/messages` lista | conversaciones recientes                  |
| M2   | Iniciar DM con otro miembro    | conversación creada; primer mensaje       |
| M3   | Recibir mensaje (otra sesión)  | onSnapshot actualiza inbox en tiempo real |
| M4   | Marcar leído                   | flag persiste                             |
| M5   | Bloquear usuario               | rule + UI lo bloquean                     |

---

### N. Dashboard: settings (P0)

| Paso | URL                                  | Assertion                                                       |
| ---- | ------------------------------------ | --------------------------------------------------------------- |
| N1   | `/es/dashboard/settings` tab Account | datos editables persisten                                       |
| N2   | Tab Cuentas                          | sección alternate email (cubre G)                               |
| N3   | Tab Seguridad                        | cambiar password OK                                             |
| N4   | Tab Seguridad                        | setup 2FA: QR escaneable, código verifica, backup codes generan |
| N5   | Tab Seguridad                        | disable 2FA pide password actual                                |
| N6   | Tab Notificaciones                   | toggles persisten (anotar si no existe)                         |
| N7   | Tab Privacidad                       | visibility settings respetados en perfil público                |
| N8   | "Borrar mi cuenta"                   | confirm modal; `onUserDelete` trigger corre; Groups removidos   |

---

### O. Notification center in-app (P1)

**Goal**: validar que el `NotificationCenter` component muestra eventos relevantes.
**Pre**: encontrar dónde está expuesto (probablemente en nav o sidebar).

| Paso | Acción                                                   | Assertion                                  |
| ---- | -------------------------------------------------------- | ------------------------------------------ |
| O1   | Login → click bell icon (donde sea)                      | center abre, muestra notifs sin leer       |
| O2   | Crear evento que dispara notif (e.g. mentorship request) | aparece en center en tiempo real           |
| O3   | Click notif                                              | navega al recurso relacionado; marca leída |
| O4   | Settings → desactivar tipo de notif                      | el siguiente evento no aparece             |

**Si NotificationCenter no está expuesto en UI**: file issue P1 — componente existe pero no se renderiza.

---

### P. Resources, spotlights, journal-club, assessments, salary insights, gamification, learning paths (P1)

| Sub                   | Pages                                                                                                | Validación mínima                                                                                                   |
| --------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| P1 Resources          | `/es/dashboard/resources`, `/es/resources`                                                           | lista carga; detalle abre; admin puede crear                                                                        |
| P2 Spotlights         | `/es/dashboard/spotlights`, `/es/spotlights`, `/es/spotlights/[id]`                                  | lista; crear (admin); ver detalle                                                                                   |
| P3 Journal Club       | `/es/dashboard/journal-club`, `/es/dashboard/journal-club/detail`, `/es/dashboard/journal-club/new`  | lista; crear; detalle; **#8 bug — journal club events no aparecen auto en /events** verificar                       |
| P4 Assessments        | `/es/dashboard/assessments`, `/es/dashboard/assessments/[id]`, `/es/dashboard/assessments/historial` | tomar assessment; resultado guarda; historial lista                                                                 |
| P5 Salary insights    | `/es/dashboard/salary-insights`                                                                      | tier classification correcta (B5 verificado); requiresContribution para no-contributor; aggregates para contributor |
| P6 Gamification       | badges, leaderboard, points, quests                                                                  | si están detrás de `gamification` beta flag, verificar que aparecen en beta                                         |
| P7 Learning Paths     | `/es/dashboard/resources` o sección específica                                                       | si están detrás de `learningPaths` flag, verificar                                                                  |
| P8 Newsletter archive | `/es/newsletter/archive`, `/es/newsletter/[id]`                                                      | published visibles; drafts solo a editores                                                                          |

---

### Q. Admin journeys (P0)

| Paso | URL                                                         | Assertion                                                    |
| ---- | ----------------------------------------------------------- | ------------------------------------------------------------ |
| Q1   | `/admin` landing                                            | badges con counters de pendientes (Phase 0 §0.2)             |
| Q2   | `/admin/users`                                              | filtro pendientes; aprobar dispara B19-B25                   |
| Q3   | `/admin/content-moderation`                                 | posts/jobs/comments pendientes; aprobar/rechazar             |
| Q4   | `/admin/merge-profiles`                                     | UI carga; flow alias documentado pero no ejecutar en QA pass |
| Q5   | `/admin/newsletter`                                         | crear issue draft; preview; send (a lista test)              |
| Q6   | `/admin/settings`                                           | config global persiste                                       |
| Q7   | Audit log surface (si existe)                               | actions del admin aparecen                                   |
| Q8   | RBAC: crear admin secundario y verificar permisos limitados | grant solo lectura → solo lee                                |

---

### R. Lifecycle edge cases (P1)

| Paso | Acción                                         | Assertion                                               |
| ---- | ---------------------------------------------- | ------------------------------------------------------- |
| R1   | User active → admin marca alumni               | email notif, Group sync                                 |
| R2   | User active → admin suspende                   | email notif, login bloqueado                            |
| R3   | User suspended → admin reinstaura              | email notif, vuelve a active                            |
| R4   | User borra su cuenta                           | `onUserDelete` corre; doc marca/borra; Groups removidos |
| R5   | User cambia email primario (si está soportado) | reflejo en auth + Firestore                             |

---

## 7. Phase 0 — Brechas a cerrar antes de testear

### 0.1 Notificaciones de onboarding (críticas)

**Patrón**: `sendEmail({to, subject, html})` en triggers existentes. Trigger Email extension ya escribe a Firestore `mail/`, ya está configurada.

**Templates HTML**: mismo estilo visual que `alternate-email.ts` (gradient header SECiD, button CTA, footer).

| Trigger                                   | Email                                                                  | Sender            | Destinatario                                   |
| ----------------------------------------- | ---------------------------------------------------------------------- | ----------------- | ---------------------------------------------- |
| `onUserDocCreated`                        | "Bienvenido a SECiD — completa tu perfil" + link a `/onboarding`       | contacto@secid.mx | user                                           |
| `onMemberStatusChange` → `pending`        | "Nueva solicitud pendiente: <name>" + link al admin panel              | contacto@secid.mx | `ADMIN_EMAIL` (env, default contacto@secid.mx) |
| `onMemberStatusChange` `pending → active` | "Tu solicitud fue aprobada — bienvenido a SECiD" + link a `/dashboard` | contacto@secid.mx | user                                           |

**Extras low-cost mismo PR**:

- Email rechazo (`pending → collaborator`): "Tu solicitud requiere más información"
- Email suspensión (`active → suspended`): "Tu cuenta fue suspendida — contáctanos"
- Email reactivación (`suspended → active`): "Tu cuenta fue reactivada"

**Acceptance criteria**:

- Cada email llega en < 60s
- Sender es exactamente `contacto@secid.mx`
- Subject + body en español por default; EN si user.lang === 'en'
- Link en body funciona y lleva al recurso correcto
- Email no contiene info sensible (PII de otros users, internal IDs, etc.)

### 0.2 Admin badge con conteo de pendientes

- Component nuevo o extender existente `/admin` landing
- Query: `users where lifecycle.status == 'pending'` (count)
- Click → filtra `/admin/users?status=pending`
- Refresh automático cada 60s o on focus

### 0.3 Empty + loading + error states sweep

**No implementar** — solo inventariar. Sweep manual por cada `/es/dashboard/*` con cuenta nueva sin datos y anotar:

- ¿Hay empty state explicativo?
- ¿Hay skeleton/spinner durante load?
- ¿Hay retry button cuando falla?

Cada gap = issue separado en Phase 5.

### 0.4 Email verification UX (opcional, low priority)

Hoy Firebase manda template default. Si decidimos custom, replicar patrón de §0.1.

**Recomendación**: skip hasta post-launch. Default funciona.

### 0.5 Verificar deployabilidad de Phase 0

- Después de implementar, push a feature/hub
- Esperar deploy
- Smoke test: trigger un cambio de status manual y verificar que email llega
- SOLO entonces empezar Phase 1

---

## 8. Phase 1 + 2 — Ejecución de journeys

Ejecutar journeys en este orden:

1. **A, F** (público + login) — bases que todo lo demás asume
2. **B, E** (signup paths principales)
3. **G, N** (multi-email + settings — recientemente shipped)
4. **H, I, J** (core dashboard features)
5. **Q** (admin)
6. **K, L, M, O** (forums, mentorship, messaging, notifs)
7. **C, D, R** (paths secundarios + lifecycle)
8. **P** (todo lo restante: assessments, salary, etc.)

Por cada journey, durante ejecución:

- Capturar screenshot del estado final exitoso
- Si falla, capturar console + network + Firestore state
- File issue inmediatamente con plantilla §12.2
- Marcar en tabla ✅/⚠️/❌

---

## 9. Phase 3 — Cross-cutting

### 9.1 Mobile

DevTools → iPhone 12 + Pixel 5. Pasada por:

- `/`, `/es/signup`, `/es/dashboard`, `/es/dashboard/jobs`, `/es/cv/<slug>`, `/es/contact`

**Acceptance criteria**:

- No horizontal overflow
- Touch targets ≥ 44×44 px
- Forms usables sin zoom
- Botones legibles
- Hamburger nav funciona

### 9.2 Performance (Lighthouse)

| Page type                 | LCP     | CLS    | TBT      | Performance score |
| ------------------------- | ------- | ------ | -------- | ----------------- |
| Home `/`                  | < 2.5 s | < 0.1  | < 200 ms | ≥ 80              |
| Static (about, blog list) | < 2.0 s | < 0.1  | < 150 ms | ≥ 85              |
| Dashboard (auth)          | < 3.5 s | < 0.15 | < 400 ms | ≥ 70              |
| CV viewer                 | < 3.0 s | < 0.1  | < 300 ms | ≥ 70              |

Run Lighthouse en Chrome DevTools, modo mobile y desktop. Capturar reports.

### 9.3 Accessibility (WCAG 2.1 AA)

Axe DevTools en al menos: `/`, `/es/signup`, `/es/dashboard`, `/es/dashboard/jobs`, `/es/contact`.

**Criterios mínimos**:

- Contraste de texto ≥ 4.5:1 (3:1 para texto grande)
- Todos los inputs con `<label>` asociado
- Todas las imágenes con `alt` (decorativas con `alt=""`)
- Keyboard nav: Tab cycle completo, focus visible, escape cierra modales
- ARIA roles correctos en componentes custom
- No usar solo color para transmitir info (errores también con icono/texto)
- Lang attribute correcto (es/en)
- Skip-to-content link en nav

### 9.4 i18n completeness

Cada journey P0 ejecutarlo también en EN. Anotar:

- Strings hardcoded en español que no se localizan
- Fechas/números mal formateados
- Layouts rotos por texto más largo en inglés

### 9.5 Console + network hygiene

Cada page: zero errores rojos en console. Warnings OK pero anotar los ruidosos.
Cada acción que escribe: 2xx; nunca 5xx; 4xx solo cuando se espera (auth, validation).

### 9.6 Headers / CSP

`curl -I https://beta.secid.mx/` debe incluir:

- `Strict-Transport-Security: max-age=...`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY` o equivalente CSP `frame-ancestors`
- `Content-Security-Policy: ...` razonable
- `Referrer-Policy: strict-origin-when-cross-origin`
- Headers de cache correctos (#44)

---

## 10. Phase 4 — Seguridad / abuse testing

### 10.1 RBAC bypass attempts

| Test                                                            | Esperado                            |
| --------------------------------------------------------------- | ----------------------------------- |
| User BASIC tier intenta cargar `/es/dashboard/jobs/new` directo | redirect o 403 page                 |
| User MEMBER intenta `/admin`                                    | redirect o 403                      |
| User no-admin intenta `gh api .../merge_requests POST` directo  | rules denegan                       |
| User no-verified intenta `requestAlternateEmail` callable       | `failed-precondition: members_only` |

### 10.2 Firestore rules bypass attempts

Con DevTools console abierta:

```js
import { collection, addDoc } from 'firebase/firestore';
await addDoc(collection(db, 'newsletter'), {email:'x@y.z', ...}); // debe fallar
await addDoc(collection(db, 'merge_audit_log'), {...}); // debe fallar
await addDoc(collection(db, 'contactMessages'), {...}); // debe fallar
```

Todos deben terminar en `permission-denied`.

### 10.3 CORS bypass attempt

Curl con `Origin: https://evil.secid.mx` (subdomain trick):

```bash
curl -X POST https://us-central1-secid-org.cloudfunctions.net/requestAlternateEmail \
  -H "Origin: https://evil.secid.mx" \
  -H "Authorization: Bearer <token>" \
  -d '{"data":{"email":"x@y.z"}}'
```

Debe ser bloqueado por CORS (S1 anchor).

### 10.4 Rate limit verification

- `/api/forms/newsletter` 6 submits seguidos desde misma IP → 6º responde 429
- `/api/forms/contact` mismo patrón
- `requestAlternateEmail` 6 submits → 429
- Esperar 10 min → contador reset → siguiente submit OK

### 10.5 IDOR (insecure direct object reference)

- Login como User A. Capturar su uid. Logout.
- Login como User B. Intentar GET `/es/members/<A's slug>` (debería ver respetando privacidad de A)
- Intentar DELETE / PATCH `users/<A's uid>` directamente vía Firestore SDK → permission-denied
- Intentar leer `merge_requests` ajeno → permission-denied

### 10.6 Token replay (CAPTCHA + alternate email)

- Capturar un captchaToken de un submit OK
- Reusar inmediatamente (misma IP, diferente body) → debe ser rechazado por reCAPTCHA (token single-use)
- Capturar token de verificación de alternate email
- Después del primer use, reintento → "ya usado" (transacción B4)

### 10.7 Session security

- Login. Capturar idToken. Logout.
- Intentar usar el idToken en una API call → debe fallar (token revocado al logout)
- Mismo test después de password reset: tokens previos revocados

### 10.8 XSS / injection

- Crear post en forum con `<script>alert(1)</script>` en title y body → no se ejecuta; se escapa
- Mismo en bio del perfil
- Mismo en mensaje de contacto
- URL params con HTML → no se reflejan sin escape

---

## 11. Phase 5 — Backlog grooming

Durante todas las phases anteriores, si encuentras algo que **no es un bug pero es un gap UX o mejora**, NO interrumpas el journey — anota en lista y al final fila un issue por cada uno usando §12.2.

Categorías esperadas:

- UX: mensajes vagos, falta confirmation, falta empty state, copy malo
- A11y: contraste, missing alt, keyboard trap, missing ARIA
- Mobile: overflow, touch target, layout roto
- Perf: page lenta, bundle grande, recursos sin lazy load
- i18n: string hardcoded, traducción mala, plurales rotos

---

## 12. Evidencia y reporte

### 12.1 Estructura de evidencia

Crear carpeta `docs/qa/2026-05-24-evidence/` con subcarpetas por journey:

```
docs/qa/2026-05-24-evidence/
  A-public/
    A1-home.png
    A21-newsletter-success.png
    A21-newsletter-network.json
  B-signup-alumno/
    B1-form.png
    B4-verify-email.png
    B19-admin-notif.png
    B22-approval.gif        ← multi-step
  ...
```

### 12.2 Plantilla de issue (para Phase 5 y bugs)

```markdown
## Found during QA pass — Journey [letra]-[paso]

**Type**: bug | ux | a11y | perf | i18n | security
**Severity**: P0 (bloqueador) | P1 (importante) | P2 (mejora)
**Environment**: beta.secid.mx @ <commit>

### Steps to reproduce

1. ...
2. ...

### Expected

...

### Actual

...

### Evidence

- screenshot: `docs/qa/2026-05-24-evidence/<journey>/...`
- console: ...
- network: ...

### Suggested fix

...
```

### 12.3 Reporte final

Al cierre del QA pass, escribir `docs/qa/2026-05-24-report.md`:

```markdown
# QA pass 2026-05-24 — Resumen

## Build

- branch: feature/hub
- commit: <sha>
- deployed: <timestamp>

## Resultado

- Journeys ejecutados: X / 22
- P0 pass: X / Y
- P1 pass: X / Y
- P2 pass: X / Y

## Ship recommendation

- ✅ SHIP / ⚠️ SHIP CON CAVEAT / ❌ NO SHIP

## Issues filed

- #N1 [P0] ...
- #N2 [P1] ...
- ...

## Phase 0 implementación

- ✅/⚠️/❌ por cada gap cerrado

## Phase 4 seguridad

- ✅/⚠️/❌ por cada test
```

---

## 13. Ship gate — Definition of Done

**SHIP**:

- ✅ Todos los journeys P0 pasan
- ✅ Phase 4 todos los tests pasan (zero security holes)
- ✅ Lighthouse perf budgets cumplidos en pages P0
- ✅ Zero issues nuevos P0 filados durante QA
- ✅ Phase 0 notificaciones funcionando

**SHIP CON CAVEAT**:

- ✅ Lo anterior
- ⚠️ ≤ 3 issues P1 filados, todos con workaround documentado
- ⚠️ ≤ 5 issues P2 filados

**NO SHIP**:

- ❌ Cualquier issue P0 abierto
- ❌ Cualquier hueco de seguridad en Phase 4
- ❌ Phase 0 incompleta

---

## 14. Rollback procedures

Si un issue P0 se descubre **después** del merge a main pero **antes** de comunicación pública:

### 14.1 Hosting rollback (frontend)

```bash
# Revertir el deploy de hosting al previo
firebase hosting:rollback --project secid-org --site secid-mx
```

### 14.2 Functions rollback

Cloud Functions Gen2 no tiene rollback nativo simple. Opciones:

1. Git revert del commit problemático en main → push → cd.yml redeploy con la versión previa
2. Si urgencia: deploy manual de la versión previa desde local con `firebase deploy --only functions:<funcName>`

### 14.3 Rules rollback

```bash
# Tener backup de la versión previa antes del deploy
git checkout <previous-sha> -- firestore.rules
firebase deploy --only firestore:rules --project secid-org
```

### 14.4 Data corruption rollback

- Firestore tiene point-in-time recovery (Daily Backups si está habilitado)
- Si data se corrompió, restore al timestamp pre-incidente
- Es destructivo de cambios posteriores → solo para incidentes graves

### 14.5 Comunicación

Si rollback es necesario y users ya están afectados:

- Banner in-app "experimentando issues"
- Email a `members@` y `colaboradores@` Google Groups
- Status update en redes sociales si crítico

---

## 15. Handoff a Playwright (futuro)

De los 22 journeys, estos son los mejores candidatos para automatizar:

- A (público + i18n switch) — alta cobertura, bajo costo
- B (signup alumno end-to-end) — el más complejo, mayor valor
- E (OAuth) — al menos uno de los 3 providers
- F (login + password reset)
- G (multi-email — ya hay tests unitarios; agregar e2e)
- I, J (jobs + events — flujos CRUD repetitivos)
- Q (admin approval — pareado con B)
- Phase 4 security checks (todos automatizables vía Playwright + curl)

Recomendación: priorizar Playwright para B (cubre el flujo más valioso end-to-end) y Q (admin approval) primero. Después A para regresión rápida.

**No-automatizar**:

- O (notification center) — UI compleja en tiempo real
- L (mentorship) — depende de flow async entre dos users
- Cross-cutting a11y / perf — usar Axe + Lighthouse en CI separado

---

## 16. Appendices

### A. RBAC matrix (referencia rápida)

| Rol                               | tier      | RBAC permissions                             | Pages accesibles                    |
| --------------------------------- | --------- | -------------------------------------------- | ----------------------------------- |
| Visitor                           | —         | none                                         | A.\*                                |
| BASIC (email verified, no member) | BASIC     | none                                         | A.\* + /dashboard limited           |
| MEMBER (isVerified=true)          | MEMBER    | jobs:_ events:_ mentorship:_ forum:_ + bl:v  | A._ + /dashboard/_ (excepto admin)  |
| RECRUITER                         | RECRUITER | jobs:c + jobs:v + companies:\*               | dashboard limited al área recruiter |
| ADMIN                             | ADMIN     | hasRBACAllowAll en todo                      | todo + /admin/\*                    |
| ALUMNI                            | MEMBER    | (igual MEMBER, con flag alumni en lifecycle) | todo MEMBER                         |

### B. Env vars referencia

Ver `.env.example` actualizado. Críticas para QA:

- `PUBLIC_FIREBASE_*` — config Firebase web
- `PUBLIC_STRIPE_PUBLISHABLE_KEY` — pendiente
- `PUBLIC_FIREBASE_VAPID_KEY` — set este sesión
- `PUBLIC_RECAPTCHA_SITE_KEY` — set este sesión
- Server-side (functions/.env vía workflow): `APP_URL`, `RECAPTCHA_SECRET_KEY`

### C. Comandos útiles durante QA

```bash
# Ver últimos deploys
gh run list --workflow=deploy-beta.yml --limit 5

# Tail logs de functions
firebase functions:log --project secid-org

# Verificar Firestore state
# (vía Firebase Console manual)

# Inspeccionar GitHub Secrets (sin ver valores)
gh secret list
```

### D. Glosario

- **canonical user**: doc users/{uid} con datos reales del miembro
- **alias stub**: doc users/{aliasUid} con sólo `aliasOf` apuntando al canonical
- **isVerified**: flag en users doc que distingue MEMBER full vs BASIC (set tras admin approval)
- **lifecycle.status**: `collaborator | pending | active | suspended | deactivated | alumni`
- **tier**: `BASIC | MEMBER | RECRUITER | ADMIN` (computed cliente-side desde isVerified + RBAC)

---

## 17. Lo que necesito de ti para arrancar

1. **OK para implementar Phase 0** (3 emails + admin badge). Te muestro código antes de commit.
2. **Cuenta admin** confirmada para journey B+Q (asumo `artemiopadilla@gmail.com`).
3. **numeroCuenta de prueba** quemable, o doy random + manejo reject.
4. **¿Empiezo con Phase 0 o con la sweep de journeys P0 que ya funcionan (A, F, G) para tener data antes de invertir en notificaciones?**

---

## Changelog

- **v3** (2026-05-24 tarde): assessment de v2, agregadas 9 journeys faltantes, Phase 4 security, ship gate, rollback procedures, Playwright handoff, RBAC matrix
- **v2** (2026-05-24 mediodía): 13 journeys, Phase 0 con notificaciones, cross-cutting
- **v1** (2026-05-24 mañana): primera pasada, foco en flujos recién shipped
