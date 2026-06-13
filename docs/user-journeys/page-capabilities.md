# SECiD — Page Capabilities Reference

What users can do on each page of the SECiD platform. Explored on `beta.secid.mx` on 2026-05-27. Spanish locale (`/es/*`) documented; English (`/en/*`) is symmetric. Auth-gated pages documented from codebase since interactive login was not performed.

**Auth tiers:**

- 🌐 **Public** — no login required
- 🔓 **Authenticated** — any logged-in member
- ⭐ **Verified** — verified members (extra dashboard features)
- 🛡 **Admin/Moderator** — admin or moderator role only

**Shared chrome (all pages):**

- Beta banner with dismiss button
- Top nav: Inicio, Empleos, Comunidad (dropdown), Nosotros
- Language toggle (ES/EN)
- Theme toggle (light/dark)
- User menu (login button or avatar dropdown)
- Footer: 4 columns (brand+socials / Plataforma / Comunidad / Soporte) + legal links
- "Reportar un problema" floating button

---

## 🌐 Public — Landing & Marketing

### `/es/` — Home

**Title:** "Bienvenidos a SECiD"
**Users can:**

- Read the SECiD mission statement and value proposition
- Click "Únete a SECiD" → `/es/join` (call-to-action)
- Click "Ver Empleos" → `/es/jobs`
- Browse 6 "Iniciativas" cards (Bolsa de Trabajo, Consultoría, Hackathons, Talleres y Cursos, Seminarios, Mentoría) — some linking to email
- Browse 4 "¿Por qué unirse?" benefit cards (Networking, Empleo, Crecimiento, Comunidad)
- Quick CTAs: "Encuentra tu próximo empleo" / "Únete a nuestra comunidad"

### `/es/about-us` — Sobre Nosotros

**Title:** "Sobre Nosotros"
**Users can:**

- Read the SECiD mission, history, and values (Excelencia, Colaboración, Innovación, Integridad)
- View Consejo Directivo (board of directors)
- View Comisiones Horizontales (horizontal commissions)
- Click "Ver organigrama interactivo" → `/es/commissions`
- Click "Regístrate Ahora" → `/registro`

### `/es/commissions` — Comisiones

**Title:** "Comisiones - SECiD"
**Users can:**

- Browse interactive org chart of SECiD's commissions and leadership structure
- See commission leads and members
- Navigate visual hierarchy of the organization

### `/es/contact` — Contacto

**Users can:**

- Fill contact form: name, email, subject, message
- Submit (rate-limited, requires CAPTCHA, routes to `sendContactMessage` Cloud Function → email to `contacto@secid.mx`)
- See success/error toast after submission

### `/es/help` — Centro de Ayuda

**Users can:**

- Browse help articles organized by category
- Search help topics

### `/es/faq` — Preguntas Frecuentes

**Users can:**

- Browse accordion-style FAQ sections
- Find answers about membership, payments, events, content moderation

### `/es/privacy` / `/es/terms` / `/es/cookies` — Legal

**Users can:**

- Read legal/policy text
- Static pages, no interaction

---

## 🌐 Public — Job Board

### `/es/jobs` — Bolsa de Trabajo

**Users can:**

- Search jobs (search input)
- Sort by: Más recientes / Mejor compatibilidad / Mayor salario
- Toggle sort direction (↓ / ↑)
- Switch view mode: Lista / Cuadrícula
- Click "Publicar Empleo" → `/es/post-job`
- Click "Iniciar Sesión" → `/es/login` (anonymous CTA)
- Click "Registrarse" → `/registro`
- Click any job card → `/es/dashboard/jobs/{id}` detail page
- **Empty state:** "No se encontraron empleos" when no listings match

### `/es/post-job` — Publicar Empleo

**Users can:**

- Submit a job posting (form with title, company, location, type, salary, description, requirements, skills, deadline)
- Sign in first if not authenticated (form gated by login state)

---

## 🌐 Public — Directory & Network

### `/es/members` — Directorio de Miembros

**Users can:**

