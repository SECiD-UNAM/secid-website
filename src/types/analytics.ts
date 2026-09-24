// Analytics types for comprehensive dashboard and monitoring

export interface AnalyticsDateRange {
  start: Date;
  end: Date;
  preset?:
    | 'today'
    | 'yesterday'
    | 'last7days'
    | 'last30days'
    | 'last90days'
    | 'last12months'
    | 'custom';
}

export interface AnalyticsFilter {
  dateRange: AnalyticsDateRange;
  location?: string[];
  userType?: 'all' | 'members' | 'guests' | 'premium';
  deviceType?: 'all' | 'desktop' | 'mobile' | 'tablet';
  browser?: string[];
  source?: string[];
}

// User Analytics
export interface UserAnalytics {
  totalUsers: number;
  newUsers: number;
  activeUsers: number;
  returningUsers: number;
  userRetention: {
    day1: number;
    day7: number;
    day30: number;
    day90: number;
  };
  registrationTrend: TimeSeriesData[];
  activeDailyUsers: TimeSeriesData[];
  activeWeeklyUsers: TimeSeriesData[];
  activeMonthlyUsers: TimeSeriesData[];
  userSegments: {
    segment: string;
    count: number;
    percentage: number;
  }[];
  demographicData: {
    age: { range: string; count: number }[];
    gender: { type: string; count: number }[];
    education: { level: string; count: number }[];
    experience: { years: string; count: number }[];
  };
}

// Content Analytics
export interface ContentAnalytics {
  jobAnalytics: {
    totalViews: number;
    uniqueViews: number;
    applications: number;
    applicationRate: number;
    mostViewedJobs: {
      jobId: string;
      title: string;
      company: string;
      views: number;
      applications: number;
    }[];
    jobsByCategory: {
      category: string;
      count: number;
      views: number;
      applications: number;
    }[];
    jobTrends: TimeSeriesData[];
  };
  eventAnalytics: {
    totalRegistrations: number;
    uniqueRegistrants: number;
    attendanceRate: number;
    noShowRate: number;
    popularEvents: {
      eventId: string;
      title: string;
      registrations: number;
      attendance: number;
    }[];
    eventsByType: {
      type: string;
      count: number;
      registrations: number;
    }[];
    registrationTrends: TimeSeriesData[];
  };
  pageAnalytics: {
    pageViews: number;
    uniquePageViews: number;
    bounceRate: number;
    avgTimeOnPage: number;
    exitRate: number;
    topPages: {
      page: string;
      views: number;
      uniqueViews: number;
      avgTime: number;
      bounceRate: number;
    }[];
    pageTrends: TimeSeriesData[];
  };
}

// Engagement Analytics
export interface EngagementAnalytics {
  forumAnalytics: {
    totalPosts: number;
    totalTopics: number;
    activeUsers: number;
    avgPostsPerUser: number;
    responseRate: number;
    avgResponseTime: number; // in hours
    topContributors: {
      userId: string;
      userName: string;
      posts: number;
      topics: number;
      reputation: number;
    }[];
    categoryEngagement: {
      categoryId: string;
      categoryName: string;
      posts: number;
      topics: number;
      views: number;
    }[];
    engagementTrends: TimeSeriesData[];
  };
  mentorshipAnalytics: {
    totalMatches: number;
    activeMatches: number;
    completedSessions: number;
    avgSessionRating: number;
    matchSuccessRate: number;
    avgMatchDuration: number; // in days
    topMentors: {
      mentorId: string;
      mentorName: string;
      matches: number;
      sessions: number;
      rating: number;
    }[];
    mentorshipTrends: TimeSeriesData[];
  };
  networkingAnalytics: {
    totalConnections: number;
    newConnections: number;
    activeConversations: number;
    avgConnectionsPerUser: number;
    connectionGrowth: TimeSeriesData[];
    networkDensity: number;
    influencers: {
      userId: string;
      userName: string;
      connections: number;
      influence: number;
    }[];
  };
}

// Revenue Analytics
export interface RevenueAnalytics {
  totalRevenue: number;
  monthlyRecurringRevenue: number;
  annualRecurringRevenue: number;
  averageRevenuePerUser: number;
  customerLifetimeValue: number;
  churnRate: number;
  revenueGrowth: number;
  revenueBySource: {
    source: string;
    revenue: number;
    percentage: number;
  }[];
  subscriptionAnalytics: {
    totalSubscriptions: number;
    activeSubscriptions: number;
    newSubscriptions: number;
    cancelledSubscriptions: number;
    trialConversions: number;
    upgradeRate: number;
    downgradeRate: number;
    subscriptionTrends: TimeSeriesData[];
  };
  paymentAnalytics: {
    successfulPayments: number;
    failedPayments: number;
    failureRate: number;
    averageTransactionValue: number;
    paymentMethods: {
      method: string;
      count: number;
      percentage: number;
    }[];
  };
}

