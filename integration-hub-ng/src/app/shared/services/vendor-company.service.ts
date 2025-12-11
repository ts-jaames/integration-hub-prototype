import { Injectable, signal, computed } from '@angular/core';
import { Observable, of, delay, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
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
  // In-memory store for vendors
  private vendors = signal<VendorCompany[]>([]);
  
  // Initialize with mock data
  constructor() {
    this.initializeMockData();
  }

  /**
   * Get all vendors
   */
  getVendors(): Observable<VendorCompany[]> {
    return of(this.vendors()).pipe(delay(300));
  }

  /**
   * Get vendor by ID
   */
  getVendorById(id: string): Observable<VendorCompany | null> {
    const vendor = this.vendors().find(v => v.id === id);
    return of(vendor || null).pipe(delay(200));
  }

  /**
   * Create a new vendor
   */
  createVendor(data: VendorCompanyFormData): Observable<VendorCompany> {
    const vendor: VendorCompany = {
      id: `vendor_${Date.now()}`,
      name: data.companyName,
      dba: data.dba,
      primaryContact: data.primaryContactName,
      primaryEmail: data.primaryContactEmail,
      primaryPhone: data.primaryContactPhone,
      status: 'Pending',
      riskLevel: 'Medium',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedBy: MOCK_CURRENT_USER.name,
      purpose: data.purpose,
      category: data.category,
      vendor: true,
      users: [],
      apiKeys: [],
      documents: [],
      activityLog: []
    };

    // Compute initial readiness
    vendor.readiness = this.computeReadiness(vendor);
    vendor.readinessBlockers = this.getReadinessBlockers(vendor);

    // Add creation activity log entry
    this.addActivityLogEntry(vendor, 'Vendor created', `Vendor "${vendor.name}" was created`);

    // Update vendors list
    this.vendors.update(vendors => [...vendors, vendor]);

    return of(vendor).pipe(delay(500));
  }

  /**
   * Update vendor metadata
   */
  updateVendor(id: string, updates: Partial<VendorCompany>): Observable<VendorCompany> {
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

  /**
   * Approve vendor
   */
  approveVendor(id: string): Observable<VendorCompany> {
    return this.transitionStatus(id, 'Approved', 'Vendor approved');
  }

  /**
   * Reject vendor
   */
  rejectVendor(id: string, reason: string): Observable<VendorCompany> {
    return this.transitionStatus(id, 'Rejected', 'Vendor rejected', reason);
  }

  /**
   * Archive vendor
   */
  archiveVendor(id: string): Observable<VendorCompany> {
    return this.transitionStatus(id, 'Archived', 'Vendor archived');
  }

  /**
   * Transition vendor status
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
    // Blocked if critical requirements missing
    if (vendor.status !== 'Approved') {
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

    if (vendor.status !== 'Approved') {
      blockers.push(`Vendor is not approved (current status: ${vendor.status})`);
    }

    const criticalDocs = vendor.documents?.filter(d => 
      d.type === 'Agreement' || d.type === 'Security Certificate'
    ) || [];

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

    if (vendor.status !== 'Approved') {
      throw new Error('Cannot add users to a vendor that is not approved');
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

    if (vendor.status !== 'Approved') {
      throw new Error('Cannot generate API keys for a vendor that is not approved');
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
   * Initialize mock data
   */
  private initializeMockData(): void {
    const mockVendors: VendorCompany[] = [
      {
        id: '1',
        name: 'Acme Corporation',
        dba: 'Acme',
        primaryContact: 'John Smith',
        primaryEmail: 'john.smith@acme.com',
        primaryPhone: '+1-555-0101',
        status: 'Approved',
        tier: 'Tier 1',
        riskLevel: 'Low',
        riskTier: 'Tier 1',
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-20T14:30:00Z',
        updatedBy: 'System Administrator',
        website: 'https://acme.com',
        address: '123 Main St, San Francisco, CA',
        purpose: 'Payment processing and financial services',
        category: 'Payment',
        vendor: true,
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
      {
        id: '2',
        name: 'TechStart Inc',
        primaryContact: 'Sarah Johnson',
        primaryEmail: 'sarah.j@techstart.com',
        primaryPhone: '+1-555-0102',
        status: 'Pending',
        tier: 'Tier 2',
        riskLevel: 'Medium',
        createdAt: '2024-02-20T14:30:00Z',
        updatedAt: '2024-02-20T14:30:00Z',
        purpose: 'Operations and data management',
        category: 'Operations',
        vendor: true,
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