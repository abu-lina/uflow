interface MonitoringConfig {
  analytics: {
    enabled: boolean;
    measurementId?: string;
    customEvents?: boolean;
  };
  errorTracking: {
    enabled: boolean;
    sampleRate: number;
    ignorePatterns: string[];
  };
  performance: {
    enabled: boolean;
    sampleRate: number;
    longTaskThreshold: number;
  };
  healthCheck: {
    enabled: boolean;
    interval: number;
    timeout: number;
    path: string;
  };
}

export const monitoringConfig: MonitoringConfig = {
  analytics: {
    enabled: process.env.NODE_ENV === 'production',
    measurementId: process.env.NEXT_PUBLIC_MEASUREMENT_ID,
    customEvents: true,
  },
  errorTracking: {
    enabled: process.env.NODE_ENV === 'production',
    sampleRate: 1.0,
    ignorePatterns: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      'Network request failed',
    ],
  },
  performance: {
    enabled: process.env.NODE_ENV === 'production',
    sampleRate: 0.1,
    longTaskThreshold: 50, // 50ms
  },
  healthCheck: {
    enabled: true,
    interval: 30000, // 30 seconds
    timeout: 5000,  // 5 seconds
    path: '/api/health',
  },
};

// Custom event types for analytics
export const AnalyticsEvents = {
  PWA: {
    INSTALL: 'pwa_install',
    UPDATE: 'pwa_update',
    OFFLINE: 'pwa_offline',
    ONLINE: 'pwa_online',
  },
  PERFORMANCE: {
    LCP: 'performance_lcp',
    FID: 'performance_fid',
    CLS: 'performance_cls',
    LONG_TASK: 'performance_long_task',
  },
  ERROR: {
    JS_ERROR: 'error_js',
    API_ERROR: 'error_api',
    NETWORK_ERROR: 'error_network',
  },
} as const;

// Health check response type
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  services: {
    database: boolean;
    storage: boolean;
    auth: boolean;
  };
} 