// Geographic Analytics
export interface GeographicAnalytics {
  usersByCountry: {
    country: string;
    code: string;
    users: number;
    percentage: number;
  }[];
  usersByRegion: {
    region: string;
    users: number;
    percentage: number;
  }[];
  usersByCity: {
    city: string;
    users: number;
    percentage: number;
  }[];
  trafficByLocation: {
    location: string;
    sessions: number;
    pageViews: number;
    bounceRate: number;
  }[];
  heatMapData: {
    latitude: number;
    longitude: number;
    value: number;
  }[];
}

// Performance Analytics
export interface PerformanceAnalytics {
  pageLoadMetrics: {
    averageLoadTime: number;
    medianLoadTime: number;
    fastLoads: number; // < 2.5s
    slowLoads: number; // > 4s
    coreWebVitals: {
      lcp: number; // Largest Contentful Paint
      fid: number; // First Input Delay
      cls: number; // Cumulative Layout Shift
      fcp: number; // First Contentful Paint
      ttfb: number; // Time to First Byte
    };
    loadTimeByPage: {
      page: string;
      avgLoadTime: number;
      samples: number;
    }[];
    loadTimeTrends: TimeSeriesData[];
  };
  apiPerformance: {
    averageResponseTime: number;
    successRate: number;
    errorRate: number;
    throughput: number; // requests per minute
    endpointMetrics: {
      endpoint: string;
      avgResponseTime: number;
      successRate: number;
      requestCount: number;
    }[];
    errorsByType: {
      type: string;
      count: number;
      percentage: number;
    }[];
  };
  userExperience: {
    overallScore: number;
    usabilityScore: number;
    accessibilityScore: number;
    performanceScore: number;
    browserCompatibility: {
      browser: string;
      version: string;
      compatibility: number;
    }[];
  };
}

// Error Analytics
export interface ErrorAnalytics {
  totalErrors: number;
  uniqueErrors: number;
  errorRate: number;
  criticalErrors: number;
  errorsByType: {
    type: string;
    count: number;
    percentage: number;
  }[];
  errorsByPage: {
    page: string;
    errors: number;
    errorRate: number;
  }[];
  errorTrends: TimeSeriesData[];
  topErrors: {
    errorId: string;
    message: string;
    count: number;
    affectedUsers: number;
    firstSeen: Date;
    lastSeen: Date;
  }[];
  errorResolution: {
    resolved: number;
    pending: number;
    ignored: number;
  };
}

// Real-time Analytics
export interface RealTimeAnalytics {
  activeUsers: number;
  currentSessions: number;
  pageViewsPerMinute: number;
  topActivePages: {
    page: string;
    activeUsers: number;
  }[];
  realtimeEvents: {
    eventType: string;
    count: number;
    timestamp: Date;
  }[];
  systemStatus: {
    apiStatus: 'healthy' | 'degraded' | 'down';
    databaseStatus: 'healthy' | 'degraded' | 'down';
    cdnStatus: 'healthy' | 'degraded' | 'down';
    responseTime: number;
    uptime: number;
  };
}

// A/B Testing Analytics
export interface ABTestAnalytics {
  tests: {
    testId: string;
    testName: string;
    status: 'draft' | 'running' | 'paused' | 'completed';
    startDate: Date;
    endDate?: Date;
    participants: number;
    variants: {
      variantId: string;
      name: string;
      traffic: number;
      conversions: number;
      conversionRate: number;
      significance: number;
    }[];
    primaryMetric: string;
    primaryMetricValue: number;
    isSignificant: boolean;
    winner?: string;
  }[];
  overallTestingImpact: {
    totalTests: number;
    activeTests: number;
    completedTests: number;
    averageLift: number;
    totalParticipants: number;
  };
}

// Funnel Analytics
export interface FunnelAnalytics {
  userJourney: {
    step: string;
    users: number;
    dropOffRate: number;
    conversionRate: number;
  }[];
  conversionFunnels: {
    funnelName: string;
    totalUsers: number;
    conversions: number;
    conversionRate: number;
    steps: {
      stepName: string;
      users: number;
      dropOff: number;
      conversionRate: number;
    }[];
  }[];
  goalCompletions: {
    goal: string;
    completions: number;
    conversionRate: number;
    averageTime: number;
  }[];
}

// Search Analytics
export interface SearchAnalytics {
  totalSearches: number;
  uniqueSearchers: number;
  averageResultsPerSearch: number;
  clickThroughRate: number;
  popularQueries: {
    query: string;
    searches: number;
    results: number;
    clicks: number;
    ctr: number;
  }[];
  zeroResultQueries: {
    query: string;
    searches: number;
  }[];
  searchTrends: TimeSeriesData[];
  searchByCategory: {
    category: string;
    searches: number;
    percentage: number;
  }[];
}

