export interface VendorCompany {
  id: string;
  name: string;
  primaryContact: string;
  primaryEmail: string;
  status: 'Pending' | 'Active' | 'Rejected' | 'Deactivated';
  tier?: 'Tier 1' | 'Tier 2' | 'Tier 3';
  riskLevel: 'Low' | 'Medium' | 'High';
  createdAt: string;
  submittedAt?: string;
  website?: string;
  address?: string;
  notes?: string;
  vendor: boolean;
}

