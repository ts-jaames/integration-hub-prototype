import { Injectable, signal, computed, inject } from '@angular/core';
import { Observable, of, delay, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiClientService } from '../../core/services/api-client.service';
import { LoggerService } from '../../core/services/logger.service';
import { 
  VendorCompany, 
  VendorStatus, 
  VendorReadinessState,
  VendorUser,
  VendorApiKey,
  VendorDocument,
  VendorActivityEvent
} from '../models/vendor-company.model';

export interface VendorCompanyFormData {
  companyName: string;
  dba?: string;
  primaryContactName: string;
  primaryContactEmail: string;
  primaryContactPhone?: string;
  purpose?: string;
  category?: string;
  legalName?: string;
  vendorType: string;
  externalVendorId?: string;
  isActive: boolean;
  integrationModes: string[];
  targetSystems: string[];
  environments: string[];
  primaryContactRole?: string;
  technicalContactName?: string;
  technicalContactEmail?: string;
  technicalContactRole?: string;
  billingContactName?: string;
  billingContactEmail?: string;
  timeZone: string;
  supportTier?: string;
  notes?: string;
}

// Mock current user - TODO: Replace with actual auth service
const MOCK_CURRENT_USER = {
  name: 'System Administrator',
  email: 'admin@example.com',
  role: 'Administrator'
};

@Injectable({
  providedIn: 'root'
})
export class VendorCompanyService {
  private apiClient = inject(ApiClientService);
  private logger = inject(LoggerService);

  // In-memory store for vendors (only used when enableMockData is true)
  private vendors = signal<VendorCompany[]>([]);
  
  // Initialize with mock data if in mock mode
  constructor() {
    console.log('[VendorCompanyService] Initializing with enableMockData:', environment.enableMockData);
    if (environment.enableMockData) {
      this.initializeMockData();
      console.log('[VendorCompanyService] Mock data initialized with', this.vendors().length, 'vendors');
    }
  }

  /**
   * Get all vendors
   */
  getVendors(): Observable<VendorCompany[]> {
    if (environment.enableMockData) {
      // Dev mode: use in-memory mocks
      const vendorsList = this.vendors();
      console.log('[VendorCompanyService.getVendors] Returning', vendorsList.length, 'mock vendors');
      this.logger.debug('VendorCompanyService: Returning mock vendors', vendorsList);
      return of(vendorsList).pipe(delay(300));
    }

    // Production: use real API
    return this.apiClient.get<VendorCompany[]>('vendors');
  }

  /**
   * Get vendor by ID
   */
  getVendorById(id: string): Observable<VendorCompany | null> {
    if (environment.enableMockData) {
      // Dev mode: use in-memory mocks
      this.logger.debug(`VendorCompanyService: Returning mock vendor ${id}`);
      const vendor = this.vendors().find(v => v.id === id);
      return of(vendor || null).pipe(delay(200));
    }

    // Production: use real API
    return this.apiClient.get<VendorCompany>(`vendors/${id}`);
  }

  /**
   * Create a new vendor (from completed onboarding - status: Pending Approval)
   */
  createVendor(data: VendorCompanyFormData): Observable<VendorCompany> {
    if (environment.enableMockData) {
      // Dev mode: use in-memory mocks
      this.logger.debug('VendorCompanyService: Creating mock vendor');
      const vendor: VendorCompany = {
        id: `vendor_${Date.now()}`,
        name: data.companyName,
        dba: data.dba,
        primaryContact: data.primaryContactName,
        primaryEmail: data.primaryContactEmail,
        primaryPhone: data.primaryContactPhone,
        status: 'Pending Approval', // Onboarding completed, awaiting activation
        riskLevel: 'Medium',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy: MOCK_CURRENT_USER.name,
        submittedAt: new Date().toISOString(), // When onboarding was completed
        purpose: data.purpose,
        category: data.category,
        vendor: true,
        onboardingProgress: {
          completedSteps: 5,
          totalSteps: 5,
          lastUpdated: new Date().toISOString()
        },
        users: [],
        apiKeys: [],
        documents: [],
        activityLog: []
      };

      // Compute initial readiness
      vendor.readiness = this.computeReadiness(vendor);
      vendor.readinessBlockers = this.getReadinessBlockers(vendor);

      // Add creation activity log entry
      this.addActivityLogEntry(vendor, 'Vendor onboarding completed', `Vendor "${vendor.name}" completed onboarding and is pending approval`);

      // Update vendors list
      this.vendors.update(vendors => [...vendors, vendor]);

      return of(vendor).pipe(delay(500));
    }

    // Production: use real API
    return this.apiClient.post<VendorCompany>('vendors', data);
  }

