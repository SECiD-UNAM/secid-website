# Salary Insights Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add anonymous salary analytics — members input compensation on work history entries, the system auto-calculates net salary using ISR/federal tax tables, and a dedicated dashboard shows aggregated statistics (medians, percentiles, benefits frequency) with a minimum 3 data points per group for privacy.

**Architecture:** Compensation data stored inside existing `WorkExperience` entries in user docs (no new Firestore collection). Tax calculators are pure functions. Analytics aggregated client-side from `getMemberProfiles()`. Charts use recharts.

**Tech Stack:** React 18, TypeScript, recharts, Tailwind CSS, Mexico ISR 2025 tables, USA federal 2025 brackets

---

## File Structure

### New files

| File                                                   | Responsibility                                  |
| ------------------------------------------------------ | ----------------------------------------------- |
| `src/lib/tax/mexico-isr.ts`                            | Mexico ISR 2025 monthly tables + net calculator |
| `src/lib/tax/usa-federal.ts`                           | USA 2025 federal brackets + net calculator      |
| `src/lib/tax/index.ts`                                 | Unified `calculateNetSalary()` API              |
| `src/components/profile/shared/CompensationFields.tsx` | Salary input fields + auto-calc display         |
| `src/components/salary/SalaryInsights.tsx`             | Main analytics dashboard orchestrator           |
| `src/components/salary/SalaryOverview.tsx`             | Big number cards (median, range, count)         |
| `src/components/salary/SalaryByExperience.tsx`         | Bar chart by experience level                   |
| `src/components/salary/SalaryByIndustry.tsx`           | Horizontal bars by industry                     |
| `src/components/salary/BenefitsHeatmap.tsx`            | Benefit frequency percentage bars               |
| `src/components/salary/CompensationBreakdown.tsx`      | Donut chart of comp split                       |
| `src/components/wrappers/SalaryInsightsPage.tsx`       | AuthProvider wrapper                            |
| `src/pages/es/dashboard/salary-insights/index.astro`   | Spanish page                                    |
| `src/pages/en/dashboard/salary-insights/index.astro`   | English page                                    |

### Modified files

| File                                            | Change                                            |
| ----------------------------------------------- | ------------------------------------------------- |
| `src/types/member.ts`                           | Add `compensation` to `WorkExperience`            |
| `src/components/profile/tabs/CareerTab.tsx`     | Add CompensationFields after each work entry form |
| `src/components/dashboard/DashboardSidebar.tsx` | Add "Salary Insights" link                        |
| `src/components/nav/DashboardBottomNav.tsx`     | Add to "More" sheet items                         |

---

## Task 1: Type definitions + tax calculators

**Files:**

- Modify: `src/types/member.ts`
- Create: `src/lib/tax/mexico-isr.ts`
- Create: `src/lib/tax/usa-federal.ts`
- Create: `src/lib/tax/index.ts`

- [ ] **Step 1: Add compensation to WorkExperience**

In `src/types/member.ts`, add after the `current: boolean` field in `WorkExperience`:

```typescript
export interface Compensation {
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

export interface WorkExperience {
  // ... existing fields ...
  compensation?: Compensation;
}
```

- [ ] **Step 2: Create Mexico ISR calculator**

Create `src/lib/tax/mexico-isr.ts` with the 2025 monthly ISR tables from SAT:

