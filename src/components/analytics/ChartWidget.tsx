import React from 'react';
import { clsx } from 'clsx';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  FunnelChart,
  Funnel,
  LabelList,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import type { ChartConfig } from '../../types/analytics';

interface ChartWidgetProps {
  config: ChartConfig;
  className?: string;
  loading?: boolean;
  error?: string;
}

const ChartWidget: React.FC<ChartWidgetProps> = ({
  config,
  className,
  loading = false,
  error
}) => {
  const {
    type,
    title,
    subtitle,
    data,
    xAxis,
    yAxis,
    colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'],
    showLegend = true,
    showTooltip = true,
    showGrid = true,
    responsive = true,
    height = 300,
    width
  } = config;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium text-gray-900">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry['name']}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const CustomLegend = (props: any) => {
    const { payload } = props;
    return (
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-gray-600">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderChart = () => {
    if(loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      );
    }

    if(error) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-red-500 text-sm font-medium">Error loading chart</p>
            <p className="text-gray-500 text-xs mt-1">{error}</p>
          </div>
        </div>
      );
    }

    if (!data || data['length'] === 0) {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500 text-sm">No data available</p>
        </div>
      );
    }

    const containerProps = {
      width: responsive ? '100%' : width,
      height: height
    };

    switch(type) {
      case 'line':
        return (
          <ResponsiveContainer {...containerProps}>
            <LineChart data={data}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />}
              <XAxis
                dataKey={xAxis?.dataKey || 'timestamp'}
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={{ stroke: '#e5e7eb' }}
                tickLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={{ stroke: '#e5e7eb' }}
                tickLine={{ stroke: '#e5e7eb' }}
                domain={yAxis?.domain}
              />
              {showTooltip && <Tooltip content={<CustomTooltip />} />}
              {showLegend && <Legend content={<CustomLegend />} />}
              {yAxis?.dataKey ? (
                <Line
                  type="monotone"
                  dataKey={yAxis.dataKey}
                  stroke={colors?.[0]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ) : (
                Object.keys(data?.[0] || {})
                  .filter(key => key !== (xAxis?.dataKey || 'timestamp'))
                  .map((key, index) => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stroke={colors[index % colors.length]}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  ))
              )}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer {...containerProps}>
            <AreaChart data={data}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />}
              <XAxis
                dataKey={xAxis?.dataKey || 'timestamp'}
                tick={{ fontSize: 12, fill: '#6b7280' }}
              />
              <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} domain={yAxis?.domain} />
              {showTooltip && <Tooltip content={<CustomTooltip />} />}
              {showLegend && <Legend content={<CustomLegend />} />}
              {yAxis?.dataKey ? (
                <Area
                  type="monotone"
                  dataKey={yAxis.dataKey}
                  stroke={colors?.[0]}
                  fill={colors?.[0]}
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
              ) : (
                Object.keys(data?.[0] || {})
                  .filter(key => key !== (xAxis?.dataKey || 'timestamp'))
                  .map((key, index) => (
                    <Area
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stackId="1"
                      stroke={colors[index % colors.length]}
                      fill={colors[index % colors.length]}
                      fillOpacity={0.3}
                      strokeWidth={2}
                    />
                  ))
              )}
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer {...containerProps}>
            <BarChart data={data}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />}
              <XAxis
                dataKey={xAxis?.dataKey || 'name'}
                tick={{ fontSize: 12, fill: '#6b7280' }}
              />
              <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} domain={yAxis?.domain} />
              {showTooltip && <Tooltip content={<CustomTooltip />} />}
              {showLegend && <Legend content={<CustomLegend />} />}
              {yAxis?.dataKey ? (
                <Bar dataKey={yAxis.dataKey} fill={colors?.[0]} radius={[4, 4, 0, 0]} />
              ) : (
                Object.keys(data?.[0] || {})
                  .filter(key => key !== (xAxis?.dataKey || 'name'))
                  .map((key, index) => (
                    <Bar
                      key={key}
                      dataKey={key}
                      fill={colors[index % colors.length]}
                      radius={[4, 4, 0, 0]}
                    />
                  ))
              )}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'pie':
      case 'donut':
        return (
          <ResponsiveContainer {...containerProps}>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={type === 'donut' ? 60 : 0}
                outerRadius={100}
                paddingAngle={2}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {data.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              {showTooltip && <Tooltip content={<CustomTooltip />} />}
              {showLegend && <Legend content={<CustomLegend />} />}
            </PieChart>
          </ResponsiveContainer>
        );

      case 'scatter':
        return (
          <ResponsiveContainer {...containerProps}>
            <ScatterChart data={data}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />}
              <XAxis
                dataKey={xAxis?.dataKey || 'x'}
                type="number"
                tick={{ fontSize: 12, fill: '#6b7280' }}
              />
              <YAxis
                dataKey={yAxis?.dataKey || 'y'}
                type="number"
                tick={{ fontSize: 12, fill: '#6b7280' }}
                domain={yAxis?.domain}
              />
              {showTooltip && <Tooltip content={<CustomTooltip />} />}
              {showLegend && <Legend content={<CustomLegend />} />}
              <Scatter name="Data" data={data} fill={colors?.[0]} />
            </ScatterChart>
          </ResponsiveContainer>
        );

      case 'funnel':
        return (
          <ResponsiveContainer {...containerProps}>
            <FunnelChart>
              <Funnel
                dataKey="value"
                data={data}
                isAnimationActive
              >
                <LabelList position="center" fill="#fff" stroke="none" />
                {data['map']((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Funnel>
              {showTooltip && <Tooltip content={<CustomTooltip />} />}
              {showLegend && <Legend content={<CustomLegend />} />}
            </FunnelChart>
          </ResponsiveContainer>
        );

      case 'gauge':
        // Custom gauge implementation using pie chart
        const gaugeData = [
          { name: 'Value', value: data[0]?.value || 0 },
          { name: 'Remaining', value: 100 - (data[0]?.value || 0) }
        ];
        return (
          <ResponsiveContainer {...containerProps}>
            <PieChart>
              <Pie
                data={gaugeData}
                dataKey="value"
                startAngle={180}
                endAngle={0}
                innerRadius={60}
                outerRadius={100}
                stroke="none"
              >
                <Cell fill={colors?.[0]} />
                <Cell fill="#e5e7eb" />
              </Pie>
              <text
                x="50%"
                y="50%"
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-2xl font-bold fill-gray-900"
              >
                {data[0]?.value || 0}%
              </text>
            </PieChart>
          </ResponsiveContainer>
        );

      default:
        return (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 text-sm">Unsupported chart type: {type}</p>
          </div>
        );
    }
  };

  return (
    <div className={clsx('bg-white rounded-lg border border-gray-200 shadow-sm', className)}>
      {(title || subtitle) && (
        <div className="p-6 pb-0">
          {title && <h3 className="text-lg font-medium text-gray-900">{title}</h3>}
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
      )}
      <div className="p-6" style={{ height: height + 'px' }}>
        {renderChart()}
      </div>
    </div>
  );
};

