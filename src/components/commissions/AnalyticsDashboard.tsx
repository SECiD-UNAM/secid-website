import React, { useState, useEffect } from 'react';
import { BaseCommissionDashboard} from './BaseCommissionDashboard';
import { COMMISSION_TYPES} from '../../lib/stripe/stripe-client';
import { useTranslations} from '../../hooks/useTranslations';
import {
  ChartBarIcon, 
  PresentationChartLineIcon,
  TableCellsIcon,
  FunnelIcon,
  EyeIcon,
  DocumentChartBarIcon,
} from '@heroicons/react/24/outline';
import {
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  Area,
  AreaChart,
} from 'recharts';

interface AnalyticsMetrics {
  totalDatasets: number;
  visualizationsCreated: number;
  dashboardsActive: number;
  analysisReports: number;
  avgProcessingTime: number;
  dataQualityScore: number;
}

interface ChartTemplate {
  id: string;
  name: string;
  description: string;
  type: 'line' | 'bar' | 'pie' | 'scatter' | 'area' | 'funnel';
  preview: string;
  useCase: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

interface Dataset {
  id: string;
  name: string;
  description: string;
  size: string;
  format: string;
  lastUpdated: Date;
  downloadCount: number;
  category: string;
}

const CHART_TEMPLATES: ChartTemplate[] = [
  {
    id: 'line-trend',
    name: 'Time Series Analysis',
    description: 'Track trends and patterns over time',
    type: 'line',
    preview: '/charts/line-preview.png',
    useCase: 'Sales trends, user growth, performance metrics',
    difficulty: 'beginner',
  },
  {
    id: 'bar-comparison',
    name: 'Category Comparison',
    description: 'Compare values across different categories',
    type: 'bar',
    preview: '/charts/bar-preview.png',
    useCase: 'Revenue by region, user segments, feature usage',
    difficulty: 'beginner',
  },
  {
    id: 'pie-distribution',
    name: 'Distribution Analysis',
    description: 'Show proportions and market share',
    type: 'pie',
    preview: '/charts/pie-preview.png',
    useCase: 'Market share, user demographics, budget allocation',
    difficulty: 'beginner',
  },
  {
    id: 'scatter-correlation',
    name: 'Correlation Analysis',
    description: 'Identify relationships between variables',
    type: 'scatter',
    preview: '/charts/scatter-preview.png',
    useCase: 'Price vs demand, effort vs results, risk vs return',
    difficulty: 'intermediate',
  },
  {
    id: 'area-stacked',
    name: 'Stacked Area Chart',
    description: 'Show cumulative values over time',
    type: 'area',
    preview: '/charts/area-preview.png',
    useCase: 'Revenue streams, user acquisition channels, cost breakdown',
    difficulty: 'intermediate',
  },
  {
    id: 'funnel-conversion',
    name: 'Conversion Funnel',
    description: 'Track user journey and drop-off points',
    type: 'funnel',
    preview: '/charts/funnel-preview.png',
    useCase: 'Sales funnel, user onboarding, checkout process',
    difficulty: 'advanced',
  },
];

const SAMPLE_DATASETS: Dataset[] = [
  {
    id: 'sales-data-2024',
    name: 'Sales Performance 2024',
    description: 'Comprehensive sales data including revenue, units sold, and customer segments',
    size: '2.3 MB',
    format: 'CSV',
    lastUpdated: new Date('2024-01-15'),
    downloadCount: 156,
    category: 'Business',
  },
  {
    id: 'user-behavior',
    name: 'User Behavior Analytics',
    description: 'Web analytics data with page views, bounce rates, and conversion metrics',
    size: '5.7 MB',
    format: 'JSON',
    lastUpdated: new Date('2024-01-10'),
    downloadCount: 234,
    category: 'Web Analytics',
  },
  {
    id: 'financial-markets',
    name: 'Financial Market Data',
    description: 'Stock prices, trading volumes, and market indicators',
    size: '12.1 MB',
    format: 'CSV',
    lastUpdated: new Date('2024-01-12'),
    downloadCount: 89,
    category: 'Finance',
  },
];

// Mock data for sample visualizations
const timeSeriesData = Array.from({ length: 12 }, (_, i) => ({
  month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
  revenue: Math.floor(Math.random() * 100000) + 50000,
  users: Math.floor(Math.random() * 1000) + 500,
  conversion: Math.random() * 5 + 2,
}));

const categoryData = [
  { name: 'Desktop', value: 45, color: '#3B82F6' },
  { name: 'Mobile', value: 35, color: '#10B981' },
  { name: 'Tablet', value: 20, color: '#F59E0B' },
];

const scatterData = Array.from({ length: 50 }, (_, i) => ({
  x: Math.random() * 100,
  y: Math.random() * 100,
  z: Math.random() * 200,
}));

export const AnalyticsDashboard: React.FC = () => {
  const { t } = useTranslations();
  const [metrics, setMetrics] = useState<AnalyticsMetrics>({
    totalDatasets: 45,
    visualizationsCreated: 128,
    dashboardsActive: 23,
    analysisReports: 67,
    avgProcessingTime: 2.3,
    dataQualityScore: 94.2,
  });
  const [selectedTemplate, setSelectedTemplate] = useState<ChartTemplate | null>(null);
  const [showDatasets, setShowDatasets] = useState(false);

  const customMetrics = (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Analytics Specific Metrics */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('analytics.performanceMetrics')}
        </h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">{t('analytics.dataQuality')}</span>
            <span className="text-lg font-semibold text-green-600">
              {metrics.dataQualityScore}%
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">{t('analytics.avgProcessingTime')}</span>
            <span className="text-lg font-semibold text-blue-600">
              {metrics.avgProcessingTime}s
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">{t('analytics.activeDashboards')}</span>
            <span className="text-lg font-semibold text-purple-600">
              {metrics.dashboardsActive}
            </span>
          </div>
        </div>
      </div>

      {/* Sample Visualization */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('analytics.sampleVisualization')}
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={timeSeriesData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Area 
              type="monotone" 
              dataKey="revenue" 
              stackId="1"
              stroke="#3B82F6" 
              fill="#3B82F6" 
              fillOpacity={0.6}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const customTools = (
    <div className="space-y-8">
      {/* Chart Templates Gallery */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            {t('analytics.chartTemplates')}
          </h3>
          <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
            {t('analytics.viewAll')}
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {CHART_TEMPLATES.map((template) => {
            const IconComponent = {
              line: PresentationChartLineIcon,
              bar: ChartBarIcon,
              pie: ChartBarIcon,
              scatter: ChartBarIcon,
              area: ChartBarIcon,
              funnel: FunnelIcon,
            }[template.type];

            return (
              <div
                key={template.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedTemplate(template)}
              >
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <IconComponent className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{template['name']}</h4>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      template.difficulty === 'beginner' 
                        ? 'bg-green-100 text-green-800'
                        : template.difficulty === 'intermediate'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {template.difficulty}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-2">{template['description']}</p>
                <p className="text-xs text-gray-500">{template.useCase}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Visualization Playground */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          {t('analytics.visualizationPlayground')}
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Chart Controls */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('analytics.chartType')}
              </label>
              <select className="w-full border border-gray-300 rounded-md px-3 py-2">
                <option value="line">{t('analytics.lineChart')}</option>
                <option value="bar">{t('analytics.barChart')}</option>
                <option value="pie">{t('analytics.pieChart')}</option>
                <option value="scatter">{t('analytics.scatterPlot')}</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('analytics.dataSource')}
              </label>
              <button
                onClick={() => setShowDatasets(!showDatasets)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-left flex items-center justify-between hover:bg-gray-50"
              >
                <span>{t('analytics.selectDataset')}</span>
                <TableCellsIcon className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  X-Axis
                </label>
                <select className="w-full border border-gray-300 rounded-md px-3 py-2">
                  <option value="month">{t('analytics.month')}</option>
                  <option value="category">{t('analytics.category')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Y-Axis
                </label>
                <select className="w-full border border-gray-300 rounded-md px-3 py-2">
                  <option value="revenue">{t('analytics.revenue')}</option>
                  <option value="users">{t('analytics.users')}</option>
                </select>
              </div>
            </div>

            <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors">
              {t('analytics.generateChart')}
            </button>
          </div>

          {/* Live Preview */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              {t('analytics.livePreview')}
            </h4>
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={timeSeriesData.slice(0, 6)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Sample Datasets */}
      {showDatasets && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            {t('analytics.sampleDatasets')}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SAMPLE_DATASETS.map((dataset) => (
              <div key={dataset.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <h4 className="font-medium text-gray-900">{dataset['name']}</h4>
                  <span className="text-xs text-gray-500">{dataset.size}</span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{dataset['description']}</p>
                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                  <span>{dataset.format}</span>
                  <span>{dataset.downloadCount} downloads</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="flex-1 bg-blue-600 text-white py-1 px-3 rounded text-sm hover:bg-blue-700">
                    {t('analytics.useDataset')}
                  </button>
                  <button className="p-1 text-gray-400 hover:text-gray-600">
                    <EyeIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Statistical Analysis Tools */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          {t('analytics.statisticalTools')}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { name: t('analytics.correlation'), desc: t('analytics.correlationDesc'), icon: ChartBarIcon },
            { name: t('analytics.regression'), desc: t('analytics.regressionDesc'), icon: PresentationChartLineIcon },
            { name: t('analytics.clustering'), desc: t('analytics.clusteringDesc'), icon: DocumentChartBarIcon },
            { name: t('analytics.forecasting'), desc: t('analytics.forecastingDesc'), icon: PresentationChartLineIcon },
          ].map((tool, index) => {
            const Icon = tool.icon;
            return (
              <div key={index} className="border border-gray-200 rounded-lg p-4 text-center hover:shadow-sm transition-shadow">
                <div className="p-3 bg-blue-100 rounded-lg inline-block mb-3">
                  <Icon className="w-6 h-6 text-blue-600" />
                </div>
                <h4 className="font-medium text-gray-900 mb-2">{tool['name']}</h4>
                <p className="text-sm text-gray-600">{tool.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <BaseCommissionDashboard
      commissionId={COMMISSION_TYPES.ANALYTICS}
      customMetrics={customMetrics}
      customTools={customTools}
    >
      {/* Template Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedTemplate['name']}
                </h3>
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              <p className="text-gray-600 mb-4">{selectedTemplate['description']}</p>
              <div className="border border-gray-200 rounded-lg p-4 mb-4">
                <ResponsiveContainer width="100%" height={300}>
                  {selectedTemplate['type'] === 'line' && (
                    <LineChart data={timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2} />
                    </LineChart>
                  )}
                  {selectedTemplate['type'] === 'bar' && (
                    <BarChart data={timeSeriesData.slice(0, 6)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="revenue" fill="#3B82F6" />
                    </BarChart>
                  )}
                  {selectedTemplate['type'] === 'pie' && (
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#3B82F6"
                        dataKey="value"
                        label
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  )}
                  {selectedTemplate['type'] === 'scatter' && (
                    <ScatterChart data={scatterData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="x" />
                      <YAxis dataKey="y" />
                      <Tooltip />
                      <Scatter dataKey="z" fill="#3B82F6" />
                    </ScatterChart>
                  )}
                </ResponsiveContainer>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  {t('common.close')}
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  {t('analytics.useTemplate')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </BaseCommissionDashboard>
  );
};

export default AnalyticsDashboard;