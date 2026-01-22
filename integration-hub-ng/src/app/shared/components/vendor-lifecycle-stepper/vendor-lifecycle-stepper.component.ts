import { Component, Input, signal, computed, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VendorLifecycle, LifecycleStage, LifecycleStatus } from '../../models/vendor-lifecycle.model';

export interface LifecycleStep {
  id: string;
  label: string;
  description?: string;
  status: 'completed' | 'active' | 'upcoming' | 'blocked';
  enabled?: boolean;
}

/**
 * Normalizes step states to ensure consistency:
 * - Exactly one step is 'active'
 * - Completed steps are all before the active step
 * - Upcoming steps are all after the active step
 * - Blocked steps respect enabled flag
 */
function normalizeStepStates(steps: LifecycleStep[], currentStepId?: string): LifecycleStep[] {
  if (!steps || steps.length === 0) return [];

  // Find active step index
  let activeIndex = -1;
  if (currentStepId) {
    activeIndex = steps.findIndex(s => s.id === currentStepId);
  }
  
  // If no currentStepId provided, find first 'active' status
  if (activeIndex === -1) {
    activeIndex = steps.findIndex(s => s.status === 'active');
  }
  
  // If still no active found, use first step
  if (activeIndex === -1) {
    activeIndex = 0;
  }

  // Normalize states
  return steps.map((step, index) => {
    // Handle blocked state first (enabled=false or status='blocked')
    const isBlocked = step.enabled === false || step.status === 'blocked';
    
    if (isBlocked) {
      // If blocked step is before active, only mark as completed if explicitly completed
      if (index < activeIndex && step.status !== 'completed') {
        return { ...step, status: 'blocked' as const };
      }
      return { ...step, status: 'blocked' as const };
    }

    // Exactly one active step
    if (index === activeIndex) {
      return { ...step, status: 'active' as const };
    }

    // Steps before active are completed (unless explicitly blocked)
    if (index < activeIndex) {
      // If already marked as completed, keep it
      if (step.status === 'completed') {
        return step;
      }
      return { ...step, status: 'completed' as const };
    }

    // Steps after active are upcoming
    return { ...step, status: 'upcoming' as const };
  });
}

/**
 * Converts VendorLifecycle to LifecycleStep array
 */
function lifecycleToSteps(lifecycle: VendorLifecycle | null): { steps: LifecycleStep[], currentStepId?: string } {
  if (!lifecycle || !lifecycle.stages || lifecycle.stages.length === 0) {
    // Default steps
    const defaultStages: LifecycleStage[] = [
      'intake',
      'registration',
      'validation',
      'configuration',
      'compliance',
      'activation',
      'monitoring'
    ];
    
    const steps: LifecycleStep[] = defaultStages.map((stage, idx) => ({
      id: stage,
      label: getStageLabel(stage),
      status: idx === 0 ? 'active' : 'upcoming',
      enabled: true
    }));
    
    return { steps, currentStepId: defaultStages[0] };
  }

  const stageLabels: Record<LifecycleStage, string> = {
    'intake': 'Intake',
    'registration': 'Registration',
    'validation': 'Validation',
    'configuration': 'Configuration',
    'compliance': 'Compliance',
    'activation': 'Activation',
    'monitoring': 'Monitoring'
  };

  const stageDescriptions: Partial<Record<LifecycleStage, string>> = {
    'intake': 'Internal request captured and initial assessment',
    'registration': 'Vendor invited or profile started',
    'validation': 'Identity verification, duplicate checks, approvals',
    'configuration': 'Integration setup, settings, and mappings',
    'compliance': 'Documents, certifications, agreements, and security reviews',
    'activation': 'Enabled for use in production environment',
    'monitoring': 'Ongoing monitoring, logs, alerts, and metrics'
  };

  const steps: LifecycleStep[] = lifecycle.stages.map(stage => {
    let status: 'completed' | 'active' | 'upcoming' | 'blocked';
    
    if (stage.status === 'BLOCKED' || stage.status === 'PENDING') {
      status = stage.status === 'BLOCKED' ? 'blocked' : 'upcoming';
    } else if (stage.status === 'COMPLETE') {
      status = 'completed';
    } else if (stage.status === 'IN_PROGRESS') {
      status = 'active';
    } else {
      status = 'upcoming';
    }

    return {
      id: stage.stage,
      label: stageLabels[stage.stage] || stage.stage,
      description: stageDescriptions[stage.stage],
      status,
      enabled: stage.status !== 'BLOCKED'
    };
  });

  return {
    steps,
    currentStepId: lifecycle.currentStage
  };
}

