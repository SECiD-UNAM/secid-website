import React, { useState, useMemo, useEffect } from 'react';
import { ChevronDownIcon, ChevronUpIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Compensation } from '@/types/member';
import { calculateNetSalary, calculateTotalCompensation } from '@/lib/tax';
import { TagInput } from './TagInput';

interface Props {
  compensation?: Compensation;
  onUpdate: (compensation: Compensation) => void;
  userId?: string;
  roleId?: string;
  lang?: 'es' | 'en';
}

const BENEFITS_BY_COUNTRY: Record<string, string[]> = {
  MX: [
    'SGMM',
    'Vales de despensa',
    'Fondo de ahorro',
    'Aguinaldo superior',
    'PTU',
    'Seguro de vida',
    'Home office',
    'Horario flexible',
    'Gimnasio',
    'Capacitación',
    'Vacaciones superiores',
  ],
  US: [
    'Health insurance',
    '401(k) match',
    'Dental/Vision',
    'PTO',
    'Remote work',
    'Stock options',
    'Signing bonus',
    'Relocation',
    'Education reimbursement',
  ],
  OTHER: [],
};

const DEFAULT_CURRENCY_BY_COUNTRY: Record<string, 'MXN' | 'USD'> = {
  MX: 'MXN',
  US: 'USD',
  OTHER: 'USD',
};

const INPUT_CLASS =
  'w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 ' +
  'focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ' +
  'dark:border-gray-600 dark:bg-gray-700 dark:text-white';

const SELECT_CLASS = INPUT_CLASS;


