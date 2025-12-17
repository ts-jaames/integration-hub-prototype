/**
 * Development environment configuration
 */
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api', // Placeholder - replace with actual API URL
  enableDevAuth: true, // Feature flag for dev-only authentication
  enableMockData: true, // Feature flag for mock data services
  logLevel: 'debug' as const
};