  /**
   * Save vendor as draft (incomplete onboarding)
   */
  saveDraftVendor(data: Partial<VendorCompanyFormData>, onboardingProgress: { completedSteps: number; totalSteps: number; currentStep?: string }): Observable<VendorCompany> {
    if (environment.enableMockData) {
      this.logger.debug('VendorCompanyService: Saving draft vendor');
      const vendor: VendorCompany = {
        id: `vendor_${Date.now()}`,
        name: data.companyName || 'Untitled Vendor',
        dba: data.dba,
        primaryContact: data.primaryContactName || '',
        primaryEmail: data.primaryContactEmail || '',
        primaryPhone: data.primaryContactPhone,
        status: 'Draft',
        riskLevel: 'Medium',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy: MOCK_CURRENT_USER.name,
        purpose: data.purpose,
        category: data.category,
        vendor: true,
        onboardingProgress: {
          ...onboardingProgress,
          lastUpdated: new Date().toISOString()
        },
        users: [],
        apiKeys: [],
        documents: [],
        activityLog: []
      };

      this.addActivityLogEntry(vendor, 'Draft saved', `Vendor draft saved at step ${onboardingProgress.currentStep || onboardingProgress.completedSteps}`);
      this.vendors.update(vendors => [...vendors, vendor]);

      return of(vendor).pipe(delay(300));
    }

    return this.apiClient.post<VendorCompany>('vendors/draft', data);
  }

  /**
   * Update vendor metadata
   */
  updateVendor(id: string, updates: Partial<VendorCompany>): Observable<VendorCompany> {
    if (environment.enableMockData) {
      // Dev mode: use in-memory mocks
      this.logger.debug(`VendorCompanyService: Updating mock vendor ${id}`);
      const vendor = this.vendors().find(v => v.id === id);
      if (!vendor) {
        throw new Error(`Vendor with id ${id} not found`);
      }

      const updated: VendorCompany = {
        ...vendor,
        ...updates,
        updatedAt: new Date().toISOString(),
        updatedBy: MOCK_CURRENT_USER.name
      };

      // Recompute readiness if relevant fields changed
      if (updates.status || updates.documents || updates.compliance) {
        updated.readiness = this.computeReadiness(updated);
        updated.readinessBlockers = this.getReadinessBlockers(updated);
      }

      // Add activity log entry
      this.addActivityLogEntry(updated, 'Vendor metadata updated', 'Vendor information was modified');

      // Update vendors list
      this.vendors.update(vendors => 
        vendors.map(v => v.id === id ? updated : v)
      );

      return of(updated).pipe(delay(300));
    }

    // Production: use real API
    return this.apiClient.patch<VendorCompany>(`vendors/${id}`, updates);
  }

  /**
   * Activate vendor (Pending Approval → Active)
   */
  activateVendor(id: string): Observable<VendorCompany> {
    const vendor = this.vendors().find(v => v.id === id);
    if (!vendor) {
      throw new Error(`Vendor with id ${id} not found`);
    }
    if (vendor.status !== 'Pending Approval') {
      throw new Error(`Cannot activate vendor with status "${vendor.status}". Must be "Pending Approval".`);
    }
    return this.transitionStatus(id, 'Active', 'Vendor activated', `Vendor activated by ${MOCK_CURRENT_USER.name}`);
  }

  /**
   * Reject vendor (Pending Approval → Rejected)
   * Requires a rejection reason for audit
   */
  rejectVendor(id: string, reason: string): Observable<VendorCompany> {
    if (!reason || reason.trim().length === 0) {
      throw new Error('Rejection reason is required');
    }
    const vendor = this.vendors().find(v => v.id === id);
    if (!vendor) {
      throw new Error(`Vendor with id ${id} not found`);
    }
    if (vendor.status !== 'Pending Approval') {
      throw new Error(`Cannot reject vendor with status "${vendor.status}". Must be "Pending Approval".`);
    }
    return this.transitionStatus(id, 'Rejected', 'Vendor rejected', reason);
  }

  /**
   * Archive vendor (Active or Rejected → Archived)
   */
  archiveVendor(id: string, reason?: string): Observable<VendorCompany> {
    const vendor = this.vendors().find(v => v.id === id);
    if (!vendor) {
      throw new Error(`Vendor with id ${id} not found`);
    }
    if (vendor.status !== 'Active' && vendor.status !== 'Rejected') {
      throw new Error(`Cannot archive vendor with status "${vendor.status}". Must be "Active" or "Rejected".`);
    }
    return this.transitionStatus(id, 'Archived', 'Vendor archived', reason || `Vendor archived by ${MOCK_CURRENT_USER.name}`);
  }

  /**
   * Transition vendor status with proper tracking
   */
  private transitionStatus(
    id: string, 
    newStatus: VendorStatus, 
    action: string,
    details?: string
  ): Observable<VendorCompany> {
    const vendor = this.vendors().find(v => v.id === id);
    if (!vendor) {
      throw new Error(`Vendor with id ${id} not found`);
    }

    const updated: VendorCompany = {
      ...vendor,
      status: newStatus,
      updatedAt: new Date().toISOString(),
      updatedBy: MOCK_CURRENT_USER.name
    };

    // Track status-specific metadata
    if (newStatus === 'Active') {
      updated.activatedAt = new Date().toISOString();
      updated.activatedBy = MOCK_CURRENT_USER.name;
    } else if (newStatus === 'Rejected') {
      updated.rejectedAt = new Date().toISOString();
      updated.rejectedBy = MOCK_CURRENT_USER.name;
      updated.rejectionReason = details;
    } else if (newStatus === 'Archived') {
      updated.archivedAt = new Date().toISOString();
      updated.archivedBy = MOCK_CURRENT_USER.name;
      updated.archiveReason = details;
    }

    // Recompute readiness
    updated.readiness = this.computeReadiness(updated);
    updated.readinessBlockers = this.getReadinessBlockers(updated);

    // Add activity log entry
    this.addActivityLogEntry(updated, action, details || `${action} by ${MOCK_CURRENT_USER.name}`);

    // Update vendors list
    this.vendors.update(vendors => 
      vendors.map(v => v.id === id ? updated : v)
    );

    return of(updated).pipe(delay(300));
  }

