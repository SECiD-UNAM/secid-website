import { calculateMexicoMonthlyNet } from './mexico-isr';
import { calculateUSAMonthlyNet } from './usa-federal';

export type FiscalRegime = 'asalariado' | 'honorarios' | 'resico' | 'w2' | '1099';
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
    const mxRegime = (regime as 'asalariado' | 'honorarios' | 'resico') || 'asalariado';
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
