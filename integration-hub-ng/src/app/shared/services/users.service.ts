import { Injectable, signal, inject } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiClientService } from '../../core/services/api-client.service';
import { LoggerService } from '../../core/services/logger.service';
import { User, InviteUserPayload, UserFilters, UserSort, UserStatus, UserRole } from '../models/user.model';

// Mock current user - TODO: Replace with actual auth service
const MOCK_CURRENT_USER = {
  name: 'System Administrator',
  email: 'admin@example.com',
  role: 'Administrator'
};

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  private apiClient = inject(ApiClientService);
  private logger = inject(LoggerService);

  // In-memory store for users (only used when enableMockData is true)
  private users = signal<User[]>([]);

  constructor() {
    if (environment.enableMockData) {
      this.initializeMockData();
      this.logger.debug('UsersService: Mock data initialized with', this.users().length, 'users');
    }
  }

  /**
   * List users with filters, sort, and paging
   */
  listUsers(filters?: UserFilters, sort?: UserSort): Observable<User[]> {
    if (environment.enableMockData) {
      let filtered = [...this.users()];

      // Apply search filter
      if (filters?.search) {
        const query = filters.search.toLowerCase();
        filtered = filtered.filter(u =>
          u.email.toLowerCase().includes(query) ||
          (u.firstName && u.firstName.toLowerCase().includes(query)) ||
          (u.lastName && u.lastName.toLowerCase().includes(query)) ||
          `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase().includes(query)
        );
      }

      // Apply status filter
      if (filters?.status) {
        filtered = filtered.filter(u => u.status === filters.status);
      }

      // Apply company filter
      if (filters?.companyId) {
        filtered = filtered.filter(u => u.companyId === filters.companyId);
      }

      // Apply role filter
      if (filters?.role) {
        filtered = filtered.filter(u => u.roles.includes(filters.role!));
      }

      // Apply MFA filter
      if (filters?.mfaEnabled !== undefined) {
        filtered = filtered.filter(u => u.mfaEnabled === filters.mfaEnabled);
      }

      // Apply sorting
      if (sort) {
        filtered.sort((a, b) => {
          let aVal: any;
          let bVal: any;

          switch (sort.field) {
            case 'name':
              aVal = `${a.firstName || ''} ${a.lastName || ''}`.trim() || a.email;
              bVal = `${b.firstName || ''} ${b.lastName || ''}`.trim() || b.email;
              break;
            case 'email':
              aVal = a.email;
              bVal = b.email;
              break;
            case 'lastLogin':
              aVal = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0;
              bVal = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0;
              break;
            case 'company':
              aVal = a.companyName;
              bVal = b.companyName;
              break;
            case 'updatedAt':
              aVal = new Date(a.updatedAt).getTime();
              bVal = new Date(b.updatedAt).getTime();
              break;
            default:
              return 0;
          }

          if (typeof aVal === 'string') {
            return sort.direction === 'asc'
              ? aVal.localeCompare(bVal)
              : bVal.localeCompare(aVal);
          } else {
            return sort.direction === 'asc' ? aVal - bVal : bVal - aVal;
          }
        });
      }

      return of(filtered).pipe(delay(300));
    }

    // Production: use real API
    return this.apiClient.get<User[]>('users', { params: { filters, sort } });
  }

  /**
   * Get user by ID
   */
  getUserById(id: string): Observable<User | null> {
    if (environment.enableMockData) {
      const user = this.users().find(u => u.id === id);
      return of(user || null).pipe(delay(200));
    }

    return this.apiClient.get<User>(`users/${id}`);
  }

  /**
   * Invite a new user
   */
  inviteUser(payload: InviteUserPayload): Observable<User> {
    if (environment.enableMockData) {
      const user: User = {
        id: `user_${Date.now()}`,
        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
        companyId: payload.companyId,
        companyName: this.getCompanyName(payload.companyId),
        roles: payload.roles,
        status: 'Invited',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        invitedAt: new Date().toISOString(),
        invitedBy: MOCK_CURRENT_USER.name,
        mfaEnabled: false
      };

      this.users.update(users => [...users, user]);
      this.logger.debug('UsersService: Created invited user', user);

      return of(user).pipe(delay(500));
    }

    return this.apiClient.post<User>('users/invite', payload);
  }

  /**
   * Update user roles
   */
  updateUserRoles(userId: string, roles: UserRole[]): Observable<User> {
    if (environment.enableMockData) {
      const user = this.users().find(u => u.id === userId);
      if (!user) {
        throw new Error(`User with id ${userId} not found`);
      }

      const updated: User = {
        ...user,
        roles,
        updatedAt: new Date().toISOString()
      };

      this.users.update(users => users.map(u => u.id === userId ? updated : u));
      this.logger.debug(`UsersService: Updated roles for user ${userId}`);

      return of(updated).pipe(delay(300));
    }

    return this.apiClient.patch<User>(`users/${userId}/roles`, { roles });
  }

  /**
   * Set user status
   */
  setUserStatus(userId: string, status: UserStatus): Observable<User> {
    if (environment.enableMockData) {
      const user = this.users().find(u => u.id === userId);
      if (!user) {
        throw new Error(`User with id ${userId} not found`);
      }

      // Guardrail: prevent deactivating the last System Admin
      if (status === 'Deactivated' && user.roles.includes('System Admin')) {
        const systemAdmins = this.users().filter(u =>
          u.roles.includes('System Admin') && u.status === 'Active'
        );
        if (systemAdmins.length <= 1) {
          throw new Error('Cannot deactivate the last System Admin');
        }
      }

      const updated: User = {
        ...user,
        status,
        updatedAt: new Date().toISOString()
      };

      this.users.update(users => users.map(u => u.id === userId ? updated : u));
      this.logger.debug(`UsersService: Updated status for user ${userId} to ${status}`);

      return of(updated).pipe(delay(300));
    }

    return this.apiClient.patch<User>(`users/${userId}/status`, { status });
  }

  /**
   * Update user details (name, company, etc.)
   */
  updateUser(userId: string, updates: Partial<User>): Observable<User> {
    if (environment.enableMockData) {
      const user = this.users().find(u => u.id === userId);
      if (!user) {
        throw new Error(`User with id ${userId} not found`);
      }

      const updated: User = {
        ...user,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      this.users.update(users => users.map(u => u.id === userId ? updated : u));
      this.logger.debug(`UsersService: Updated user ${userId}`);

      return of(updated).pipe(delay(300));
    }

    return this.apiClient.patch<User>(`users/${userId}`, updates);
  }

  /**
   * Resend invite
   */
  resendInvite(userId: string): Observable<void> {
    if (environment.enableMockData) {
      const user = this.users().find(u => u.id === userId);
      if (!user) {
        throw new Error(`User with id ${userId} not found`);
      }

      if (user.status !== 'Invited') {
        throw new Error('User is not in Invited status');
      }

      // Update invitedAt timestamp
      const updated: User = {
        ...user,
        invitedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      this.users.update(users => users.map(u => u.id === userId ? updated : u));
      this.logger.debug(`UsersService: Resent invite for user ${userId}`);

      return of(undefined).pipe(delay(300));
    }

    return this.apiClient.post<void>(`users/${userId}/resend-invite`, {});
  }

  /**
   * Get companies list (for company filter)
   */
  getCompanies(): Observable<Array<{ id: string; name: string }>> {
    // In a real app, this would come from a companies service
    // For now, extract unique companies from users
    if (environment.enableMockData) {
      const companies = Array.from(
        new Set(this.users().map(u => ({ id: u.companyId, name: u.companyName })))
      );
      return of(companies).pipe(delay(200));
    }

    return this.apiClient.get<Array<{ id: string; name: string }>>('companies');
  }

  /**
   * Initialize mock data
   */
  private initializeMockData(): void {
    const mockUsers: User[] = [
      {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@acme.com',
        companyId: '1',
        companyName: 'Acme Corporation',
        roles: ['Company Manager'],
        status: 'Active',
        lastLoginAt: '2024-11-15T10:30:00Z',
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-11-15T10:30:00Z',
        mfaEnabled: true
      },
      {
        id: '2',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@techstart.com',
        companyId: '2',
        companyName: 'TechStart Inc',
        roles: ['Developer'],
        status: 'Active',
        lastLoginAt: '2024-11-14T14:20:00Z',
        createdAt: '2024-02-20T14:30:00Z',
        updatedAt: '2024-11-14T14:20:00Z',
        mfaEnabled: false
      },
      {
        id: '3',
        firstName: 'Michael',
        lastName: 'Chen',
        email: 'mchen@glp.com',
        companyId: '3',
        companyName: 'Global Logistics Partners',
        roles: ['Company Manager', 'Developer'],
        status: 'Active',
        lastLoginAt: '2024-11-13T09:15:00Z',
        createdAt: '2024-03-01T09:00:00Z',
        updatedAt: '2024-11-13T09:15:00Z',
        mfaEnabled: true
      },
      {
        id: '4',
        firstName: 'Emily',
        lastName: 'Rodriguez',
        email: 'emily@cloudsync.io',
        companyId: '4',
        companyName: 'CloudSync Solutions',
        roles: ['Read-only'],
        status: 'Active',
        lastLoginAt: '2024-11-12T16:45:00Z',
        createdAt: '2024-03-10T13:00:00Z',
        updatedAt: '2024-11-12T16:45:00Z',
        mfaEnabled: false
      },
      {
        id: '5',
        firstName: 'David',
        lastName: 'Park',
        email: 'dpark@dataflow.com',
        companyId: '5',
        companyName: 'DataFlow Analytics',
        roles: ['Developer'],
        status: 'Suspended',
        lastLoginAt: '2024-10-20T11:00:00Z',
        createdAt: '2024-04-01T10:00:00Z',
        updatedAt: '2024-10-25T14:00:00Z',
        mfaEnabled: false
      },
      {
        id: '6',
        firstName: 'Lisa',
        lastName: 'Thompson',
        email: 'lisa@secureauth.com',
        companyId: '6',
        companyName: 'SecureAuth Systems',
        roles: ['System Admin'],
        status: 'Active',
        lastLoginAt: '2024-11-15T08:00:00Z',
        createdAt: '2024-04-10T08:00:00Z',
        updatedAt: '2024-11-15T08:00:00Z',
        mfaEnabled: true
      },
      {
        id: '7',
        firstName: 'Robert',
        lastName: 'Martinez',
        email: 'rmartinez@quickpay.com',
        companyId: '7',
        companyName: 'QuickPay Financial',
        roles: ['Company Manager'],
        status: 'Invited',
        createdAt: '2024-11-10T10:00:00Z',
        updatedAt: '2024-11-10T10:00:00Z',
        invitedAt: '2024-11-10T10:00:00Z',
        invitedBy: MOCK_CURRENT_USER.name,
        mfaEnabled: false
      },
      {
        id: '8',
        firstName: 'Jessica',
        lastName: 'Lee',
        email: 'jlee@notifyhub.io',
        companyId: '8',
        companyName: 'NotifyHub Communications',
        roles: ['Developer'],
        status: 'Active',
        lastLoginAt: '2024-11-14T13:30:00Z',
        createdAt: '2024-05-15T09:00:00Z',
        updatedAt: '2024-11-14T13:30:00Z',
        mfaEnabled: true
      },
      {
        id: '9',
        firstName: 'Andrew',
        lastName: 'Kim',
        email: 'akim@datavault.com',
        companyId: '9',
        companyName: 'DataVault Backups',
        roles: ['Read-only'],
        status: 'Deactivated',
        lastLoginAt: '2024-09-15T10:00:00Z',
        createdAt: '2023-12-01T10:00:00Z',
        updatedAt: '2024-09-20T14:00:00Z',
        mfaEnabled: false
      },
      {
        id: '10',
        firstName: 'Rachel',
        lastName: 'Green',
        email: 'rgreen@apigateway.io',
        companyId: '10',
        companyName: 'APIGateway Pro',
        roles: ['System Admin'],
        status: 'Active',
        lastLoginAt: '2024-11-15T09:30:00Z',
        createdAt: '2024-06-01T10:00:00Z',
        updatedAt: '2024-11-15T09:30:00Z',
        mfaEnabled: true
      }
    ];

    this.users.set(mockUsers);
  }

  /**
   * Get company name by ID (helper for mock data)
   */
  private getCompanyName(companyId: string): string {
    const user = this.users().find(u => u.companyId === companyId);
    return user?.companyName || `Company ${companyId}`;
  }
}

