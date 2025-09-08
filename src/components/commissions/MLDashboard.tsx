import React, { useState, useEffect } from 'react';
import { BaseCommissionDashboard} from './BaseCommissionDashboard';
import { COMMISSION_TYPES} from '../../lib/stripe/stripe-client';
import { useTranslations} from '../../hooks/useTranslations';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Bar, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import {
  CpuChipIcon,
  BeakerIcon,
  ChartBarIcon,
  ClockIcon,
  PlayIcon,
  StopIcon,
} from '@heroicons/react/24/outline';

interface MLMetrics {
  experimentsRunning: number;
  modelsDeployed: number;
  avgAccuracy: number;
  totalTrainingTime: number;
  featuresEngineered: number;
  deploymentsToday: number;
}

interface Experiment {
  id: string;
  name: string;
  algorithm: string;
  status: 'running' | 'completed' | 'failed' | 'queued';
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  startTime: Date;
  duration: number;
  hyperparameters: Record<string, any>;
}

const SAMPLE_EXPERIMENTS: Experiment[] = [
  {
    id: 'exp-001',
    name: 'Customer Churn Prediction',
    algorithm: 'Random Forest',
    status: 'completed',
    accuracy: 0.94,
    precision: 0.92,
    recall: 0.91,
    f1Score: 0.915,
    startTime: new Date('2024-01-15T10:30:00'),
    duration: 3600,
    hyperparameters: { n_estimators: 100, max_depth: 10 }
  },
  {
    id: 'exp-002',
    name: 'Price Optimization',
    algorithm: 'XGBoost',
    status: 'running',
    accuracy: 0.87,
    precision: 0.85,
    recall: 0.89,
    f1Score: 0.87,
    startTime: new Date('2024-01-16T09:15:00'),
    duration: 1800,
    hyperparameters: { learning_rate: 0.1, max_depth: 6 }
  },
  {
    id: 'exp-003',
    name: 'Fraud Detection',
    algorithm: 'Neural Network',
    status: 'queued',
    accuracy: 0.0,
    precision: 0.0,
    recall: 0.0,
    f1Score: 0.0,
    startTime: new Date('2024-01-16T14:00:00'),
    duration: 0,
    hyperparameters: { hidden_layers: 3, neurons: [128, 64, 32] }
  }
];

const modelPerformanceData = [
  { name: 'Jan', accuracy: 0.85, precision: 0.83, recall: 0.87 },
  { name: 'Feb', accuracy: 0.87, precision: 0.85, recall: 0.89 },
  { name: 'Mar', accuracy: 0.89, precision: 0.87, recall: 0.91 },
  { name: 'Apr', accuracy: 0.91, precision: 0.89, recall: 0.93 },
  { name: 'May', accuracy: 0.93, precision: 0.91, recall: 0.95 },
  { name: 'Jun', accuracy: 0.94, precision: 0.92, recall: 0.96 },
];

const algorithmComparison = [
  { algorithm: 'Random Forest', accuracy: 0.94, speed: 0.85, interpretability: 0.9 },
  { algorithm: 'XGBoost', accuracy: 0.92, speed: 0.8, interpretability: 0.7 },
  { algorithm: 'Neural Network', accuracy: 0.96, speed: 0.6, interpretability: 0.3 },
  { algorithm: 'SVM', accuracy: 0.89, speed: 0.9, interpretability: 0.8 },
  { algorithm: 'Logistic Regression', accuracy: 0.87, speed: 0.95, interpretability: 0.95 },
];

