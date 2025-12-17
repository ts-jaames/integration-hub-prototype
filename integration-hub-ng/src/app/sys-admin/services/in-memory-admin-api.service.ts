import { Injectable, signal, computed, inject } from '@angular/core';
import { BehaviorSubject, Observable, of, delay } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiClientService } from '../../core/services/api-client.service';
import { LoggerService } from '../../core/services/logger.service';
import { 
  Company, 
  User, 
  RegistrationRequest, 
  Invitation, 
  AuditEvent, 
  Team,
  CompanyStatus,
  UserStatus,
  RegistrationStatus,
  InvitationStatus,
  RoleKey
} from '../models';

// Removed STORAGE_KEYS - in-memory services should not persist to localStorage
// Data is only kept in memory and resets on page refresh

@Injectable({
  providedIn: 'root'
})
export class InMemoryAdminApiService {
  // In-memory only - no localStorage persistence
  // Data resets on page refresh (as expected for mock services)
  private companiesSubject = new BehaviorSubject<Company[]>(this.getSeedCompanies());
  private usersSubject = new BehaviorSubject<User[]>(this.getSeedUsers());
  private registrationRequestsSubject = new BehaviorSubject<RegistrationRequest[]>(this.getSeedRegistrationRequests());
  private invitationsSubject = new BehaviorSubject<Invitation[]>([]);
  private auditEventsSubject = new BehaviorSubject<AuditEvent[]>([]);

  companies$ = this.companiesSubject.asObservable();
  users$ = this.usersSubject.asObservable();
  registrationRequests$ = this.registrationRequestsSubject.asObservable();
  invitations$ = this.invitationsSubject.asObservable();
  auditEvents$ = this.auditEventsSubject.asObservable();

  private companiesSignal = signal<Company[]>(this.companiesSubject.value);
  private usersSignal = signal<User[]>(this.usersSubject.value);

  private apiClient = inject(ApiClientService);
  private logger = inject(LoggerService);

  constructor() {
    // No localStorage persistence - data is in-memory only
    this.companies$.subscribe(companies => {
      this.companiesSignal.set(companies);
    });
    this.users$.subscribe(users => {
      this.usersSignal.set(users);
    });
    // No subscriptions needed for other subjects - they're already reactive
  }

  // Company methods
  listCompanies(filter?: { status?: CompanyStatus[], vendor?: boolean, search?: string }): Observable<Company[]> {
    if (environment.enableMockData) {
      // Dev mode: use in-memory mocks
      this.logger.debug('InMemoryAdminApiService: Returning mock companies');
      let companies = [...this.companiesSubject.value];
      
      if (filter?.status && filter.status.length > 0) {
        companies = companies.filter(c => filter.status!.includes(c.status));
      }
      
      if (filter?.vendor !== undefined) {
        companies = companies.filter(c => c.vendor === filter.vendor);
      }
      
      if (filter?.search) {
        const searchLower = filter.search.toLowerCase();
        companies = companies.filter(c => 
          c.name.toLowerCase().includes(searchLower) || 
          c.slug.toLowerCase().includes(searchLower)
        );
      }
      
      return of(companies).pipe(delay(200));
    }

    // Production: use real API
    const params: any = {};
    if (filter?.status) params.status = filter.status.join(',');
    if (filter?.vendor !== undefined) params.vendor = filter.vendor;
    if (filter?.search) params.search = filter.search;
    
    return this.apiClient.get<Company[]>('companies', { params });
  }

  getCompany(id: string): Observable<Company | null> {
    if (environment.enableMockData) {
      // Dev mode: use in-memory mocks
      this.logger.debug(`InMemoryAdminApiService: Returning mock company ${id}`);
      const company = this.companiesSubject.value.find(c => c.id === id);
      return of(company || null).pipe(delay(100));
    }

    // Production: use real API
    return this.apiClient.get<Company>(`companies/${id}`);
  }

