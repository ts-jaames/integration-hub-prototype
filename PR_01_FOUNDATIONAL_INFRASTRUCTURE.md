# PR #1: Foundational Infrastructure

## Summary
This PR establishes the core infrastructure services and configuration needed for the scaffold transformation. It creates a foundation for logging, error handling, API communication, and environment-based configuration.

## Files Changed

### New Files
1. **`src/app/core/services/logger.service.ts`**
   - Centralized logging service with log levels (DEBUG, INFO, WARN, ERROR)
   - Environment-aware (DEBUG in dev, ERROR only in prod)
   - Placeholder for external error tracking integration

2. **`src/app/core/services/global-error-handler.ts`**
   - Global error handler that catches all unhandled errors
   - Integrates with LoggerService
   - Placeholder for user-facing error notifications

3. **`src/app/core/services/api-client.service.ts`**
   - HttpClient wrapper providing consistent API interface
   - Methods: get, post, put, patch, delete
   - Environment-based base URL configuration
   - Integrated logging for all requests
   - Error handling (will be enhanced by interceptors in PR #2)

4. **`src/environments/environment.ts`**
   - Development environment configuration
   - API URL, feature flags (devAuth, mockData), log level

5. **`src/environments/environment.prod.ts`**
   - Production environment configuration
   - Disabled dev features, production API URL

### Modified Files
1. **`src/app/app.config.ts`**
   - Added `provideHttpClient` for HTTP functionality
   - Registered `GlobalErrorHandler` as ErrorHandler
   - Ready for interceptors (will be added in PR #2)

2. **`angular.json`**
   - Added file replacement configuration for production builds
   - Ensures `environment.prod.ts` is used in production

## What Improves

✅ **Centralized Logging**
- All logging goes through LoggerService
- Consistent log format with levels
- Easy to enhance with external services later

✅ **Global Error Handling**
- Catches all unhandled errors
- Consistent error logging
- Foundation for user-facing error messages

✅ **API Client Abstraction**
- Single point for all HTTP requests
- Environment-based configuration
- Ready for interceptors and real backend integration

✅ **Environment Configuration**
- Clear separation of dev/prod configs
- Feature flags for dev-only features
- Easy to add new environment variables

## What Remains

⚠️ **Services Still Use Mocks**
- Existing services (MockApiService, InMemoryDevService, etc.) still use direct mocks
- Will be refactored in PR #6 to use ApiClient

⚠️ **Console.log Still Present**
- 98+ console.log/error statements still in codebase
- Will be replaced in PR #4 using LoggerService

⚠️ **No HTTP Interceptors Yet**
- Auth interceptor and error interceptor will be added in PR #2
- ApiClient is ready but interceptors not registered

⚠️ **No Real Backend Integration**
- API URLs are placeholders
- Services still return mock data
- Intentional - will be connected when backend is ready

## Testing

- ✅ No linter errors
- ✅ Services compile successfully
- ✅ Environment files properly configured
- ⚠️ Unit tests not yet added (will be in PR #8)

## Next Steps

After this PR is merged:
1. PR #2 will add HTTP interceptors
2. PR #4 will replace all console.log with LoggerService
3. PR #6 will refactor services to use ApiClient

## Breaking Changes

None - this is purely additive infrastructure that doesn't change existing functionality.

