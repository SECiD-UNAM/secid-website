import React, { useState } from 'react';
import { BaseCommissionDashboard } from './BaseCommissionDashboard';
import { COMMISSION_TYPES } from '../../lib/stripe/stripe-client';
import { useTranslations } from '../../hooks/useTranslations';
import {
  CpuChipIcon,
  BoltIcon,
  EyeIcon,
  BeakerIcon,
} from '@heroicons/react/24/outline';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

export const DLDashboard: React.FC = () => {
  const { t } = useTranslations();

  const gpuData = [
    { time: '00:00', gpu1: 85, gpu2: 78, gpu3: 92 },
    { time: '04:00', gpu1: 88, gpu2: 82, gpu3: 95 },
    { time: '08:00', gpu1: 92, gpu2: 85, gpu3: 88 },
    { time: '12:00', gpu1: 87, gpu2: 90, gpu3: 93 },
    { time: '16:00', gpu1: 91, gpu2: 87, gpu3: 89 },
    { time: '20:00', gpu1: 86, gpu2: 83, gpu3: 91 },
  ];

  const trainingData = [
    { epoch: 1, loss: 0.8, accuracy: 0.65 },
    { epoch: 5, loss: 0.6, accuracy: 0.78 },
    { epoch: 10, loss: 0.4, accuracy: 0.85 },
    { epoch: 15, loss: 0.3, accuracy: 0.89 },
    { epoch: 20, loss: 0.2, accuracy: 0.92 },
    { epoch: 25, loss: 0.15, accuracy: 0.94 },
  ];

  const customMetrics = (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          GPU Utilization
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={gpuData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis domain={[0, 100]} />
            <Tooltip formatter={(value) => `${value}%`} />
            <Area
              type="monotone"
              dataKey="gpu1"
              stackId="1"
              stroke="#EF4444"
              fill="#EF4444"
              fillOpacity={0.6}
            />
            <Area
              type="monotone"
              dataKey="gpu2"
              stackId="1"
              stroke="#3B82F6"
              fill="#3B82F6"
              fillOpacity={0.6}
            />
            <Area
              type="monotone"
              dataKey="gpu3"
              stackId="1"
              stroke="#10B981"
              fill="#10B981"
              fillOpacity={0.6}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Training Progress
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={trainingData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="epoch" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="accuracy"
              stroke="#10B981"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="loss"
              stroke="#EF4444"
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
          Deep Learning Tools
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              name: 'Model Builder',
              icon: BeakerIcon,
              color: 'bg-red-100 text-red-600',
            },
            {
              name: 'GPU Monitor',
              icon: CpuChipIcon,
              color: 'bg-blue-100 text-blue-600',
            },
            {
              name: 'Training Tracker',
              icon: BoltIcon,
              color: 'bg-green-100 text-green-600',
            },
            {
              name: 'Model Viewer',
              icon: EyeIcon,
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
      commissionId={COMMISSION_TYPES.DEEP_LEARNING}
      customMetrics={customMetrics}
      customTools={customTools}
    />
  );
};

export default DLDashboard;
