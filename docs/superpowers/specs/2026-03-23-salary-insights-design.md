# Salary Insights — Design Spec

## Problem

SECiD members have no way to benchmark their compensation against peers. Salary information is scattered and private. Members want to understand market rates by experience level, industry, and location — but individual salary data is sensitive and must never be exposed.

## Design Decisions

| Decision            | Choice                                                          | Rationale                                                                 |
| ------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Minimum group size  | 3 data points                                                   | Balances visibility with privacy for a small community (~29 members)      |
| Data input location | Work history entries in Profile Editor + annual survey reminder | Ties salary to specific jobs for better breakdowns                        |
| Analytics location  | Dedicated `/dashboard/salary-insights` page                     | Sensitive data deserves its own page, not mixed into company/member views |
| Tax calculation     | Client-side using ISR/federal tables                            | Estimate only, not tax-filing accurate; recalculates when tables update   |
| Storage             | Inside `WorkExperience` in user doc                             | No new collection; uses existing read/write patterns and Firestore rules  |
| Aggregation         | Client-side from `getMemberProfiles()`                          | Sufficient at current scale; no server-side pipeline needed               |

## Data Collection

### Compensation Fields on Work History Entries

Added to each work history entry in the CareerTab of the Profile Editor:

| Field                  | Type               | Required                   | Notes                                                         |
| ---------------------- | ------------------ | -------------------------- | ------------------------------------------------------------- |
| Monthly Gross          | Number             | Optional                   | Primary input                                                 |
| Currency               | MXN / USD          | Default by location        |                                                               |
| Country                | MX / US / OTHER    | Required if salary entered |                                                               |
| Fiscal Regime          | Dropdown           | Required if salary entered | Mexico: Asalariado, Honorarios, RESICO. USA: W-2, 1099        |
| Annual Bonus           | Number             | Optional                   |                                                               |
| Bonus Type             | Fixed / Percentage | Optional                   | If percentage, calculated from annual gross                   |
| Sign-on Bonus          | Number             | Optional                   | One-time amount                                               |
| Stock/RSU Annual Value | Number             | Optional                   | Annual vesting value                                          |
| Benefits               | Multi-select tags  | Optional                   | Health insurance, SGMM, food vouchers, remote work, gym, etc. |

### Auto-Calculated Fields (Client-Side Only, Never Stored)

- **Monthly Net**: From monthly gross using ISR tables (Mexico) or federal+state brackets (USA)
- **Annual Gross**: Monthly gross × 12
- **Annual Net**: Monthly net × 12
- **Total Compensation**: Annual gross + bonus (resolved) + sign-on (amortized over 1 year) + stock value

### Mexico ISR Calculation

Uses the monthly ISR withholding tables published by SAT (2025). Each bracket has:

- Lower limit (`limiteInferior`)
- Fixed fee (`cuotaFija`)
- Marginal rate (`porcentaje`)

Formula: `ISR = cuotaFija + (monthlyGross - limiteInferior) × porcentaje`
Monthly net = monthlyGross - ISR

Also accounts for employment subsidy (`subsidio al empleo`) for lower brackets.

### USA Federal Tax Calculation

Uses 2025 federal income tax brackets for single filer (simplified). Monthly estimate = annual tax / 12. Does not account for state tax (would require state selection — deferred).

### Privacy Rules

- Compensation fields are **never** shown on public profiles, member cards, or any member-facing view
- Compensation data is **excluded** from `getVisibleFields()` return
- Only used for anonymized aggregates on the Salary Insights page
- Analytics enforce minimum 3 data points per group — groups with fewer are hidden

### Annual Reminder

- Once per year, a dismissible banner appears on the dashboard: "Help your community! Update your salary info for better insights."
- Links to the CareerTab salary section
- Tracks `lastSalaryPromptAt` on user doc; shows banner if > 365 days or null
- Dismissed with a "Remind me later" button (sets `lastSalaryPromptAt` to now)

## Data Model

### Added to `WorkExperience` Interface

```typescript
// In src/types/member.ts, added to WorkExperience
compensation?: {
  monthlyGross?: number;
  currency: 'MXN' | 'USD';
  country: 'MX' | 'US' | 'OTHER';
  fiscalRegime?: 'asalariado' | 'honorarios' | 'resico' | 'w2' | '1099';
  annualBonus?: number;
  annualBonusType?: 'fixed' | 'percentage';
  signOnBonus?: number;
  stockAnnualValue?: number;
  benefits?: string[];
}
```

No new Firestore collections. Data stored inside existing user docs within `experience.previousRoles[].compensation`.

Firestore rules: No changes needed — salary data is inside user doc (owner-write already allowed).

## Analytics Dashboard

### Route

- Spanish: `/es/dashboard/salary-insights`
- English: `/en/dashboard/salary-insights`
- Requires verified member auth

### Data Pipeline

1. `getMemberProfiles({ limit: 500 })` — fetch all members
2. Extract `compensation` from all `previousRoles` entries
3. Filter to entries with `monthlyGross` set
4. Group by various dimensions (experience, industry, country)
5. Calculate aggregates: median, 10th/90th percentile, count
6. Enforce minimum 3 per group — hide groups below threshold

