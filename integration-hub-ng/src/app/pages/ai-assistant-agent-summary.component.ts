import { Component, OnInit, signal, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  ButtonModule,
  TagModule,
  IconModule
} from 'carbon-components-angular';
import { AiAssistantService, Insight } from '../core/ai-assistant.service';
import { AgentActivityLogComponent, AgentActivity } from '../shared/components/agent-activity-log/agent-activity-log.component';

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
              <span class="stat-value">{{ activityLog().length }}</span>
              <span class="stat-label">Actions Taken</span>
            </div>
          </div>
        </div>

        <!-- Activity Log -->
        <div class="summary-card">
          <h3 class="card-title">Complete Activity Log</h3>
          <app-agent-activity-log [activities]="activityLog"></app-agent-activity-log>
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
    }
  `]
})
export class AiAssistantAgentSummaryComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private aiAssistant = inject(AiAssistantService);

  insight = signal<Insight | null>(null);
  loading = signal(true);
  activityLog = signal<AgentActivity[]>([]);

  completedSteps = signal(5);
  totalDuration = signal('8.2s');

  ngOnInit() {
    const insightId = this.route.snapshot.paramMap.get('id');
    if (insightId) {
      this.aiAssistant.getInsightById(insightId).subscribe(insight => {
        if (insight) {
          this.insight.set(insight);
          this.loadActivityLog(insight);
          this.loading.set(false);
        } else {
          this.loading.set(false);
        }
      });
    } else {
      this.loading.set(false);
    }
  }

  loadActivityLog(insight: Insight) {
    // Generate mock activity log based on the workflow
    const activities: AgentActivity[] = [
      {
        id: '1',
        timestamp: new Date(Date.now() - 10000).toISOString(),
        action: 'Agent started resolution workflow',
        details: `Beginning automated resolution for: ${insight.title}`,
        status: 'info',
        metadata: { insightId: insight.id }
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 9000).toISOString(),
        action: 'Starting: Reviewing credential usage',
        status: 'info'
      },
      {
        id: '3',
        timestamp: new Date(Date.now() - 8000).toISOString(),
        action: 'Completed: Reviewing credential usage',
        details: 'Found 3 integrations using this credential. All are active and healthy.',
        status: 'success',
        metadata: { duration: '1200ms', integrationsFound: 3 }
      },
      {
        id: '4',
        timestamp: new Date(Date.now() - 7000).toISOString(),
        action: 'Starting: Generating replacement credential',
        status: 'info'
      },
      {
        id: '5',
        timestamp: new Date(Date.now() - 6000).toISOString(),
        action: 'Completed: Generating replacement credential',
        details: 'Generated new API key: sk_live_***abc123. Expires in 365 days.',
        status: 'success',
        metadata: { duration: '1500ms', credentialType: 'API Key' }
      },
      {
        id: '6',
        timestamp: new Date(Date.now() - 5000).toISOString(),
        action: 'Starting: Updating affected integrations',
        status: 'info'
      },
      {
        id: '7',
        timestamp: new Date(Date.now() - 4000).toISOString(),
        action: 'Completed: Updating affected integrations',
        details: 'Updated credentials in Orders API, Payments API, and Inventory API. All updates successful.',
        status: 'success',
        metadata: { duration: '1800ms', integrationsUpdated: 3 }
      },
      {
        id: '8',
        timestamp: new Date(Date.now() - 3000).toISOString(),
        action: 'Starting: Verifying connection health',
        status: 'info'
      },
      {
        id: '9',
        timestamp: new Date(Date.now() - 2000).toISOString(),
        action: 'Completed: Verifying connection health',
        details: 'All 3 integrations verified. Health checks passed. Response times normal.',
        status: 'success',
        metadata: { duration: '2000ms', healthChecks: '3/3 passed' }
      },
      {
        id: '10',
        timestamp: new Date(Date.now() - 1000).toISOString(),
        action: 'Starting: Preparing revocation of old credential',
        status: 'info'
      },
      {
        id: '11',
        timestamp: new Date().toISOString(),
        action: 'Completed: Preparing revocation of old credential',
        details: 'Old credential marked for revocation. Will be deactivated in 5 minutes after verification period.',
        status: 'success',
        metadata: { duration: '1100ms' }
      },
      {
        id: '12',
        timestamp: new Date().toISOString(),
        action: 'Resolution workflow completed successfully',
        details: 'All steps completed without errors. The insight has been resolved.',
        status: 'success',
        metadata: { totalSteps: 5, totalDuration: '8.2s' }
      }
    ];
    this.activityLog.set(activities);
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

