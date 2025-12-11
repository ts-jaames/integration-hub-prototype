import { Component, Input, signal, computed, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TagModule } from 'carbon-components-angular';
import { VendorLifecycle, LifecycleStage, LifecycleStatus, GovernanceState } from '../../models/vendor-lifecycle.model';

@Component({
  selector: 'app-vendor-lifecycle-stepper',
  standalone: true,
  imports: [CommonModule, TagModule],
  template: `
    <div class="lifecycle-stepper">
      <div class="stepper-header">
        <h3 class="stepper-title">Vendor Lifecycle Status</h3>
        <div class="governance-badges" *ngIf="governanceState()">
          <ibm-tag 
            *ngIf="governanceState() === 'approval-required'" 
            type="red">
            Approval Required
          </ibm-tag>
          <ibm-tag 
            *ngIf="governanceState() === 'pending-validation'" 
            type="purple">
            Pending Validation
          </ibm-tag>
          <ibm-tag 
            *ngIf="governanceState() === 'ready-for-activation'" 
            type="green">
            Ready for Activation
          </ibm-tag>
        </div>
      </div>

      <div class="stepper-container">
        <div 
          *ngFor="let stage of stages(); let i = index" 
          class="stepper-step"
          [class.completed]="stage.status === 'COMPLETE'"
          [class.in-progress]="stage.status === 'IN_PROGRESS'"
          [class.blocked]="stage.status === 'BLOCKED'"
          [class.pending]="stage.status === 'PENDING'">
          
          <div class="step-connector" *ngIf="i > 0"></div>
          
          <div class="step-content">
            <div class="step-indicator">
              <div class="indicator-circle" [class]="getIndicatorClass(stage.status)">
                <span *ngIf="stage.status === 'COMPLETE'" class="check-icon">✓</span>
                <span *ngIf="stage.status === 'IN_PROGRESS'" class="spinner"></span>
                <span *ngIf="stage.status === 'BLOCKED'" class="block-icon">⚠</span>
                <span *ngIf="stage.status === 'PENDING'" class="step-number">{{ i + 1 }}</span>
              </div>
            </div>
            
            <div class="step-info">
              <div class="step-header-info">
                <span class="step-label">{{ getStageLabel(stage.stage) }}</span>
                <ibm-tag 
                  *ngIf="stage.status === 'BLOCKED'"
                  type="red" 
                  size="sm">
                  Blocked
                </ibm-tag>
              </div>
              <div class="step-meta" *ngIf="stage.assignedReviewer">
                <span class="meta-text">Reviewer: {{ stage.assignedReviewer }}</span>
              </div>
              <div class="step-meta" *ngIf="stage.completedAt">
                <span class="meta-text">Completed: {{ formatDate(stage.completedAt) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .lifecycle-stepper {
      background: var(--linear-surface);
      border: 1px solid var(--linear-border);
      border-radius: 8px;
      padding: 1.5rem;
    }

    .stepper-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--linear-border);
    }

    .stepper-title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--linear-text-primary);
      margin: 0;
    }

    .governance-badges {
      display: flex;
      gap: 0.5rem;
    }

    .stepper-container {
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    .stepper-step {
      display: flex;
      align-items: flex-start;
      position: relative;
      padding: 1rem 0;
    }

    .step-connector {
      position: absolute;
      left: 20px;
      top: 0;
      bottom: 0;
      width: 2px;
      background: var(--linear-border);
      z-index: 0;
    }

    .stepper-step.completed + .stepper-step .step-connector {
      background: #24a148;
    }

    .stepper-step.in-progress + .stepper-step .step-connector {
      background: linear-gradient(to bottom, #24a148 0%, var(--linear-border) 50%);
    }

    .step-content {
      display: flex;
      gap: 1rem;
      align-items: flex-start;
      position: relative;
      z-index: 1;
    }

    .step-indicator {
      flex-shrink: 0;
    }

    .indicator-circle {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid var(--linear-border);
      background: var(--linear-surface);
      color: var(--linear-text-secondary);
      font-size: 0.875rem;
      font-weight: 600;
      transition: all 0.3s ease;
    }

    .indicator-circle.completed {
      background: #24a148;
      border-color: #24a148;
      color: white;
    }

    .indicator-circle.in-progress {
      background: var(--cds-link-primary, #0f62fe);
      border-color: var(--cds-link-primary, #0f62fe);
      color: white;
      animation: pulse 2s ease-in-out infinite;
    }

    .indicator-circle.blocked {
      background: #da1e28;
      border-color: #da1e28;
      color: white;
    }

    .indicator-circle.pending {
      background: var(--linear-surface);
      border-color: var(--linear-border);
      color: var(--linear-text-secondary);
      opacity: 0.5;
    }

    @keyframes pulse {
      0%, 100% {
        box-shadow: 0 0 0 0 rgba(15, 98, 254, 0.4);
      }
      50% {
        box-shadow: 0 0 0 8px rgba(15, 98, 254, 0);
      }
    }

    .check-icon {
      font-size: 1.25rem;
      font-weight: 600;
    }

    .block-icon {
      font-size: 1.25rem;
    }

    .step-number {
      font-size: 0.875rem;
    }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .step-info {
      flex: 1;
      padding-top: 0.5rem;
    }

    .step-header-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.25rem;
    }

    .step-label {
      font-size: 0.9375rem;
      font-weight: 500;
      color: var(--linear-text-primary);
    }

    .stepper-step.pending .step-label {
      color: var(--linear-text-secondary);
      opacity: 0.6;
    }

    .step-meta {
      margin-top: 0.25rem;
    }

    .meta-text {
      font-size: 0.75rem;
      color: var(--linear-text-secondary);
    }

    .stepper-step.completed .step-label {
      color: var(--linear-text-primary);
    }

    .stepper-step.in-progress .step-label {
      color: var(--cds-link-primary, #0f62fe);
      font-weight: 600;
    }

    .stepper-step.blocked .step-label {
      color: #da1e28;
    }
  `]
})
export class VendorLifecycleStepperComponent implements OnChanges {
  @Input() lifecycle: VendorLifecycle | null = null;
  
