import { Injectable, signal } from '@angular/core';
import { RoleKey } from '../models';

export interface AuthUser {
  id: string;
  email: string;
  roles: RoleKey[];
}

@Injectable({
  providedIn: 'root'
})
export class AuthStateService {
  private readonly currentUser = signal<AuthUser>({
    id: 'admin-1',
    email: 'admin@system.com',
    roles: ['SYSTEM_ADMIN']
  });

  getCurrentUser() {
    return this.currentUser.asReadonly();
  }

  hasRole(role: RoleKey): boolean {
    return this.currentUser().roles.includes(role);
  }

  hasAnyRole(roles: RoleKey[]): boolean {
    return roles.some(role => this.currentUser().roles.includes(role));
  }
}

