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
  { min: 0, max: 11925, rate: 0.10, baseTax: 0 },
  { min: 11925, max: 48475, rate: 0.12, baseTax: 1192.50 },
  { min: 48475, max: 103350, rate: 0.22, baseTax: 5578.50 },
  { min: 103350, max: 197300, rate: 0.24, baseTax: 17651.00 },
  { min: 197300, max: 250525, rate: 0.32, baseTax: 40199.00 },
  { min: 250525, max: 626350, rate: 0.35, baseTax: 57231.00 },
  { min: 626350, max: Infinity, rate: 0.37, baseTax: 188769.75 },
];

const STANDARD_DEDUCTION_2025 = 15700; // Single filer
const FICA_RATE = 0.0765; // Social Security 6.2% + Medicare 1.45%
const SELF_EMPLOYMENT_TAX_RATE = 0.1530; // Double FICA for 1099

export function calculateUSAFederalTax(annualGross: number): number {
  if (annualGross <= 0) return 0;
  const taxableIncome = Math.max(0, annualGross - STANDARD_DEDUCTION_2025);

  const bracket = FEDERAL_BRACKETS_2025.find(
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
