import { Injectable, signal, computed, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { LoggerService } from './logger.service';

/**
 * DevAuthProvider
 * 
 * Provides development-only authentication mechanisms.
 * This service is only active when enableDevAuth is true in environment.
 * 
 * In production, this service should not be used - real auth should be implemented.
 */
export interface DevAuthUser {
  id: string;
  email: string;
  roles: string[];
  teams?: string[];
}

export interface DevRoleConfig {
  id: string;
  label: string;
  description: string;
  icon: string;
}

@Injectable({
  providedIn: 'root'
})
export class DevAuthProvider {
  private logger = inject(LoggerService);

  // Hardcoded dev users (only used when enableDevAuth is true)
  private readonly devUsers: Record<string, DevAuthUser> = {
    'system-administrator': {
      id: 'admin-1',
      email: 'admin@system.com',
      roles: ['SYSTEM_ADMIN']
    },
    'company-manager': {
      id: 'manager-1',
      email: 'manager@company.com',
      roles: ['COMPANY_MANAGER']
    },
    'developer-internal': {
      id: 'dev-1',
      email: 'developer@internal.com',
      roles: ['DEVELOPER_INTERNAL'],
      teams: ['Platform']
    },
    'developer-external': {
      id: 'dev-ext-1',
      email: 'developer@external.com',
      roles: ['DEVELOPER_EXTERNAL'],
      teams: ['Integration']
    },
    'support-vendor-success': {
      id: 'support-1',
      email: 'support@vendor.com',
      roles: ['SUPPORT', 'VENDOR_SUCCESS']
    },
    'compliance-auditor': {
      id: 'auditor-1',
      email: 'auditor@compliance.com',
      roles: ['COMPLIANCE_AUDITOR']
    },
    'business-viewer': {
      id: 'viewer-1',
      email: 'viewer@business.com',
      roles: ['BUSINESS_VIEWER']
    }
  };

  // Available roles for dev mode
  public readonly roles: DevRoleConfig[] = [
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

  // Current role (in-memory only, no localStorage)
  private currentRoleId = signal<string>('system-administrator');

  // Computed current user based on role
  public readonly currentUser = computed(() => {
    const roleId = this.currentRoleId();
    return this.devUsers[roleId] || this.devUsers['system-administrator'];
  });

  constructor() {
    if (!environment.enableDevAuth) {
      this.logger.warn('DevAuthProvider is being used but enableDevAuth is false. This should not happen in production.');
    }
  }

  /**
   * Check if dev auth is enabled
   */
  isEnabled(): boolean {
    return environment.enableDevAuth === true;
  }

  /**
   * Get current role ID
   */
  getCurrentRoleId(): string {
    if (!this.isEnabled()) {
      this.logger.warn('DevAuthProvider.getCurrentRoleId() called but dev auth is disabled');
      return 'system-administrator';
    }
    return this.currentRoleId();
  }

  /**
   * Set current role (dev mode only)
   */
  setRole(roleId: string): void {
    if (!this.isEnabled()) {
      this.logger.warn('DevAuthProvider.setRole() called but dev auth is disabled');
      return;
    }

    if (!this.devUsers[roleId]) {
      this.logger.warn(`Invalid role ID: ${roleId}`);
      return;
    }

    this.currentRoleId.set(roleId);
    this.logger.debug(`Dev auth: Role switched to ${roleId}`);
  }

  /**
   * Get current user
   */
  getCurrentUser(): DevAuthUser {
    if (!this.isEnabled()) {
      this.logger.warn('DevAuthProvider.getCurrentUser() called but dev auth is disabled');
      return this.devUsers['system-administrator'];
    }
    return this.currentUser();
  }

  /**
   * Check if user has a specific role
   */
  hasRole(role: string): boolean {
    if (!this.isEnabled()) {
      return false;
    }
    return this.currentUser().roles.includes(role);
  }

  /**
   * Check if user has any of the specified roles
   */
  hasAnyRole(roles: string[]): boolean {
    if (!this.isEnabled()) {
      return false;
    }
    return roles.some(role => this.currentUser().roles.includes(role));
  }

  /**
   * Get role configuration
   */
  getRoleConfig(roleId: string): DevRoleConfig | undefined {
    return this.roles.find(r => r.id === roleId);
  }
}

