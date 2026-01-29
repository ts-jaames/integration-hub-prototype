export type UserStatus = 'Active' | 'Invited' | 'Suspended' | 'Deactivated';
export type UserRole = 'System Admin' | 'Company Manager' | 'Developer' | 'Read-only';

export type UserActivityType = 
  | 'invited' 
  | 'invite_resent' 
  | 'activated' 
  | 'role_changed' 
  | 'suspended' 
  | 'unsuspended' 
  | 'deactivated'
  | 'login'
  | 'password_changed';

export interface UserActivityEntry {
  id: string;
  type: UserActivityType;
  timestamp: string;
  actor?: {
    name: string;
    email?: string;
  };
  details?: string;
  metadata?: Record<string, any>;
}

export interface User {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  companyId: string;
  companyName: string;
  roles: UserRole[];
  status: UserStatus;
  lastLoginAt?: string;
  updatedAt: string;
  createdAt: string;
  mfaEnabled?: boolean;
  invitedAt?: string;
  invitedBy?: string;
  // Suspension tracking
  suspendedAt?: string;
  suspendedBy?: string;
  suspendReason?: string;
  // Invite history
  inviteResentAt?: string;
  inviteResentBy?: string;
  inviteCount?: number;
  // Activity history
  activityHistory?: UserActivityEntry[];
}

export interface InviteUserPayload {
  email: string;
  firstName?: string;
  lastName?: string;
  companyId: string;
  roles: UserRole[];
  message?: string;
}

export interface UserFilters {
  status?: UserStatus;
  companyId?: string;
  role?: UserRole;
  mfaEnabled?: boolean;
  search?: string;
}

export interface UserSort {
  field: 'name' | 'email' | 'lastLogin' | 'company' | 'updatedAt';
  direction: 'asc' | 'desc';
}

