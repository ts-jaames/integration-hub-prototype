export type RoleKey = 
  | 'SYSTEM_ADMIN' 
  | 'COMPANY_OWNER' 
  | 'COMPANY_MANAGER' 
  | 'DEVELOPER' 
  | 'ANALYST' 
  | 'SUPPORT' 
  | 'VIEWER';

export type CompanyStatus = 'active' | 'suspended' | 'deleted' | 'pending';
export type UserStatus = 'active' | 'suspended' | 'invited' | 'deactivated';
export type RegistrationStatus = 'new' | 'approved' | 'rejected';
export type InvitationStatus = 'sent' | 'accepted' | 'expired';

export interface Team {
  id: string;
  name: string;
  members: string[]; // User IDs
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  status: CompanyStatus;
  createdAt: string;
  updatedAt: string;
  metadata?: {
    address?: string;
    website?: string;
    notes?: string;
  };
  teams: Team[];
  vendor?: boolean;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: UserStatus;
  companyId: string;
  roles: RoleKey[];
  createdAt: string;
  lastLoginAt?: string;
}

export interface RegistrationRequest {
  id: string;
  companyName: string;
  submittedByEmail: string;
  submittedAt: string;
  notes?: string;
  status: RegistrationStatus;
  decisionBy?: string;
  decisionAt?: string;
  rejectionReason?: string;
}

export interface Invitation {
  id: string;
  email: string;
  companyId: string;
  role: RoleKey;
  sentAt: string;
  expiresAt: string;
  status: InvitationStatus;
}

export interface AuditEvent {
  id: string;
  actorUserId: string;
  action: string;
  targetType: 'company' | 'user' | 'registration' | 'invitation';
  targetId: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