  /**
   * Check for duplicate vendors
   */
  checkDuplicate(name: string, email: string): Observable<{ isDuplicate: boolean; matches: VendorCompany[] }> {
    const matches = this.vendors().filter(v => 
      v.name.toLowerCase() === name.toLowerCase() ||
      v.primaryEmail.toLowerCase() === email.toLowerCase()
    );
    
    return of({
      isDuplicate: matches.length > 0,
      matches
    }).pipe(delay(200));
  }

  /**
   * Compute vendor readiness state
   */
  computeReadiness(vendor: VendorCompany): VendorReadinessState {
    // Not ready if not Active
    if (vendor.status !== 'Active') {
      return 'Blocked';
    }

    // Check for expired or missing critical documents
    const criticalDocs = vendor.documents?.filter(d => 
      d.type === 'Agreement' || d.type === 'Security Certificate'
    ) || [];

    const hasExpiredDocs = criticalDocs.some(doc => {
      if (!doc.expirationDate) return false;
      const expiration = new Date(doc.expirationDate);
      return expiration < new Date();
    });

    if (hasExpiredDocs || criticalDocs.length === 0) {
      return 'Blocked';
    }

    // Check for missing non-critical requirements
    const hasAllRequiredDocs = vendor.documents && vendor.documents.length >= 2;
    if (!hasAllRequiredDocs) {
      return 'Pending Requirements';
    }

    return 'Ready';
  }

  /**
   * Get list of readiness blockers
   */
  getReadinessBlockers(vendor: VendorCompany): string[] {
    const blockers: string[] = [];

    if (vendor.status === 'Draft') {
      blockers.push('Vendor onboarding is incomplete');
    } else if (vendor.status === 'Pending Approval') {
      blockers.push('Vendor is pending approval');
    } else if (vendor.status === 'Rejected') {
      blockers.push(`Vendor was rejected${vendor.rejectionReason ? ': ' + vendor.rejectionReason : ''}`);
    } else if (vendor.status === 'Archived') {
      blockers.push('Vendor is archived');
    } else if (vendor.status !== 'Active') {
      blockers.push(`Vendor status is ${vendor.status}`);
    }

    const criticalDocs = vendor.documents?.filter(d => 
      d.type === 'Agreement' || d.type === 'Security Certificate'
    ) || [];

    if (vendor.status === 'Active') {
      if (criticalDocs.length === 0) {
        blockers.push('Missing required compliance documents (Agreement or Security Certificate)');
      } else {
        criticalDocs.forEach(doc => {
          if (doc.expirationDate) {
            const expiration = new Date(doc.expirationDate);
            if (expiration < new Date()) {
              blockers.push(`${doc.type} expired on ${expiration.toLocaleDateString()}`);
            }
          }
        });
      }
    }

    return blockers;
  }

  /**
   * Add vendor user
   */
  addVendorUser(vendorId: string, user: Omit<VendorUser, 'id' | 'vendorId' | 'invitedAt' | 'invitedBy'>): Observable<VendorUser> {
    const vendor = this.vendors().find(v => v.id === vendorId);
    if (!vendor) {
      throw new Error(`Vendor with id ${vendorId} not found`);
    }

    if (vendor.status !== 'Active') {
      throw new Error('Cannot add users to a vendor that is not active');
    }

    const newUser: VendorUser = {
      id: `user_${Date.now()}`,
      vendorId,
      ...user,
      status: 'Invited',
      invitedAt: new Date().toISOString(),
      invitedBy: MOCK_CURRENT_USER.name
    };

    const updated: VendorCompany = {
      ...vendor,
      users: [...(vendor.users || []), newUser],
      updatedAt: new Date().toISOString(),
      updatedBy: MOCK_CURRENT_USER.name
    };

    this.addActivityLogEntry(updated, 'Vendor user invited', `User ${user.name} (${user.email}) was invited`);

    this.vendors.update(vendors => 
      vendors.map(v => v.id === vendorId ? updated : v)
    );

    return of(newUser).pipe(delay(300));
  }

  /**
   * Update vendor user
   */
  updateVendorUser(vendorId: string, userId: string, updates: Partial<VendorUser>): Observable<VendorUser> {
    const vendor = this.vendors().find(v => v.id === vendorId);
    if (!vendor) {
      throw new Error(`Vendor with id ${vendorId} not found`);
    }

    const user = vendor.users?.find(u => u.id === userId);
    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }

    const updatedUser: VendorUser = { ...user, ...updates };
    const updated: VendorCompany = {
      ...vendor,
      users: vendor.users!.map(u => u.id === userId ? updatedUser : u),
      updatedAt: new Date().toISOString(),
      updatedBy: MOCK_CURRENT_USER.name
    };

