import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

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

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  public readonly roles: RoleConfig[] = [
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

  private roleSubject: BehaviorSubject<UserRole>;
  public role$: Observable<UserRole>;

  constructor() {
    this.roleSubject = new BehaviorSubject<UserRole>(this.getInitialRole());
    this.role$ = this.roleSubject.asObservable();
  }

  private getInitialRole(): UserRole {
    const savedRole = localStorage.getItem('userRole') as UserRole;
    const validRoles: UserRole[] = [
      'system-administrator',
      'company-manager',
      'developer-internal',
      'developer-external',
      'support-vendor-success',
      'compliance-auditor',
      'business-viewer'
    ];
    
    if (savedRole && validRoles.includes(savedRole)) {
      return savedRole;
    }
    return 'system-administrator'; // Default role
  }

  getCurrentRole(): UserRole {
    return this.roleSubject.value;
  }

  getCurrentRoleConfig(): RoleConfig {
    return this.roles.find(r => r.id === this.roleSubject.value) || this.roles[0];
  }

  setRole(role: UserRole): void {
    this.roleSubject.next(role);
    localStorage.setItem('userRole', role);
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

