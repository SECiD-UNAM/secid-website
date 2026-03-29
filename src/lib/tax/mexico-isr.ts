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
  { limiteInferior: 0.01, limiteSuperior: 746.04, cuotaFija: 0, porcentaje: 0.0192 },
  { limiteInferior: 746.05, limiteSuperior: 6332.05, cuotaFija: 14.32, porcentaje: 0.0640 },
  { limiteInferior: 6332.06, limiteSuperior: 11128.01, cuotaFija: 371.83, porcentaje: 0.1088 },
  { limiteInferior: 11128.02, limiteSuperior: 12935.82, cuotaFija: 893.63, porcentaje: 0.16 },
  { limiteInferior: 12935.83, limiteSuperior: 15487.71, cuotaFija: 1182.88, porcentaje: 0.1792 },
  { limiteInferior: 15487.72, limiteSuperior: 31236.49, cuotaFija: 1640.18, porcentaje: 0.2136 },
  { limiteInferior: 31236.50, limiteSuperior: 49233.00, cuotaFija: 5004.12, porcentaje: 0.2352 },
  { limiteInferior: 49233.01, limiteSuperior: 93993.90, cuotaFija: 9236.89, porcentaje: 0.30 },
  { limiteInferior: 93993.91, limiteSuperior: 125325.20, cuotaFija: 22665.17, porcentaje: 0.32 },
  { limiteInferior: 125325.21, limiteSuperior: 375975.61, cuotaFija: 32691.18, porcentaje: 0.34 },
  { limiteInferior: 375975.62, limiteSuperior: Infinity, cuotaFija: 117912.32, porcentaje: 0.35 },
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
  { hasta: 7113.90, subsidio: 253.54 },
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
    const isrProvisional = monthlyGross * 0.10;
    return monthlyGross - isrProvisional;
  }

  // Asalariado: ISR from tables - subsidio
  const isr = calculateMexicoISR(monthlyGross);
  const subsidio = getSubsidioAlEmpleo(monthlyGross);
  const isrFinal = Math.max(0, isr - subsidio);
  return monthlyGross - isrFinal;
}