  createCompany(payload: Partial<Company>): Observable<Company> {
    if (environment.enableMockData) {
      // Dev mode: use in-memory mocks
      this.logger.debug('InMemoryAdminApiService: Creating mock company');
      const company: Company = {
        id: `company-${Date.now()}`,
        name: payload.name!,
        slug: payload.slug!,
        status: payload.status || 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: payload.metadata,
        teams: payload.teams || [],
        vendor: payload.vendor || false
      };
      
      const companies = [...this.companiesSubject.value, company];
      this.companiesSubject.next(companies);
      
      this.logAuditEvent({
        actorUserId: 'admin-1',
      action: 'COMPANY_CREATED',
      targetType: 'company',
      targetId: company.id,
      metadata: { name: company.name }
    });
    
      return of(company).pipe(delay(300));
    }

    // Production: use real API
    return this.apiClient.post<Company>('companies', payload);
  }

  updateCompany(id: string, patch: Partial<Company>): Observable<Company> {
    const companies = [...this.companiesSubject.value];
    const index = companies.findIndex(c => c.id === id);
    
    if (index === -1) {
      throw new Error('Company not found');
    }
    
    const updated = {
      ...companies[index],
      ...patch,
      updatedAt: new Date().toISOString()
    };
    
    companies[index] = updated;
    this.companiesSubject.next(companies);
    
    this.logAuditEvent({
      actorUserId: 'admin-1',
      action: 'COMPANY_UPDATED',
      targetType: 'company',
      targetId: id,
      metadata: patch
    });
    
    return of(updated).pipe(delay(300));
  }

  suspendCompany(id: string): Observable<Company> {
    const company = this.companiesSubject.value.find(c => c.id === id);
    if (!company) {
      throw new Error('Company not found');
    }
    
    const newStatus: CompanyStatus = company.status === 'suspended' ? 'active' : 'suspended';
    return this.updateCompany(id, { status: newStatus }).pipe(
      delay(100),
      // Log specific suspend event
      // The updateCompany already logs COMPANY_UPDATED, but we want COMPANY_SUSPENDED
    );
  }

  deleteCompany(id: string): Observable<void> {
    const companies = this.companiesSubject.value.filter(c => c.id !== id);
    this.companiesSubject.next(companies);
    
    this.logAuditEvent({
      actorUserId: 'admin-1',
      action: 'COMPANY_DELETED',
      targetType: 'company',
      targetId: id
    });
    
    return of(undefined).pipe(delay(300));
  }

  // User methods
  listUsers(companyId?: string): Observable<User[]> {
    let users = [...this.usersSubject.value];
    
    if (companyId) {
      users = users.filter(u => u.companyId === companyId);
    }
    
    return of(users).pipe(delay(200));
  }

  inviteUser(companyId: string, email: string, role: RoleKey): Observable<Invitation> {
    const invitation: Invitation = {
      id: `invitation-${Date.now()}`,
      email,
      companyId,
      role,
      sentAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      status: 'sent'
    };
    
    const invitations = [...this.invitationsSubject.value, invitation];
    this.invitationsSubject.next(invitations);
    
    this.logAuditEvent({
      actorUserId: 'admin-1',
      action: 'USER_INVITED',
      targetType: 'invitation',
      targetId: invitation.id,
      metadata: { email, role, companyId }
    });
    
    return of(invitation).pipe(delay(300));
  }

  assignRoles(userId: string, roles: RoleKey[]): Observable<User> {
    const users = [...this.usersSubject.value];
    const index = users.findIndex(u => u.id === userId);
    
    if (index === -1) {
      throw new Error('User not found');
    }
    
    const updated = {
      ...users[index],
      roles: [...roles],
      updatedAt: new Date().toISOString()
    };
    
    users[index] = updated;
    this.usersSubject.next(users);
    
    this.logAuditEvent({
      actorUserId: 'admin-1',
      action: 'USER_ROLE_ASSIGNED',
      targetType: 'user',
      targetId: userId,
      metadata: { roles }
    });
    
    return of(updated).pipe(delay(300));
  }

  suspendUser(userId: string): Observable<User> {
    const users = [...this.usersSubject.value];
    const index = users.findIndex(u => u.id === userId);
    
    if (index === -1) {
      throw new Error('User not found');
    }
    
    const newStatus: UserStatus = users[index].status === 'suspended' ? 'active' : 'suspended';
    const updated: User = {
      ...users[index],
      status: newStatus
    };
    
    users[index] = updated;
    this.usersSubject.next(users);
    
    this.logAuditEvent({
      actorUserId: 'admin-1',
      action: 'USER_SUSPENDED',
      targetType: 'user',
      targetId: userId,
      metadata: { status: newStatus }
    });
    
    return of(updated).pipe(delay(300));
  }

