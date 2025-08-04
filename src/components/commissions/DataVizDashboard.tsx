import React, { useState } from 'react';
import { BaseCommissionDashboard } from './BaseCommissionDashboard';
import { COMMISSION_TYPES } from '../../lib/stripe/stripe-client';
import { useTranslations } from '../../hooks/useTranslations';
import {
  PresentationChartLineIcon,
  PhotoIcon,
  PaletteIcon,
  CodeBracketIcon,
} from '@heroicons/react/24/outline';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

export const DataVizDashboard: React.FC = () => {
  const { t } = useTranslations();

  const chartTypes = [
    { name: 'Line Charts', value: 35, color: '#3B82F6' },
    { name: 'Bar Charts', value: 25, color: '#10B981' },
    { name: 'Pie Charts', value: 20, color: '#F59E0B' },
    { name: 'Scatter Plots', value: 20, color: '#EF4444' },
  ];

  const designTrends = [
    { month: 'Jan', interactive: 45, static: 55 },
    { month: 'Feb', interactive: 52, static: 48 },
    { month: 'Mar', interactive: 58, static: 42 },
    { month: 'Apr', interactive: 65, static: 35 },
    { month: 'May', interactive: 72, static: 28 },
    { month: 'Jun', interactive: 78, static: 22 },
  ];

  const customMetrics = (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Chart Usage
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={chartTypes}
              cx="50%"
              cy="50%"
              outerRadius={80}
              fill="#6366F1"
              dataKey="value"
              label={(entry) => `${entry['name']}: ${entry.value}%`}
            >
              {chartTypes.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Design Trends
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={designTrends}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="interactive"
              stroke="#6366F1"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="static"
              stroke="#9CA3AF"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const customTools = (
    <div className="space-y-8">
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-6 text-lg font-semibold text-gray-900">
          Visualization Tools
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              name: 'Chart Builder',
              icon: PresentationChartLineIcon,
              color: 'bg-indigo-100 text-indigo-600',
            },
            {
              name: 'Color Palette',
              icon: PaletteIcon,
              color: 'bg-pink-100 text-pink-600',
            },
            {
              name: 'Gallery',
              icon: PhotoIcon,
              color: 'bg-green-100 text-green-600',
            },
            {
              name: 'Code Export',
              icon: CodeBracketIcon,
              color: 'bg-yellow-100 text-yellow-600',
            },
          ].map((tool, index) => {
            const Icon = tool.icon;
            return (
              <div
                key={index}
                className="rounded-lg border border-gray-200 p-4 text-center"
              >
                <div
                  className={`p-3 ${tool.color} mb-3 inline-block rounded-lg`}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <h4 className="font-medium text-gray-900">{tool['name']}</h4>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <BaseCommissionDashboard
      commissionId={COMMISSION_TYPES.DATA_VIZ}
      customMetrics={customMetrics}
      customTools={customTools}
    />
  );
};

export default DataVizDashboard;
