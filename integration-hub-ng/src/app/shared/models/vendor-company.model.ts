import { VendorLifecycle, ComplianceStatus, IntegrationStatus } from './vendor-lifecycle.model';

export type VendorStatus = 'Pending' | 'Approved' | 'Rejected' | 'Archived';
export type VendorComplianceState = 'Complete' | 'Missing Docs' | 'Expired';
export type VendorOnboardingPhase = 'New' | 'In Review' | 'Ready' | 'Blocked';
export type VendorReadinessState = 'Ready' | 'Pending Requirements' | 'Blocked';

export interface VendorCompany {
  id: string;
  name: string;
  dba?: string; // Doing Business As
  primaryContact: string;
  primaryEmail: string;
  primaryPhone?: string;
  status: VendorStatus;
  tier?: 'Tier 1' | 'Tier 2' | 'Tier 3';
  riskLevel: 'Low' | 'Medium' | 'High';
  riskTier?: string; // Placeholder field for risk tier
  createdAt: string;
  updatedAt: string;
  updatedBy?: string; // Actor who last updated
  submittedAt?: string;
  website?: string;
  address?: string;
  notes?: string;
  purpose?: string; // High-level description
  category?: string; // Classification (e.g., Payment, Operations, etc.)
  vendor: boolean;
  lifecycle?: VendorLifecycle;
  compliance?: ComplianceStatus;
  integrationStatus?: IntegrationStatus;
  // New fields for epic implementation
  complianceState?: VendorComplianceState;
  onboardingPhase?: VendorOnboardingPhase;
  readiness?: VendorReadinessState;
  readinessBlockers?: string[]; // List of specific blockers
  users?: VendorUser[];
  apiKeys?: VendorApiKey[];
  documents?: VendorDocument[];
  activityLog?: VendorActivityEvent[];
}

export interface VendorUser {
  id: string;
  vendorId: string;
  name: string;
  email: string;
  role: string;
  status: 'Active' | 'Disabled' | 'Invited';
  invitedAt?: string;
  invitedBy?: string;
  lastActiveAt?: string;
}

export interface VendorApiKey {
  id: string;
  vendorId: string;
  keyValue: string; // Full key (only shown once after creation)
  maskedKey: string; // Masked version for display
  environment: 'Sandbox' | 'Production';
  status: 'Active' | 'Revoked' | 'Expired';
  description?: string;
  createdAt: string;
  createdBy?: string;
  lastUsedAt?: string;
  rotatedFrom?: string; // ID of key this was rotated from
}

export interface VendorDocument {
  id: string;
  vendorId: string;
  type: 'Agreement' | 'Security Certificate' | 'Insurance Certificate' | 'Other';
  fileName: string;
  expirationDate?: string;
  uploadedAt: string;
  uploadedBy?: string;
  fileSize?: number;
  notes?: string;
}

export interface VendorActivityEvent {
  id: string;
  vendorId: string;
  timestamp: string;
  actor: {
    name: string;
    email?: string;
    role?: string;
  };
  action: string; // e.g., "Vendor created", "Vendor approved", "API key generated"
  details?: string; // Additional context (e.g., rejection reason)
  metadata?: Record<string, any>; // Additional structured data
}

