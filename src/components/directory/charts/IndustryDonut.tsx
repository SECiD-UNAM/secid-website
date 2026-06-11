import React, { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const PALETTE = [
  '#2563EB',
  '#7C3AED',
  '#DB2777',
  '#DC2626',
  '#EA580C',
  '#CA8A04',
  '#65A30D',
  '#059669',
  '#0891B2',
  '#0284C7',
  '#4F46E5',
  '#9333EA',
  '#C026D3',
  '#E11D48',
  '#F59E0B',
  '#737373',
];

const LABEL_ES: Record<string, string> = {
  tech: 'Tecnología',
  finance: 'Finanzas',
  consulting: 'Consultoría',
  academia: 'Academia',
  healthcare: 'Salud',
  retail: 'Retail',
  consumer: 'Consumo',
  energy: 'Energía',
  government: 'Gobierno',
  manufacturing: 'Manufactura',
  media: 'Medios',
  fintech: 'Fintech',
  biotech: 'Biotech',
  logistics: 'Logística',
  gaming: 'Gaming',
  other: 'Otro',
};
const LABEL_EN: Record<string, string> = {
  tech: 'Technology',
  finance: 'Finance',
  consulting: 'Consulting',
  academia: 'Academia',
  healthcare: 'Healthcare',
  retail: 'Retail',
  consumer: 'Consumer',
  energy: 'Energy',
  government: 'Government',
  manufacturing: 'Manufacturing',
  media: 'Media',
  fintech: 'Fintech',
  biotech: 'Biotech',
  logistics: 'Logistics',
  gaming: 'Gaming',
  other: 'Other',
};

interface Props {
  data: Record<string, number>;
  lang?: 'es' | 'en';
}

export default function IndustryDonut({ data, lang = 'es' }: Props) {
  const rows = useMemo(() => {
    const labels = lang === 'es' ? LABEL_ES : LABEL_EN;
    return Object.entries(data)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => ({ name: labels[k] || k, value: v, key: k }))
      .sort((a, b) => b.value - a.value);
  }, [data, lang]);

  const total = rows.reduce((s, r) => s + r.value, 0);
  if (total === 0) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-gray-500">
        {lang === 'es' ? 'Sin datos suficientes' : 'Not enough data'}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <PieChart>
        <Pie
          data={rows}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={110}
          paddingAngle={2}
          label={({ percent }) =>
            percent && percent > 0.05 ? `${Math.round(percent * 100)}%` : ''
          }
        >
          {rows.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(v: number) => `${v} (${Math.round((v / total) * 100)}%)`}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