- View public member directory (only members with `privacy.profileVisibility = 'public'` and consent flag are shown)
- See "¿Dónde trabajan los miembros?" company logo grid
- Click any member card → `/es/members/{id}` detail page
- Click "Únete a SECiD" → `/registro`
- Authenticated members can additionally see filters by skill, location, experience level

### `/es/members/detail` (catchall via Hosting rewrite `/es/members/*`)

**Users can:**

- View a member's full public profile (read URL slug client-side via `useRouteIdBySegment('members')`)
- See bio, skills, experience, education, certifications, portfolio
- Click LinkedIn/GitHub/website links
- Authenticated: send connection request, send message, view contact info
- Public-CV viewer: `/es/members/{slug}/cv` rewrites to `/es/cv/`

### `/es/companies` — Red de Empresas

**Users can:**

- Browse company directory
- Filter by industry, size, location
- Click company card → `/es/companies/{slug}` detail page

### `/es/companies/detail`

**Users can:**

- View company profile: logo, description, current jobs, members working there
- Authenticated: follow company, save to favorites

---

## 🌐 Public — Events & Calendar

### `/es/events` — Eventos

**Users can:**

- Browse upcoming and past events
- Filter by type (workshop, talk, social, journal-club, etc.) and status
- Search events
- Click event card → `/es/events/{id}`
- Authenticated: register/RSVP

### `/es/calendar` — Calendario de Actividades

**Users can:**

- View monthly/weekly calendar with events
- Click date or event for details
- Subscribe to calendar feed

### `/es/events/detail`

**Users can:**

- View event details (date, location, speakers, agenda)
- Register for the event (auth required)
- Add to personal calendar
- See attendee list (if visibility permits)

### `/es/journal-club` — Journal Club

**Users can:**

- Browse journal club sessions
- View past discussions and papers
- Authenticated: RSVP to upcoming sessions

---

## 🌐 Public — Content (Blog, Newsletter, Spotlights, Resources)

### `/es/blog` — Blog

**Users can:**

