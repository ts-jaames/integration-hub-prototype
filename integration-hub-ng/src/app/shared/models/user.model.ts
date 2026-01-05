export type UserStatus = 'Active' | 'Invited' | 'Suspended' | 'Deactivated';
export type UserRole = 'System Admin' | 'Company Manager' | 'Developer' | 'Read-only';

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

