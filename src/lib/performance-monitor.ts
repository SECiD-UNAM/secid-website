import { 
import { db} from './firebase';

  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  Timestamp 
} from 'firebase/firestore';
import type { 
  PerformanceMonitorConfig, 
  PerformanceAlert, 
  PerformanceAnalytics 
} from '../types/analytics';

/**
 * Performance Monitoring System
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private config: PerformanceMonitorConfig;
  private observers: Map<string, PerformanceObserver> = new Map();
  private metrics: Map<string, number[]> = new Map();
  private alertThresholds: Map<string, number> = new Map();

  constructor(config: PerformanceMonitorConfig) {
    this.config = config;
    this.initializeThresholds();
    this.initializeObservers();
  }

  static getInstance(config?: PerformanceMonitorConfig): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      if (!config) {
        throw new Error('PerformanceMonitor config required for first initialization');
      }
      PerformanceMonitor.instance = new PerformanceMonitor(config);
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Initialize performance thresholds
   */
  private initializeThresholds(): void {
    Object.entries(this.config.thresholds).forEach(([metric, threshold]) => {
      this.alertThresholds.set(metric, threshold);
    });
  }

  /**
   * Initialize performance observers
   */
  private initializeObservers(): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      console.warn('PerformanceObserver not supported');
      return;
    }

    // Core Web Vitals Observer
    this.initializeCoreWebVitalsObserver();
    
    // Navigation Observer
    this.initializeNavigationObserver();
    
    // Resource Observer
    this.initializeResourceObserver();
    
    // Long Task Observer
    this.initializeLongTaskObserver();
    
    // Layout Shift Observer
    this.initializeLayoutShiftObserver();
    
    // First Input Delay Observer
    this.initializeFirstInputDelayObserver();
  }

  /**
   * Core Web Vitals Observer
   */
  private initializeCoreWebVitalsObserver(): void {
    try {
      // Largest Contentful Paint (LCP)
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        if(lastEntry) {
          this.recordMetric('lcp', lastEntry.startTime);
          this.checkAlert('lcp', lastEntry.startTime);
        }
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.set('lcp', lcpObserver);

      // First Contentful Paint (FCP)
      const fcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry['name'] === 'first-contentful-paint') {
            this.recordMetric('fcp', entry.startTime);
            this.checkAlert('fcp', entry.startTime);
          }
        });
      });
      fcpObserver.observe({ entryTypes: ['paint'] });
      this.observers.set('fcp', fcpObserver);

    } catch (error) {
      console.warn('Failed to initialize Core Web Vitals observer:', error);
    }
  }

  /**
   * Navigation Observer
   */
  private initializeNavigationObserver(): void {
    try {
      const navigationObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          // Time to First Byte (TTFB)
          const ttfb = entry.responseStart - entry.requestStart;
          this.recordMetric('ttfb', ttfb);
          this.checkAlert('ttfb', ttfb);

          // DOM Content Loaded
          const domContentLoaded = entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart;
          this.recordMetric('domContentLoaded', domContentLoaded);
          this.checkAlert('domContentLoaded', domContentLoaded);

          // Page Load Time
          const pageLoadTime = entry.loadEventEnd - entry.navigationStart;
          this.recordMetric('pageLoadTime', pageLoadTime);
          this.checkAlert('pageLoadTime', pageLoadTime);

          // DNS Lookup Time
          const dnsTime = entry.domainLookupEnd - entry.domainLookupStart;
          this.recordMetric('dnsTime', dnsTime);

          // Connection Time
          const connectionTime = entry.connectEnd - entry.connectStart;
          this.recordMetric('connectionTime', connectionTime);

          // Server Response Time
          const serverResponseTime = entry.responseEnd - entry.responseStart;
          this.recordMetric('serverResponseTime', serverResponseTime);
        });
      });
      navigationObserver.observe({ entryTypes: ['navigation'] });
      this.observers.set('navigation', navigationObserver);

    } catch (error) {
      console.warn('Failed to initialize navigation observer:', error);
    }
  }

  /**
   * Resource Observer
   */
  private initializeResourceObserver(): void {
    try {
      const resourceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          const resourceLoadTime = entry.responseEnd - entry.startTime;
          
          // Track by resource type
          const resourceType = entry.initiatorType || 'other';
          this.recordMetric(`resource_${resourceType}`, resourceLoadTime);
          
          // Check for slow resources
          if (resourceLoadTime > 1000) { // 1 second threshold
            this.checkAlert('slowResource', resourceLoadTime, {
              name: entry['name'],
              type: resourceType,
              size: entry.transferSize
            });
          }
        });
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.set('resource', resourceObserver);

    } catch (error) {
      console.warn('Failed to initialize resource observer:', error);
    }
  }

  /**
   * Long Task Observer
   */
  private initializeLongTaskObserver(): void {
    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          this.recordMetric('longTask', entry.duration);
          this.checkAlert('longTask', entry.duration, {
            startTime: entry.startTime,
            duration: entry.duration
          });
        });
      });
      longTaskObserver.observe({ entryTypes: ['longtask'] });
      this.observers.set('longtask', longTaskObserver);

    } catch (error) {
      console.warn('Failed to initialize long task observer:', error);
    }
  }

  /**
   * Layout Shift Observer
   */
  private initializeLayoutShiftObserver(): void {
    try {
      let clsValue = 0;
      let sessionValue = 0;
      let sessionEntries: any[] = [];

      const layoutShiftObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            const firstSessionEntry = sessionEntries?.[0];
            const lastSessionEntry = sessionEntries[sessionEntries.length - 1];

            if (sessionValue === 0 || 
                entry.startTime - lastSessionEntry.startTime < 1000 ||
                entry.startTime - firstSessionEntry.startTime < 5000) {
              sessionValue += entry.value;
              sessionEntries.push(entry);
            } else {
              clsValue = Math.max(clsValue, sessionValue);
              sessionValue = entry.value;
              sessionEntries = [entry];
            }
          }
        });

        // Update CLS value
        clsValue = Math.max(clsValue, sessionValue);
        this.recordMetric('cls', clsValue);
        this.checkAlert('cls', clsValue);
      });

      layoutShiftObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.set('layout-shift', layoutShiftObserver);

    } catch (error) {
      console.warn('Failed to initialize layout shift observer:', error);
    }
  }

  /**
   * First Input Delay Observer
   */
  private initializeFirstInputDelayObserver(): void {
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          const fid = entry.processingStart - entry.startTime;
          this.recordMetric('fid', fid);
          this.checkAlert('fid', fid);
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.observers.set('first-input', fidObserver);

    } catch (error) {
      console.warn('Failed to initialize first input delay observer:', error);
    }
  }

  /**
   * Record performance metric
   */
  private recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const values = this.metrics.get(name)!;
    values.push(value);
    
    // Keep only last 100 values
    if (values.length > 100) {
      values.shift();
    }

    // Store in Firebase if sampling is enabled
    if (this.config.sampling.enabled) {
      const shouldSample = Math.random() < this.config.sampling.rate;
      if(shouldSample) {
        this.storeMetric(name, value);
      }
    }
  }

  /**
   * Store metric in Firebase
   */
  private async storeMetric(name: string, value: number): Promise<void> {
    try {
      await addDoc(collection(db, 'performance_metrics'), {
        metric: name,
        value,
        timestamp: Timestamp.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        connection: this.getConnectionInfo()
      });
    } catch (error) {
      console.error('Failed to store performance metric:', error);
    }
  }

  /**
   * Check if metric exceeds alert threshold
   */
  private checkAlert(metric: string, value: number, metadata?: any): void {
    const threshold = this.alertThresholds.get(metric);
    if (!threshold || value <= threshold) return;

    const severity = this.calculateSeverity(metric, value, threshold);
    
    const alert: PerformanceAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      metric,
      value,
      threshold,
      severity,
      message: this.generateAlertMessage(metric, value, threshold),
      timestamp: new Date(),
      resolved: false
    };

    this.triggerAlert(alert, metadata);
  }

  /**
   * Calculate alert severity
   */
  private calculateSeverity(metric: string, value: number, threshold: number): 'low' | 'medium' | 'high' | 'critical' {
    const ratio = value / threshold;
    
    if (ratio >= 3) return 'critical';
    if (ratio >= 2) return 'high';
    if (ratio >= 1.5) return 'medium';
    return 'low';
  }

  /**
   * Generate alert message
   */
  private generateAlertMessage(metric: string, value: number, threshold: number): string {
    const metricNames: Record<string, string> = {
      lcp: 'Largest Contentful Paint',
      fcp: 'First Contentful Paint',
      cls: 'Cumulative Layout Shift',
      fid: 'First Input Delay',
      ttfb: 'Time to First Byte',
      pageLoadTime: 'Page Load Time',
      longTask: 'Long Task',
      slowResource: 'Slow Resource'
    };

    const name = metricNames[metric] || metric;
    return `${name} (${value.toFixed(2)}) exceeded threshold (${threshold})`;
  }

  /**
   * Trigger alert
   */
  private async triggerAlert(alert: PerformanceAlert, metadata?: any): Promise<void> {
    if (!this.config.alerting.enabled) return;

    try {
      // Store alert in Firebase
      await addDoc(collection(db, 'performance_alerts'), {
        ...alert,
        metadata,
        timestamp: Timestamp.fromDate(alert.timestamp)
      });

      // Send notifications based on configured channels
      if (this.config.alerting.channels.includes('email')) {
        await this.sendEmailAlert(alert);
      }
      
      if (this.config.alerting.channels.includes('slack')) {
        await this.sendSlackAlert(alert);
      }
      
      if (this.config.alerting.channels.includes('webhook')) {
        await this.sendWebhookAlert(alert);
      }

    } catch (error) {
      console.error('Failed to trigger alert:', error);
    }
  }

  /**
   * Send email alert
   */
  private async sendEmailAlert(alert: PerformanceAlert): Promise<void> {
    // Implementation would depend on your email service
    console.log('Email alert:', alert);
  }

  /**
   * Send Slack alert
   */
  private async sendSlackAlert(alert: PerformanceAlert): Promise<void> {
    // Implementation would depend on your Slack integration
    console.log('Slack alert:', alert);
  }

  /**
   * Send webhook alert
   */
  private async sendWebhookAlert(alert: PerformanceAlert): Promise<void> {
    // Implementation would depend on your webhook endpoint
    console.log('Webhook alert:', alert);
  }

  /**
   * Get connection information
   */
  private getConnectionInfo(): any {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData
      };
    }
    return null;
  }

  /**
   * Get current performance metrics
   */
  getCurrentMetrics(): Record<string, number[]> {
    const result: Record<string, number[]> = {};
    this.metrics.forEach((values, name) => {
      result[name] = [...values];
    });
    return result;
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): Record<string, { avg: number; min: number; max: number; p95: number }> {
    const summary: Record<string, any> = {};
    
    this.metrics.forEach((values, name) => {
      if (values.length === 0) return;
      
      const sorted = [...values].sort((a, b) => a - b);
      const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
      const min = sorted?.[0];
      const max = sorted[sorted.length - 1];
      const p95Index = Math.floor(sorted.length * 0.95);
      const p95 = sorted[p95Index];
      
      summary[name] = { avg, min, max, p95 };
    });
    
    return summary;
  }

  /**
   * Get performance analytics data
   */
  async getAnalyticsData(startDate: Date, endDate: Date): Promise<PerformanceAnalytics> {
    try {
      const metricsQuery = query(
        collection(db, 'performance_metrics'),
        where('timestamp', '>=', Timestamp.fromDate(startDate)),
        where('timestamp', '<=', Timestamp.fromDate(endDate)),
        orderBy('timestamp', 'desc')
      );

      const snapshot = await getDocs(metricsQuery);
      const metrics = snapshot['docs'].map(doc => doc['data']());

      // Process metrics data
      const pageLoadTimes = metrics.filter(m => m.metric === 'pageLoadTime').map(m => m.value);
      const lcpValues = metrics.filter(m => m.metric === 'lcp').map(m => m.value);
      const fidValues = metrics.filter(m => m.metric === 'fid').map(m => m.value);
      const clsValues = metrics.filter(m => m.metric === 'cls').map(m => m.value);
      const fcpValues = metrics.filter(m => m.metric === 'fcp').map(m => m.value);
      const ttfbValues = metrics.filter(m => m.metric === 'ttfb').map(m => m.value);

      const averageLoadTime = pageLoadTimes.length > 0 
        ? pageLoadTimes.reduce((sum, val) => sum + val, 0) / pageLoadTimes.length 
        : 0;

      const medianLoadTime = pageLoadTimes.length > 0
        ? pageLoadTimes.sort((a, b) => a - b)[Math.floor(pageLoadTimes.length / 2)]
        : 0;

      const fastLoads = pageLoadTimes.filter(time => time < 2500).length;
      const slowLoads = pageLoadTimes.filter(time => time > 4000).length;

      return {
        pageLoadMetrics: {
          averageLoadTime,
          medianLoadTime,
          fastLoads,
          slowLoads,
          coreWebVitals: {
            lcp: lcpValues.length > 0 ? lcpValues.reduce((sum, val) => sum + val, 0) / lcpValues.length : 0,
            fid: fidValues.length > 0 ? fidValues.reduce((sum, val) => sum + val, 0) / fidValues.length : 0,
            cls: clsValues.length > 0 ? clsValues.reduce((sum, val) => sum + val, 0) / clsValues.length : 0,
            fcp: fcpValues.length > 0 ? fcpValues.reduce((sum, val) => sum + val, 0) / fcpValues.length : 0,
            ttfb: ttfbValues.length > 0 ? ttfbValues.reduce((sum, val) => sum + val, 0) / ttfbValues.length : 0
          },
          loadTimeByPage: this.groupMetricsByPage(metrics.filter(m => m.metric === 'pageLoadTime')),
          loadTimeTrends: this.generateLoadTimeTrends(metrics.filter(m => m.metric === 'pageLoadTime'))
        },
        apiPerformance: {
          averageResponseTime: 0, // Would need API metrics
          successRate: 0,
          errorRate: 0,
          throughput: 0,
          endpointMetrics: [],
          errorsByType: []
        },
        userExperience: {
          overallScore: this.calculateOverallScore({
            lcp: lcpValues,
            fid: fidValues,
            cls: clsValues,
            pageLoad: pageLoadTimes
          }),
          usabilityScore: 0,
          accessibilityScore: 0,
          performanceScore: this.calculatePerformanceScore(pageLoadTimes),
          browserCompatibility: []
        }
      };

    } catch (error) {
      console.error('Failed to get performance analytics:', error);
      throw error;
    }
  }

  /**
   * Group metrics by page
   */
  private groupMetricsByPage(metrics: any[]): any[] {
    const pageMetrics: Record<string, number[]> = {};
    
    metrics.forEach(metric => {
      const url = new URL(metric.url);
      const page = url.pathname;
      
      if (!pageMetrics[page]) {
        pageMetrics[page] = [];
      }
      pageMetrics[page].push(metric.value);
    });

    return Object.entries(pageMetrics).map(([page, values]) => ({
      page,
      avgLoadTime: values.reduce((sum, val) => sum + val, 0) / values.length,
      samples: values.length
    }));
  }

  /**
   * Generate load time trends
   */
  private generateLoadTimeTrends(metrics: any[]): any[] {
    const trends: Record<string, number[]> = {};
    
    metrics.forEach(metric => {
      const date = metric.timestamp.toDate().toISOString().split('T')[0];
      if (!trends[date]) {
        trends[date] = [];
      }
      trends[date].push(metric.value);
    });

    return Object.entries(trends).map(([date, values]) => ({
      timestamp: new Date(date),
      value: values.reduce((sum, val) => sum + val, 0) / values.length
    }));
  }

  /**
   * Calculate overall performance score
   */
  private calculateOverallScore(metrics: {
    lcp: number[];
    fid: number[];
    cls: number[];
    pageLoad: number[];
  }): number {
    let score = 100;
    
    // LCP scoring (0-2.5s = good, 2.5-4s = needs improvement, >4s = poor)
    if (metrics.lcp.length > 0) {
      const avgLcp = metrics.lcp.reduce((sum, val) => sum + val, 0) / metrics.lcp.length;
      if (avgLcp > 4000) score -= 25;
      else if (avgLcp > 2500) score -= 15;
    }
    
    // FID scoring (0-100ms = good, 100-300ms = needs improvement, >300ms = poor)
    if (metrics.fid.length > 0) {
      const avgFid = metrics.fid.reduce((sum, val) => sum + val, 0) / metrics.fid.length;
      if (avgFid > 300) score -= 25;
      else if (avgFid > 100) score -= 15;
    }
    
    // CLS scoring (0-0.1 = good, 0.1-0.25 = needs improvement, >0.25 = poor)
    if (metrics.cls.length > 0) {
      const avgCls = metrics.cls.reduce((sum, val) => sum + val, 0) / metrics.cls.length;
      if (avgCls > 0.25) score -= 25;
      else if (avgCls > 0.1) score -= 15;
    }
    
    // Page load scoring
    if (metrics.pageLoad.length > 0) {
      const avgPageLoad = metrics.pageLoad.reduce((sum, val) => sum + val, 0) / metrics.pageLoad.length;
      if (avgPageLoad > 5000) score -= 25;
      else if (avgPageLoad > 3000) score -= 15;
    }
    
    return Math.max(0, score);
  }

  /**
   * Calculate performance score
   */
  private calculatePerformanceScore(pageLoadTimes: number[]): number {
    if (pageLoadTimes.length === 0) return 0;
    
    const avgLoadTime = pageLoadTimes.reduce((sum, val) => sum + val, 0) / pageLoadTimes.length;
    
    // Score based on average load time
    if (avgLoadTime <= 1000) return 100;
    if (avgLoadTime <= 2000) return 90;
    if (avgLoadTime <= 3000) return 75;
    if (avgLoadTime <= 5000) return 50;
    return 25;
  }

  /**
   * Start monitoring
   */
  start(): void {
    // Observers are already initialized in constructor
    console.log('Performance monitoring started');
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    this.observers.forEach(observer => {
      observer.disconnect();
    });
    this.observers.clear();
    console.log('Performance monitoring stopped');
  }

  /**
   * Clean up
   */
  dispose(): void {
    this.stop();
    this.metrics.clear();
    this.alertThresholds.clear();
  }
}

// Default configuration
export const defaultPerformanceConfig: PerformanceMonitorConfig = {
  metrics: ['lcp', 'fcp', 'cls', 'fid', 'ttfb', 'pageLoadTime', 'longTask'],
  thresholds: {
    lcp: 2500, // 2.5 seconds
    fcp: 1800, // 1.8 seconds
    cls: 0.1,  // 0.1 CLS score
    fid: 100,  // 100ms
    ttfb: 600, // 600ms
    pageLoadTime: 3000, // 3 seconds
    longTask: 50 // 50ms
  },
  alerting: {
    enabled: true,
    channels: ['email'],
    recipients: []
  },
  sampling: {
    enabled: true,
    rate: 0.1 // 10% sampling
  }
};

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance(defaultPerformanceConfig);

// Convenience functions
export const startPerformanceMonitoring = () => {
  performanceMonitor.start();
};

export const stopPerformanceMonitoring = () => {
  performanceMonitor.stop();
};

export const getPerformanceMetrics = () => {
  return performanceMonitor.getCurrentMetrics();
};

export const getPerformanceSummary = () => {
  return performanceMonitor.getPerformanceSummary();
};