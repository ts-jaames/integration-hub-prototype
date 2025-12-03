import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, delay, of } from 'rxjs';
import { Provider, Connection, Event } from './models';

@Injectable({
  providedIn: 'root'
})
export class MockApiService {
  constructor(private http: HttpClient) {}

  getProviders(): Observable<Provider[]> {
    return this.http.get<Provider[]>('/assets/providers.json').pipe(
      delay(300) // Simulate network delay
    );
  }

  getConnections(): Observable<Connection[]> {
    return this.http.get<Connection[]>('/assets/connections.json').pipe(
      delay(300)
    );
  }

  getEvents(): Observable<Event[]> {
    return this.http.get<Event[]>('/assets/events.json').pipe(
      delay(300)
    );
  }

  createConnection(connection: any): Observable<Connection> {
    // Simulate creating a connection
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
}

