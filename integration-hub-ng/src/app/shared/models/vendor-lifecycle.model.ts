export type LifecycleStage = 
  | 'intake'
  | 'registration'
  | 'validation'
  | 'configuration'
  | 'compliance'
  | 'activation'
  | 'monitoring';

export type LifecycleStatus = 
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'COMPLETE'
  | 'BLOCKED';

export type GovernanceState = 
  | 'approval-required'
  | 'pending-validation'
  | 'ready-for-activation'
  | null;

export interface LifecycleStageData {
  stage: LifecycleStage;
  status: LifecycleStatus;
  startedAt?: string;
  completedAt?: string;
  blockedReason?: string;
  assignedReviewer?: string;
  notes?: string;
}

export interface VendorLifecycle {
  currentStage: LifecycleStage;
  stages: LifecycleStageData[];
  governanceState: GovernanceState;
  overallStatus: 'onboarding' | 'active' | 'suspended' | 'archived';
}

export interface OnboardingStep {
  id: string;
  stage: LifecycleStage;
  title: string;
  description: string;
  fields?: OnboardingField[];
  actions?: OnboardingAction[];
  completed: boolean;
  canProceed: boolean;
}

export interface OnboardingField {
  id: string;
  label: string;
  type: 'text' | 'email' | 'url' | 'date' | 'select' | 'textarea';
  value?: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

export interface OnboardingAction {
  id: string;
  label: string;
  type: 'button' | 'link';
  action: string;
  visibleForRoles?: string[];
}

export interface ActivityLogEntry {
  id: string;
  timestamp: string;
  actor: {
    name: string;
    role: string;
    email?: string;
  };
  action: string;
  details?: string;
  stage?: LifecycleStage;
}

export interface ComplianceChecklistItem {
  id: string;
  label: string;
  status: 'pending' | 'in-review' | 'approved' | 'rejected';
  required: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
  notes?: string;
}

export interface ComplianceStatus {
  certificationStatus: 'pending' | 'in-review' | 'approved' | 'rejected';
  checklist: ComplianceChecklistItem[];
  lastReviewDate?: string;
  nextReviewDate?: string;
}

export interface IntegrationStatus {
  status: 'HEALTHY' | 'DEGRADED' | 'ERROR';
  lastChecked: string;
  recentErrors?: {
    count: number;
    types: string[];
    lastError?: string;
  };
}

