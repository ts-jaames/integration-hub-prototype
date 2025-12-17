import { HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { LoggerService } from '../services/logger.service';
import { environment } from '../../../environments/environment';

/**
 * Auth Interceptor
 * 
 * Injects authentication tokens into HTTP requests.
 * Currently stubbed - will be replaced with real auth when backend is ready.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const logger = inject(LoggerService);

  // Skip auth for certain endpoints (e.g., login, public APIs)
  if (shouldSkipAuth(req.url)) {
    return next(req);
  }

  // Get auth token (stubbed for now)
  const token = getAuthToken();

  if (token) {
    // Clone request and add auth header
    const clonedReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });

    logger.debug(`Auth interceptor: Added token to ${req.method} ${req.url}`);
    return next(clonedReq);
  }

  // No token available - proceed without auth header
  // In production, you might want to redirect to login or handle differently
  if (environment.production) {
    logger.warn(`Auth interceptor: No token available for ${req.method} ${req.url}`);
  }

  return next(req);
};

/**
 * Get authentication token
 * 
 * TODO: Replace with real auth service when backend is ready
 * This should:
 * - Get token from auth service
 * - Check if token is expired
 * - Trigger token refresh if needed
 */
function getAuthToken(): string | null {
  // Stub implementation
  // In dev mode, you might have a dev token
  if (environment.enableDevAuth) {
    // For now, return null - real implementation will get from auth service
    // Example: return inject(AuthService).getToken();
    return null;
  }

  // In production, get from auth service
  // Example: return inject(AuthService).getToken();
  return null;
}

/**
 * Check if auth should be skipped for this URL
 */
function shouldSkipAuth(url: string): boolean {
  // Skip auth for:
  // - Login/authentication endpoints
  // - Public APIs
  // - Health checks
  const skipPatterns = [
    '/auth/login',
    '/auth/register',
    '/public/',
    '/health',
    '/assets/' // Static assets
  ];

  return skipPatterns.some(pattern => url.includes(pattern));
}

