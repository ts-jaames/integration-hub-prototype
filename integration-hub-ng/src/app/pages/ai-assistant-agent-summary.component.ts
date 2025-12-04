import { Component, OnInit, signal, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ButtonModule,
  TagModule,
  IconModule,
  ToggleModule
} from 'carbon-components-angular';
import { AiAssistantService, Insight } from '../core/ai-assistant.service';
import { AgentActivityLogComponent } from '../shared/components/agent-activity-log/agent-activity-log.component';
import { StepCorrectionModalComponent } from '../shared/components/step-correction-modal/step-correction-modal.component';
import { AgentTeachService } from '../core/services/agent-teach.service';
import { AgentStep, StepFeedback } from '../core/models/agent-resolution.model';

@Component({
  selector: 'app-ai-assistant-agent-summary',
  standalone: false,
  template: `
    <div class="page-container">
      <div class="page-header">
        <button ibmButton="ghost" size="sm" (click)="goBack()" class="back-button">
          ← Back
        </button>
        <div>
          <h1>Agent Resolution Summary</h1>
          <p class="page-subtitle">Detailed log of agent actions and results</p>
        </div>
      </div>

      <div *ngIf="insight(); else loading" class="summary-container">
        <!-- Insight Info -->
        <div class="summary-card">
          <div class="card-header">
            <h2>{{ insight()!.title }}</h2>
            <ibm-tag type="green">Resolved</ibm-tag>
          </div>
          <p class="card-description">{{ insight()!.description }}</p>
          <div class="card-meta">
            <div class="meta-item">
              <span class="meta-label">Resolved:</span>
              <span class="meta-value">{{ formatDate(getResolvedDate()) }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Method:</span>
              <span class="meta-value">AI Agent (Automated)</span>
            </div>
          </div>
        </div>

        <!-- Resolution Summary -->
        <div class="summary-card">
          <h3 class="card-title">Resolution Summary</h3>
          <div class="summary-stats">
            <div class="stat-item">
              <span class="stat-value">{{ completedSteps() }}</span>
              <span class="stat-label">Steps Completed</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ totalDuration() }}</span>
              <span class="stat-label">Total Duration</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ agentSteps().length }}</span>
              <span class="stat-label">Actions Taken</span>
            </div>
          </div>
        </div>

        <!-- Activity Log -->
        <div class="summary-card">
          <div class="log-header-controls">
            <h3 class="card-title">Complete Activity Log</h3>
            <div class="teach-mode-control" *ngIf="canTeach()">
              <label class="teach-mode-label">
                <span>Teach Mode</span>
                <ibm-toggle
                  [checked]="teachMode()"
                  (checkedChange)="teachMode.set($event)"
                  [ariaLabel]="'Toggle Teach Mode'">
                </ibm-toggle>
              </label>
            </div>
          </div>
          <app-agent-activity-log 
            [steps]="agentSteps"
            [teachMode]="teachMode"
            (correctStep)="openCorrectionModal($event)">
          </app-agent-activity-log>
        </div>

        <!-- Actions -->
        <div class="summary-actions">
          <button 
            ibmButton="primary" 
            (click)="goBack()">
            Back to Insights
          </button>
        </div>
      </div>

      <ng-template #loading>
        <div class="loading-state">
          <p>Loading summary...</p>
        </div>
      </ng-template>
    </div>

    <!-- Step Correction Modal -->
    <app-step-correction-modal
      [open]="correctionModalOpen"
      [step]="selectedStep"
      (saved)="onFeedbackSaved($event)"
      (cancelled)="closeCorrectionModal()">
    </app-step-correction-modal>
  `,
  styles: [`
    .page-container {
      max-width: 1200px;
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

    .summary-container {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .summary-card {
      background: var(--linear-surface);
      border: 1px solid var(--linear-border);
      border-radius: 12px;
      padding: 1.5rem;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      margin-bottom: 0.75rem;
    }

    .card-header h2 {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--linear-text-primary);
      margin: 0;
      flex: 1;
    }

    .card-description {
      font-size: 0.875rem;
      color: var(--linear-text-secondary);
      margin: 0 0 1rem 0;
      line-height: 1.5;
    }

    .card-meta {
      display: flex;
      gap: 2rem;
      flex-wrap: wrap;
    }

    .meta-item {
      display: flex;
      gap: 0.5rem;
      font-size: 0.875rem;
    }

    .meta-label {
      color: var(--linear-text-secondary);
      font-weight: 500;
    }

    .meta-value {
      color: var(--linear-text-primary);
    }

    .card-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--linear-text-primary);
      margin: 0 0 1.5rem 0;
    }

    .log-header-controls {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    .teach-mode-control {
      display: flex;
      align-items: center;
    }

    .teach-mode-label {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.875rem;
      color: var(--linear-text-primary);
      cursor: pointer;
    }

    .summary-stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.5rem;
    }

    .stat-item {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      text-align: center;
      padding: 1rem;
      background: rgba(15, 98, 254, 0.05);
      border: 1px solid rgba(15, 98, 254, 0.1);
      border-radius: 8px;
    }

    .stat-value {
      font-size: 2rem;
      font-weight: 700;
      color: var(--cds-link-primary, #0f62fe);
      line-height: 1;
    }

    .stat-label {
      font-size: 0.75rem;
      color: var(--linear-text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .summary-actions {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      margin-top: 1rem;
    }

    .loading-state {
      text-align: center;
      padding: 3rem;
      color: var(--linear-text-secondary);
    }

    @media (max-width: 768px) {
      .summary-stats {
        grid-template-columns: 1fr;
      }

      .log-header-controls {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
      }
    }
  `]
})
export class AiAssistantAgentSummaryComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private aiAssistant = inject(AiAssistantService);
  private teachService = inject(AgentTeachService);

  insight = signal<Insight | null>(null);
  loading = signal(true);
  agentSteps = signal<AgentStep[]>([]);
  teachMode = signal(false);
  correctionModalOpen = signal(false);
  selectedStep = signal<AgentStep | null>(null);

  completedSteps = signal(5);
  totalDuration = signal('8.2s');
  canTeach = signal(true); // For now, always true

  ngOnInit() {
    const insightId = this.route.snapshot.paramMap.get('id');
    if (insightId) {
      this.aiAssistant.getInsightById(insightId).subscribe(insight => {
        if (insight) {
          this.insight.set(insight);
          this.loadAgentSteps(insight, insightId);
          this.loading.set(false);
        } else {
          this.loading.set(false);
        }
      });
    } else {
      this.loading.set(false);
    }
  }

  loadAgentSteps(insight: Insight, resolutionId: string) {
    // Load existing feedback
    const feedbackMap = this.teachService.getAllFeedbackForResolution(resolutionId);

    // Generate mock steps with confidence scores
    const steps: AgentStep[] = [
      {
        id: 'step-1',
        index: 1,
        label: 'Starting: Reviewing credential usage',
        status: 'started',
        type: 'info',
        message: 'Beginning analysis of credential usage across integrations',
        timestamp: new Date(Date.now() - 10000).toISOString(),
        confidence: 95,
        needsReview: false,
        outputText: 'Beginning analysis of credential usage across integrations'
      },
      {
        id: 'step-2',
        index: 2,
        label: 'Completed: Reviewing credential usage',
        status: 'completed',
        type: 'success',
        message: 'Found 3 integrations using this credential. All are active and healthy.',
        timestamp: new Date(Date.now() - 8000).toISOString(),
        durationMs: 1200,
        confidence: 92,
        needsReview: false,
        outputText: 'Found 3 integrations using this credential. All are active and healthy.',
        feedback: feedbackMap.get('step-2')
      },
      {
        id: 'step-3',
        index: 3,
        label: 'Starting: Generating replacement credential',
        status: 'started',
        type: 'info',
        message: 'Initiating credential generation process',
        timestamp: new Date(Date.now() - 7000).toISOString(),
        confidence: 88,
        needsReview: false,
        outputText: 'Initiating credential generation process'
      },
      {
        id: 'step-4',
        index: 4,
        label: 'Completed: Generating replacement credential',
        status: 'completed',
        type: 'success',
        message: 'Generated new API key: sk_live_***abc123. Expires in 365 days.',
        timestamp: new Date(Date.now() - 6000).toISOString(),
        durationMs: 1500,
        confidence: 65, // Low confidence - needs review
        needsReview: true,
        outputText: 'Generated new API key: sk_live_***abc123. Expires in 365 days.',
        feedback: feedbackMap.get('step-4')
      },
      {
        id: 'step-5',
        index: 5,
        label: 'Starting: Updating affected integrations',
        status: 'started',
        type: 'info',
        message: 'Preparing to update credentials in affected integrations',
        timestamp: new Date(Date.now() - 5000).toISOString(),
        confidence: 90,
        needsReview: false,
        outputText: 'Preparing to update credentials in affected integrations'
      },
      {
        id: 'step-6',
        index: 6,
        label: 'Completed: Updating affected integrations',
        status: 'completed',
        type: 'success',
        message: 'Updated credentials in Orders API, Payments API, and Inventory API. All updates successful.',
        timestamp: new Date(Date.now() - 4000).toISOString(),
        durationMs: 1800,
        confidence: 85,
        needsReview: false,
        outputText: 'Updated credentials in Orders API, Payments API, and Inventory API. All updates successful.',
        feedback: feedbackMap.get('step-6')
      },
      {
        id: 'step-7',
        index: 7,
        label: 'Starting: Verifying connection health',
        status: 'started',
        type: 'info',
        message: 'Running health checks on updated integrations',
        timestamp: new Date(Date.now() - 3000).toISOString(),
        confidence: 93,
        needsReview: false,
        outputText: 'Running health checks on updated integrations'
      },
      {
        id: 'step-8',
        index: 8,
        label: 'Completed: Verifying connection health',
        status: 'completed',
        type: 'success',
        message: 'All 3 integrations verified. Health checks passed. Response times normal.',
        timestamp: new Date(Date.now() - 2000).toISOString(),
        durationMs: 2000,
        confidence: 78,
        needsReview: false,
        outputText: 'All 3 integrations verified. Health checks passed. Response times normal.',
        feedback: feedbackMap.get('step-8')
      },
      {
        id: 'step-9',
        index: 9,
        label: 'Starting: Preparing revocation of old credential',
        status: 'started',
        type: 'info',
        message: 'Scheduling revocation of expired credential',
        timestamp: new Date(Date.now() - 1000).toISOString(),
        confidence: 87,
        needsReview: false,
        outputText: 'Scheduling revocation of expired credential'
      },
      {
        id: 'step-10',
        index: 10,
        label: 'Completed: Preparing revocation of old credential',
        status: 'completed',
        type: 'success',
        message: 'Old credential marked for revocation. Will be deactivated in 5 minutes after verification period.',
        timestamp: new Date().toISOString(),
        durationMs: 1100,
        confidence: 91,
        needsReview: false,
        outputText: 'Old credential marked for revocation. Will be deactivated in 5 minutes after verification period.',
        feedback: feedbackMap.get('step-10')
      }
    ];

    this.agentSteps.set(steps);
  }

  openCorrectionModal(step: AgentStep) {
    this.selectedStep.set(step);
    this.correctionModalOpen.set(true);
  }

  closeCorrectionModal() {
    this.correctionModalOpen.set(false);
    this.selectedStep.set(null);
  }

  async onFeedbackSaved(feedback: StepFeedback) {
    const step = this.selectedStep();
    const insightId = this.route.snapshot.paramMap.get('id');
    
    if (step && insightId) {
      // Save feedback
      await this.teachService.saveStepFeedback(insightId, step.id, feedback);
      
      // Update the step with feedback
      const steps = [...this.agentSteps()];
      const stepIndex = steps.findIndex(s => s.id === step.id);
      if (stepIndex !== -1) {
        steps[stepIndex] = {
          ...steps[stepIndex],
          feedback,
          confidence: feedback.adjustedConfidence,
          needsReview: feedback.adjustedConfidence < 70 || feedback.verdict !== 'correct',
          outputText: feedback.updatedOutput || steps[stepIndex].outputText
        };
        this.agentSteps.set(steps);
      }
      
      this.closeCorrectionModal();
    }
  }

  getResolvedDate(): string {
    return this.insight()?.resolvedAt || new Date().toISOString();
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  goBack() {
    this.router.navigate(['/ai-assistant/insights']);
  }
}
