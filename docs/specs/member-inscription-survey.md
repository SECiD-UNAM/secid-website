# Spec — Member Inscription Survey

**Status:** Draft proposal
**Date:** 2026-05-27
**Owner:** TBD

---

## 1. Current state — what `/es/members` shows today

Live on `beta.secid.mx/es/members`:

```
Hero: "Directorio de Miembros"
Section: "Miembros"
  └── "¿Dónde trabajan los miembros de SECiD?"
      • Stat row: 23 Empresas · 9 Industrias · 26 Conexiones · UNAM Ciencia de Datos
      • Toggle: Actuales / Historial completo
      • Industry-grouped company logos:
          - Consultoría (6): NielsenIQ, Oliver Wyman, Cognodata, J.D. Power, XalDigital, Algorithia
          - Tecnología (6): Arkham, Uber, Microsoft, AWS, Grandata, Oracle
          - Finanzas (4): BBVA, J.P. Morgan, Banco Azteca, Banorte
          - Academia (2), Consumo (1), Fitness (1), Fintech (1), Healthcare (1), Retail (1)
Footer CTA: "¿Aún no eres miembro?"
```

### Where this data comes from

`src/components/directory/MemberShowcase.tsx` → `EcosystemMap` (`src/components/shared/EcosystemMap.tsx`)

- Source: `getCompanies()` from `src/lib/companies.ts`
- Aggregates: company `industry` field + `memberCount` (denormalized count)
- **This is not survey data** — it's the existing company collection, filtered to approved companies and grouped by industry

### What the codebase already supports for member data

Already captured during signup (`SignUpForm.tsx`, 4 steps: account → type → unam → done):