  deactivateUser(userId: string): Observable<User> {
    const users = [...this.usersSubject.value];
    const index = users.findIndex(u => u.id === userId);
    
    if (index === -1) {
      throw new Error('User not found');
    }
    
    const updated: User = {
      ...users[index],
      status: 'deactivated' as UserStatus
    };
    
    users[index] = updated;
    this.usersSubject.next(users);
    
    this.logAuditEvent({
      actorUserId: 'admin-1',
      action: 'USER_DEACTIVATED',
      targetType: 'user',
      targetId: userId
    });
    
    return of(updated).pipe(delay(300));
  }

  // Registration methods
  listRegistrationRequests(status?: RegistrationStatus): Observable<RegistrationRequest[]> {
    let requests = [...this.registrationRequestsSubject.value];
    
    if (status) {
      requests = requests.filter(r => r.status === status);
    }
    
    return of(requests).pipe(delay(200));
  }

  approveRegistration(id: string): Observable<{ company: Company; invitation: Invitation }> {
    const requests = [...this.registrationRequestsSubject.value];
    const request = requests.find(r => r.id === id);
    
    if (!request) {
      throw new Error('Registration request not found');
    }
    
    // Update request status
    const updatedRequest: RegistrationRequest = {
      ...request,
      status: 'approved',
      decisionBy: 'admin-1',
      decisionAt: new Date().toISOString()
    };
    
    const requestIndex = requests.findIndex(r => r.id === id);
    requests[requestIndex] = updatedRequest;
    this.registrationRequestsSubject.next(requests);
    
    // Create company
    const slug = request.companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const company: Company = {
      id: `company-${Date.now()}`,
      name: request.companyName,
      slug,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {
        notes: request.notes
      },
      teams: [],
      vendor: false
    };
    
    const companies = [...this.companiesSubject.value, company];
    this.companiesSubject.next(companies);
    
    // Create invitation for submitter as COMPANY_OWNER
    const invitation: Invitation = {
      id: `invitation-${Date.now()}`,
      email: request.submittedByEmail,
      companyId: company.id,
      role: 'COMPANY_OWNER',
      sentAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'sent'
    };
    
    const invitations = [...this.invitationsSubject.value, invitation];
    this.invitationsSubject.next(invitations);
    
    // Log audit events
    this.logAuditEvent({
      actorUserId: 'admin-1',
      action: 'REGISTRATION_APPROVED',
      targetType: 'registration',
      targetId: id,
      metadata: { companyId: company.id }
    });
    
    this.logAuditEvent({
      actorUserId: 'admin-1',
      action: 'COMPANY_CREATED',
      targetType: 'company',
      targetId: company.id,
      metadata: { name: company.name, fromRegistration: true }
    });
    
    this.logAuditEvent({
      actorUserId: 'admin-1',
      action: 'USER_INVITED',
      targetType: 'invitation',
      targetId: invitation.id,
      metadata: { email: invitation.email, role: invitation.role }
    });
    
    return of({ company, invitation }).pipe(delay(500));
  }

  rejectRegistration(id: string, reason?: string): Observable<RegistrationRequest> {
    const requests = [...this.registrationRequestsSubject.value];
    const index = requests.findIndex(r => r.id === id);
    
    if (index === -1) {
      throw new Error('Registration request not found');
    }
    
    const updated: RegistrationRequest = {
      ...requests[index],
      status: 'rejected',
      decisionBy: 'admin-1',
      decisionAt: new Date().toISOString(),
      rejectionReason: reason
    };
    
    requests[index] = updated;
    this.registrationRequestsSubject.next(requests);
    
    this.logAuditEvent({
      actorUserId: 'admin-1',
      action: 'REGISTRATION_REJECTED',
      targetType: 'registration',
      targetId: id,
      metadata: { reason }
    });
    
    return of(updated).pipe(delay(300));
  }