// Predefined chart configurations for common use cases
export const ChartTemplates = {
  userRegistrationsOverTime: (data: any[]): ChartConfig => ({
    type: 'line',
    title: 'User Registrations Over Time',
    data,
    xAxis: { dataKey: 'date', label: 'Date' },
    yAxis: { dataKey: 'registrations', label: 'Registrations' },
    showGrid: true,
    showTooltip: true,
    showLegend: false
  }),

  jobApplicationsByCategory: (data: any[]): ChartConfig => ({
    type: 'bar',
    title: 'Job Applications by Category',
    data,
    xAxis: { dataKey: 'category', label: 'Category' },
    yAxis: { dataKey: 'applications', label: 'Applications' },
    showGrid: true,
    showTooltip: true,
    showLegend: false
  }),

  userDeviceDistribution: (data: any[]): ChartConfig => ({
    type: 'pie',
    title: 'User Device Distribution',
    data,
    showTooltip: true,
    showLegend: true
  }),

  revenueGrowth: (data: any[]): ChartConfig => ({
    type: 'area',
    title: 'Revenue Growth',
    subtitle: 'Monthly recurring revenue over time',
    data,
    xAxis: { dataKey: 'month', label: 'Month' },
    yAxis: { dataKey: 'revenue', label: 'Revenue (MXN)' },
    colors: ['#10b981'],
    showGrid: true,
    showTooltip: true,
    showLegend: false
  }),

  conversionFunnel: (data: any[]): ChartConfig => ({
    type: 'funnel',
    title: 'User Conversion Funnel',
    data,
    showTooltip: true,
    showLegend: true
  }),

  performanceMetrics: (data: any[]): ChartConfig => ({
    type: 'line',
    title: 'Performance Metrics',
    subtitle: 'Page load times over the last 24 hours',
    data,
    xAxis: { dataKey: 'timestamp', label: 'Time' },
    yAxis: { dataKey: 'loadTime', label: 'Load Time (ms)' },
    colors: ['#ef4444'],
    showGrid: true,
    showTooltip: true,
    showLegend: false
  }),

  engagementHeatmap: (data: any[]): ChartConfig => ({
    type: 'scatter',
    title: 'User Engagement Heatmap',
    data,
    xAxis: { dataKey: 'hour', label: 'Hour of Day' },
    yAxis: { dataKey: 'dayOfWeek', label: 'Day of Week' },
    showGrid: true,
    showTooltip: true,
    showLegend: false
  }),

  goalProgress: (value: number): ChartConfig => ({
    type: 'gauge',
    title: 'Goal Progress',
    data: [{ value }],
    showTooltip: false,
    showLegend: false
  })
};

export default ChartWidget;