/**
 * Environment Configuration and Validation
 *
 * This file validates environment variables at startup and provides
 * typed access to configuration throughout the application.
 */

// Required environment variables
const REQUIRED_ENV_VARS = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
] as const;

// Optional environment variables with defaults
const OPTIONAL_ENV_VARS = {
  VITE_ENVIRONMENT: 'development',
  VITE_API_TIMEOUT: '10000',
  VITE_ENABLE_LOGGING: 'false',
  VITE_ENABLE_SERVICE_WORKER: 'true',
  VITE_DEBUG_MODE: 'false',
  VITE_LOG_LEVEL: 'error',
  VITE_ENABLE_OFFLINE_MODE: 'true',
  VITE_CORS_ORIGINS: 'http://localhost:5173',
  VITE_ENABLE_AI_FEATURES: 'true',
  VITE_ENABLE_EXPORT: 'true',
  VITE_ENABLE_CLOUD_SYNC: 'true',
  VITE_ENABLE_TELEGRAM: 'false',
  VITE_ENABLE_ANALYTICS: 'false',
  VITE_BUNDLE_ANALYZER: 'false',
  VITE_SENTRY_ENVIRONMENT: 'development',
} as const;

/**
 * Validate environment variables
 * Throws an error if required variables are missing or invalid
 */
export function validateEnv(): void {
  const missing: string[] = [];
  const invalid: string[] = [];

  // Check required variables
  for (const key of REQUIRED_ENV_VARS) {
    const value = import.meta.env[key];

    if (!value) {
      missing.push(key);
      continue;
    }

    // Validate Supabase URL format
    if (key === 'VITE_SUPABASE_URL') {
      if (!value.startsWith('https://') || !value.includes('.supabase.co')) {
        invalid.push(`${key}: Invalid Supabase URL format. Expected: https://[project].supabase.co`);
      }
    }

    // Validate Supabase Anon Key format (JWT)
    if (key === 'VITE_SUPABASE_ANON_KEY') {
      const parts = value.split('.');
      if (parts.length !== 3 || !parts[0].startsWith('eyJ')) {
        invalid.push(`${key}: Invalid JWT format`);
      }
    }
  }

  // Report errors
  if (missing.length > 0 || invalid.length > 0) {
    const errorMessages: string[] = [];

    if (missing.length > 0) {
      errorMessages.push(
        `Missing required environment variables:\n  - ${missing.join('\n  - ')}`
      );
    }

    if (invalid.length > 0) {
      errorMessages.push(
        `Invalid environment variables:\n  - ${invalid.join('\n  - ')}`
      );
    }

    errorMessages.push(
      '\nPlease copy .env.example to .env and fill in the required values.'
    );

    throw new Error(errorMessages.join('\n\n'));
  }
}

/**
 * Get environment variable with fallback to default
 */
function getEnvVar(key: keyof typeof OPTIONAL_ENV_VARS): string {
  return import.meta.env[key] || OPTIONAL_ENV_VARS[key];
}

/**
 * Get boolean environment variable
 */
function getEnvBool(key: keyof typeof OPTIONAL_ENV_VARS, defaultValue = false): boolean {
  const value = import.meta.env[key];
  if (value === undefined) return defaultValue;
  return value === 'true';
}

/**
 * Environment configuration object
 * Provides typed access to all environment variables
 */