### Charts

#### 1. Salary Overview Cards

Four big-number cards at top:

- Median Monthly Gross (across all data)
- Median Total Compensation (annual)
- Number of salary data points
- Number of members contributing

#### 2. By Experience Level

Horizontal bar chart: Junior, Mid, Senior, Lead, Executive.
Shows median monthly gross with 10th–90th percentile range whiskers.
Experience level from `member.experience.level`.

#### 3. By Industry

Horizontal bars showing median monthly gross per industry.
Industry from the company linked to the work entry (via `companyId` lookup) or from `member.experience.industries`.
Only industries with 3+ data points shown.

#### 4. Benefits Frequency

Horizontal percentage bars showing how common each benefit is.
Example: "SGMM — 65%", "Remote Work — 50%", "Food Vouchers — 40%".

#### 5. Compensation Breakdown

Donut chart showing average split across all members:

- Base Salary: X%
- Bonus: Y%
- Stock/RSU: Z%
- Sign-on (amortized): W%

#### 6. Mexico vs USA (if enough data)

Side-by-side comparison cards showing median gross and net for each country.
Only shown if both countries have 3+ data points.

### Chart Library

Uses `recharts` (already installed): `BarChart`, `Bar`, `ResponsiveContainer`, `PieChart`, `Pie`, `Cell`, `Tooltip`.

### Privacy Enforcement in Analytics

```typescript
function safeAggregate(values: number[], minCount = 3) {
  if (values.length < minCount) return null; // Don't show
  values.sort((a, b) => a - b);
  return {
    median: values[Math.floor(values.length / 2)],
    p10: values[Math.floor(values.length * 0.1)],
    p90: values[Math.floor(values.length * 0.9)],
    count: values.length,
  };
}
```

Groups returning `null` are not rendered.

## Component Architecture

### New Files

| File                                                   | Purpose                                                  |
| ------------------------------------------------------ | -------------------------------------------------------- |
| `src/lib/tax/mexico-isr.ts`                            | Mexico ISR 2025 monthly tables + net salary calculator   |
| `src/lib/tax/usa-federal.ts`                           | USA 2025 federal tax brackets + estimate calculator      |
| `src/lib/tax/index.ts`                                 | `calculateNetSalary(gross, country, regime)` unified API |
| `src/components/profile/shared/CompensationFields.tsx` | Salary input fields + auto-calc display for CareerTab    |
| `src/components/salary/SalaryInsights.tsx`             | Main analytics dashboard with all charts                 |
| `src/components/salary/SalaryOverview.tsx`             | Big number cards                                         |
| `src/components/salary/SalaryByExperience.tsx`         | Bar chart by experience level                            |
| `src/components/salary/SalaryByIndustry.tsx`           | Horizontal bars by industry                              |
| `src/components/salary/BenefitsHeatmap.tsx`            | Benefit frequency bars                                   |
| `src/components/salary/CompensationBreakdown.tsx`      | Donut chart of comp split                                |
| `src/components/wrappers/SalaryInsightsPage.tsx`       | AuthProvider wrapper                                     |
| `src/pages/es/dashboard/salary-insights/index.astro`   | Spanish page                                             |
| `src/pages/en/dashboard/salary-insights/index.astro`   | English page                                             |

### Modified Files

| File                                            | Change                                               |
| ----------------------------------------------- | ---------------------------------------------------- |
| `src/types/member.ts`                           | Add `compensation` to `WorkExperience` interface     |
| `src/components/profile/tabs/CareerTab.tsx`     | Add `CompensationFields` inside each work entry form |
| `src/components/dashboard/DashboardSidebar.tsx` | Add "Salary Insights" link (requireVerified)         |
| `src/components/nav/DashboardBottomNav.tsx`     | Add to "More" sheet items                            |

## Benefits Tag Options

Predefined multi-select options (members can also type custom):

**Mexico common:**

- SGMM (Seguro de Gastos Médicos Mayores)
- Vales de despensa / Food vouchers
- Fondo de ahorro / Savings fund
- Aguinaldo superior al mínimo
- PTU
- Seguro de vida / Life insurance
- Home office / Remote work
- Horario flexible / Flexible hours
- Gimnasio / Gym
- Capacitación / Training budget
- Días de vacaciones superiores / Extra vacation days

**USA common:**

- Health insurance (employer-paid)
- 401(k) match
- Dental/Vision
- PTO / Unlimited PTO
- Remote work
- Stock options / RSU
- Signing bonus
- Relocation assistance
- Education reimbursement

## Verification

1. Add salary to a work history entry → auto-calc shows net, annual
2. Navigate to `/es/dashboard/salary-insights` → see charts
3. With < 3 data points in a group → that group is hidden
4. Change language to English → all labels translated
5. Check public profile → no salary data visible
6. Annual banner shows if `lastSalaryPromptAt` is null or > 365 days old
7. Dismiss banner → doesn't show again for a year