```typescript
/**
 * Mexico ISR (Impuesto Sobre la Renta) monthly withholding calculator.
 * Based on SAT 2025 monthly tables.
 */

interface ISRBracket {
  limiteInferior: number;
  limiteSuperior: number;
  cuotaFija: number;
  porcentaje: number; // as decimal (0.0192 = 1.92%)
}

// 2025 Monthly ISR table (Tarifa del artículo 96 LISR)
const ISR_MONTHLY_2025: ISRBracket[] = [
  {
    limiteInferior: 0.01,
    limiteSuperior: 746.04,
    cuotaFija: 0,
    porcentaje: 0.0192,
  },
  {
    limiteInferior: 746.05,
    limiteSuperior: 6332.05,
    cuotaFija: 14.32,
    porcentaje: 0.064,
  },
  {
    limiteInferior: 6332.06,
    limiteSuperior: 11128.01,
    cuotaFija: 371.83,
    porcentaje: 0.1088,
  },
  {
    limiteInferior: 11128.02,
    limiteSuperior: 12935.82,
    cuotaFija: 893.63,
    porcentaje: 0.16,
  },
  {
    limiteInferior: 12935.83,
    limiteSuperior: 15487.71,
    cuotaFija: 1182.88,
    porcentaje: 0.1792,
  },
  {
    limiteInferior: 15487.72,
    limiteSuperior: 31236.49,
    cuotaFija: 1640.18,
    porcentaje: 0.2136,
  },
  {
    limiteInferior: 31236.5,
    limiteSuperior: 49233.0,
    cuotaFija: 5004.12,
    porcentaje: 0.2352,
  },
  {
    limiteInferior: 49233.01,
    limiteSuperior: 93993.9,
    cuotaFija: 9236.89,
    porcentaje: 0.3,
  },
  {
    limiteInferior: 93993.91,
    limiteSuperior: 125325.2,
    cuotaFija: 22665.17,
    porcentaje: 0.32,
  },
  {
    limiteInferior: 125325.21,
    limiteSuperior: 375975.61,
    cuotaFija: 32691.18,
    porcentaje: 0.34,
  },
  {
    limiteInferior: 375975.62,
    limiteSuperior: Infinity,
    cuotaFija: 117912.32,
    porcentaje: 0.35,
  },
];

// Subsidio al empleo mensual 2025
const SUBSIDIO_MONTHLY: { hasta: number; subsidio: number }[] = [
  { hasta: 1768.96, subsidio: 407.02 },
  { hasta: 2653.38, subsidio: 406.83 },
  { hasta: 3472.84, subsidio: 406.62 },
  { hasta: 3537.87, subsidio: 392.77 },
  { hasta: 4446.15, subsidio: 382.46 },
  { hasta: 4717.18, subsidio: 354.23 },
  { hasta: 5335.42, subsidio: 324.87 },
  { hasta: 6224.67, subsidio: 294.63 },
  { hasta: 7113.9, subsidio: 253.54 },
  { hasta: 7382.33, subsidio: 217.61 },
  { hasta: Infinity, subsidio: 0 },
];

export function calculateMexicoISR(monthlyGross: number): number {
  if (monthlyGross <= 0) return 0;

  const bracket = ISR_MONTHLY_2025.find(
    (b) => monthlyGross >= b.limiteInferior && monthlyGross <= b.limiteSuperior
  );
  if (!bracket) return 0;

  const excedente = monthlyGross - bracket.limiteInferior;
  const isr = bracket.cuotaFija + excedente * bracket.porcentaje;
  return Math.max(0, isr);
}

export function getSubsidioAlEmpleo(monthlyGross: number): number {
  const row = SUBSIDIO_MONTHLY.find((r) => monthlyGross <= r.hasta);
  return row?.subsidio ?? 0;
}

export function calculateMexicoMonthlyNet(
  monthlyGross: number,
  regime: 'asalariado' | 'honorarios' | 'resico' = 'asalariado'
): number {
  if (monthlyGross <= 0) return 0;

  if (regime === 'resico') {
    // RESICO: flat 2.5% for income under ~3.5M annual
    return monthlyGross * (1 - 0.025);
  }

  if (regime === 'honorarios') {
    // Honorarios: ISR provisional 10% + IVA is separate (not deducted from income)
    const isrProvisional = monthlyGross * 0.1;
    return monthlyGross - isrProvisional;
  }

  // Asalariado: ISR from tables - subsidio
  const isr = calculateMexicoISR(monthlyGross);
  const subsidio = getSubsidioAlEmpleo(monthlyGross);
  const isrFinal = Math.max(0, isr - subsidio);
  return monthlyGross - isrFinal;
}
```