- Browse blog post list
- Search posts (requires composite Firestore index — fixed #57)
- Filter by tag/author/date
- Click post → `/es/blog/{slug}` (rewrites to `/es/blog/entry/index.html`)
- Authenticated members can write their own posts via `/es/dashboard/blog/new`

### `/es/blog/entry` (catchall `/es/blog/*`)

**Users can:**

- Read full blog post (markdown rendered)
- See author info, publication date, tags
- Comment (if comments enabled)
- Share to social media

### `/es/newsletter` — Newsletter

**Users can:**

- Subscribe to newsletter via form (calls `subscribeNewsletter` Cloud Function, CAPTCHA-gated)
- See latest newsletter previews
- Click "Ver archivo" → `/es/newsletter/archive`

### `/es/newsletter/archive` — Archivo del Newsletter

**Users can:**

- Browse past newsletter editions
- Click any edition → `/es/newsletter/{id}` detail

### `/es/newsletter/detail`

**Users can:**

- Read full newsletter content
- Share, download as PDF

### `/es/spotlights` — Historias de Egresados

**Users can:**

- Browse alumni spotlight stories
- Click spotlight card → `/es/spotlights/{id}` detail
- Inspire-themed visual gallery layout

### `/es/spotlights/detail`

**Users can:**

- Read the alumnus story, career path, advice
- See linked member profile

### `/es/resources` — Recursos

**Users can:**

- Browse educational resources (courses, tutorials, papers, books)
- Filter by category, type, level
- Click resource → `/es/resources/{id}` detail

### `/es/resources/detail`

**Users can:**

- View resource description, link/file, ratings
- Authenticated: bookmark, rate, comment

---

## 🌐 Public — Community Forum

### `/es/forum` — Foro

**Users can:**

- Browse forum categories
- See category descriptions and topic counts
- Click category → `/es/forum/category/{slug}` topic list
- Authenticated: click "Nuevo Tema" → `/es/forum/new-topic`
- Click "Buscar" → `/es/forum/search`

### `/es/forum/category/detail` (catchall `/es/forum/category/*`)

**Users can:**

- Browse all topics in the category
- Filter pinned/locked
- Click topic → `/es/forum/topic/{slug}`

### `/es/forum/topic/detail` (catchall `/es/forum/topic/*`)

**Users can:**

- Read original post and all replies (threaded)
- Authenticated: reply, upvote/downvote, react, report
- Topic author/admin: edit, lock, pin, mark as solution

### `/es/forum/new-topic` — Nuevo Tema

**Users can (auth required):**

- Select category, write title + markdown body
- Add tags, attachments
- Preview before posting
- Submit topic

### `/es/forum/search` — Buscar en Foro

**Users can:**

- Search forum topics and posts
- Filter by category, author, date range

---

## 🌐 Public — Mentorship

### `/es/mentorship` — Programa de Mentoría

**Users can:**

- Read about the mentorship program
- Apply as mentee or mentor (requires auth)
- Click "Buscar Mentores" → `/es/mentorship/browse`

### `/es/mentorship/browse` — Buscar Mentores

**Users can:**

- Browse mentor profiles
- Filter by area of expertise, availability, language
- Authenticated: request mentorship session

---

## 🌐 Public — CV Viewer

### `/es/cv` — CV

**Users can:**

- View a public member's CV (via `/es/members/{slug}/cv` rewrite, gated by member's `cvVisibility = 'public'`)
- Download CV as PDF (3 formats: full, 1-page resume, 2-page resume)
- See deterministic accent color per member
- See date format like "Mar 2024" (#49 fix)

---

## 🌐 Public — Auth & Onboarding

### `/es/login` — Iniciar Sesión

**Users can:**

- Sign in with email + password
- Sign in with Google OAuth (popup)
- Sign in with GitHub OAuth (popup)
- Sign in with LinkedIn OAuth (popup)
- Click "Forgot password?" → password reset flow
- Click "Crear cuenta" → `/es/signup`
- Enter 2FA code if enabled (TOTP)
- 5-second timeout fallback on 2FA + lastLogin Firestore calls (#73 fix)

### `/es/signup` — Crear Cuenta

**Users can:**

- 4-step wizard:
  1. **account** — email + password OR OAuth provider
  2. **verification** — email confirmation
  3. **basic info** — name, university details (numero de cuenta, generation, career)
  4. **profile** — extended info
- Resume from any step on refresh (state in Firestore `onboarding_state`)
- Submit triggers welcome email + admin notification fanout
- Awaits `authStateReady` before progressing (#67 fix)
- Surfaces errors via toast (no silent failures — #63 fix)

### `/es/join` — Únete a SECiD

**Users can:**

- Read the value proposition for joining
- See free vs. paid tier features (free-only at current launch)
- Click "Regístrate" → `/registro` (root-level Spanish registration)

### `/es/verify-alternate-email` — Verificar correo alterno

**Users can:**

- Click the unique link from the alternate-email verification email
- Token is consumed atomically (#B4 fix)
- See success or "token expired/used" error
- Redirect to dashboard on success

### `/registro` — Registro (root)

**Users can:**

- Alias for `/es/signup` — root-level entry point

---

## 🔓 Authenticated — Dashboard

All `/es/dashboard/*` routes require login. AuthGuard redirects to `/es/login?next=...` if unauthenticated.

### `/es/dashboard` — Dashboard Home

**Users can:**

- See profile completion progress
- View activity feed
- Quick links to: jobs, events, mentorship, profile
- See bottom navigation: Inicio, Mensajes, Notificaciones, Perfil (mobile)
- Notification badge for unread items

### `/es/dashboard/profile` — Mi Perfil

**Users can:**

- View own profile as others see it
- Click "Editar" → `/es/dashboard/profile/edit`

### `/es/dashboard/profile/edit` — Editar Perfil

**Users can:**

- Update bio, headline, location
- Add/remove skills, certifications, education entries, experience
- Upload profile photo + cover photo
- Manage portfolio links + projects
- Set privacy: profileVisibility (public/members-only/private), cvVisibility
- Add alternate email (requires verification)
- Link external accounts (LinkedIn, GitHub, ORCID)

### `/es/dashboard/settings` — Configuración

**Users can:**

- Change password
- Enable/disable 2FA (TOTP setup)
- Manage notification preferences (email, in-app, push)
- Set language preference
- Set theme preference
- Download personal data (GDPR export)
- Delete account (with confirmation)

### `/es/dashboard/jobs` — Mis Empleos

**Users can:**

- See all job postings (filtered by member-visible)
- Filter by salary, location, remote, type
- Click "Nuevo Empleo" → `/es/dashboard/jobs/new`
- Click job → `/es/dashboard/jobs/{id}` detail
- Save jobs to favorites

### `/es/dashboard/jobs/new` — Publicar Nuevo Empleo

**Users can:**

- Create a job posting: title, company, salary, location, remote flag, type, description, requirements, benefits, deadline
- Add screening questions
- Save as draft or publish

### `/es/dashboard/jobs/detail` (catchall)

**Users can:**

- View full job details
- Click "Aplicar" → opens `JobApplicationModal` to attach CV + cover letter
- Track application status
- Job poster sees applicants list

### `/es/dashboard/applications` — Mis Postulaciones

**Users can:**

- Track all jobs they've applied to
- See status: pending, viewed, interview, rejected, accepted
- Withdraw application

### `/es/dashboard/members` — Directorio (Auth)

**Users can:**

- Full member directory (vs. public-only filtered view)
- See members marked private-to-members
- Send messages, connection requests

### `/es/dashboard/companies` — Empresas

**Users can:**

- Browse network of companies
- Save companies to follow
- See members per company

### `/es/dashboard/company` — Mi Empresa (employer role)

**Users can:**

- Manage their company profile
- Post jobs as company
- View employee directory

### `/es/dashboard/events` — Eventos

**Users can:**

- See registered events
- Browse all events
- Filter by upcoming/past, type
- Click "Nuevo Evento" → `/es/dashboard/events/new` (organizer role)

### `/es/dashboard/events/new` — Nuevo Evento

**Users can (organizer/admin):**

- Create event: title, date, location (in-person + virtual), capacity, speakers, agenda
- Set RSVP window, ticket price
- Add cover image
- Publish or save draft

### `/es/dashboard/events/detail` (catchall via `groups`/`events` rewrite pattern)

**Users can:**

- View event details + RSVP
- Organizer: see registration list, send updates, edit event

### `/es/dashboard/events/edit/index` (catchall via `/events/edit/*`)

**Users can (organizer):**

- Edit existing event

### `/es/dashboard/forums` — Foros (dashboard view)

**Users can:**

- Browse all forums with member-only categories visible
- Track unread topics
- See own posts and reactions

### `/es/dashboard/mentorship` — Mi Mentoría

**Users can:**

- See active mentor/mentee relationships
- View upcoming sessions
- Accept/decline mentorship requests
- Toggle availability (mentor role)

### `/es/dashboard/resources` — Recursos (auth)

**Users can:**

- Browse extended resource library
- Bookmark, rate, contribute new resources

### `/es/dashboard/blog/new` — Nueva Publicación de Blog

**Users can:**

- Write blog post: title, cover image, markdown body, tags
- Save draft or publish
- Preview before publish

### `/es/dashboard/spotlights` — Mis Spotlights

**Users can (eligible members):**

- View spotlight submissions
- Click "Nuevo Spotlight" → `/es/dashboard/spotlights/new`
- Edit existing → `/es/dashboard/spotlights/edit/{id}`

### `/es/dashboard/spotlights/new` — Nuevo Spotlight

**Users can:**

- Submit a spotlight story (auto-bio, career path, advice, photo)

### `/es/dashboard/spotlights/edit/index`

**Users can:**

- Edit own spotlight (or admin can edit any)

### `/es/dashboard/journal-club` — Mi Journal Club

**Users can:**

- See registered/upcoming sessions
- Click "Nueva Sesión" → `/es/dashboard/journal-club/new` (organizer)
- Edit existing → `/es/dashboard/journal-club/edit/{id}`

### `/es/dashboard/journal-club/new` & `/edit/index`

**Users can (organizer):**

- Schedule session: paper link, presenter, date
- Edit existing sessions

### `/es/dashboard/journal-club/detail` (catchall)

**Users can:**

- View session details
- RSVP, see attendees

### `/es/dashboard/newsletter` — Mis Newsletters

**Users can (editor role):**

- See sent newsletters
- Click "Nueva Edición" → `/es/dashboard/newsletter/new`
- Edit drafts → `/es/dashboard/newsletter/edit/{id}`

### `/es/dashboard/newsletter/new` & `/edit/index`

**Users can (editor):**

- Compose newsletter (rich editor)
- Schedule send or send immediately
- Target audience (all subscribers, segments)

### `/es/dashboard/assessments` — Mis Evaluaciones

**Users can:**

- Browse 32 skill categories (Python, SQL, ML, etc.)
- Take skill assessment
- View certifications earned
- Click "Mi Historial" → `/es/dashboard/assessments/historial`

### `/es/dashboard/assessments/historial` — Historial

**Users can:**

- See past assessment scores and dates
- Retake (after cooldown)
- Share certificate

### `/es/dashboard/assessments/detail` (catchall via `/assessments/*`)

**Users can:**

- Take selected skill assessment
- View certificate or start over

### `/es/dashboard/salary-insights` — Datos Salariales

**Users can (verified members):**

- View aggregated salary stats by role, level, location
- Submit own salary data (anonymized)
- Filter by experience years, company size

---

## 🛡 Admin/Moderator — Dashboard Admin

All `/es/dashboard/admin/*` routes require `role` ∈ `['admin', 'moderator']` via `DashboardLayout requireRole={['admin', 'moderator']}`.

### `/es/dashboard/admin` — Admin Home

**Users can:**

- See platform-wide stats: total users, pending approvals, recent signups
- Quick actions: approve members, moderate content, view reports

### `/es/dashboard/admin/members` — Gestión de Miembros

**Users can:**

- Search/filter all users (status: pending/active/suspended/deactivated)
- See member detail rows: name, email, status, joined date, last login
- Click "Aprobar" → flips status to active (triggers approved email)
- Click "Suspender" / "Reactivar" / "Eliminar"
- Bulk actions
- Click "Editar" → `/es/dashboard/admin/members/{uid}/edit` (rewrite → `members/edit/index.html`)

### `/es/dashboard/admin/members/edit` (catchall via `/members/*/edit`)

**Users can:**

- Edit any member's profile (uses ProfileEdit with `isAdmin={true}` flag)
- Override fields like role, verified status, university

### `/es/dashboard/admin/companies` — Gestión de Empresas

**Users can:**

- CRUD on company profiles (used by admin to curate the directory)
- Verify company accounts
- Fetch company logo via `/api/companies/fetch-logo`

### `/es/dashboard/admin/groups` — Grupos de Permisos

**Users can:**

- List permission groups (RBAC)
- Click "Nuevo Grupo" → `/es/dashboard/admin/groups/new`
- Click group → `/es/dashboard/admin/groups/{id}` detail (rewrite → `groups/detail/index.html`)
- Click "Editar" → `/es/dashboard/admin/groups/edit/{id}`

### `/es/dashboard/admin/groups/new` & `/groups/edit/index`

**Users can:**

- Create/edit permission groups
- Assign permissions: resource × operation matrix (e.g., `members:read`, `jobs:write`)
- Assign group to users

### `/es/dashboard/admin/groups/detail` (catchall)

**Users can:**

- View group permissions and assigned members
- Add/remove members from group

### `/es/dashboard/admin/notifications` — Notificaciones del Sistema

**Users can:**

- Send broadcast notifications to all users or segments
- Schedule notifications
- View notification delivery logs

### `/es/dashboard/admin/reports` — Reportes

**Users can:**

- View reported content (posts, profiles, jobs)
- Take action: dismiss, warn, suspend, delete
- See reporter info + report reason

### `/es/dashboard/admin/salary` — Admin Salary Data

**Users can:**

- View all salary submissions (with raw values, vs. members who see aggregated)
- Audit suspicious entries
- Approve/reject submissions

---

## 🛡 Admin — Legacy Admin Panel (`/admin/*`)

Separate admin UI from `/es/dashboard/admin/*`, uses `AdminLayout` and `AdminAuthGuard requiredRole="moderator"`. All 7 pages are functional (prerender flag removed in `a55ced5`). Consolidation with `/dashboard/admin/*` is a future product decision (see closed #36).

### `/admin/` — Panel principal

**Users can:**

- See `AdminDashboard` overview
- Auto-refreshes data every 5 minutes
- Tracks `admin_dashboard_accessed` analytics event

### `/admin/users` — Gestión de Usuarios

**Users can:**

- `UserManagement` component
- Filters saved to localStorage

### `/admin/merge-profiles` — Merge Profiles

**Users can:**

- Merge duplicate user profiles
- Two-write pattern (pending → approved) with audit log

### `/admin/directory` — Directory

**Users can:**

- `DirectoryManagement` for the public-facing directory
- Curate which members appear and in what order

### `/admin/analytics` — Analytics

**Users can:**

- Platform analytics dashboards (signups, engagement, content)

### `/admin/moderation` — Content Moderation

**Users can:**

- `ContentModeration` for reported items across forums, jobs, profiles

### `/admin/settings` — Settings

**Users can:**

- Platform-wide settings (feature flags, email templates, etc.)

---

## Special pages

### `/404` (also reached via any unknown route)

**Users can:**

- See "Página no encontrada"
- Click "Volver al inicio"

### `/index.astro` (root, no locale prefix)

**Users can:**

- Auto-detect browser language and redirect to `/es/` or `/en/`
- Fallback to `/es/`

### `/es/pricing` — Pricing

**Users can:**

- View pricing tiers
- **Note:** Currently auto-redirects to `/es/dashboard` (the platform launched free per #39 launch-scope decision; pricing page is a placeholder until paid plans are introduced)

### `/api-docs` (in src root, not under locale)

**Users can:**

- View API documentation page
- **Note:** Returns 404 in production — the page lives in src but doesn't appear to be exposed under the current hosting config

---

## Cross-page features

### User menu (top-right when authenticated)

- Mi Perfil → `/es/dashboard/profile`
- Mi Dashboard → `/es/dashboard`
- Notificaciones (with badge count)
- Mensajes (with badge count)
- Configuración → `/es/dashboard/settings`
- Cerrar Sesión

### Comunidad dropdown (top nav)

Links to: Miembros, Empresas, Eventos, Foro, Blog, Spotlights, Recursos, Newsletter, Mentoría, Journal Club

### Mobile bottom nav (authenticated, mobile only)

- Inicio (dashboard home)
- Buscar (global search)
- Mensajes
- Notificaciones
- Perfil

### Floating "Reportar un problema"

- Opens feedback modal on any page
- Submits to feedback collection

### Global search (Cmd/Ctrl + K)

- Search across members, jobs, events, posts, resources

---

## Live verification (2026-05-27)

| Route group     | Pages tested live                                                                   | Status                                                               |
| --------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Home            | `/es/`                                                                              | ✅                                                                   |
| Public listings | `/es/jobs`, `/es/members`, `/es/events`, `/es/about-us`                             | ✅ all 200                                                           |
| Static info     | `/es/help`, `/es/faq`, `/es/privacy`, `/es/terms`, `/es/cookies`, `/es/contact`     | ✅ all 200                                                           |
| Content         | `/es/blog`, `/es/newsletter`, `/es/spotlights`, `/es/resources`, `/es/journal-club` | ✅ all 200                                                           |
| Community       | `/es/forum`, `/es/mentorship`, `/es/commissions`, `/es/calendar`, `/es/companies`   | ✅ all 200                                                           |
| Auth            | `/es/login`, `/es/signup`, `/es/join`, `/registro`, `/es/verify-alternate-email`    | ✅ all 200                                                           |
| Special         | `/es/pricing` (redirects to dashboard), `/es/api-docs` (404), `/404`                | ✅ documented                                                        |
| Dashboard       | (33 routes under `/es/dashboard/*`)                                                 | 📋 documented from code; not interactively tested (no admin session) |
| Admin legacy    | (7 routes under `/admin/*`)                                                         | 📋 documented from code; not interactively tested                    |

All 33 public Spanish routes confirmed reachable with 200 status. English (`/en/*`) symmetric. Dashboard and admin routes require authenticated session to interactively verify — capability descriptions sourced from component code and route configuration.