| Field                                           | Captured? | Source                   |
| ----------------------------------------------- | --------- | ------------------------ |
| Name, email, password                           | ✅        | Step 1 (account)         |
| numeroCuenta (UNAM student #)                   | ✅        | Step 3 (unam)            |
| generation (cohort year)                        | ✅        | Step 3 (unam)            |
| academicLevel (licenciatura/maestría/doctorado) | ✅        | Step 3 (unam)            |
| campus, program, graduationYear                 | ✅        | Step 3 (unam)            |
| currentPosition, currentCompany                 | ✅        | Profile edit, not signup |
| skills (free-text array)                        | ✅        | Profile edit             |
| bio, linkedinUrl, githubUrl                     | ✅        | Profile edit             |

**Gap:** No structured demographic/career survey. No industry, seniority, work mode, areas-of-interest, mentorship-availability, looking-for-opportunities, hard-skills-mastery, soft-skills, etc.

`MemberStatistics` interface (`src/types/member.ts`) has placeholder fields `generationDistribution` and `skillsDistribution` — but no UI consumes them yet.

### Original (legacy) SECiD site — inferred survey scope

Based on the existing data model + standard alumni-network surveys + project_universal_listing memory, the legacy site likely captured:

1. **Industry** — where they currently work (Tech / Finance / Academia / Consulting / Healthcare / Gov / etc.)
2. **Seniority** — Junior / Mid / Senior / Lead / Manager / Director / C-level / Student
3. **Job function** — DS / ML Engineer / Data Engineer / Analyst / Researcher / PM / Founder / Other
4. **Work mode** — Remote / Hybrid / On-site
5. **Geographic location** — Country, city
6. **Areas of interest** — ML / DL / NLP / CV / RL / Statistics / Data Eng / BI / MLOps / GenAI / etc.
7. **Tech stack / tools** — Python / R / SQL / Spark / TensorFlow / PyTorch / cloud (AWS/GCP/Azure) / etc.
8. **Education level** — degree currently held (B / M / PhD / Postdoc)
9. **Mentorship willingness** — Want a mentor / Want to mentor / Both / Neither
10. **Open to opportunities** — Actively looking / Open / Not looking
11. **Why they joined SECiD** — Networking / Job opportunities / Stay updated / Learning / Mentorship / Other
12. **How they heard about SECiD** — UNAM / Friend / Event / Social / Other
13. **Salary** (optional, anonymized) — already in `/es/dashboard/salary-insights`

The "Empresas / Industrias / Conexiones" stat row on the current /es/members reflects what they likely had before, but only the company side. Pre-survey aggregates (pies of industry, generation histogram, areas-of-interest word cloud) are missing.

---

## 2. Proposal — Survey system architecture

### 2.1 Data model

New Firestore collection: `member_surveys` (separate from `users` to allow versioning, partial updates, and privacy-controlled aggregation queries).

```typescript
// src/types/survey.ts
export interface MemberSurveyResponse {
  uid: string; // doc id = uid (1:1 with user)
  version: number; // increments on each edit
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt?: Timestamp; // null if started but not finished
  visibility: 'public' | 'members' | 'private' | 'aggregate-only';

  // === Demographic ===
  generation?: string; // "2018", "2020-A", etc. (mirror of UserProfile.generation)
  academicLevel?: AcademicLevel; // mirror

  // === Career ===
  industry?: IndustryCategory; // single
  jobFunction?: JobFunction; // single
  seniority?: SeniorityLevel; // single
  workMode?: 'remote' | 'hybrid' | 'on-site';
  yearsOfExperience?: number; // 0-50
  countryCode?: string; // ISO 3166-1 alpha-2 ('MX', 'US', ...)
  city?: string;

  // === Interests & skills (multi-select arrays) ===
  areasOfInterest?: AreaOfInterest[]; // ['ml', 'nlp', 'cv']
  techStack?: TechTool[]; // ['python', 'sql', 'spark']
  toolProficiency?: Record<TechTool, 1 | 2 | 3 | 4 | 5>; // optional self-rated

  // === Community engagement ===
  mentorshipRole?: 'want-mentor' | 'want-mentee' | 'both' | 'neither';
  openToOpportunities?: 'actively-looking' | 'open' | 'not-looking';
  reasonsForJoining?: ReasonForJoining[]; // multi
  heardAboutUsFrom?:
    | 'unam'
    | 'friend'
    | 'event'
    | 'social'
    | 'search'
    | 'other';

  // === Optional, sensitive ===
  salaryRange?: SalaryBucket; // already collected separately, can mirror
  remoteAvailability?: boolean;
  freelanceAvailability?: boolean;

  // === Custom + Other ===
  customAnswers?: Record<string, string | string[] | number>; // for ad-hoc questions
}

export type IndustryCategory =
  | 'tech'
  | 'finance'
  | 'consulting'
  | 'academia'
  | 'healthcare'
  | 'retail'
  | 'consumer'
  | 'energy'
  | 'government'
  | 'manufacturing'
  | 'media'
  | 'fintech'
  | 'biotech'
  | 'logistics'
  | 'gaming'
  | 'other';

export type JobFunction =
  | 'data-scientist'
  | 'ml-engineer'
  | 'data-engineer'
  | 'data-analyst'
  | 'research'
  | 'product-manager'
  | 'engineering-manager'
  | 'founder'
  | 'consultant'
  | 'student'
  | 'other';

export type SeniorityLevel =
  | 'student'
  | 'junior'
  | 'mid'
  | 'senior'
  | 'lead'
  | 'manager'
  | 'director'
  | 'vp'
  | 'c-level';

export type AreaOfInterest =
  | 'ml'
  | 'dl'
  | 'nlp'
  | 'cv'
  | 'rl'
  | 'gen-ai'
  | 'mlops'
  | 'data-eng'
  | 'analytics'
  | 'bi'
  | 'statistics'
  | 'research'
  | 'ethics'
  | 'product'
  | 'leadership';

export type TechTool =
  | 'python'
  | 'r'
  | 'sql'
  | 'scala'
  | 'java'
  | 'rust'
  | 'go'
  | 'spark'
  | 'kafka'
  | 'airflow'
  | 'dbt'
  | 'snowflake'
  | 'bigquery'
  | 'tensorflow'
  | 'pytorch'
  | 'sklearn'
  | 'transformers'
  | 'langchain'
  | 'aws'
  | 'gcp'
  | 'azure'
  | 'docker'
  | 'kubernetes'
  | 'terraform'
  | 'tableau'
  | 'power-bi'
  | 'looker';

export type ReasonForJoining =
  | 'networking'
  | 'job-opportunities'
  | 'stay-updated'
  | 'learning'
  | 'mentorship'
  | 'speaking'
  | 'recruiting'
  | 'community-building';

export type SalaryBucket =
  | '<10k'
  | '10-20k'
  | '20-35k'
  | '35-50k'
  | '50-75k'
  | '75-100k'
  | '100k+';
```

### 2.2 Firestore rules

```js
match /member_surveys/{uid} {
  // Owner can read + write their own survey
  allow read, write: if request.auth != null && request.auth.uid == uid;

  // Authenticated members can read public + members-visible surveys
  allow read: if request.auth != null
    && resource.data.get(['visibility'], 'private') in ['public', 'members'];

  // Anonymous can read 'public' visibility surveys only
  allow read: if request.auth == null
    && resource.data.get(['visibility'], 'private') == 'public';

  // Admins can read all
  allow read: if request.auth != null
    && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'moderator'];

  // For aggregation queries, expose pre-computed aggregates as a separate doc
  // at /survey_aggregates/global so we never expose individual answers
  // even on aggregate queries.
}

match /survey_aggregates/{period} {
  // Public read; only Cloud Function writes
  allow read: if true;
  allow write: if false;
}
```

### 2.3 Aggregation strategy

To support the public `/es/members` charts **without** exposing individual responses, aggregate counts into `/survey_aggregates/global` and `/survey_aggregates/{YYYY-MM}` docs via a scheduled Cloud Function:

```typescript
// functions/src/aggregate-survey.ts
export const aggregateSurveyResponses = onSchedule(
  'every 6 hours',
  async () => {
    const surveys = await admin
      .firestore()
      .collection('member_surveys')
      .where('completedAt', '!=', null)
      .get();

    const aggregates = {
      totalRespondents: surveys.size,
      byIndustry: countBy(surveys, 'industry'),
      bySeniority: countBy(surveys, 'seniority'),
      byJobFunction: countBy(surveys, 'jobFunction'),
      byWorkMode: countBy(surveys, 'workMode'),
      byGeneration: countBy(surveys, 'generation'),
      byCountry: countBy(surveys, 'countryCode'),
      byAreaOfInterest: countMultiBy(surveys, 'areasOfInterest'), // multi-select
      byTechStack: countMultiBy(surveys, 'techStack'),
      byMentorship: countBy(surveys, 'mentorshipRole'),
      byReasonsForJoining: countMultiBy(surveys, 'reasonsForJoining'),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await admin.firestore().doc('survey_aggregates/global').set(aggregates);
  }
);
```

Privacy note: only aggregates with `count >= 5` are emitted to prevent re-identification (k-anonymity threshold). Buckets below 5 collapse into "Other".

### 2.4 UI surface

Three places members interact with the survey:

#### A. Signup wizard — add a new "survey" step

`src/components/auth/SignUpForm.tsx` already has steps. Add an optional step after `unam`:

```typescript
type Step = 'account' | 'type' | 'unam' | 'survey' | 'done';
```

- Title: "Cuéntanos un poco más" / "Tell us a bit about yourself"
- Subtitle: "Estas respuestas son opcionales pero nos ayudan a mejorar la comunidad"
- 8-10 questions, single-column flow, **all optional** with a clear "Saltar este paso" button
- On submit: write to `member_surveys/{uid}` with `completedAt: serverTimestamp()`
- On skip: still create the doc with empty fields (so we know they saw it; sets `completedAt: null`)

#### B. Profile editor — add "Encuesta" tab

`src/components/profile/ProfileEdit.tsx` currently has tabs (basic info / experience / portfolio / privacy). Add a new tab:

- **"Encuesta de miembros"** / **"Member survey"**
- Same form as signup step
- Banner at top: "Última actualización: X" + "Version N" so members see their answer history
- Button: "Guardar cambios" → increments `version`, updates `updatedAt`
- Button: "Restablecer respuestas" → wipes their answers (sets to null, but keeps doc)

#### C. Public `/es/members` page — surface aggregates

Replace `<MemberShowcase>` (companies-only) with a tabbed view `<MemberInsights>`:

- **Tab 1: "Empresas"** — current `EcosystemMap` (unchanged)
- **Tab 2: "Industrias"** — donut from `byIndustry` aggregates
- **Tab 3: "Generaciones"** — horizontal bar chart from `byGeneration`
- **Tab 4: "Tech stack"** — word cloud or horizontal bar from `byTechStack` (top 20)
- **Tab 5: "Áreas de interés"** — horizontal bar from `byAreaOfInterest`
- **Tab 6: "Mentoría"** — donut from `byMentorship` with CTA "Buscar mentor" / "Ser mentor"

Each tab has:

- Total respondent count (e.g. "Basado en 142 respuestas")
- Privacy note: "Solo mostramos agregados de 5+ respuestas"
- Last updated timestamp

Data source: a single fetch to `/survey_aggregates/global` (one read).

Charts: reuse `recharts` (already in dependencies — `package.json` line 91).

#### D. Admin dashboard

New page `/es/dashboard/admin/survey`:

- Survey response rate (X of Y members completed)
- Full chart suite (same as public but uncensored — admins see all buckets)
- "Export to CSV" button
- "Edit survey questions" — config-driven so questions can change without code deploys

### 2.5 i18n

All question labels live in `src/i18n/translations.ts` under a new `survey.*` namespace. Both `es` and `en` complete from day one.

### 2.6 Versioning + question evolution

Questions evolve. Strategy:

- Survey definition lives in `survey_config/current` Firestore doc (admin-editable)
- Each question has: `id`, `label.{es,en}`, `type` (select/multi/text/number/scale), `options[]`, `required`, `category`
- Responses store the question `id` + version of the survey definition they answered against
- New question added → existing members get a banner on `/es/dashboard` prompting "We have new survey questions — answer them" (link to profile editor)
- Removed question → old responses stay but no longer aggregate; admin export still has them

### 2.7 Implementation order (incremental, deployable per step)

1. **Spec + types** — write `src/types/survey.ts` and Firestore rules in this PR
2. **MVP read-only aggregates** — pre-populate `survey_aggregates/global` with hand-curated data from existing `users` collection (industry from companyId join, generation from existing field). Surface as Tab 2-3 on `/es/members`. _No survey form yet, just aggregation of existing data._
3. **Survey form (edit-only)** — add the Encuesta tab in profile editor. Existing members can fill it in. Survey aggregation Cloud Function now runs.
4. **Signup integration** — add the survey step to signup wizard, marked optional.
5. **More aggregates** — areas of interest, tech stack, mentorship.
6. **Admin survey-editor** — turn questions into config.
7. **Community-driven prompt** — nudge members with incomplete surveys at session boundaries (post-login).

Each step is a separate PR. Step 2 alone is shippable without any new user-facing collection.

---

## 3. Open questions to resolve before implementation

1. **Privacy default** — should survey default to `'members'` visibility (logged-in see aggregates) or `'aggregate-only'` (no one sees individual answers, only counts)? Recommend `'aggregate-only'` for sensitive fields (salary, mentorship) and `'members'` for non-sensitive (industry, tech stack).
2. **Anonymous member directory access** — currently public; should industry/generation aggregates also be public (current proposal: yes, with k=5 threshold), or members-only?
3. **Question count** — proposal has ~15 questions. Should we trim for signup completion rate? Recommend 5 essential at signup, rest in profile editor "complete your profile" prompts.
4. **Conflict with existing salary system** — `/es/dashboard/salary-insights` already exists with its own dataset. Either reuse that data (skip salary in survey) or migrate it into the survey (more unified).
5. **Pre-fill from existing data** — generation, academicLevel, currentPosition, currentCompany already in user profile. Pre-populate corresponding survey fields on first open so users only answer net-new questions.
6. **Bilingual handling** — for free-text or "Other" responses, store the user's text and the language they wrote it in; don't auto-translate.
7. **Required vs optional at signup** — all optional (proposed) maximizes signup completion; requiring even 1-2 questions risks bounce. Decision: all optional.

---

## 4. Suggested file structure

```
src/
  types/
    survey.ts                          # NEW — types from §2.1
  lib/
    survey/
      mutations.ts                     # NEW — saveSurvey(), upsertSurvey()
      queries.ts                       # NEW — getSurvey(uid), getAggregates()
      validation.ts                    # NEW — zod schemas per question
      defaults.ts                      # NEW — question catalog with i18n labels
  components/
    survey/
      SurveyForm.tsx                   # NEW — main form, used in both signup + edit
      SurveyQuestion.tsx               # NEW — renders one question by type
      SurveyProgress.tsx               # NEW — completion indicator
    directory/
      MemberInsights.tsx               # NEW — tabbed aggregate views (replaces MemberShowcase wrapper)
      charts/
        IndustryDonut.tsx              # NEW
        GenerationHistogram.tsx        # NEW
        TechStackBars.tsx              # NEW
        AreasOfInterestBars.tsx        # NEW
        MentorshipDonut.tsx            # NEW
    auth/
      SignUpSurveyStep.tsx             # NEW — wizard step
    profile/
      tabs/
        SurveyTab.tsx                  # NEW — profile editor tab
  i18n/
    translations/
      survey.es.ts                     # NEW
      survey.en.ts                     # NEW

functions/
  src/
    aggregate-survey.ts                # NEW — scheduled aggregation
    survey-callable.ts                 # NEW — onCall fn for atomic writes if needed

firestore.rules                        # MODIFIED — §2.2 blocks added

docs/specs/
  member-inscription-survey.md         # THIS DOC
```

---

## 5. Effort estimate

| Phase                                   | Effort        | Ships independently |
| --------------------------------------- | ------------- | ------------------- |
| 1. Spec + types + rules                 | 0.5 day       | ✅                  |
| 2. MVP aggregates from existing data    | 1 day         | ✅                  |
| 3. Survey form (edit-only, profile tab) | 1.5 days      | ✅                  |
| 4. Signup integration                   | 0.5 day       | ✅                  |
| 5. Additional aggregates + charts       | 1 day         | ✅                  |
| 6. Admin survey-editor                  | 1.5 days      | ✅                  |
| 7. Community nudges                     | 0.5 day       | ✅                  |
| **Total**                               | **~6.5 days** |                     |

Recommended kick-off: ship phases 1+2 in week 1 (visible value immediately on `/es/members` without any data-collection commitment). Phase 3+4 in week 2 (functional survey). Phases 5-7 iteratively after launch based on response rate.