  lifecycleSignal = signal<VendorLifecycle | null>(null);
  
  ngOnChanges() {
    this.lifecycleSignal.set(this.lifecycle);
  }

  stages = computed(() => {
    const lc = this.lifecycleSignal();
    if (!lc || !lc.stages || lc.stages.length === 0) {
      // Return default stages if lifecycle is missing
      const allStages: LifecycleStage[] = [
        'preparation',
        'registration',
        'validation',
        'configuration-review',
        'compliance-certification',
        'activation',
        'monitoring'
      ];
      return allStages.map(stage => ({
        stage,
        status: 'PENDING' as LifecycleStatus,
        startedAt: undefined,
        completedAt: undefined,
        blockedReason: undefined,
        assignedReviewer: undefined,
        notes: undefined
      }));
    }
    return lc.stages;
  });

  governanceState = computed(() => {
    const lc = this.lifecycleSignal();
    return lc?.governanceState || null;
  });

  getStageLabel(stage: LifecycleStage): string {
    const labels: Record<LifecycleStage, string> = {
      'preparation': 'Preparation',
      'registration': 'Registration',
      'validation': 'Validation',
      'configuration-review': 'Configuration Review',
      'compliance-certification': 'Compliance / Certification',
      'activation': 'Activation',
      'monitoring': 'Monitoring'
    };
    return labels[stage] || stage;
  }

  getIndicatorClass(status: LifecycleStatus): string {
    const classes: Record<LifecycleStatus, string> = {
      'PENDING': 'pending',
      'IN_PROGRESS': 'in-progress',
      'COMPLETE': 'completed',
      'BLOCKED': 'blocked'
    };
    return classes[status] || 'pending';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
}

