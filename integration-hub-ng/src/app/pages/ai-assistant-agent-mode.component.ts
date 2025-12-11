import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  ButtonModule,
  TagModule,
  IconModule
} from 'carbon-components-angular';
import { AiAssistantService, Insight } from '../core/ai-assistant.service';
import { AgentStatusComponent, AgentStep as AgentStatusStep } from '../shared/components/agent-status/agent-status.component';
import { AgentActivityLogComponent } from '../shared/components/agent-activity-log/agent-activity-log.component';
import { AgentStep } from '../core/models/agent-resolution.model';

@Component({
  selector: 'app-ai-assistant-agent-mode',
  standalone: false,
  template: `
    <div class="page-container">
      <div class="page-header">
        <button ibmButton="ghost" size="sm" (click)="goBack()" class="back-button">
          ← Back
        </button>
        <div>
          <h1>AI Agent Resolution</h1>
          <p class="page-subtitle">The AI agent is automatically resolving this insight</p>
        </div>
      </div>

      <div *ngIf="insight(); else loading" class="agent-container">
        <!-- Insight Summary -->
        <div class="insight-summary">
          <div class="summary-header">
            <h2>{{ insight()!.title }}</h2>
            <ibm-tag [type]="getSeverityType(insight()!.severity)">
              {{ insight()!.severity | titlecase }}
            </ibm-tag>
          </div>
          <p class="summary-description">{{ insight()!.description }}</p>
        </div>

        <!-- Agent Status -->
        <app-agent-status [steps]="agentSteps"></app-agent-status>

        <!-- Activity Log -->
        <app-agent-activity-log [steps]="activityLogSteps"></app-agent-activity-log>

        <!-- Success State -->
        <div *ngIf="isComplete()" class="completion-state">
          <div class="completion-icon">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="32" cy="32" r="32" fill="#24a148"/>
              <path d="M20 32L28 40L44 24" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <h2 class="completion-title">Resolution Complete</h2>
          <p class="completion-description">
            The AI agent has successfully resolved this insight. All steps completed without errors.
          </p>
          <div class="completion-actions">
            <button 
              ibmButton="primary" 
              (click)="viewDetails()">
              View Details
            </button>
            <button 
              ibmButton="secondary" 
              (click)="goBack()">
              Back to Insights
            </button>
          </div>
        </div>

        <!-- Manual Override -->
        <div class="override-section" *ngIf="!isComplete()">
          <div class="override-card">
            <h3 class="override-title">Need manual control?</h3>
            <p class="override-description">
              You can stop the agent and complete the resolution manually at any time.
            </p>
            <button 
              ibmButton="secondary" 
              size="sm"
              (click)="switchToManual()">
              Switch to Manual Mode
            </button>
          </div>
        </div>
      </div>

      <ng-template #loading>
        <div class="loading-state">
          <p>Loading agent mode...</p>
        </div>
      </ng-template>
    </div>
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

    .agent-container {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .insight-summary {
      background: var(--linear-surface);
      border: 1px solid var(--linear-border);
      border-radius: 12px;
      padding: 1.5rem;
    }

    .summary-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      margin-bottom: 0.75rem;
    }

    .summary-header h2 {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--linear-text-primary);
      margin: 0;
      flex: 1;
    }

    .summary-description {
      font-size: 0.875rem;
      color: var(--linear-text-secondary);
      margin: 0;
      line-height: 1.5;
    }

    .completion-state {
      text-align: center;
      padding: 3rem 2rem;
      background: var(--linear-surface);
      border: 1px solid var(--linear-border);
      border-radius: 12px;
    }

    .completion-icon {
      margin: 0 auto 1.5rem;
      width: 64px;
      height: 64px;
    }

    .completion-title {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--linear-text-primary);
      margin: 0 0 0.75rem 0;
    }

    .completion-description {
      font-size: 0.875rem;
      color: var(--linear-text-secondary);
      margin: 0 0 2rem 0;
      max-width: 500px;
      margin-left: auto;
      margin-right: auto;
    }

    .completion-actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
    }

    .override-section {
      margin-top: 1rem;
    }

    .override-card {
      background: rgba(255, 131, 43, 0.05);
      border: 1px solid rgba(255, 131, 43, 0.2);
      border-radius: 8px;
      padding: 1.25rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }

    .override-title {
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--linear-text-primary);
      margin: 0 0 0.25rem 0;
    }

    .override-description {
      font-size: 0.8125rem;
      color: var(--linear-text-secondary);
      margin: 0;
    }

    .loading-state {
      text-align: center;
      padding: 3rem;
      color: var(--linear-text-secondary);
    }
  `]
})
export class AiAssistantAgentModeComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private aiAssistant = inject(AiAssistantService);

  insight = signal<Insight | null>(null);
  loading = signal(true);
  agentSteps = signal<AgentStatusStep[]>([]);
  activityLogSteps = signal<AgentStep[]>([]);
  isComplete = signal(false);

  ngOnInit() {
    const insightId = this.route.snapshot.paramMap.get('id');
    if (insightId) {
      this.aiAssistant.getInsightById(insightId).subscribe(insight => {
        if (insight) {
          this.insight.set(insight);
          this.loading.set(false);
          this.startAgentWorkflow(insight);
        } else {
          this.loading.set(false);
        }
      });
    } else {
      this.loading.set(false);
    }
  }

  startAgentWorkflow(insight: Insight) {
    // Initialize status steps (for AgentStatusComponent)
    const statusSteps: AgentStatusStep[] = [
      { id: '1', label: 'Reviewing credential usage', status: 'pending' },
      { id: '2', label: 'Generating replacement credential', status: 'pending' },
      { id: '3', label: 'Updating affected integrations', status: 'pending' },
      { id: '4', label: 'Verifying connection health', status: 'pending' },
      { id: '5', label: 'Preparing revocation of old credential', status: 'pending' }
    ];
    this.agentSteps.set(statusSteps);

    // Add initial log entry as AgentStep
    const initialTimestamp = new Date().toISOString();
    this.addActivityStep({
      id: 'workflow-start',
      index: 0,
      label: 'Agent started resolution workflow',
      status: 'started',
      message: `Beginning automated resolution for: ${insight.title}`,
      timestamp: initialTimestamp,
      type: 'info'
    });

    // Execute steps sequentially
    this.executeStep(0);
  }

  executeStep(stepIndex: number) {
    const steps = [...this.agentSteps()];
    if (stepIndex >= steps.length) {
      this.completeWorkflow();
      return;
    }

    const step = steps[stepIndex];
    const startTime = Date.now();
    const startTimestamp = new Date().toISOString();

    // Mark step as running (for status component)
    steps[stepIndex] = { ...step, status: 'running' };
    this.agentSteps.set(steps);

    // Add started step to activity log
    this.addActivityStep({
      id: `step-${stepIndex}-start`,
      index: stepIndex + 1,
      label: `Starting: ${step.label}`,
      status: 'started',
      message: `Beginning execution of: ${step.label}`,
      timestamp: startTimestamp,
      type: 'info'
    });

    // Simulate step execution (1-2 seconds)
    const duration = 1000 + Math.random() * 1000;
    
    setTimeout(() => {
      const endTime = Date.now();
      const actualDuration = endTime - startTime;
      const endTimestamp = new Date().toISOString();

      // Mark step as completed (for status component)
      const updatedSteps = [...this.agentSteps()];
      updatedSteps[stepIndex] = {
        ...step,
        status: 'completed',
        duration: actualDuration,
        result: this.getStepResult(stepIndex)
      };
      this.agentSteps.set(updatedSteps);

      // Add completion step to activity log
      const resultMessage = this.getStepResult(stepIndex);
      this.addActivityStep({
        id: `step-${stepIndex}-complete`,
        index: stepIndex + 1,
        label: `Completed: ${step.label}`,
        status: 'completed',
        message: resultMessage,
        timestamp: endTimestamp,
        durationMs: actualDuration,
        type: 'success'
      });

      // Move to next step
      setTimeout(() => {
        this.executeStep(stepIndex + 1);
      }, 300);
    }, duration);
  }

  getStepResult(stepIndex: number): string {
    const results = [
      'Found 3 integrations using this credential. All are active and healthy.',
      'Generated new API key: sk_live_***abc123. Expires in 365 days.',
      'Updated credentials in Orders API, Payments API, and Inventory API. All updates successful.',
      'All 3 integrations verified. Health checks passed. Response times normal.',
      'Old credential marked for revocation. Will be deactivated in 5 minutes after verification period.'
    ];
    return results[stepIndex] || 'Step completed successfully';
  }

  addActivityStep(step: AgentStep) {
    this.activityLogSteps.update(log => [...log, step]);
  }

  completeWorkflow() {
    this.isComplete.set(true);
    this.addActivityStep({
      id: 'workflow-complete',
      index: this.agentSteps().length + 1,
      label: 'Resolution workflow completed successfully',
      status: 'completed',
      message: 'All steps completed without errors. The insight has been resolved.',
      timestamp: new Date().toISOString(),
      type: 'success'
    });

    // Resolve the insight
    const insightId = this.route.snapshot.paramMap.get('id');
    if (insightId) {
      this.aiAssistant.resolveInsight(insightId).subscribe();
    }
  }

  viewDetails() {
    const insightId = this.route.snapshot.paramMap.get('id');
    if (insightId) {
      this.router.navigate(['/ai-assistant/agent-summary', insightId]);
    }
  }

  switchToManual() {
    const insightId = this.route.snapshot.paramMap.get('id');
    if (insightId) {
      this.router.navigate(['/ai-assistant/workflow', insightId]);
    }
  }

  goBack() {
    this.router.navigate(['/ai-assistant/insights']);
  }

  getSeverityType(severity: string): 'red' | 'warm-gray' | 'magenta' | 'purple' | 'blue' | 'cyan' | 'teal' | 'green' | 'cool-gray' | 'gray' {
    switch (severity) {
      case 'critical': return 'red';
      case 'high': return 'magenta';
      case 'medium': return 'purple';
      case 'low': return 'green';
      default: return 'gray';
    }
  }
}