    this.addActivityLogEntry(updated, 'Vendor user updated', `User ${updatedUser.name} was modified`);

    this.vendors.update(vendors => 
      vendors.map(v => v.id === vendorId ? updated : v)
    );

    return of(updatedUser).pipe(delay(300));
  }

  /**
   * Remove vendor user
   */
  removeVendorUser(vendorId: string, userId: string): Observable<void> {
    const vendor = this.vendors().find(v => v.id === vendorId);
    if (!vendor) {
      throw new Error(`Vendor with id ${vendorId} not found`);
    }

    const user = vendor.users?.find(u => u.id === userId);
    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }

    const updated: VendorCompany = {
      ...vendor,
      users: vendor.users!.filter(u => u.id !== userId),
      updatedAt: new Date().toISOString(),
      updatedBy: MOCK_CURRENT_USER.name
    };

    this.addActivityLogEntry(updated, 'Vendor user removed', `User ${user.name} (${user.email}) was removed`);

    this.vendors.update(vendors => 
      vendors.map(v => v.id === vendorId ? updated : v)
    );

    return of(undefined).pipe(delay(300));
  }

  /**
   * Generate API key
   */
  generateApiKey(vendorId: string, environment: 'Sandbox' | 'Production', description?: string): Observable<{ key: VendorApiKey; fullKey: string }> {
    const vendor = this.vendors().find(v => v.id === vendorId);
    if (!vendor) {
      throw new Error(`Vendor with id ${vendorId} not found`);
    }

    if (vendor.status !== 'Active') {
      throw new Error('Cannot generate API keys for a vendor that is not active');
    }

    // Generate a mock API key
    const fullKey = `sk_live_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    const maskedKey = `****-****-${fullKey.slice(-4)}`;

    const newKey: VendorApiKey = {
      id: `key_${Date.now()}`,
      vendorId,
      keyValue: fullKey,
      maskedKey,
      environment,
      status: 'Active',
      description,
      createdAt: new Date().toISOString(),
      createdBy: MOCK_CURRENT_USER.name
    };

    const updated: VendorCompany = {
      ...vendor,
      apiKeys: [...(vendor.apiKeys || []), newKey],
      updatedAt: new Date().toISOString(),
      updatedBy: MOCK_CURRENT_USER.name
    };

    this.addActivityLogEntry(updated, 'API key generated', `New ${environment} API key created`);

    this.vendors.update(vendors => 
      vendors.map(v => v.id === vendorId ? updated : v)
    );

    return of({ key: newKey, fullKey }).pipe(delay(300));
  }

  /**
   * Rotate API key
   */
  rotateApiKey(vendorId: string, keyId: string): Observable<{ key: VendorApiKey; fullKey: string }> {
    const vendor = this.vendors().find(v => v.id === vendorId);
    if (!vendor) {
      throw new Error(`Vendor with id ${vendorId} not found`);
    }

    const oldKey = vendor.apiKeys?.find(k => k.id === keyId);
    if (!oldKey) {
      throw new Error(`API key with id ${keyId} not found`);
    }

    // Revoke old key
    const revokedKey: VendorApiKey = { ...oldKey, status: 'Revoked' };

    // Generate new key
    const fullKey = `sk_live_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    const maskedKey = `****-****-${fullKey.slice(-4)}`;

    const newKey: VendorApiKey = {
      id: `key_${Date.now()}`,
      vendorId,
      keyValue: fullKey,
      maskedKey,
      environment: oldKey.environment,
      status: 'Active',
      description: oldKey.description,
      createdAt: new Date().toISOString(),
      createdBy: MOCK_CURRENT_USER.name,
      rotatedFrom: oldKey.id
    };

    const updated: VendorCompany = {
      ...vendor,
      apiKeys: vendor.apiKeys!.map(k => k.id === keyId ? revokedKey : k).concat(newKey),
      updatedAt: new Date().toISOString(),
      updatedBy: MOCK_CURRENT_USER.name
    };

    this.addActivityLogEntry(updated, 'API key rotated', `API key rotated for ${oldKey.environment} environment`);

    this.vendors.update(vendors => 
      vendors.map(v => v.id === vendorId ? updated : v)
    );

    return of({ key: newKey, fullKey }).pipe(delay(300));
  }

  /**
   * Revoke API key
   */
  revokeApiKey(vendorId: string, keyId: string): Observable<void> {
    const vendor = this.vendors().find(v => v.id === vendorId);
    if (!vendor) {
      throw new Error(`Vendor with id ${vendorId} not found`);
    }

    const key = vendor.apiKeys?.find(k => k.id === keyId);
    if (!key) {
      throw new Error(`API key with id ${keyId} not found`);
    }

    const revokedKey: VendorApiKey = { ...key, status: 'Revoked' };

    const updated: VendorCompany = {
      ...vendor,
      apiKeys: vendor.apiKeys!.map(k => k.id === keyId ? revokedKey : k),
      updatedAt: new Date().toISOString(),
      updatedBy: MOCK_CURRENT_USER.name
    };

    this.addActivityLogEntry(updated, 'API key revoked', `API key revoked for ${key.environment} environment`);

    this.vendors.update(vendors => 
      vendors.map(v => v.id === vendorId ? updated : v)
    );

    return of(undefined).pipe(delay(300));
  }

  /**
   * Upload document
   */
  uploadDocument(vendorId: string, document: Omit<VendorDocument, 'id' | 'vendorId' | 'uploadedAt' | 'uploadedBy'>): Observable<VendorDocument> {
    const vendor = this.vendors().find(v => v.id === vendorId);
    if (!vendor) {
      throw new Error(`Vendor with id ${vendorId} not found`);
    }

    if (vendor.status === 'Archived') {
      throw new Error('Cannot upload documents for an archived vendor');
    }

    const newDoc: VendorDocument = {
      id: `doc_${Date.now()}`,
      vendorId,
      ...document,
      uploadedAt: new Date().toISOString(),
      uploadedBy: MOCK_CURRENT_USER.name
    };

    const updated: VendorCompany = {
      ...vendor,
      documents: [...(vendor.documents || []), newDoc],
      updatedAt: new Date().toISOString(),
      updatedBy: MOCK_CURRENT_USER.name
    };

    // Recompute readiness
    updated.readiness = this.computeReadiness(updated);
    updated.readinessBlockers = this.getReadinessBlockers(updated);

    this.addActivityLogEntry(updated, 'Compliance document uploaded', `${document.type}: ${document.fileName}`);

    this.vendors.update(vendors => 
      vendors.map(v => v.id === vendorId ? updated : v)
    );

    return of(newDoc).pipe(delay(300));
  }

  /**
   * Remove document
   */
  removeDocument(vendorId: string, documentId: string): Observable<void> {
    const vendor = this.vendors().find(v => v.id === vendorId);
    if (!vendor) {
      throw new Error(`Vendor with id ${vendorId} not found`);
    }

    const doc = vendor.documents?.find(d => d.id === documentId);
    if (!doc) {
      throw new Error(`Document with id ${documentId} not found`);
    }

    const updated: VendorCompany = {
      ...vendor,
      documents: vendor.documents!.filter(d => d.id !== documentId),
      updatedAt: new Date().toISOString(),
      updatedBy: MOCK_CURRENT_USER.name
    };

    // Recompute readiness
    updated.readiness = this.computeReadiness(updated);
    updated.readinessBlockers = this.getReadinessBlockers(updated);

    this.addActivityLogEntry(updated, 'Compliance document removed', `${doc.type}: ${doc.fileName}`);

    this.vendors.update(vendors => 
      vendors.map(v => v.id === vendorId ? updated : v)
    );

    return of(undefined).pipe(delay(300));
  }

  /**
   * Add activity log entry
   */
  private addActivityLogEntry(vendor: VendorCompany, action: string, details?: string): void {
    const entry: VendorActivityEvent = {
      id: `activity_${Date.now()}`,
      vendorId: vendor.id,
      timestamp: new Date().toISOString(),
      actor: {
        name: MOCK_CURRENT_USER.name,
        email: MOCK_CURRENT_USER.email,
        role: MOCK_CURRENT_USER.role
      },
      action,
      details
    };

    vendor.activityLog = [...(vendor.activityLog || []), entry];
  }

  /**
   * Initialize mock data with unified status model
   */
  private initializeMockData(): void {
    const mockVendors: VendorCompany[] = [
      // Active vendors (previously Approved)
      {
        id: '1',
        name: 'Acme Corporation',
        dba: 'Acme',
        primaryContact: 'John Smith',
        primaryEmail: 'john.smith@acme.com',
        primaryPhone: '+1-555-0101',
        status: 'Active',
        tier: 'Tier 1',
        riskLevel: 'Low',
        riskTier: 'Tier 1',
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-20T14:30:00Z',
        updatedBy: 'System Administrator',
        activatedAt: '2024-01-20T14:30:00Z',
        activatedBy: 'System Administrator',
        website: 'https://acme.com',
        address: '123 Main St, San Francisco, CA',
        purpose: 'Payment processing and financial services',
        category: 'Payment',
        vendor: true,
        onboardingProgress: { completedSteps: 5, totalSteps: 5 },
        documents: [
          {
            id: 'doc1',
            vendorId: '1',
            type: 'Agreement',
            fileName: 'acme-agreement-2024.pdf',
            uploadedAt: '2024-01-16T10:00:00Z',
            uploadedBy: 'System Administrator',
            expirationDate: '2025-01-15T00:00:00Z'
          },
          {
            id: 'doc2',
            vendorId: '1',
            type: 'Security Certificate',
            fileName: 'acme-soc2-2024.pdf',
            uploadedAt: '2024-01-16T10:00:00Z',
            uploadedBy: 'System Administrator',
            expirationDate: '2025-06-15T00:00:00Z'
          }
        ],
        users: [
          {
            id: 'user1',
            vendorId: '1',
            name: 'John Smith',
            email: 'john.smith@acme.com',
            role: 'Administrator',
            status: 'Active',
            invitedAt: '2024-01-16T10:00:00Z',
            invitedBy: 'System Administrator'
          }
        ],
        apiKeys: [],
        activityLog: []
      },
      // Draft vendor (incomplete onboarding)
      {
        id: '2',
        name: 'TechStart Inc',
        dba: 'TechStart',
        primaryContact: 'Sarah Johnson',
        primaryEmail: 'sarah.j@techstart.com',
        primaryPhone: '+1-555-0102',
        status: 'Draft',
        tier: 'Tier 2',
        riskLevel: 'Medium',
        createdAt: '2024-02-20T14:30:00Z',
        updatedAt: '2024-02-20T14:30:00Z',
        website: 'https://techstart.io',
        purpose: 'Operations and data management',
        category: 'Operations',
        vendor: true,
        onboardingProgress: { completedSteps: 2, totalSteps: 5, currentStep: 'Integration' },
        documents: [],
        users: [],
        apiKeys: [],
        activityLog: []
      },
      {
        id: '3',
        name: 'Global Logistics Partners',
        dba: 'GLP',
        primaryContact: 'Michael Chen',
        primaryEmail: 'mchen@glp.com',
        primaryPhone: '+1-555-0103',
        status: 'Active',
        tier: 'Tier 1',
        riskLevel: 'Low',
        riskTier: 'Tier 1',
        createdAt: '2024-03-01T09:00:00Z',
        updatedAt: '2024-03-15T11:00:00Z',
        updatedBy: 'System Administrator',
        activatedAt: '2024-03-15T11:00:00Z',
        activatedBy: 'System Administrator',
        website: 'https://glp.com',
        address: '456 Commerce Blvd, New York, NY',
        purpose: 'Shipping and logistics integration',
        category: 'Logistics',
        vendor: true,
        onboardingProgress: { completedSteps: 5, totalSteps: 5 },
        documents: [
          {
            id: 'doc3',
            vendorId: '3',
            type: 'Agreement',
            fileName: 'glp-contract-2024.pdf',
            uploadedAt: '2024-03-02T10:00:00Z',
            uploadedBy: 'System Administrator',
            expirationDate: '2025-03-01T00:00:00Z'
          }
        ],
        users: [
          {
            id: 'user3',
            vendorId: '3',
            name: 'Michael Chen',
            email: 'mchen@glp.com',
            role: 'Administrator',
            status: 'Active',
            invitedAt: '2024-03-02T10:00:00Z',
            invitedBy: 'System Administrator'
          }
        ],
        apiKeys: [],
        activityLog: []
      },
      {
        id: '4',
        name: 'CloudSync Solutions',
        dba: 'CloudSync',
        primaryContact: 'Emily Rodriguez',
        primaryEmail: 'emily@cloudsync.io',
        primaryPhone: '+1-555-0104',
        status: 'Active',
        tier: 'Tier 2',
        riskLevel: 'Medium',
        riskTier: 'Tier 2',
        createdAt: '2024-03-10T13:00:00Z',
        updatedAt: '2024-03-20T16:00:00Z',
        updatedBy: 'System Administrator',
        activatedAt: '2024-03-20T16:00:00Z',
        activatedBy: 'System Administrator',
        website: 'https://cloudsync.io',
        address: '789 Tech Park, Austin, TX',
        purpose: 'Cloud storage and data synchronization',
        category: 'Storage',
        vendor: true,
        onboardingProgress: { completedSteps: 5, totalSteps: 5 },
        documents: [
          {
            id: 'doc4',
            vendorId: '4',
            type: 'Agreement',
            fileName: 'cloudsync-msa-2024.pdf',
            uploadedAt: '2024-03-11T10:00:00Z',
            uploadedBy: 'System Administrator',
            expirationDate: '2025-03-10T00:00:00Z'
          },
          {
            id: 'doc5',
            vendorId: '4',
            type: 'Security Certificate',
            fileName: 'cloudsync-iso27001.pdf',
            uploadedAt: '2024-03-11T10:00:00Z',
            uploadedBy: 'System Administrator',
            expirationDate: '2025-09-10T00:00:00Z'
          }
        ],
        users: [
          {
            id: 'user4',
            vendorId: '4',
            name: 'Emily Rodriguez',
            email: 'emily@cloudsync.io',
            role: 'Administrator',
            status: 'Active',
            invitedAt: '2024-03-11T10:00:00Z',
            invitedBy: 'System Administrator'
          }
        ],
        apiKeys: [],
        activityLog: []
      },
      // Rejected vendor
      {
        id: '5',
        name: 'DataFlow Analytics',
        primaryContact: 'David Park',
        primaryEmail: 'dpark@dataflow.com',
        primaryPhone: '+1-555-0105',
        status: 'Rejected',
        tier: 'Tier 3',
        riskLevel: 'High',
        riskTier: 'Tier 3',
        createdAt: '2024-04-01T10:00:00Z',
        updatedAt: '2024-04-05T14:00:00Z',
        updatedBy: 'System Administrator',
        rejectedAt: '2024-04-05T14:00:00Z',
        rejectedBy: 'System Administrator',
        rejectionReason: 'Failed security review - inadequate data protection measures',
        website: 'https://dataflow.com',
        purpose: 'Business intelligence and analytics',
        category: 'Analytics',
        vendor: true,
        onboardingProgress: { completedSteps: 5, totalSteps: 5 },
        documents: [],
        users: [],
        apiKeys: [],
        activityLog: []
      },
      {
        id: '6',
        name: 'SecureAuth Systems',
        dba: 'SecureAuth',
        primaryContact: 'Lisa Thompson',
        primaryEmail: 'lisa@secureauth.com',
        primaryPhone: '+1-555-0106',
        status: 'Active',
        tier: 'Tier 1',
        riskLevel: 'Low',
        riskTier: 'Tier 1',
        createdAt: '2024-04-10T08:00:00Z',
        updatedAt: '2024-04-15T12:00:00Z',
        updatedBy: 'System Administrator',
        activatedAt: '2024-04-15T12:00:00Z',
        activatedBy: 'System Administrator',
        website: 'https://secureauth.com',
        address: '321 Security Lane, Boston, MA',
        purpose: 'Authentication and identity management',
        category: 'Security',
        vendor: true,
        onboardingProgress: { completedSteps: 5, totalSteps: 5 },
        documents: [
          {
            id: 'doc6',
            vendorId: '6',
            type: 'Agreement',
            fileName: 'secureauth-agreement-2024.pdf',
            uploadedAt: '2024-04-11T10:00:00Z',
            uploadedBy: 'System Administrator',
            expirationDate: '2025-04-10T00:00:00Z'
          },
          {
            id: 'doc7',
            vendorId: '6',
            type: 'Security Certificate',
            fileName: 'secureauth-soc2-type2.pdf',
            uploadedAt: '2024-04-11T10:00:00Z',
            uploadedBy: 'System Administrator',
            expirationDate: '2025-10-10T00:00:00Z'
          }
        ],
        users: [
          {
            id: 'user6',
            vendorId: '6',
            name: 'Lisa Thompson',
            email: 'lisa@secureauth.com',
            role: 'Administrator',
            status: 'Active',
            invitedAt: '2024-04-11T10:00:00Z',
            invitedBy: 'System Administrator'
          },
          {
            id: 'user7',
            vendorId: '6',
            name: 'Mark Wilson',
            email: 'mark@secureauth.com',
            role: 'Technical',
            status: 'Active',
            invitedAt: '2024-04-12T10:00:00Z',
            invitedBy: 'System Administrator'
          }
        ],
        apiKeys: [],
        activityLog: []
      },
      // Pending Approval vendor (completed onboarding, awaiting activation)
      {
        id: '7',
        name: 'QuickPay Financial',
        dba: 'QuickPay',
        primaryContact: 'Robert Martinez',
        primaryEmail: 'rmartinez@quickpay.com',
        primaryPhone: '+1-555-0107',
        status: 'Pending Approval',
        tier: 'Tier 1',
        riskLevel: 'Low',
        createdAt: '2024-05-01T14:00:00Z',
        updatedAt: '2024-05-01T14:00:00Z',
        submittedAt: '2024-05-01T14:00:00Z',
        website: 'https://quickpay.com',
        address: '555 Financial Plaza, Chicago, IL',
        purpose: 'Payment gateway and processing',
        category: 'Payment',
        vendor: true,
        onboardingProgress: { completedSteps: 5, totalSteps: 5 },
        documents: [
          {
            id: 'doc8',
            vendorId: '7',
            type: 'Agreement',
            fileName: 'quickpay-msa-draft.pdf',
            uploadedAt: '2024-05-02T10:00:00Z',
            uploadedBy: 'System Administrator'
          }
        ],
        users: [],
        apiKeys: [],
        activityLog: []
      },
      {
        id: '8',
        name: 'NotifyHub Communications',
        dba: 'NotifyHub',
        primaryContact: 'Jessica Lee',
        primaryEmail: 'jlee@notifyhub.io',
        primaryPhone: '+1-555-0108',
        status: 'Active',
        tier: 'Tier 2',
        riskLevel: 'Medium',
        riskTier: 'Tier 2',
        createdAt: '2024-05-15T09:00:00Z',
        updatedAt: '2024-05-20T11:00:00Z',
        updatedBy: 'System Administrator',
        activatedAt: '2024-05-20T11:00:00Z',
        activatedBy: 'System Administrator',
        website: 'https://notifyhub.io',
        address: '888 Notification Way, Seattle, WA',
        purpose: 'SMS and email notification services',
        category: 'Communications',
        vendor: true,
        onboardingProgress: { completedSteps: 5, totalSteps: 5 },
        documents: [
          {
            id: 'doc9',
            vendorId: '8',
            type: 'Agreement',
            fileName: 'notifyhub-agreement-2024.pdf',
            uploadedAt: '2024-05-16T10:00:00Z',
            uploadedBy: 'System Administrator',
            expirationDate: '2025-05-15T00:00:00Z'
          }
        ],
        users: [
          {
            id: 'user8',
            vendorId: '8',
            name: 'Jessica Lee',
            email: 'jlee@notifyhub.io',
            role: 'Administrator',
            status: 'Active',
            invitedAt: '2024-05-16T10:00:00Z',
            invitedBy: 'System Administrator'
          }
        ],
        apiKeys: [],
        activityLog: []
      },
      // Archived vendor
      {
        id: '9',
        name: 'DataVault Backups',
        primaryContact: 'Andrew Kim',
        primaryEmail: 'akim@datavault.com',
        primaryPhone: '+1-555-0109',
        status: 'Archived',
        tier: 'Tier 3',
        riskLevel: 'Medium',
        createdAt: '2023-12-01T10:00:00Z',
        updatedAt: '2024-06-01T10:00:00Z',
        updatedBy: 'System Administrator',
        archivedAt: '2024-06-01T10:00:00Z',
        archivedBy: 'System Administrator',
        archiveReason: 'Contract ended - vendor discontinued service',
        website: 'https://datavault.com',
        purpose: 'Data backup and recovery services',
        category: 'Storage',
        vendor: true,
        onboardingProgress: { completedSteps: 5, totalSteps: 5 },
        documents: [],
        users: [],
        apiKeys: [],
        activityLog: []
      },
      {
        id: '10',
        name: 'APIGateway Pro',
        dba: 'API Gateway',
        primaryContact: 'Rachel Green',
        primaryEmail: 'rgreen@apigateway.io',
        primaryPhone: '+1-555-0110',
        status: 'Active',
        tier: 'Tier 1',
        riskLevel: 'Low',
        riskTier: 'Tier 1',
        createdAt: '2024-06-01T10:00:00Z',
        updatedAt: '2024-06-10T14:00:00Z',
        updatedBy: 'System Administrator',
        activatedAt: '2024-06-10T14:00:00Z',
        activatedBy: 'System Administrator',
        website: 'https://apigateway.io',
        address: '999 Integration Blvd, Denver, CO',
        purpose: 'API management and gateway services',
        category: 'Integration',
        vendor: true,
        onboardingProgress: { completedSteps: 5, totalSteps: 5 },
        documents: [
          {
            id: 'doc10',
            vendorId: '10',
            type: 'Agreement',
            fileName: 'apigateway-enterprise-2024.pdf',
            uploadedAt: '2024-06-02T10:00:00Z',
            uploadedBy: 'System Administrator',
            expirationDate: '2025-06-01T00:00:00Z'
          },
          {
            id: 'doc11',
            vendorId: '10',
            type: 'Security Certificate',
            fileName: 'apigateway-soc2.pdf',
            uploadedAt: '2024-06-02T10:00:00Z',
            uploadedBy: 'System Administrator',
            expirationDate: '2025-12-01T00:00:00Z'
          }
        ],
        users: [
          {
            id: 'user10',
            vendorId: '10',
            name: 'Rachel Green',
            email: 'rgreen@apigateway.io',
            role: 'Administrator',
            status: 'Active',
            invitedAt: '2024-06-02T10:00:00Z',
            invitedBy: 'System Administrator'
          }
        ],
        apiKeys: [],
        activityLog: []
      },
      // Another Draft vendor
      {
        id: '11',
        name: 'NewCo Innovations',
        primaryContact: 'Alex Turner',
        primaryEmail: 'alex@newco.io',
        primaryPhone: '+1-555-0111',
        status: 'Draft',
        riskLevel: 'Medium',
        createdAt: '2024-06-15T10:00:00Z',
        updatedAt: '2024-06-15T10:00:00Z',
        website: 'https://newco.io',
        purpose: 'Workflow automation',
        category: 'Operations',
        vendor: true,
        onboardingProgress: { completedSteps: 1, totalSteps: 5, currentStep: 'Company' },
        documents: [],
        users: [],
        apiKeys: [],
        activityLog: []
      },
      // Another Pending Approval vendor
      {
        id: '12',
        name: 'PaymentStream',
        dba: 'PayStream',
        primaryContact: 'Maria Garcia',
        primaryEmail: 'mgarcia@paymentstream.com',
        primaryPhone: '+1-555-0112',
        status: 'Pending Approval',
        tier: 'Tier 2',
        riskLevel: 'Medium',
        createdAt: '2024-06-18T09:00:00Z',
        updatedAt: '2024-06-18T16:00:00Z',
        submittedAt: '2024-06-18T16:00:00Z',
        website: 'https://paymentstream.com',
        purpose: 'Real-time payment processing',
        category: 'Payment',
        vendor: true,
        onboardingProgress: { completedSteps: 5, totalSteps: 5 },
        documents: [],
        users: [],
        apiKeys: [],
        activityLog: []
      }
    ];

    // Compute readiness for all vendors
    mockVendors.forEach(vendor => {
      vendor.readiness = this.computeReadiness(vendor);
      vendor.readinessBlockers = this.getReadinessBlockers(vendor);
    });

    this.vendors.set(mockVendors);
  }

  /**
   * Save vendor company (legacy method for compatibility)
   */
  saveVendorCompany(data: VendorCompanyFormData): Observable<VendorCompanyFormData & { id: string; createdAt: string }> {
    return this.createVendor(data).pipe(
      delay(500),
      // Map to legacy return type
      // @ts-ignore
      map(vendor => ({
        ...data,
        id: vendor.id,
        createdAt: vendor.createdAt
      }))
    );
  }
}