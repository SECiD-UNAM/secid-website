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
  labels?: Record<string, { es: string; en: string }>;
  lang?: 'es' | 'en';
  color?: string;
  maxRows?: number;
  heightPerRow?: number;
}

export default function HorizontalBars({
  data,
  labels,
  lang = 'es',
  color = '#7C3AED',
  maxRows = 20,
  heightPerRow = 24,
}: Props) {
  const rows = useMemo(() => {
    const arr = Object.entries(data)
      .filter(([k, v]) => k && v > 0)
      .map(([k, v]) => ({
        key: k,
        label: labels?.[k]?.[lang] || k,
        count: v,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, maxRows);
    return arr;
  }, [data, labels, lang, maxRows]);

  if (rows.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-gray-500">
        {lang === 'es' ? 'Sin datos suficientes' : 'Not enough data'}
      </div>
    );
  }

  const height = Math.max(220, rows.length * heightPerRow + 60);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} layout="vertical" margin={{ left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
        <YAxis
          dataKey="label"
          type="category"
          width={140}
          tick={{ fontSize: 12 }}
        />
        <Tooltip />
        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
          {rows.map((_, i) => (
            <Cell key={i} fill={color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
