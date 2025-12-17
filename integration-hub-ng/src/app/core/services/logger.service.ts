import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

@Injectable({
  providedIn: 'root'
})
export class LoggerService {
  private logLevel: LogLevel = LogLevel.INFO;
  private env = environment;

  constructor() {
    // In development, allow DEBUG level
    if (!this.env.production) {
      this.logLevel = LogLevel.DEBUG;
    } else {
      // In production, only show errors
      this.logLevel = LogLevel.ERROR;
    }
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(`[INFO] ${message}`, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  error(message: string, error?: Error | any, ...args: any[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(`[ERROR] ${message}`, error, ...args);
      
      // In production, you might want to send errors to a logging service
      if (this.env.production && error) {
        // TODO: Send to error tracking service (e.g., Sentry, LogRocket)
        this.logToExternalService(message, error);
      }
    }
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private logToExternalService(message: string, error: Error | any): void {
    // Placeholder for future error tracking integration
    // Example: Sentry.captureException(error, { extra: { message } });
  }
}

