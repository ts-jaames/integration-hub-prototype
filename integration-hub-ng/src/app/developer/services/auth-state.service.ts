import { Injectable, signal } from '@angular/core';

export interface DevUser {
  id: string;
  email: string;
  roles: string[];
  teams: string[];
}

@Injectable({
  providedIn: 'root'
})
export class DevAuthStateService {
  private readonly currentUser = signal<DevUser>({
    id: 'dev-1',
    email: 'developer@internal.com',
    roles: ['DEVELOPER_INTERNAL'],
    teams: ['Platform']
  });

  getCurrentUser() {
    return this.currentUser.asReadonly();
  }

  hasRole(role: string): boolean {
    return this.currentUser().roles.includes(role);
  }
}