  // Audit methods
  listAuditEvents(query?: { 
    startDate?: string; 
    endDate?: string; 
    actorUserId?: string; 
    action?: string; 
    targetType?: string;
    targetId?: string;
  }): Observable<AuditEvent[]> {
    let events = [...this.auditEventsSubject.value];
    
    if (query?.startDate) {
      events = events.filter(e => e.createdAt >= query.startDate!);
    }
    
    if (query?.endDate) {
      events = events.filter(e => e.createdAt <= query.endDate!);
    }
    
    if (query?.actorUserId) {
      events = events.filter(e => e.actorUserId === query.actorUserId);
    }
    
    if (query?.action) {
      events = events.filter(e => e.action === query.action);
    }
    
    if (query?.targetType) {
      events = events.filter(e => e.targetType === query.targetType);
    }
    
    if (query?.targetId) {
      events = events.filter(e => e.targetId === query.targetId);
    }
    
    // Sort by createdAt descending
    events.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return of(events).pipe(delay(200));
  }

  private logAuditEvent(event: Omit<AuditEvent, 'id' | 'createdAt'>): void {
    const auditEvent: AuditEvent = {
      ...event,
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString()
    };
    
    const events = [...this.auditEventsSubject.value, auditEvent];
    this.auditEventsSubject.next(events);
  }

  // Removed localStorage helpers - in-memory services should not persist data
  // This ensures mock data doesn't leak into production and resets on page refresh

  // Seed data
  private getSeedCompanies(): Company[] {
    return [
      {
        id: 'company-1',
        name: 'Acme Corporation',
        slug: 'acme-corporation',
        status: 'active',
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-11-01T14:30:00Z',
        metadata: {
          address: '123 Business St, San Francisco, CA',
          website: 'https://acme.com',
          notes: 'Enterprise customer'
        },
        teams: [
          { id: 'team-1', name: 'Engineering', members: ['user-1', 'user-2'] },
          { id: 'team-2', name: 'Product', members: ['user-3'] }
        ],
        vendor: false
      },
      {
        id: 'company-2',
        name: 'TechVendor Inc',
        slug: 'techvendor-inc',
        status: 'active',
        createdAt: '2024-02-20T09:00:00Z',
        updatedAt: '2024-10-15T11:20:00Z',
        metadata: {
          website: 'https://techvendor.io',
          notes: 'Technology vendor partner'
        },
        teams: [],
        vendor: true
      }
    ];
  }

  private getSeedUsers(): User[] {
    return [
      {
        id: 'user-1',
        email: 'john.doe@acme.com',
        firstName: 'John',
        lastName: 'Doe',
        status: 'active',
        companyId: 'company-1',
        roles: ['COMPANY_OWNER'],
        createdAt: '2024-01-15T10:30:00Z',
        lastLoginAt: '2024-11-05T08:15:00Z'
      },
      {
        id: 'user-2',
        email: 'jane.smith@acme.com',
        firstName: 'Jane',
        lastName: 'Smith',
        status: 'active',
        companyId: 'company-1',
        roles: ['DEVELOPER'],
        createdAt: '2024-01-20T11:00:00Z',
        lastLoginAt: '2024-11-04T16:45:00Z'
      },
      {
        id: 'user-3',
        email: 'bob.jones@acme.com',
        firstName: 'Bob',
        lastName: 'Jones',
        status: 'active',
        companyId: 'company-1',
        roles: ['COMPANY_MANAGER', 'ANALYST'],
        createdAt: '2024-02-01T09:00:00Z',
        lastLoginAt: '2024-11-03T10:20:00Z'
      },
      {
        id: 'user-4',
        email: 'admin@techvendor.io',
        firstName: 'Admin',
        lastName: 'User',
        status: 'active',
        companyId: 'company-2',
        roles: ['COMPANY_OWNER'],
        createdAt: '2024-02-20T09:30:00Z',
        lastLoginAt: '2024-11-02T14:10:00Z'
      }
    ];
  }

  private getSeedRegistrationRequests(): RegistrationRequest[] {
    return [
      {
        id: 'reg-1',
        companyName: 'NewStartup Co',
        submittedByEmail: 'founder@newstartup.com',
        submittedAt: '2024-11-05T12:00:00Z',
        notes: 'Early stage startup looking to integrate',
        status: 'new'
      }
    ];
  }
}

