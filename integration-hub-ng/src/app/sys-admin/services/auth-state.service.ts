import { Injectable, signal, computed, inject } from '@angular/core';
import { RoleKey } from '../models';
import { environment } from '../../../environments/environment';
import { DevAuthProvider } from '../../core/services/dev-auth-provider.service';
import { LoggerService } from '../../core/services/logger.service';

export interface AuthUser {
  id: string;
  email: string;
  roles: RoleKey[];
}

/**
 * AuthStateService
 * 
 * Provides authentication state for sys-admin features.
 * 
 * In development mode (enableDevAuth = true), uses DevAuthProvider.
 * In production, this should be replaced with real authentication.
 */
@Injectable({
  providedIn: 'root'
})
export class AuthStateService {
  private devAuth = inject(DevAuthProvider);
  private logger = inject(LoggerService);

  // In dev mode, computed from DevAuthProvider
  // In production, would come from real auth service
  private readonly currentUser = computed<AuthUser>(() => {
    if (environment.enableDevAuth) {
      const devUser = this.devAuth.getCurrentUser();
      return {
        id: devUser.id,
        email: devUser.email,
        roles: devUser.roles as RoleKey[]
      };
    }

    // Production: would get from real auth service
    // For now, return a default (this should be replaced with real auth)
    return {
      id: 'user-1',
      email: 'user@system.com',
      roles: ['SYSTEM_ADMIN']
    };
  });

  getCurrentUser() {
    return this.currentUser;
  }

  hasRole(role: RoleKey): boolean {
    if (environment.enableDevAuth) {
      return this.devAuth.hasRole(role);
    }

    // Production: would check real auth service
    return this.currentUser().roles.includes(role);
  }

  hasAnyRole(roles: RoleKey[]): boolean {
    if (environment.enableDevAuth) {
      return this.devAuth.hasAnyRole(roles);
    }

    // Production: would check real auth service
    return roles.some(role => this.currentUser().roles.includes(role));
  }
}
