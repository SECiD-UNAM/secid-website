import React, { useState } from 'react';
import { BaseCommissionDashboard } from './BaseCommissionDashboard';
import { COMMISSION_TYPES } from '../../lib/stripe/stripe-client';
import { useTranslations } from '../../hooks/useTranslations';
import {
  BeakerIcon,
  DocumentTextIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
} from 'recharts';

export const BioinformaticsDashboard: React.FC = () => {
  const { t } = useTranslations();

  const sequenceData = [
    { organism: 'E. coli', sequences: 4500, proteins: 4200 },
    { organism: 'S. cerevisiae', sequences: 6000, proteins: 5800 },
    { organism: 'H. sapiens', sequences: 20000, proteins: 19500 },
    { organism: 'M. musculus', sequences: 22000, proteins: 21000 },
  ];

  const alignmentData = [
    { length: 100, identity: 95 },
    { length: 250, identity: 87 },
    { length: 500, identity: 82 },
    { length: 750, identity: 78 },
    { length: 1000, identity: 75 },
  ];

  const customMetrics = (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Sequence Database
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={sequenceData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="organism" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="sequences" fill="#14B8A6" />
            <Bar dataKey="proteins" fill="#06B6D4" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Alignment Quality
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <ScatterChart data={alignmentData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="length" />
            <YAxis dataKey="identity" />
            <Tooltip />
            <Scatter dataKey="identity" fill="#14B8A6" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const customTools = (
    <div className="space-y-8">
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-6 text-lg font-semibold text-gray-900">
          Bioinformatics Tools
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              name: 'Sequence Aligner',
              icon: MagnifyingGlassIcon,
              color: 'bg-teal-100 text-teal-600',
            },
            {
              name: 'Protein Predictor',
              icon: BeakerIcon,
              color: 'bg-blue-100 text-blue-600',
            },
            {
              name: 'Phylogeny Tree',
              icon: ChartBarIcon,
              color: 'bg-green-100 text-green-600',
            },
            {
              name: 'Literature Search',
              icon: DocumentTextIcon,
              color: 'bg-purple-100 text-purple-600',
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
      commissionId={COMMISSION_TYPES.BIOINFORMATICS}
      customMetrics={customMetrics}
      customTools={customTools}
    />
  );
};

export default BioinformaticsDashboard;
