/**
 * Production environment configuration
 */
export const environment = {
  production: true,
  apiUrl: '/api', // Production API URL (relative or absolute)
  enableDevAuth: false, // Disable dev auth in production
  enableMockData: false, // Disable mocks in production
  logLevel: 'error' as const
};

