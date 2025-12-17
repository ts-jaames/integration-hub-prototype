import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { LoggerService } from './logger.service';

export interface ApiRequestOptions {
  headers?: HttpHeaders | { [header: string]: string | string[] };
  params?: HttpParams | { [param: string]: any };
  observe?: 'body' | 'events' | 'response';
  reportProgress?: boolean;
  responseType?: 'json' | 'text' | 'blob' | 'arraybuffer';
}

@Injectable({
  providedIn: 'root'
})
export class ApiClientService {
  private http = inject(HttpClient);
  private logger = inject(LoggerService);

  /**
   * Base URL for API requests
   */
  get baseUrl(): string {
    return environment.apiUrl;
  }

  /**
   * GET request
   */
  get<T>(endpoint: string, options?: ApiRequestOptions): Observable<T> {
    const url = this.buildUrl(endpoint);
    this.logger.debug(`GET ${url}`, options);
    
    return this.http.get<T>(url, options).pipe(
      catchError(error => this.handleError(error, 'GET', endpoint))
    );
  }

  /**
   * POST request
   */
  post<T>(endpoint: string, body: any, options?: ApiRequestOptions): Observable<T> {
    const url = this.buildUrl(endpoint);
    this.logger.debug(`POST ${url}`, body);
    
    return this.http.post<T>(url, body, options).pipe(
      catchError(error => this.handleError(error, 'POST', endpoint))
    );
  }

  /**
   * PUT request
   */
  put<T>(endpoint: string, body: any, options?: ApiRequestOptions): Observable<T> {
    const url = this.buildUrl(endpoint);
    this.logger.debug(`PUT ${url}`, body);
    
    return this.http.put<T>(url, body, options).pipe(
      catchError(error => this.handleError(error, 'PUT', endpoint))
    );
  }

  /**
   * PATCH request
   */
  patch<T>(endpoint: string, body: any, options?: ApiRequestOptions): Observable<T> {
    const url = this.buildUrl(endpoint);
    this.logger.debug(`PATCH ${url}`, body);
    
    return this.http.patch<T>(url, body, options).pipe(
      catchError(error => this.handleError(error, 'PATCH', endpoint))
    );
  }

  /**
   * DELETE request
   */
  delete<T>(endpoint: string, options?: ApiRequestOptions): Observable<T> {
    const url = this.buildUrl(endpoint);
    this.logger.debug(`DELETE ${url}`, options);
    
    return this.http.delete<T>(url, options).pipe(
      catchError(error => this.handleError(error, 'DELETE', endpoint))
    );
  }

  /**
   * Build full URL from endpoint
   */
  private buildUrl(endpoint: string): string {
    // Remove leading slash if present
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    return `${this.baseUrl}/${cleanEndpoint}`;
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: any, method: string, endpoint: string): Observable<never> {
    this.logger.error(`API ${method} ${endpoint} failed`, error);
    
    // Error will be normalized by ErrorInterceptor
    // Re-throw to let interceptor handle it
    return throwError(() => error);
  }
}

