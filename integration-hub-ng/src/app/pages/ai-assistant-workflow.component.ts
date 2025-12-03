import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ButtonModule,
  TagModule,
  IconModule,
  InputModule,
  CheckboxModule
} from 'carbon-components-angular';
import { AiAssistantService, Insight, WorkflowStep } from '../core/ai-assistant.service';

@Component({
  selector: 'app-ai-assistant-workflow',
  standalone: false,
  template: `
    <div class="page-container">
      <div class="page-header">
        <button ibmButton="ghost" size="sm" (click)="goBack()" class="back-button">
          ← Back
        </button>
        <div>
          <h1>Credential Expiration Resolution</h1>
          <p class="page-subtitle">Guided workflow to resolve credential expiration</p>
        </div>
      </div>

      <div *ngIf="insight(); else loading" class="workflow-container">
        <div class="workflow-sidebar">
          <div class="workflow-progress">
            <h3 class="progress-title">Progress</h3>
            <div class="steps-list">
              <div 
                *ngFor="let step of steps(); let i = index" 
                class="step-item"
                [class.completed]="step.completed"
                [class.active]="currentStepIndex() === i"
                [class.pending]="!step.completed && currentStepIndex() !== i">
                <div class="step-indicator">
                  <span *ngIf="step.completed" class="step-check">✓</span>
                  <span *ngIf="!step.completed" class="step-number">{{ i + 1 }}</span>
                </div>
                <div class="step-info">
                  <span class="step-title">{{ step.title }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="workflow-content">
          <div class="step-header" *ngIf="currentStep()">
            <h2>{{ currentStep()!.title }}</h2>
            <p class="step-description">{{ currentStep()!.description }}</p>
          </div>

          <div class="step-body">
            <!-- Step 1: Review Credential Details -->
            <div *ngIf="currentStepIndex() === 0 && currentStep()" class="review-step">
              <div class="review-card">
                <h3 class="review-title">Credential Information</h3>
                <div class="review-details">
                  <div class="detail-row">
                    <span class="detail-label">Credential Name:</span>
                    <span class="detail-value">{{ currentStep()!.data?.credentialName }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Expires At:</span>
                    <span class="detail-value warning">{{ formatDate(currentStep()!.data?.expiresAt) }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Last Rotated:</span>
                    <span class="detail-value">{{ formatDate(currentStep()!.data?.lastRotated) }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Used By:</span>
                    <div class="detail-value">
                      <div *ngFor="let entity of currentStep()!.data?.usedBy" class="entity-tag">
                        {{ entity }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="review-actions">
                <label class="checkbox-label">
                  <input 
                    type="checkbox" 
                    [(ngModel)]="step1Confirmed"
                    class="checkbox-input">
                  <span>I have reviewed the credential details and understand the impact</span>
                </label>
              </div>
            </div>

            <!-- Step 2: Generate New Credential -->
            <div *ngIf="currentStepIndex() === 1 && currentStep()" class="form-step">
              <div class="form-card">
                <div class="form-group">
                  <label class="form-label">Credential Type</label>
                  <input 
                    ibmText 
                    [(ngModel)]="newCredential.type"
                    value="API Key"
                    readonly
                    class="form-input">
                </div>
                <div class="form-group">
                  <label class="form-label">Environment</label>
                  <input 
                    ibmText 
                    [(ngModel)]="newCredential.environment"
                    value="Production"
                    readonly
                    class="form-input">
                </div>
                <div class="form-group">
                  <label class="form-label">Permissions</label>
                  <div class="permissions-list">
                    <label *ngFor="let perm of newCredential.permissions" class="checkbox-label">
                      <input type="checkbox" [checked]="true" disabled class="checkbox-input">
                      <span>{{ perm | titlecase }}</span>
                    </label>
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label">Expiration Date</label>
                  <input 
                    type="date"
                    ibmText 
                    [(ngModel)]="newCredential.expirationDate"
                    [min]="minExpirationDate"
                    class="form-input">
                  <p class="form-hint">Select expiration date for the new credential (recommended: 1 year from today)</p>
                </div>
              </div>
              <div class="form-actions">
                <button 
                  ibmButton="primary" 
                  (click)="generateCredential()"
                  [disabled]="!newCredential.expirationDate">
                  Generate New Credential
                </button>
              </div>
              <div *ngIf="generatedCredential" class="credential-display">
                <h4>New Credential Generated</h4>
                <div class="credential-box">
                  <code class="credential-value">{{ generatedCredential.key }}</code>
                  <button ibmButton="ghost" size="sm" (click)="copyCredential()">Copy</button>
                </div>
                <p class="credential-warning">⚠️ Save this credential securely. You won't be able to see it again.</p>
              </div>
            </div>

            <!-- Step 3: Update Integrations -->
            <div *ngIf="currentStepIndex() === 2 && currentStep()" class="form-step">
              <div class="integrations-list">
                <h3>Update Credentials in Integrations</h3>
                <p class="section-description">Replace the old credential with the new one in each integration:</p>
                <div *ngFor="let integration of currentStep()!.data?.integrations" class="integration-item">
                  <div class="integration-info">
                    <span class="integration-name">{{ integration }}</span>
                    <ibm-tag *ngIf="updatedIntegrations.includes(integration)" type="green">Updated</ibm-tag>
                    <ibm-tag *ngIf="!updatedIntegrations.includes(integration)" type="gray">Pending</ibm-tag>
                  </div>
                  <button 
                    *ngIf="!updatedIntegrations.includes(integration)"
                    ibmButton="secondary" 
                    size="sm"
                    (click)="markIntegrationUpdated(integration)">
                    Mark as Updated
                  </button>
                </div>
              </div>
            </div>

            <!-- Step 4: Verify & Test -->
            <div *ngIf="currentStepIndex() === 3 && currentStep()" class="form-step">
              <div class="verification-card">
                <h3>Verification Tests</h3>
                <p class="section-description">The system will test each integration to verify the new credential works correctly:</p>
                <div *ngFor="let endpoint of currentStep()!.data?.testEndpoints" class="test-item">
                  <div class="test-info">
                    <span class="test-endpoint">{{ endpoint }}</span>
                    <ibm-tag *ngIf="testResults[endpoint] === 'success'" type="green">✓ Success</ibm-tag>
                    <ibm-tag *ngIf="testResults[endpoint] === 'failed'" type="red">✗ Failed</ibm-tag>
                    <ibm-tag *ngIf="!testResults[endpoint]" type="gray">Pending</ibm-tag>
                  </div>
                </div>
                <div class="verification-actions">
                  <button 
                    ibmButton="primary" 
                    (click)="runTests()"
                    [disabled]="testing">
                    {{ testing ? 'Running Tests...' : 'Run Verification Tests' }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Step 5: Revoke Old Credential -->
            <div *ngIf="currentStepIndex() === 4" class="confirmation-step">
              <div class="confirmation-card">
                <h3>Revoke Old Credential</h3>
                <p class="section-description">Once you confirm, the old credential will be immediately deactivated. Make sure all integrations are using the new credential.</p>
                <div class="warning-box">
                  <strong>⚠️ Warning:</strong> This action cannot be undone. Ensure all integrations have been updated and tested before proceeding.
                </div>
                <div class="confirmation-actions">
                  <label class="checkbox-label">
                    <input 
                      type="checkbox" 
                      [(ngModel)]="revocationConfirmed"
                      class="checkbox-input">
                    <span>I confirm that all integrations have been updated and tested successfully</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div class="step-footer">
            <button 
              ibmButton="secondary" 
              (click)="previousStep()"
              [disabled]="currentStepIndex() === 0">
              Previous
            </button>
            <button 
              *ngIf="currentStepIndex() < steps().length - 1"
              ibmButton="primary" 
              (click)="nextStep()"
              [disabled]="!canProceed()">
              Next Step
            </button>
            <button 
              *ngIf="currentStepIndex() === steps().length - 1"
              ibmButton="primary" 
              (click)="completeWorkflow()"
              [disabled]="!canProceed()">
              Complete Resolution
            </button>
          </div>
        </div>
      </div>

      <ng-template #loading>
        <div class="loading-state">
          <p>Loading workflow...</p>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .page-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem;
    }

    .page-header {
      margin-bottom: 2rem;
    }

    .back-button {
      margin-bottom: 1rem;
    }

    .page-header h1 {
      font-size: 2rem;
      font-weight: 600;
      color: var(--linear-text-primary);
      margin: 0 0 0.5rem 0;
    }

    .page-subtitle {
      font-size: 0.875rem;
      color: var(--linear-text-secondary);
      margin: 0;
    }

    .workflow-container {
      display: flex;
      gap: 2rem;
      margin-top: 2rem;
    }

    .workflow-sidebar {
      width: 280px;
      flex-shrink: 0;
    }

    .workflow-progress {
      background: var(--linear-surface);
      border: 1px solid var(--linear-border);
      border-radius: 6px;
      padding: 1.5rem;
      position: sticky;
      top: 2rem;
    }

    .progress-title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--linear-text-primary);
      margin: 0 0 1.5rem 0;
    }

    .steps-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .step-item {
      display: flex;
      gap: 0.75rem;
      align-items: flex-start;
      padding: 0.5rem;
      border-radius: 4px;
      transition: background 0.2s;
    }

    .step-item.active {
      background: rgba(15, 98, 254, 0.1);
    }

    .step-indicator {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      border: 2px solid var(--linear-border);
      background: var(--linear-surface);
    }

    .step-item.completed .step-indicator {
      background: #24a148;
      border-color: #24a148;
      color: white;
    }

    .step-item.active .step-indicator {
      background: var(--cds-link-primary, #0f62fe);
      border-color: var(--cds-link-primary, #0f62fe);
      color: white;
    }

    .step-check {
      font-size: 1rem;
      font-weight: 600;
    }

    .step-number {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--linear-text-secondary);
    }

    .step-item.completed .step-number,
    .step-item.active .step-number {
      color: white;
    }

    .step-info {
      flex: 1;
      padding-top: 0.25rem;
    }

    .step-title {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--linear-text-primary);
      line-height: 1.4;
    }

    .workflow-content {
      flex: 1;
      background: var(--linear-surface);
      border: 1px solid var(--linear-border);
      border-radius: 6px;
      padding: 2rem;
    }

    .step-header {
      margin-bottom: 2rem;
    }

    .step-header h2 {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--linear-text-primary);
      margin: 0 0 0.5rem 0;
    }

    .step-description {
      font-size: 0.875rem;
      color: var(--linear-text-secondary);
      margin: 0;
    }

    .step-body {
      min-height: 400px;
      margin-bottom: 2rem;
    }

    .review-card,
    .form-card,
    .verification-card,
    .confirmation-card {
      background: var(--linear-surface);
      border: 1px solid var(--linear-border);
      border-radius: 6px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }

    .review-title,
    .form-card h3,
    .verification-card h3,
    .confirmation-card h3 {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--linear-text-primary);
      margin: 0 0 1rem 0;
    }

    .review-details {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .detail-row {
      display: flex;
      gap: 1rem;
    }

    .detail-label {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--linear-text-secondary);
      min-width: 140px;
    }

    .detail-value {
      font-size: 0.875rem;
      color: var(--linear-text-primary);
      flex: 1;
    }

    .detail-value.warning {
      color: #ff832b;
      font-weight: 600;
    }

    .entity-tag {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      background: rgba(15, 98, 254, 0.1);
      border: 1px solid rgba(15, 98, 254, 0.2);
      border-radius: 4px;
      font-size: 0.75rem;
      color: var(--cds-link-primary, #0f62fe);
      margin-right: 0.5rem;
      margin-top: 0.25rem;
    }

    .review-actions,
    .form-actions,
    .verification-actions,
    .confirmation-actions {
      margin-top: 1.5rem;
    }

    .checkbox-label {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      cursor: pointer;
      font-size: 0.875rem;
      color: var(--linear-text-primary);
    }

    .checkbox-input {
      margin-top: 0.125rem;
      cursor: pointer;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    .form-label {
      display: block;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--linear-text-primary);
      margin-bottom: 0.5rem;
    }

    .form-input {
      width: 100%;
    }

    .form-hint {
      font-size: 0.75rem;
      color: var(--linear-text-secondary);
      margin-top: 0.5rem;
      margin: 0;
    }

    .permissions-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .credential-display {
      margin-top: 1.5rem;
      padding: 1.5rem;
      background: rgba(15, 98, 254, 0.05);
      border: 1px solid rgba(15, 98, 254, 0.2);
      border-radius: 6px;
    }

    .credential-display h4 {
      font-size: 1rem;
      font-weight: 600;
      color: var(--linear-text-primary);
      margin: 0 0 1rem 0;
    }

    .credential-box {
      display: flex;
      gap: 1rem;
      align-items: center;
      margin-bottom: 0.75rem;
    }

    .credential-value {
      flex: 1;
      padding: 0.75rem;
      background: var(--linear-surface);
      border: 1px solid var(--linear-border);
      border-radius: 4px;
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 0.875rem;
      color: var(--linear-text-primary);
      word-break: break-all;
    }

    .credential-warning {
      font-size: 0.75rem;
      color: #ff832b;
      margin: 0;
    }

    .integrations-list h3,
    .section-description {
      font-size: 0.875rem;
      color: var(--linear-text-secondary);
      margin: 0 0 1rem 0;
    }

    .integrations-list h3 {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--linear-text-primary);
      margin-bottom: 0.5rem;
    }

    .integration-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      background: var(--linear-surface);
      border: 1px solid var(--linear-border);
      border-radius: 4px;
      margin-bottom: 0.75rem;
    }

    .integration-info {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .integration-name {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--linear-text-primary);
    }

    .test-item {
      padding: 1rem;
      background: var(--linear-surface);
      border: 1px solid var(--linear-border);
      border-radius: 4px;
      margin-bottom: 0.75rem;
    }

    .test-info {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .test-endpoint {
      font-size: 0.875rem;
      color: var(--linear-text-primary);
      flex: 1;
    }

    .warning-box {
      padding: 1rem;
      background: rgba(255, 131, 43, 0.1);
      border: 1px solid rgba(255, 131, 43, 0.3);
      border-radius: 4px;
      margin: 1rem 0;
      font-size: 0.875rem;
      color: var(--linear-text-primary);
    }

    .step-footer {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      padding-top: 2rem;
      border-top: 1px solid var(--linear-border);
    }

    .loading-state {
      text-align: center;
      padding: 3rem;
      color: var(--linear-text-secondary);
    }

    @media (max-width: 1024px) {
      .workflow-container {
        flex-direction: column;
      }

      .workflow-sidebar {
        width: 100%;
      }

      .workflow-progress {
        position: static;
      }
    }
  `]
})
export class AiAssistantWorkflowComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private aiAssistant = inject(AiAssistantService);

  insight = signal<Insight | null>(null);
  steps = signal<WorkflowStep[]>([]);
  currentStepIndex = signal(0);
  loading = signal(true);

  step1Confirmed = false;
  newCredential = {
    type: 'API Key',
    environment: 'Production',
    permissions: ['read', 'write'],
    expirationDate: ''
  };
  generatedCredential: { key: string } | null = null;
  updatedIntegrations: string[] = [];
  testResults: Record<string, 'success' | 'failed'> = {};
  testing = false;
  revocationConfirmed = false;

  get minExpirationDate(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }

  currentStep = computed(() => {
    const index = this.currentStepIndex();
    const steps = this.steps();
    return steps[index] || null;
  });

  ngOnInit() {
    const insightId = this.route.snapshot.paramMap.get('id');
    if (insightId) {
      this.aiAssistant.getInsightById(insightId).subscribe(insight => {
        if (insight) {
          this.insight.set(insight);
          this.aiAssistant.getWorkflowSteps(insightId).subscribe(steps => {
            this.steps.set(steps);
            this.loading.set(false);
          });
        } else {
          this.loading.set(false);
        }
      });
    } else {
      this.loading.set(false);
    }
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  canProceed(): boolean {
    const index = this.currentStepIndex();
    const step = this.currentStep();
    if (!step) return false;
    if (index === 0) return this.step1Confirmed;
    if (index === 1) return !!this.generatedCredential;
    if (index === 2) return this.updatedIntegrations.length === (step.data?.integrations?.length || 0);
    if (index === 3) return Object.keys(this.testResults).length > 0 && Object.values(this.testResults).every(r => r === 'success');
    if (index === 4) return this.revocationConfirmed;
    return false;
  }

  nextStep() {
    const current = this.currentStep();
    if (current) {
      const updatedSteps = [...this.steps()];
      updatedSteps[this.currentStepIndex()] = { ...current, completed: true };
      this.steps.set(updatedSteps);
    }
    this.currentStepIndex.set(Math.min(this.currentStepIndex() + 1, this.steps().length - 1));
  }

  previousStep() {
    this.currentStepIndex.set(Math.max(this.currentStepIndex() - 1, 0));
  }

  generateCredential() {
    // Mock credential generation
    this.generatedCredential = {
      key: `sk_live_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`
    };
  }

  copyCredential() {
    if (this.generatedCredential) {
      navigator.clipboard.writeText(this.generatedCredential.key);
      alert('Credential copied to clipboard');
    }
  }

  markIntegrationUpdated(integration: string) {
    if (!this.updatedIntegrations.includes(integration)) {
      this.updatedIntegrations = [...this.updatedIntegrations, integration];
    }
  }

  runTests() {
    this.testing = true;
    const step = this.currentStep();
    const endpoints = step?.data?.testEndpoints || [];
    
    // Simulate async testing
    setTimeout(() => {
      endpoints.forEach((endpoint: string, index: number) => {
        setTimeout(() => {
          this.testResults = {
            ...this.testResults,
            [endpoint]: Math.random() > 0.2 ? 'success' : 'failed'
          };
          if (index === endpoints.length - 1) {
            this.testing = false;
          }
        }, (index + 1) * 500);
      });
    }, 500);
  }

  completeWorkflow() {
    const insightId = this.route.snapshot.paramMap.get('id');
    if (insightId) {
      // Mark all steps as completed
      const updatedSteps = this.steps().map(s => ({ ...s, completed: true }));
      this.steps.set(updatedSteps);
      
      // Resolve the insight
      this.aiAssistant.resolveInsight(insightId).subscribe(() => {
        this.router.navigate(['/ai-assistant/resolution', insightId]);
      });
    }
  }

  goBack() {
    const insightId = this.route.snapshot.paramMap.get('id');
    if (insightId) {
      this.router.navigate(['/ai-assistant/insights', insightId]);
    } else {
      this.router.navigate(['/ai-assistant/insights']);
    }
  }
}

