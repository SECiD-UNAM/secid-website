import React, { useState } from 'react';
import { BaseCommissionDashboard } from './BaseCommissionDashboard';
import { COMMISSION_TYPES } from '../../lib/stripe/stripe-client';
import { useTranslations } from '../../hooks/useTranslations';
import {
  CogIcon,
  ServerIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

export const DataEngDashboard: React.FC = () => {
  const { t } = useTranslations();

  const pipelineData = [
    { name: 'Mon', processed: 1200, failed: 15 },
    { name: 'Tue', processed: 1500, failed: 8 },
    { name: 'Wed', processed: 1800, failed: 12 },
    { name: 'Thu', processed: 1400, failed: 5 },
    { name: 'Fri', processed: 2000, failed: 20 },
    { name: 'Sat', processed: 900, failed: 3 },
    { name: 'Sun', processed: 600, failed: 2 },
  ];

  const customMetrics = (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Pipeline Performance
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={pipelineData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="processed" fill="#10B981" />
            <Bar dataKey="failed" fill="#EF4444" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          System Health
        </h3>
        <div className="space-y-4">
          <div className="flex justify-between">
            <span>Active Pipelines:</span>
            <span className="font-bold text-green-600">12</span>
          </div>
          <div className="flex justify-between">
            <span>Data Quality Score:</span>
            <span className="font-bold text-blue-600">96.2%</span>
          </div>
          <div className="flex justify-between">
            <span>Avg Processing Time:</span>
            <span className="font-bold text-purple-600">2.3s</span>
          </div>
        </div>
      </div>
    </div>
  );

  const customTools = (
    <div className="space-y-8">
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-6 text-lg font-semibold text-gray-900">
          Data Engineering Tools
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              name: 'Pipeline Monitor',
              icon: CogIcon,
              color: 'bg-blue-100 text-blue-600',
            },
            {
              name: 'Data Quality',
              icon: ExclamationTriangleIcon,
              color: 'bg-orange-100 text-orange-600',
            },
            {
              name: 'ETL Designer',
              icon: ServerIcon,
              color: 'bg-green-100 text-green-600',
            },
            {
              name: 'Scheduler',
              icon: ClockIcon,
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
      commissionId={COMMISSION_TYPES.DATA_ENG}
      customMetrics={customMetrics}
      customTools={customTools}
    />
  );
};

export default DataEngDashboard;