- [ ] **Step 3: Create USA federal tax calculator**

Create `src/lib/tax/usa-federal.ts`:

```typescript
/**
 * USA federal income tax estimate (2025, single filer).
 * Simplified — does not include state tax or deductions beyond standard.
 */

interface TaxBracket {
  min: number;
  max: number;
  rate: number;
  baseTax: number;
}

// 2025 Federal tax brackets (single filer, annual)
const FEDERAL_BRACKETS_2025: TaxBracket[] = [
  { min: 0, max: 11925, rate: 0.1, baseTax: 0 },
  { min: 11925, max: 48475, rate: 0.12, baseTax: 1192.5 },
  { min: 48475, max: 103350, rate: 0.22, baseTax: 5578.5 },
  { min: 103350, max: 197300, rate: 0.24, baseTax: 17651.0 },
  { min: 197300, max: 250525, rate: 0.32, baseTax: 40199.0 },
  { min: 250525, max: 626350, rate: 0.35, baseTax: 57231.0 },
  { min: 626350, max: Infinity, rate: 0.37, baseTax: 188769.75 },
];

const STANDARD_DEDUCTION_2025 = 15700; // Single filer
const FICA_RATE = 0.0765; // Social Security 6.2% + Medicare 1.45%
const SELF_EMPLOYMENT_TAX_RATE = 0.153; // Double FICA for 1099

export function calculateUSAFederalTax(annualGross: number): number {
  if (annualGross <= 0) return 0;
  const taxableIncome = Math.max(0, annualGross - STANDARD_DEDUCTION_2025);

  const bracket =
    FEDERAL_BRACKETS_2025.find(
      (b) => taxableIncome >= b.min && taxableIncome < b.max
    ) || FEDERAL_BRACKETS_2025[FEDERAL_BRACKETS_2025.length - 1]!;

  return bracket.baseTax + (taxableIncome - bracket.min) * bracket.rate;
}

export function calculateUSAMonthlyNet(
  monthlyGross: number,
  regime: 'w2' | '1099' = 'w2'
): number {
  if (monthlyGross <= 0) return 0;
  const annualGross = monthlyGross * 12;
  const federalTax = calculateUSAFederalTax(annualGross);

  if (regime === '1099') {
    const seTax = annualGross * SELF_EMPLOYMENT_TAX_RATE;
    const annualNet = annualGross - federalTax - seTax;
    return Math.max(0, annualNet / 12);
  }

  // W-2: federal tax + FICA
  const fica = annualGross * FICA_RATE;
  const annualNet = annualGross - federalTax - fica;
  return Math.max(0, annualNet / 12);
}
```

- [ ] **Step 4: Create unified tax API**

Create `src/lib/tax/index.ts`:

