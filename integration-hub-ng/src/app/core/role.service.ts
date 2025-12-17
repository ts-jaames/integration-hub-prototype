import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { DevAuthProvider } from './services/dev-auth-provider.service';
import { LoggerService } from './services/logger.service';

export type UserRole = 
  | 'system-administrator'
  | 'company-manager'
  | 'developer-internal'
  | 'developer-external'
  | 'support-vendor-success'
  | 'compliance-auditor'
  | 'business-viewer';

export interface RoleConfig {
  id: UserRole;
  label: string;
  description: string;
  icon: string;
}

/**
 * RoleService
 * 
 * Provides role management and access control.
 * 
 * In development mode (enableDevAuth = true), uses DevAuthProvider for role switching.
 * In production, this should be replaced with real authentication.
 */
@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private devAuth = inject(DevAuthProvider);
  private logger = inject(LoggerService);

  // Role configurations (delegated to DevAuthProvider in dev mode)
  public readonly roles: RoleConfig[];

  private roleSubject: BehaviorSubject<UserRole>;
  public role$: Observable<UserRole>;

  constructor() {
    // In dev mode, use DevAuthProvider's roles
    // In production, roles would come from real auth service
    if (environment.enableDevAuth) {
      this.roles = this.devAuth.roles.map(role => ({
        id: role.id as UserRole,
        label: role.label,
        description: role.description,
        icon: role.icon
      }));
    } else {
      // Production: define roles statically (would come from real auth in production)
      this.roles = [
        {
          id: 'system-administrator',
          label: 'System Administrator',
          description: 'Full platform visibility and configuration',
          icon: 'shield'
        },
        {
          id: 'company-manager',
          label: 'Company Manager',
          description: 'Company-level visibility and control',
          icon: 'building'
        },
        {
          id: 'developer-internal',
          label: 'Developer (Internal)',
          description: 'Domain-specific API access',
          icon: 'code'
        },
        {
          id: 'developer-external',
          label: 'Developer (External)',
          description: 'Integration environment access',
          icon: 'api'
        },
        {
          id: 'support-vendor-success',
          label: 'Support / Vendor Success',
          description: 'Vendor support and monitoring',
          icon: 'support'
        },
        {
          id: 'compliance-auditor',
          label: 'Compliance Auditor',
          description: 'Read-only compliance access',
          icon: 'audit'
        },
        {
          id: 'business-viewer',
          label: 'Business Viewer',
          description: 'Read-only insights and reports',
          icon: 'chart'
        }
      ];
    }

    // Initialize role (no localStorage - in-memory only)
    const initialRole = this.getInitialRole();
    this.roleSubject = new BehaviorSubject<UserRole>(initialRole);
    this.role$ = this.roleSubject.asObservable();
  }

  private getInitialRole(): UserRole {
    // In dev mode, use DevAuthProvider
    if (environment.enableDevAuth) {
      return this.devAuth.getCurrentRoleId() as UserRole;
    }

    // In production, would get from real auth service
    // For now, default to system-administrator
    return 'system-administrator';
  }

  getCurrentRole(): UserRole {
    // In dev mode, sync with DevAuthProvider
    if (environment.enableDevAuth) {
      return this.devAuth.getCurrentRoleId() as UserRole;
    }

    return this.roleSubject.value;
  }

  getCurrentRoleConfig(): RoleConfig {
    const role = this.getCurrentRole();
    return this.roles.find(r => r.id === role) || this.roles[0];
  }

  setRole(role: UserRole): void {
    // In dev mode, delegate to DevAuthProvider
    if (environment.enableDevAuth) {
      this.devAuth.setRole(role);
      this.roleSubject.next(role);
      this.logger.debug(`Role switched to ${role} (dev mode)`);
      return;
    }

    // In production, this would call real auth service
    // For now, just update the subject (no localStorage)
    this.roleSubject.next(role);
    this.logger.warn('Role switching is only available in dev mode. In production, use real authentication.');
  }

  // Role-based access control helpers
  canAccessCompanies(): boolean {
    const role = this.getCurrentRole();
    return ['system-administrator', 'company-manager', 'support-vendor-success', 'compliance-auditor'].includes(role);
  }

  canAccessUsers(): boolean {
    const role = this.getCurrentRole();
    return ['system-administrator', 'company-manager'].includes(role);
  }

  canAccessServiceAccounts(): boolean {
    const role = this.getCurrentRole();
    return ['system-administrator', 'company-manager', 'developer-internal', 'developer-external'].includes(role);
  }

  canAccessAPIs(): boolean {
    const role = this.getCurrentRole();
    return ['system-administrator', 'developer-internal', 'developer-external'].includes(role);
  }

  canAccessMonitoring(): boolean {
    const role = this.getCurrentRole();
    return ['system-administrator', 'support-vendor-success', 'business-viewer'].includes(role);
  }

  canAccessCompliance(): boolean {
    const role = this.getCurrentRole();
    return ['system-administrator', 'compliance-auditor'].includes(role);
  }
}
