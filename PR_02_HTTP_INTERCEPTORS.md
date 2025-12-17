# PR #2: HTTP Interceptors

## Summary
This PR adds HTTP interceptors for authentication token injection and centralized error handling. These interceptors provide a consistent way to handle auth and errors across all HTTP requests, ready for backend integration.

## Files Changed

### New Files
1. **`src/app/core/interceptors/auth.interceptor.ts`**
   - Functional interceptor that injects auth tokens into HTTP requests
   - Currently stubbed - returns null token (ready for real auth service)
   - Skips auth for public endpoints (login, public APIs, health checks)
   - Logs auth token injection for debugging

2. **`src/app/core/interceptors/error.interceptor.ts`**
   - Functional interceptor that normalizes HTTP errors
   - Provides consistent error structure (`NormalizedHttpError`)
   - Generates user-friendly error messages based on status codes
   - Logs errors with appropriate severity levels
   - Placeholder for error tracking service integration

3. **`src/app/core/interceptors/index.ts`**
   - Barrel export for interceptors

### Modified Files
1. **`src/app/app.config.ts`**
   - Registered `authInterceptor` and `errorInterceptor`
   - Changed from `withInterceptorsFromDi()` to `withInterceptors()` for functional interceptors
   - Interceptors are applied in order: auth first, then error handling

## What Improves

✅ **Centralized Auth Token Injection**
- All HTTP requests automatically get auth tokens (when available)
- Consistent auth header format (`Bearer <token>`)
- Easy to swap stub for real auth service later

✅ **Normalized Error Handling**
- All HTTP errors follow consistent structure
- User-friendly error messages based on status codes
- Better error logging with appropriate severity levels

✅ **Error Structure**
- `NormalizedHttpError` interface provides consistent error shape
- Includes original error, user message, timestamp, and metadata
- Makes error handling in components/services easier

✅ **Ready for Backend Integration**
- Interceptors are in place and working
- Just need to replace `getAuthToken()` stub with real auth service
- Error handling will work automatically with real backend

## What Remains

⚠️ **Auth Token is Stubbed**
- `getAuthToken()` returns null (intentional)
- Will be replaced with real auth service in future PR
- Interceptor is ready - just needs token source

⚠️ **No User-Facing Error Notifications**
- Errors are logged but not shown to users yet
- Can be added later with notification service
- Error structure supports user messages

⚠️ **No Error Tracking Service**
- Placeholder for Sentry/LogRocket integration
- Will be added when needed
- Error data is structured for easy integration

## Interceptor Order

Interceptors are applied in this order:
1. **authInterceptor** - Adds auth token to request
2. **errorInterceptor** - Handles errors in response

This order ensures:
- Auth token is added before request is sent
- Errors are normalized after response is received

## Error Status Code Handling

The error interceptor provides user-friendly messages for common HTTP status codes:
- `0` - Network/connection errors
- `400` - Bad request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not found
- `409` - Conflict
- `422` - Validation error
- `429` - Rate limiting
- `500+` - Server errors

## Testing

- ✅ No linter errors
- ✅ Interceptors compile successfully
- ✅ Registered in app.config.ts
- ⚠️ Unit tests not yet added (will be in PR #8)

## Next Steps

After this PR is merged:
1. PR #4 will replace console.log with LoggerService (interceptors already use LoggerService)
2. PR #5 will add real auth service (can replace `getAuthToken()` stub)
3. PR #6 will refactor services to use ApiClient (interceptors will work automatically)

## Breaking Changes

None - this is purely additive. Existing HTTP requests will now:
- Automatically get auth tokens (when auth service is implemented)
- Receive normalized errors (components can opt into using `NormalizedHttpError`)

Existing error handling in components will continue to work, but can be enhanced to use normalized errors.

