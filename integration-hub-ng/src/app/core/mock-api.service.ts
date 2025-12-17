import { Injectable, inject } from '@angular/core';
import { Observable, delay, of } from 'rxjs';
import { Provider, Connection, Event } from './models';
import { ApiClientService } from './services/api-client.service';
import { environment } from '../../environments/environment';
import { LoggerService } from './services/logger.service';

/**
 * MockApiService
 * 
 * Provides mock API data for providers, connections, and events.
 * 
 * In development (enableMockData = true), uses in-memory mocks.
 * In production, should use real API endpoints via ApiClientService.
 */
@Injectable({
  providedIn: 'root'
})
export class MockApiService {
  private apiClient = inject(ApiClientService);
  private logger = inject(LoggerService);

  getProviders(): Observable<Provider[]> {
    if (environment.enableMockData) {
      // Dev mode: return mock data
      this.logger.debug('MockApiService: Returning mock providers');
      return of(this.getMockProviders()).pipe(delay(300));
    }

    // Production: use real API
    return this.apiClient.get<Provider[]>('providers');
  }

  getConnections(): Observable<Connection[]> {
    if (environment.enableMockData) {
      // Dev mode: return mock data
      this.logger.debug('MockApiService: Returning mock connections');
      return of(this.getMockConnections()).pipe(delay(300));
    }

    // Production: use real API
    return this.apiClient.get<Connection[]>('connections');
  }

  getEvents(): Observable<Event[]> {
    if (environment.enableMockData) {
      // Dev mode: return mock data
      this.logger.debug('MockApiService: Returning mock events');
      return of(this.getMockEvents()).pipe(delay(300));
    }

    // Production: use real API
    return this.apiClient.get<Event[]>('events');
  }

  createConnection(connection: any): Observable<Connection> {
    if (environment.enableMockData) {
      // Dev mode: simulate creating a connection
      this.logger.debug('MockApiService: Creating mock connection');
      const newConnection: Connection = {
        id: `conn-${Date.now()}`,
        name: connection.name,
        providerId: connection.providerId,
        providerName: connection.providerName,
        status: 'active',
        authType: connection.authType,
        createdAt: new Date().toISOString(),
        lastSync: new Date().toISOString()
      };
      return of(newConnection).pipe(delay(500));
    }

    // Production: use real API
    return this.apiClient.post<Connection>('connections', connection);
  }

  // Mock data generators
  private getMockProviders(): Provider[] {
    // Return mock providers
    // TODO: Load from assets if needed, or generate inline
    return [];
  }

  private getMockConnections(): Connection[] {
    // Return mock connections
    // TODO: Load from assets if needed, or generate inline
    return [];
  }

  private getMockEvents(): Event[] {
    // Return mock events
    // TODO: Load from assets if needed, or generate inline
    return [];
  }
}
