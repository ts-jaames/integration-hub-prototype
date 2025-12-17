import { ErrorHandler, Injectable, inject } from '@angular/core';
import { LoggerService } from './logger.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private logger = inject(LoggerService);

  handleError(error: Error | any): void {
    // Log the error
    this.logger.error('Global error handler caught an error', error);

    // Prevent the default console error handling
    // In production, you might want to:
    // - Send to error tracking service
    // - Show user-friendly error message
    // - Log to backend
    
    // For now, we'll just log it
    // TODO: Add user-facing error notification
    // TODO: Add error tracking service integration
  }
}