```typescript
import { calculateMexicoMonthlyNet } from './mexico-isr';
import { calculateUSAMonthlyNet } from './usa-federal';

export type FiscalRegime =
  | 'asalariado'
  | 'honorarios'
  | 'resico'
  | 'w2'
  | '1099';
export type Country = 'MX' | 'US' | 'OTHER';

export interface NetSalaryResult {
  monthlyNet: number;
  annualGross: number;
  annualNet: number;
}

export function calculateNetSalary(
  monthlyGross: number,
  country: Country,
  regime?: FiscalRegime
): NetSalaryResult {
  let monthlyNet: number;

  if (country === 'MX') {
    const mxRegime =
      (regime as 'asalariado' | 'honorarios' | 'resico') || 'asalariado';
    monthlyNet = calculateMexicoMonthlyNet(monthlyGross, mxRegime);
  } else if (country === 'US') {
    const usRegime = (regime as 'w2' | '1099') || 'w2';
    monthlyNet = calculateUSAMonthlyNet(monthlyGross, usRegime);
  } else {
    // No tax calc for other countries — show gross only
    monthlyNet = monthlyGross;
  }

  return {
    monthlyNet: Math.round(monthlyNet * 100) / 100,
    annualGross: Math.round(monthlyGross * 12 * 100) / 100,
    annualNet: Math.round(monthlyNet * 12 * 100) / 100,
  };
}

export function calculateTotalCompensation(
  monthlyGross: number,
  annualBonus?: number,
  annualBonusType?: 'fixed' | 'percentage',
  signOnBonus?: number,
  stockAnnualValue?: number
): number {
  const annualBase = monthlyGross * 12;
  const bonus =
    annualBonusType === 'percentage' && annualBonus
      ? annualBase * (annualBonus / 100)
      : annualBonus || 0;
  const signOn = signOnBonus || 0; // amortized as-is (1 year)
  const stock = stockAnnualValue || 0;
  return annualBase + bonus + signOn + stock;
}

export { calculateMexicoMonthlyNet } from './mexico-isr';
export { calculateUSAMonthlyNet } from './usa-federal';
```

- [ ] **Step 5: Verify and commit**

Run: `npm run check`
Expected: 0 errors

```bash
git add src/types/member.ts src/lib/tax/
git commit -m "feat(salary): add compensation type and tax calculators (MX ISR + USA federal)"
```

---

## Task 2: CompensationFields component

**Files:**

- Create: `src/components/profile/shared/CompensationFields.tsx`
- Modify: `src/components/profile/tabs/CareerTab.tsx`

- [ ] **Step 1: Create CompensationFields**

Create `src/components/profile/shared/CompensationFields.tsx` — a collapsible section that goes inside each WorkEntryForm showing salary inputs + auto-calculated values. The component receives the entry's `compensation` object and an `onUpdate` callback.

Key features:

- Collapsed by default with "Add compensation" link
- Country selector → shows matching fiscal regime options
- Monthly gross input → auto-shows monthly net, annual gross, annual net
- Optional fields: bonus, sign-on, stock, benefits tags
- All auto-calcs use `calculateNetSalary` and `calculateTotalCompensation`
- Currency format using `Intl.NumberFormat`
- Benefits multi-select with predefined tags (country-specific)

- [ ] **Step 2: Wire into CareerTab**

In `src/components/profile/tabs/CareerTab.tsx`, import `CompensationFields` and add it inside `WorkEntryForm` after the technologies `TagInput`, before the closing `</>`:

```tsx
import { CompensationFields } from '../shared/CompensationFields';

// Inside WorkEntryForm, after Technologies section:
<CompensationFields
  compensation={entry.compensation}
  onUpdate={(comp) => onUpdate({ compensation: comp })}
  lang={lang}
/>;
```

- [ ] **Step 3: Verify and commit**

Run: `npm run check`

```bash
git add src/components/profile/shared/CompensationFields.tsx src/components/profile/tabs/CareerTab.tsx
git commit -m "feat(salary): add compensation fields to work history entries"
```

---

## Task 3: Analytics dashboard

**Files:**

- Create: `src/components/salary/SalaryInsights.tsx`
- Create: `src/components/salary/SalaryOverview.tsx`
- Create: `src/components/salary/SalaryByExperience.tsx`
- Create: `src/components/salary/SalaryByIndustry.tsx`
- Create: `src/components/salary/BenefitsHeatmap.tsx`
- Create: `src/components/salary/CompensationBreakdown.tsx`

- [ ] **Step 1: Create SalaryInsights orchestrator**

The main component that fetches member profiles, extracts compensation data, and renders sub-components. Uses `getMemberProfiles({ limit: 500 })` and company data for industry mapping.

Includes the `safeAggregate` privacy function (minimum 3 per group).