// Technology Analytics
export interface TechnologyAnalytics {
  browserUsage: {
    browser: string;
    version: string;
    users: number;
    percentage: number;
  }[];
  deviceUsage: {
    deviceType: 'desktop' | 'mobile' | 'tablet';
    users: number;
    percentage: number;
    avgSessionDuration: number;
    bounceRate: number;
  }[];
  operatingSystem: {
    os: string;
    version: string;
    users: number;
    percentage: number;
  }[];
  screenResolution: {
    resolution: string;
    users: number;
    percentage: number;
  }[];
  networkSpeed: {
    speed: 'slow' | 'medium' | 'fast';
    users: number;
    percentage: number;
    avgLoadTime: number;
  }[];
}

// Comprehensive Analytics Dashboard Data
export interface AnalyticsDashboardData {
  userAnalytics: UserAnalytics;
  contentAnalytics: ContentAnalytics;
  engagementAnalytics: EngagementAnalytics;
  revenueAnalytics: RevenueAnalytics;
  geographicAnalytics: GeographicAnalytics;
  performanceAnalytics: PerformanceAnalytics;
  errorAnalytics: ErrorAnalytics;
  realTimeAnalytics: RealTimeAnalytics;
  abTestAnalytics: ABTestAnalytics;
  funnelAnalytics: FunnelAnalytics;
  searchAnalytics: SearchAnalytics;
  technologyAnalytics: TechnologyAnalytics;
  lastUpdated: Date;
}

// Time Series Data
export interface TimeSeriesData {
  timestamp: Date;
  value: number;
  label?: string;
  metadata?: Record<string, any>;
}

// Chart Configuration
export interface ChartConfig {
  type:
    | 'line'
    | 'bar'
    | 'area'
    | 'pie'
    | 'donut'
    | 'scatter'
    | 'heatmap'
    | 'funnel'
    | 'gauge';
  title: string;
  subtitle?: string;
  data: any[];
  xAxis?: {
    dataKey: string;
    label?: string;
    type?: 'category' | 'number' | 'time';
  };
  yAxis?: {
    dataKey?: string;
    label?: string;
    domain?: [number, number];
  };
  colors?: string[];
  showLegend?: boolean;
  showTooltip?: boolean;
  showGrid?: boolean;
  responsive?: boolean;
  height?: number;
  width?: number;
}

// Metric Card Configuration
export interface MetricCardConfig {
  title: string;
  value: number | string;
  previousValue?: number | string;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  unit?: string;
  format?: 'number' | 'currency' | 'percentage' | 'duration' | 'custom';
  icon?: string;
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  trend?: TimeSeriesData[];
  target?: number;
  description?: string;
}

// Report Configuration
export interface ReportConfig {
  id: string;
  name: string;
  description: string;
  type: 'scheduled' | 'one-time';
  format: 'pdf' | 'csv' | 'excel';
  sections: string[];
  filters: AnalyticsFilter;
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    time: string; // HH:mm format
    dayOfWeek?: number; // 0-6 for weekly
    dayOfMonth?: number; // 1-31 for monthly
    recipients: string[];
  };
  lastGenerated?: Date;
  isActive: boolean;
}

// Analytics Event Tracking
export interface AnalyticsEventTrack {
  eventName: string;
  userId?: string;
  sessionId: string;
  timestamp: Date;
  properties: Record<string, any>;
  page: string;
  referrer?: string;
  userAgent: string;
  ipAddress?: string;
  location?: {
    country: string;
    region: string;
    city: string;
  };
}

// Analytics Dashboard Configuration
export interface DashboardConfig {
  id: string;
  name: string;
  layout: {
    rows: {
      columns: {
        widget: string;
        size: 1 | 2 | 3 | 4 | 6 | 12; // Bootstrap grid system
        config?: any;
      }[];
    }[];
  };
  filters: AnalyticsFilter;
  refreshInterval: number; // in seconds
  isDefault: boolean;
  userId?: string; // For user-specific dashboards
  isPublic: boolean;
  permissions: string[];
}

// Performance Monitoring
export interface PerformanceMonitorConfig {
  metrics: string[];
  thresholds: Record<string, number>;
  alerting: {
    enabled: boolean;
    channels: ('email' | 'slack' | 'webhook')[];
    recipients: string[];
  };
  sampling: {
    enabled: boolean;
    rate: number; // 0-1
  };
}

export interface PerformanceAlert {
  id: string;
  metric: string;
  value: number;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  acknowledgedBy?: string;
}
