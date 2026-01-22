import { Injectable, signal, computed, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { DevAuthProvider } from '../../core/services/dev-auth-provider.service';
import { LoggerService } from '../../core/services/logger.service';

export interface DevUser {
  id: string;
  email: string;
  roles: string[];
  teams: string[];
}

/**
 * DevAuthStateService
 * 
 * Provides authentication state for developer features.
 * 
 * In development mode (enableDevAuth = true), uses DevAuthProvider.
 * In production, this should be replaced with real authentication.
 */
@Injectable({
  providedIn: 'root'
})
export class DevAuthStateService {
  private devAuth = inject(DevAuthProvider);
  private logger = inject(LoggerService);

  // In dev mode, computed from DevAuthProvider
  // In production, would come from real auth service
  private readonly currentUser = computed<DevUser>(() => {
    if (environment.enableDevAuth) {
      const devUser = this.devAuth.getCurrentUser();
      return {
        id: devUser.id,
        email: devUser.email,
        roles: devUser.roles,
        teams: devUser.teams || []
      };
    }

    // Production: would get from real auth service
    // For now, return a default (this should be replaced with real auth)
    return {
      id: 'dev-1',
      email: 'developer@internal.com',
      roles: ['DEVELOPER_INTERNAL'],
      teams: ['Platform']
    };
  });

  getCurrentUser() {
    return this.currentUser;
  }

  hasRole(role: string): boolean {
    if (environment.enableDevAuth) {
      return this.devAuth.hasRole(role);
    }

    // Production: would check real auth service
    return this.currentUser().roles.includes(role);
  }
}