- [ ] **Step 2: Create SalaryOverview**

Four stat cards: Median Monthly Gross, Median Total Comp, Data Points Count, Contributing Members Count.

- [ ] **Step 3: Create SalaryByExperience**

Horizontal bar chart using recharts `BarChart`. Groups by `experience.level` (junior/mid/senior/lead/executive). Shows median with whiskers for 10th-90th percentile.

- [ ] **Step 4: Create SalaryByIndustry**

Horizontal bars by industry. Uses `translateIndustry` for English. Only shows industries with 3+ data points.

- [ ] **Step 5: Create BenefitsHeatmap**

Horizontal percentage bars showing benefit frequency. Sorts by most common.

- [ ] **Step 6: Create CompensationBreakdown**

Donut chart using recharts `PieChart` showing average split: base vs bonus vs stock vs sign-on.

- [ ] **Step 7: Verify and commit**

Run: `npm run check`

```bash
git add src/components/salary/
git commit -m "feat(salary): add analytics dashboard with charts"
```

---

## Task 4: Pages, navigation, and wiring

**Files:**

- Create: `src/components/wrappers/SalaryInsightsPage.tsx`
- Create: `src/pages/es/dashboard/salary-insights/index.astro`
- Create: `src/pages/en/dashboard/salary-insights/index.astro`
- Modify: `src/components/dashboard/DashboardSidebar.tsx`
- Modify: `src/components/nav/DashboardBottomNav.tsx`

- [ ] **Step 1: Create wrapper**

```tsx
// src/components/wrappers/SalaryInsightsPage.tsx
import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { SalaryInsights } from '@/components/salary/SalaryInsights';

interface Props {
  lang?: 'es' | 'en';
}

export default function SalaryInsightsPage({ lang = 'es' }: Props) {
  return (
    <AuthProvider>
      <SalaryInsights lang={lang} />
    </AuthProvider>
  );
}
```

- [ ] **Step 2: Create Astro pages**

Spanish: `src/pages/es/dashboard/salary-insights/index.astro`
English: `src/pages/en/dashboard/salary-insights/index.astro`

Follow DashboardLayout pattern with `requireVerified={true}`.

- [ ] **Step 3: Add sidebar link**

In `DashboardSidebar.tsx`, add after the Company Network item:

```typescript
{
  name: lang === 'es' ? 'Salarios' : 'Salary Insights',
  href: `/${lang}/dashboard/salary-insights`,
  icon: ChartBarSquareIcon, // or CurrencyDollarIcon
  requireVerified: true,
},
```

Import `CurrencyDollarIcon` from `@heroicons/react/24/outline`.

- [ ] **Step 4: Add to bottom nav sheet**

In `DashboardBottomNav.tsx`, add to `sheetItems` array:

```typescript
{
  href: `/${lang}/dashboard/salary-insights`,
  label: lang === 'es' ? 'Salarios' : 'Salary Insights',
  icon: 'fas fa-chart-line',
},
```

- [ ] **Step 5: Verify and commit**

Run: `npm run check`

```bash
git add -A
git commit -m "feat(salary): add salary insights pages and navigation"
```

---

## Task 5: Final verification

- [ ] **Step 1: Full type check**

Run: `npm run check`

- [ ] **Step 2: Lint**

Run: `npm run lint`

- [ ] **Step 3: Manual verification**

1. Go to Profile Editor → Career tab → expand a work entry
2. Click "Add compensation" → fill monthly gross, select country/regime
3. Verify auto-calculated net, annual gross, annual net appear
4. Save profile → verify compensation data persists
5. Go to `/es/dashboard/salary-insights` → verify charts render
6. With < 3 data points → groups should be hidden
7. Check English version at `/en/dashboard/salary-insights`
8. Verify sidebar and bottom nav links work
9. Check public profile → no salary data visible

- [ ] **Step 4: Push**

```bash
git push origin feature/hub
```
