import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface Props {
  data: Record<string, number>;
  lang?: 'es' | 'en';
}

export default function GenerationHistogram({ data, lang = 'es' }: Props) {
  const rows = useMemo(
    () =>
      Object.entries(data)
        .filter(([k, v]) => k && v > 0)
        .map(([k, v]) => ({ generation: k, count: v }))
        .sort((a, b) => a.generation.localeCompare(b.generation)),
    [data]
  );

  if (rows.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-gray-500">
        {lang === 'es' ? 'Sin datos suficientes' : 'Not enough data'}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={rows}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="generation"
          tick={{ fontSize: 12 }}
          label={{
            value: lang === 'es' ? 'Generación' : 'Generation',
            position: 'insideBottom',
            offset: -5,
            style: { fontSize: 12 },
          }}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 12 }}
          label={{
            value: lang === 'es' ? 'Miembros' : 'Members',
            angle: -90,
            position: 'insideLeft',
            style: { fontSize: 12 },
          }}
        />
        <Tooltip />
        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
          {rows.map((_, i) => (
            <Cell key={i} fill="#2563EB" />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
