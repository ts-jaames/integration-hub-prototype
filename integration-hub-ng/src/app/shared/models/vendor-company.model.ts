import { VendorLifecycle, ComplianceStatus, IntegrationStatus } from './vendor-lifecycle.model';

/**
 * Unified Vendor Status Model
 * 
 * - Draft: Onboarding started but not all required steps complete
 * - Pending Approval: All onboarding steps completed, awaiting activation
 * - Active: Vendor approved and activated, integrations allowed
 * - Rejected: Vendor reviewed and not approved (requires rejection reason)
 * - Archived: No longer active/relevant, hidden from default views
 */
export type VendorStatus = 'Draft' | 'Pending Approval' | 'Active' | 'Rejected' | 'Archived';

export type VendorComplianceState = 'Complete' | 'Missing Docs' | 'Expired';
export type VendorReadinessState = 'Ready' | 'Pending Requirements' | 'Blocked';

/**
 * Onboarding progress tracking (not a status, but metadata)
 */
export interface OnboardingProgress {
  completedSteps: number;
  totalSteps: number;
  currentStep?: string;
  lastUpdated?: string;
}

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
  submittedAt?: string; // When onboarding was completed
  website?: string;
  address?: string;
  notes?: string;
  purpose?: string; // High-level description
  category?: string; // Classification (e.g., Payment, Operations, etc.)
  vendor: boolean;
  lifecycle?: VendorLifecycle;
  compliance?: ComplianceStatus;
  integrationStatus?: IntegrationStatus;
  // Compliance and readiness
  complianceState?: VendorComplianceState;
  readiness?: VendorReadinessState;
  readinessBlockers?: string[]; // List of specific blockers
  // Onboarding progress (metadata, not status)
  onboardingProgress?: OnboardingProgress;
  // Rejection tracking (for audit)
  rejectionReason?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  // Archive tracking
  archivedAt?: string;
  archivedBy?: string;
  archiveReason?: string;
  // Activation tracking
  activatedAt?: string;
  activatedBy?: string;
  // Related entities
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