export const MLDashboard: React.FC = () => {
  const { t } = useTranslations();
  const [metrics, setMetrics] = useState<MLMetrics>({
    experimentsRunning: 3,
    modelsDeployed: 12,
    avgAccuracy: 92.4,
    totalTrainingTime: 156.7,
    featuresEngineered: 47,
    deploymentsToday: 5,
  });

  const [experiments, setExperiments] = useState<Experiment[]>(SAMPLE_EXPERIMENTS);
  const [selectedExperiment, setSelectedExperiment] = useState<string | null>(null);

  const customMetrics = (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('ml.performanceMetrics')}
        </h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">{t('ml.avgAccuracy')}</span>
            <span className="text-lg font-semibold text-purple-600">{metrics.avgAccuracy}%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">{t('ml.totalTrainingTime')}</span>
            <span className="text-lg font-semibold text-blue-600">{metrics.totalTrainingTime}h</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">{t('ml.featuresEngineered')}</span>
            <span className="text-lg font-semibold text-green-600">{metrics.featuresEngineered}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('ml.modelPerformance')}
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={modelPerformanceData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis domain={[0.8, 1]} />
            <Tooltip formatter={(value) => `${(value as number * 100).toFixed(1)}%`} />
            <Line type="monotone" dataKey="accuracy" stroke="#8B5CF6" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const customTools = (
    <div className="space-y-8">
      {/* Experiment Tracker */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          {t('ml.experimentTracker')}
        </h3>
        
        <div className="space-y-4">
          {experiments.map((exp) => (
            <div key={exp.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <h4 className="font-medium text-gray-900">{exp['name']}</h4>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    exp['status'] === 'completed' ? 'bg-green-100 text-green-800' :
                    exp['status'] === 'running' ? 'bg-blue-100 text-blue-800' :
                    exp['status'] === 'failed' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {exp['status']}
                  </span>
                </div>
                <span className="text-sm text-gray-500">{exp.algorithm}</span>
              </div>
              
              {exp['status'] === 'completed' && (
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Accuracy:</span>
                    <span className="ml-1 font-medium">{(exp.accuracy * 100).toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Precision:</span>
                    <span className="ml-1 font-medium">{(exp.precision * 100).toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Recall:</span>
                    <span className="ml-1 font-medium">{(exp.recall * 100).toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="text-gray-500">F1-Score:</span>
                    <span className="ml-1 font-medium">{(exp.f1Score * 100).toFixed(1)}%</span>
                  </div>
                </div>
              )}
              
              <div className="mt-3 flex justify-between items-center">
                <span className="text-xs text-gray-500">
                  Started: {exp.startTime.toLocaleString()}
                </span>
                <div className="flex space-x-2">
                  <button className="text-blue-600 hover:text-blue-700 text-sm">
                    {t('ml.viewDetails')}
                  </button>
                  {exp['status'] === 'running' && (
                    <button className="text-red-600 hover:text-red-700 text-sm">
                      {t('ml.stop')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Algorithm Comparison */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          {t('ml.algorithmComparison')}
        </h3>
        
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart data={algorithmComparison}>
            <PolarGrid />
            <PolarAngleAxis dataKey="algorithm" />
            <PolarRadiusAxis angle={30} domain={[0, 1]} />
            <Radar name="Accuracy" dataKey="accuracy" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.1} />
            <Radar name="Speed" dataKey="speed" stroke="#10B981" fill="#10B981" fillOpacity={0.1} />
            <Radar name="Interpretability" dataKey="interpretability" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.1} />
            <Tooltip formatter={(value) => `${(value as number * 100).toFixed(0)}%`} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Model Deployment Tools */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          {t('ml.deploymentTools')}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { name: t('ml.hyperparameterTuning'), icon: BeakerIcon, color: 'bg-purple-100 text-purple-600' },
            { name: t('ml.crossValidation'), icon: ChartBarIcon, color: 'bg-blue-100 text-blue-600' },
            { name: t('ml.featureSelection'), icon: CpuChipIcon, color: 'bg-green-100 text-green-600' },
            { name: t('ml.modelMonitoring'), icon: ClockIcon, color: 'bg-orange-100 text-orange-600' },
          ].map((tool, index) => {
            const Icon = tool.icon;
            return (
              <div key={index} className="border border-gray-200 rounded-lg p-4 text-center hover:shadow-sm transition-shadow">
                <div className={`p-3 ${tool.color} rounded-lg inline-block mb-3`}>
                  <Icon className="w-6 h-6" />
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
      commissionId={COMMISSION_TYPES.ML}
      customMetrics={customMetrics}
      customTools={customTools}
    />
  );
};

export default MLDashboard;