export const ENV = {
  // Environment info
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  mode: import.meta.env.MODE,
  environment: getEnvVar('VITE_ENVIRONMENT'),

  // Debug settings
  debug: {
    enabled: getEnvBool('VITE_DEBUG_MODE') || import.meta.env.DEV,
    logLevel: getEnvVar('VITE_LOG_LEVEL') as 'debug' | 'info' | 'warn' | 'error',
  },

  // Supabase configuration
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL as string,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
    projectId: extractProjectId(import.meta.env.VITE_SUPABASE_URL),
  },

  // Feature flags
  features: {
    enableLogging: import.meta.env.VITE_ENABLE_LOGGING === 'true' || import.meta.env.DEV,
    enableServiceWorker: import.meta.env.VITE_ENABLE_SERVICE_WORKER !== 'false' && import.meta.env.PROD,
    enableOfflineMode: getEnvBool('VITE_ENABLE_OFFLINE_MODE', true),
    enableAI: getEnvBool('VITE_ENABLE_AI_FEATURES', true),
    enableExport: getEnvBool('VITE_ENABLE_EXPORT', true),
    enableCloudSync: getEnvBool('VITE_ENABLE_CLOUD_SYNC', true),
    enableTelegram: getEnvBool('VITE_ENABLE_TELEGRAM', false),
    enableAnalytics: getEnvBool('VITE_ENABLE_ANALYTICS', false),
    enableBundleAnalyzer: getEnvBool('VITE_BUNDLE_ANALYZER', false),
  },

  // API configuration
  api: {
    timeout: parseInt(import.meta.env.VITE_API_TIMEOUT || OPTIONAL_ENV_VARS.VITE_API_TIMEOUT),
    maxRetries: 3,
    retryDelay: 1000,
  },

  // CORS configuration
  cors: {
    allowedOrigins: (import.meta.env.VITE_CORS_ORIGINS || OPTIONAL_ENV_VARS.VITE_CORS_ORIGINS)
      .split(',')
      .map((o: string) => o.trim()),
  },

  // Cloud storage (optional)
  storage: {
    dropbox: {
      clientId: import.meta.env.VITE_DROPBOX_CLIENT_ID,
    },
    onedrive: {
      clientId: import.meta.env.VITE_ONEDRIVE_CLIENT_ID,
    },
  },

  // Telegram (optional)
  telegram: {
    botToken: import.meta.env.VITE_TELEGRAM_BOT_TOKEN,
  },

  // Monitoring & Analytics
  monitoring: {
    sentryDsn: import.meta.env.VITE_SENTRY_DSN,
    sentryEnvironment: getEnvVar('VITE_SENTRY_ENVIRONMENT'),
  },
} as const;

/**
 * Extract project ID from Supabase URL
 */
function extractProjectId(url: string | undefined): string | undefined {
  if (!url) return undefined;

  try {
    const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
    return match?.[1];
  } catch {
    return undefined;
  }
}

/**
 * Log environment configuration (safe for production)
 * Only logs non-sensitive information
 */
export function logEnvInfo(): void {
  if (!ENV.features.enableLogging && !ENV.debug.enabled) return;

  console.group('🔧 Environment Configuration');
  console.log('Mode:', ENV.mode);
  console.log('Environment:', ENV.environment);
  console.log('Debug Mode:', ENV.debug.enabled ? 'ON' : 'OFF');
  console.log('Log Level:', ENV.debug.logLevel.toUpperCase());
  console.log('Supabase Project:', ENV.supabase.projectId);

  console.group('Features');
  console.log('Service Worker:', ENV.features.enableServiceWorker ? '✓' : '✗');
  console.log('Offline Mode:', ENV.features.enableOfflineMode ? '✓' : '✗');
  console.log('AI Features:', ENV.features.enableAI ? '✓' : '✗');
  console.log('Export:', ENV.features.enableExport ? '✓' : '✗');
  console.log('Cloud Sync:', ENV.features.enableCloudSync ? '✓' : '✗');
  console.log('Telegram:', ENV.features.enableTelegram ? '✓' : '✗');
  console.log('Analytics:', ENV.features.enableAnalytics ? '✓' : '✗');
  console.groupEnd();

  console.log('API Timeout:', `${ENV.api.timeout}ms`);
  console.log('CORS Origins:', ENV.cors.allowedOrigins.join(', '));
  console.log('Sentry:', ENV.monitoring.sentryDsn ? 'Configured' : 'Not configured');
  console.groupEnd();
}