function formatCurrency(amount: number, currency: 'MXN' | 'USD', lang: 'es' | 'en'): string {
  const locale = lang === 'es' ? 'es-MX' : 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function hasCompensationData(comp?: Compensation): boolean {
  return !!(
    comp &&
    (comp.monthlyGross ||
      comp.annualBonus ||
      comp.signOnBonus ||
      comp.stockAnnualValue ||
      (comp.benefits && comp.benefits.length > 0))
  );
}

function buildSummary(comp: Compensation, lang: 'es' | 'en'): string {
  if (!comp.monthlyGross) return lang === 'es' ? 'Compensación registrada' : 'Compensation recorded';
  const formatted = formatCurrency(comp.monthlyGross, comp.currency, lang);
  const label = lang === 'es' ? '/mes bruto' : '/month gross';
  return `${formatted} ${label}`;
}

function buildDefaultCompensation(): Compensation {
  return { currency: 'MXN', country: 'MX' };
}

export const CompensationFields: React.FC<Props> = ({
  compensation,
  onUpdate,
  userId,
  roleId,
  lang = 'es',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localComp, setLocalComp] = useState<Compensation>(
    compensation ?? buildDefaultCompensation()
  );

  // Load from sub-collection on mount when userId + roleId are provided
  useEffect(() => {
    if (!userId || !roleId) return;
    let cancelled = false;

    (async () => {
      try {
        const snap = await getDoc(doc(db, 'users', userId, 'compensation', roleId));
        if (!cancelled && snap.exists()) {
          const data = snap.data() as Compensation;
          setLocalComp({
            currency: data.currency ?? 'MXN',
            country: data.country ?? 'MX',
            fiscalRegime: data.fiscalRegime,
            monthlyGross: data.monthlyGross,
            annualBonus: data.annualBonus,
            annualBonusType: data.annualBonusType,
            signOnBonus: data.signOnBonus,
            stockAnnualValue: data.stockAnnualValue,
            benefits: data.benefits,
          });
        }
      } catch (err) {
        console.warn('Error loading compensation:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, roleId]);

  const current = localComp;
  const hasData = hasCompensationData(current);

  async function saveToSubCollection(comp: Compensation): Promise<void> {
    if (!userId || !roleId) return;
    try {
      await setDoc(doc(db, 'users', userId, 'compensation', roleId), {
        ...comp,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Error saving compensation:', err);
    }
  }

  const update = (partial: Partial<Compensation>) => {
    const updated = { ...current, ...partial };
    setLocalComp(updated);
    onUpdate(updated);
    void saveToSubCollection(updated);
  };

  const handleCountryChange = (country: 'MX' | 'US' | 'OTHER') => {
    const currency = DEFAULT_CURRENCY_BY_COUNTRY[country] ?? 'MXN';
    const fiscalRegime = country === 'MX' ? 'asalariado' : country === 'US' ? 'w2' : undefined;
    update({ country, currency, fiscalRegime, benefits: [] });
  };

  const netResult = useMemo(() => {
    if (!current.monthlyGross) return null;
    return calculateNetSalary(current.monthlyGross, current.country, current.fiscalRegime);
  }, [current.monthlyGross, current.country, current.fiscalRegime]);

  const totalComp = useMemo(() => {
    if (!current.monthlyGross) return null;
    return calculateTotalCompensation(
      current.monthlyGross,
      current.annualBonus,
      current.annualBonusType,
      current.signOnBonus,
      current.stockAnnualValue
    );
  }, [
    current.monthlyGross,
    current.annualBonus,
    current.annualBonusType,
    current.signOnBonus,
    current.stockAnnualValue,
  ]);

  const benefitSuggestions = BENEFITS_BY_COUNTRY[current.country] ?? [];

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Header toggle */}
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className={
          'flex w-full items-center justify-between px-4 py-3 text-left ' +
          'text-sm font-medium text-gray-700 hover:bg-gray-50 ' +
          'dark:text-gray-300 dark:hover:bg-gray-700/50 ' +
          'rounded-lg transition-colors'
        }
        aria-expanded={isExpanded}
      >
        <span className="flex items-center gap-2">
          <LockClosedIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
          {hasData && !isExpanded
            ? buildSummary(current, lang)
            : lang === 'es'
              ? 'Agregar información de compensación'
              : 'Add compensation info'}
        </span>
        {isExpanded ? (
          <ChevronUpIcon className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDownIcon className="h-4 w-4 text-gray-400" />
        )}
      </button>

      {/* Expanded form */}
      {isExpanded && (
        <div className="space-y-5 border-t border-gray-200 px-4 pb-5 pt-4 dark:border-gray-700">
          {/* Privacy notice */}
          <p className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <LockClosedIcon className="h-3.5 w-3.5 shrink-0" />
            {lang === 'es'
              ? 'Tu salario nunca se muestra en tu perfil. Solo se usa para estadísticas anónimas de la comunidad.'
              : 'Your salary data is never shown on your profile. Only used for anonymous community statistics.'}
          </p>

          {/* Row 1: Country + Currency */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {lang === 'es' ? 'País' : 'Country'}
              </label>
              <select
                value={current.country}
                onChange={(e) => handleCountryChange(e.target.value as 'MX' | 'US' | 'OTHER')}
                className={SELECT_CLASS}
              >
                <option value="MX">México</option>
                <option value="US">United States</option>
                <option value="OTHER">{lang === 'es' ? 'Otro' : 'Other'}</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {lang === 'es' ? 'Moneda' : 'Currency'}
              </label>
              <select
                value={current.currency}
                onChange={(e) => update({ currency: e.target.value as 'MXN' | 'USD' })}
                className={SELECT_CLASS}
              >
                <option value="MXN">MXN — Peso mexicano</option>
                <option value="USD">USD — US Dollar</option>
              </select>
            </div>
          </div>

          {/* Row 2: Fiscal regime */}
          {current.country !== 'OTHER' && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {lang === 'es' ? 'Régimen fiscal' : 'Fiscal regime'}
              </label>
              <select
                value={current.fiscalRegime ?? ''}
                onChange={(e) =>
                  update({ fiscalRegime: e.target.value as Compensation['fiscalRegime'] })
                }
                className={SELECT_CLASS}
              >
                {current.country === 'MX' && (
                  <>
                    <option value="asalariado">
                      {lang === 'es' ? 'Asalariado (Art. 96 LISR)' : 'Salaried employee (Art. 96 LISR)'}
                    </option>
                    <option value="honorarios">
                      {lang === 'es' ? 'Honorarios (Actividad Profesional)' : 'Professional fees (Honorarios)'}
                    </option>
                    <option value="resico">RESICO</option>
                  </>
                )}
                {current.country === 'US' && (
                  <>
                    <option value="w2">W-2 (Employee)</option>
                    <option value="1099">1099 (Independent Contractor)</option>
                  </>
                )}
              </select>
            </div>
          )}

          {/* Row 3: Monthly gross */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {lang === 'es' ? 'Salario mensual bruto' : 'Monthly gross salary'}
              {' '}
              <span className="font-normal text-gray-500">({current.currency})</span>
            </label>
            <input
              type="number"
              min={0}
              step={100}
              value={current.monthlyGross ?? ''}
              onChange={(e) => {
                const val = e.target.value === '' ? undefined : Number(e.target.value);
                update({ monthlyGross: val });
              }}
              className={INPUT_CLASS}
              placeholder={lang === 'es' ? 'ej. 45000' : 'e.g. 5000'}
            />
          </div>

          {/* Auto-calculated net salary */}
          {netResult && (
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {lang === 'es' ? 'Cálculo estimado (neto)' : 'Estimated calculation (net)'}
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {lang === 'es' ? 'Mensual neto' : 'Monthly net'}
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(netResult.monthlyNet, current.currency, lang)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {lang === 'es' ? 'Anual bruto' : 'Annual gross'}
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(netResult.annualGross, current.currency, lang)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {lang === 'es' ? 'Anual neto' : 'Annual net'}
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(netResult.annualNet, current.currency, lang)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Row 4: Annual bonus */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {lang === 'es' ? 'Bono anual' : 'Annual bonus'}
                {' '}
                <span className="font-normal text-gray-500">
                  ({lang === 'es' ? 'opcional' : 'optional'})
                </span>
              </label>
              <input
                type="number"
                min={0}
                step={100}
                value={current.annualBonus ?? ''}
                onChange={(e) => {
                  const val = e.target.value === '' ? undefined : Number(e.target.value);
                  update({ annualBonus: val });
                }}
                className={INPUT_CLASS}
                placeholder="0"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {lang === 'es' ? 'Tipo de bono' : 'Bonus type'}
              </label>
              <select
                value={current.annualBonusType ?? 'fixed'}
                onChange={(e) =>
                  update({ annualBonusType: e.target.value as 'fixed' | 'percentage' })
                }
                className={SELECT_CLASS}
              >
                <option value="fixed">
                  {lang === 'es' ? 'Monto fijo' : 'Fixed amount'}
                </option>
                <option value="percentage">
                  {lang === 'es' ? '% del salario anual' : '% of annual salary'}
                </option>
              </select>
            </div>
          </div>

          {/* Row 5: Sign-on bonus + Stock */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {lang === 'es' ? 'Bono de entrada' : 'Sign-on bonus'}
                {' '}
                <span className="font-normal text-gray-500">
                  ({lang === 'es' ? 'opcional' : 'optional'})
                </span>
              </label>
              <input
                type="number"
                min={0}
                step={100}
                value={current.signOnBonus ?? ''}
                onChange={(e) => {
                  const val = e.target.value === '' ? undefined : Number(e.target.value);
                  update({ signOnBonus: val });
                }}
                className={INPUT_CLASS}
                placeholder="0"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {lang === 'es' ? 'Stock / RSU (valor anual)' : 'Stock / RSU (annual value)'}
                {' '}
                <span className="font-normal text-gray-500">
                  ({lang === 'es' ? 'opcional' : 'optional'})
                </span>
              </label>
              <input
                type="number"
                min={0}
                step={100}
                value={current.stockAnnualValue ?? ''}
                onChange={(e) => {
                  const val = e.target.value === '' ? undefined : Number(e.target.value);
                  update({ stockAnnualValue: val });
                }}
                className={INPUT_CLASS}
                placeholder="0"
              />
            </div>
          </div>

          {/* Total compensation */}
          {totalComp !== null && current.monthlyGross && (
            <div className="rounded-lg border border-primary-200 bg-primary-50 p-3 dark:border-primary-800 dark:bg-primary-900/20">
              <p className="text-xs text-primary-700 dark:text-primary-300">
                {lang === 'es' ? 'Compensación total estimada (anual)' : 'Estimated total annual compensation'}
              </p>
              <p className="text-lg font-bold text-primary-800 dark:text-primary-200">
                {formatCurrency(totalComp, current.currency, lang)}
              </p>
            </div>
          )}

          {/* Benefits */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {lang === 'es' ? 'Beneficios' : 'Benefits'}
              {' '}
              <span className="font-normal text-gray-500">
                ({lang === 'es' ? 'opcional' : 'optional'})
              </span>
            </label>
            <TagInput
              tags={current.benefits ?? []}
              onChange={(tags) => update({ benefits: tags })}
              suggestions={benefitSuggestions}
              placeholder={
                lang === 'es' ? 'Agregar beneficio...' : 'Add benefit...'
              }
            />
          </div>

        </div>
      )}
    </div>
  );
};

export default CompensationFields;
