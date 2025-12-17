import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { LoggerService } from '../services/logger.service';

/**
 * Error Interceptor
 * 
 * Normalizes HTTP errors and provides consistent error handling.
 * Logs errors and can be extended to show user-facing error messages.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const logger = inject(LoggerService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Normalize the error
      const normalizedError = normalizeError(error, req.url, req.method);

      // Log the error
      logError(normalizedError, logger);

      // Re-throw normalized error for component/service handling
      return throwError(() => normalizedError);
    })
  );
};

/**
 * Normalized error structure
 */
export interface NormalizedHttpError {
  message: string;
  status: number;
  statusText: string;
  url: string;
  method?: string;
  timestamp: string;
  originalError: HttpErrorResponse;
  userMessage?: string; // User-friendly message
}

/**
 * Normalize HTTP error to consistent structure
 */
function normalizeError(error: HttpErrorResponse, url: string, method?: string): NormalizedHttpError {
  const normalized: NormalizedHttpError = {
    message: error.message || 'An unknown error occurred',
    status: error.status || 0,
    statusText: error.statusText || 'Unknown Error',
    url: url,
    method: method,
    timestamp: new Date().toISOString(),
    originalError: error
  };

  // Add user-friendly message based on status code
  normalized.userMessage = getUserFriendlyMessage(error.status);

  // Include error details from response body if available
  if (error.error) {
    if (typeof error.error === 'string') {
      normalized.message = error.error;
    } else if (error.error.message) {
      normalized.message = error.error.message;
    } else if (error.error.error) {
      normalized.message = error.error.error;
    }
  }

  return normalized;
}

/**
 * Get user-friendly error message based on status code
 */
function getUserFriendlyMessage(status: number): string {
  switch (status) {
    case 0:
      return 'Unable to connect to server. Please check your internet connection.';
    case 400:
      return 'Invalid request. Please check your input and try again.';
    case 401:
      return 'You are not authorized. Please log in and try again.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return 'The requested resource was not found.';
    case 409:
      return 'A conflict occurred. The resource may have been modified by another user.';
    case 422:
      return 'Validation failed. Please check your input.';
    case 429:
      return 'Too many requests. Please wait a moment and try again.';
    case 500:
      return 'A server error occurred. Please try again later.';
    case 502:
      return 'Bad gateway. The server is temporarily unavailable.';
    case 503:
      return 'Service unavailable. Please try again later.';
    case 504:
      return 'Gateway timeout. The server took too long to respond.';
    default:
      return 'An error occurred. Please try again.';
  }
}

/**
 * Log error with appropriate level
 */
function logError(error: NormalizedHttpError, logger: LoggerService): void {
  const logMessage = `HTTP ${error.status} ${error.statusText}: ${error.message} (${error.url})`;

  // Log based on error severity
  if (error.status >= 500) {
    // Server errors - log as error
    logger.error(logMessage, error.originalError);
  } else if (error.status >= 400) {
    // Client errors - log as warning (expected errors)
    logger.warn(logMessage);
  } else {
    // Other errors - log as error
    logger.error(logMessage, error.originalError);
  }

  // In production, you might want to send to error tracking service
  // Example: Sentry.captureException(error.originalError, { extra: error });
}