function getStageLabel(stage: LifecycleStage): string {
  const labels: Record<LifecycleStage, string> = {
    'intake': 'Intake',
    'registration': 'Registration',
    'validation': 'Validation',
    'configuration': 'Configuration',
    'compliance': 'Compliance',
    'activation': 'Activation',
    'monitoring': 'Monitoring'
  };
  return labels[stage] || stage;
}

@Component({
  selector: 'app-vendor-lifecycle-stepper',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="lifecycle-stepper-card">
      <div class="stepper-header">
        <h3 class="stepper-title">Vendor Lifecycle</h3>
        <p class="stepper-subtitle">Onboarding & Governance</p>
      </div>

      <!-- Loading state -->
      <div *ngIf="isLoading()" class="stepper-container">
        <div *ngFor="let _ of [1,2,3,4,5,6,7]" class="step-row skeleton">
          <div class="step-indicator skeleton-indicator"></div>
          <div class="step-label skeleton-label"></div>
        </div>
      </div>

      <!-- Empty state -->
      <div *ngIf="!isLoading() && normalizedSteps().length === 0" class="empty-state">
        <p>Lifecycle not available.</p>
      </div>

      <!-- Stepper -->
      <div *ngIf="!isLoading() && normalizedSteps().length > 0" class="stepper-container">
        <div 
          *ngFor="let step of normalizedSteps(); let i = index" 
          class="step-row"
          [class.completed]="step.status === 'completed'"
          [class.active]="step.status === 'active'"
          [class.upcoming]="step.status === 'upcoming'"
          [class.blocked]="step.status === 'blocked'"
          [class.clickable]="step.status === 'completed' || step.status === 'active'"
          [attr.aria-current]="step.status === 'active' ? 'step' : null"
          [attr.aria-label]="getStepAriaLabel(step)"
          (click)="onStepClick(step)"
          role="button"
          [tabindex]="(step.status === 'completed' || step.status === 'active') ? 0 : -1">
          
          <!-- Status indicator -->
          <div class="step-indicator">
            <div class="indicator-dot" [class]="getIndicatorClass(step.status)">
              <span *ngIf="step.status === 'completed'" class="check-icon" aria-label="Completed">✓</span>
              <span *ngIf="step.status === 'blocked'" class="block-icon" aria-label="Blocked">⊘</span>
            </div>
          </div>

          <!-- Step content -->
          <div class="step-content">
            <div class="step-label">{{ step.label }}</div>
            <div *ngIf="step.status === 'active' && step.description" class="step-description">
              {{ step.description }}
            </div>
            <div *ngIf="step.status === 'blocked'" class="blocked-hint">Blocked</div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .lifecycle-stepper-card {
      background: var(--linear-surface, #1a1a1a);
      border: 1px solid var(--linear-border, rgba(255, 255, 255, 0.1));
      border-radius: 8px;
      padding: 1.5rem;
    }

    .stepper-header {
      margin-bottom: 1.25rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid var(--linear-border, rgba(255, 255, 255, 0.1));
    }

    .stepper-title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--linear-text-primary, #f4f4f4);
      margin: 0 0 0.25rem 0;
    }

    .stepper-subtitle {
      font-size: 0.75rem;
      color: var(--linear-text-secondary, #a8a8a8);
      margin: 0;
    }

    .stepper-container {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .step-row {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.5rem 0;
      transition: all 0.2s ease;
    }

    .step-row.clickable {
      cursor: pointer;
    }

    .step-row.clickable:hover {
      background: rgba(255, 255, 255, 0.03);
      border-radius: 4px;
      padding-left: 0.5rem;
      padding-right: 0.5rem;
      margin-left: -0.5rem;
      margin-right: -0.5rem;
    }

    .step-row.clickable:focus {
      outline: 2px solid var(--linear-accent, #0f62fe);
      outline-offset: 2px;
      border-radius: 4px;
    }

    .step-indicator {
      flex-shrink: 0;
      padding-top: 0.125rem;
    }

    .indicator-dot {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }

    .indicator-dot.completed {
      background: #24a148;
      border: 2px solid #24a148;
    }

    .indicator-dot.active {
      background: var(--linear-accent, #0f62fe);
      border: 2px solid var(--linear-accent, #0f62fe);
      box-shadow: 0 0 0 3px rgba(15, 98, 254, 0.2);
    }

    .indicator-dot.upcoming {
      background: transparent;
      border: 2px solid var(--linear-border, rgba(255, 255, 255, 0.2));
    }

    .indicator-dot.blocked {
      background: transparent;
      border: 2px solid #da1e28;
    }

    .check-icon {
      color: white;
      font-size: 0.75rem;
      font-weight: 600;
      line-height: 1;
    }

    .block-icon {
      color: #da1e28;
      font-size: 0.875rem;
      line-height: 1;
    }

    .step-content {
      flex: 1;
      min-width: 0;
    }

    .step-label {
      font-size: 0.875rem;
      line-height: 1.4;
      transition: all 0.2s ease;
    }

    .step-row.completed .step-label,
    .step-row.upcoming .step-label,
    .step-row.blocked .step-label {
      color: var(--linear-text-secondary, #a8a8a8);
      font-weight: 400;
    }

    .step-row.active .step-label {
      color: var(--linear-text-primary, #f4f4f4);
      font-weight: 600;
    }

    .step-description {
      font-size: 0.75rem;
      color: var(--linear-text-secondary, #a8a8a8);
      margin-top: 0.25rem;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .blocked-hint {
      font-size: 0.625rem;
      color: #da1e28;
      margin-top: 0.125rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 500;
    }

    /* Skeleton loading */
    .skeleton {
      opacity: 0.5;
    }

    .skeleton-indicator {
      background: var(--linear-border, rgba(255, 255, 255, 0.1));
      border-radius: 50%;
      width: 16px;
      height: 16px;
      animation: pulse 1.5s ease-in-out infinite;
    }

    .skeleton-label {
      background: var(--linear-border, rgba(255, 255, 255, 0.1));
      height: 14px;
      width: 80px;
      border-radius: 2px;
      animation: pulse 1.5s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 0.5;
      }
      50% {
        opacity: 0.8;
      }
    }

    .empty-state {
      padding: 1rem 0;
      text-align: center;
    }

    .empty-state p {
      font-size: 0.875rem;
      color: var(--linear-text-secondary, #a8a8a8);
      margin: 0;
    }
  `]
})
export class VendorLifecycleStepperComponent implements OnChanges {
  @Input() lifecycle: VendorLifecycle | null = null;
  @Input() steps: LifecycleStep[] | null = null;
  @Input() currentStepId: string | null = null;

  lifecycleSignal = signal<VendorLifecycle | null>(null);
  stepsSignal = signal<LifecycleStep[] | null>(null);
  currentStepIdSignal = signal<string | null>(null);

  ngOnChanges(changes: SimpleChanges) {
    if (changes['lifecycle']) {
      this.lifecycleSignal.set(this.lifecycle);
    }
    if (changes['steps']) {
      this.stepsSignal.set(this.steps);
    }
    if (changes['currentStepId']) {
      this.currentStepIdSignal.set(this.currentStepId);
    }
  }

  isLoading = computed(() => {
    // Show loading if lifecycle is null and steps are not provided
    const lifecycle = this.lifecycleSignal();
    const steps = this.stepsSignal();
    return !lifecycle && !steps;
  });

  normalizedSteps = computed(() => {
    const lifecycle = this.lifecycleSignal();
    const steps = this.stepsSignal();
    const currentStepId = this.currentStepIdSignal();

    // If steps are provided directly, use them
    if (steps && steps.length > 0) {
      return normalizeStepStates(steps, currentStepId || undefined);
    }

    // Otherwise, convert from lifecycle
    if (lifecycle) {
      const { steps: convertedSteps, currentStepId: lifecycleCurrentStepId } = lifecycleToSteps(lifecycle);
      return normalizeStepStates(convertedSteps, currentStepId || lifecycleCurrentStepId);
    }

    return [];
  });

  getIndicatorClass(status: 'completed' | 'active' | 'upcoming' | 'blocked'): string {
    return status;
  }

  getStepAriaLabel(step: LifecycleStep): string {
    const statusLabels: Record<string, string> = {
      'completed': 'Completed',
      'active': 'Current',
      'upcoming': 'Upcoming',
      'blocked': 'Blocked'
    };
    return `${step.label}, ${statusLabels[step.status] || step.status}`;
  }

  onStepClick(step: LifecycleStep) {
    // Only allow clicking on completed or active steps
    if (step.status === 'completed' || step.status === 'active') {
      // Navigation can be wired here if needed
      // For now, this is a placeholder
    }
  }
}
