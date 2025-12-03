import { Component, OnInit, signal, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  ButtonModule,
  TagModule,
  IconModule
} from 'carbon-components-angular';
import { AiAssistantService, Insight } from '../core/ai-assistant.service';

@Component({
  selector: 'app-ai-assistant-resolution',
  standalone: false,
  template: `
    <div class="page-container">
      <div class="resolution-container">
        <div class="success-header">
          <div class="success-icon">✓</div>
          <h1>Resolution Complete</h1>
          <p class="success-message">The credential expiration has been successfully resolved.</p>
        </div>

        <div *ngIf="insight(); else loading" class="resolution-content">
          <div class="summary-card">
            <h2 class="card-title">Resolution Summary</h2>
            <div class="summary-details">
              <div class="summary-item">
                <span class="summary-label">Issue:</span>
                <span class="summary-value">{{ insight()!.title }}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Resolved At:</span>
                <span class="summary-value">{{ formatDate(insight()!.resolvedAt!) }}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Time to Resolution:</span>
                <span class="summary-value">{{ calculateResolutionTime() }}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Status:</span>
                <ibm-tag type="green">Resolved</ibm-tag>
              </div>
            </div>
          </div>

          <div class="actions-taken-card">
            <h2 class="card-title">Actions Taken</h2>
            <div class="actions-list">
              <div class="action-item completed">
                <div class="action-icon">✓</div>
                <div class="action-content">
                  <span class="action-title">Reviewed Credential Details</span>
                  <span class="action-description">Examined the expiring credential and identified all affected integrations</span>
                </div>
              </div>
              <div class="action-item completed">
                <div class="action-icon">✓</div>
                <div class="action-content">
                  <span class="action-title">Generated New Credential</span>
                  <span class="action-description">Created a new API key with appropriate permissions and expiration date</span>
                </div>
              </div>
              <div class="action-item completed">
                <div class="action-icon">✓</div>
                <div class="action-content">
                  <span class="action-title">Updated Integrations</span>
                  <span class="action-description">Replaced the old credential in all affected integrations</span>
                </div>
              </div>
              <div class="action-item completed">
                <div class="action-icon">✓</div>
                <div class="action-content">
                  <span class="action-title">Verified & Tested</span>
                  <span class="action-description">Confirmed all integrations are working correctly with the new credential</span>
                </div>
              </div>
              <div class="action-item completed">
                <div class="action-icon">✓</div>
                <div class="action-content">
                  <span class="action-title">Revoked Old Credential</span>
                  <span class="action-description">Safely deactivated the expired credential to prevent unauthorized access</span>
                </div>
              </div>
            </div>
          </div>

          <div class="impact-card">
            <h2 class="card-title">Impact Prevented</h2>
            <div class="impact-stats">
              <div class="stat-item">
                <div class="stat-value">{{ insight()!.businessImpact.affectedUsers.toLocaleString() }}</div>
                <div class="stat-label">Users Protected</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">{{ insight()!.businessImpact.estimatedDowntime || 'N/A' }}</div>
                <div class="stat-label">Downtime Prevented</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">{{ insight()!.affectedEntities.length }}</div>
                <div class="stat-label">Integrations Secured</div>
              </div>
            </div>
          </div>

          <div class="recommendations-card">
            <h2 class="card-title">Recommendations</h2>
            <div class="recommendations-list">
              <div class="recommendation-item">
                <span class="recommendation-icon">💡</span>
                <div class="recommendation-content">
                  <span class="recommendation-title">Set Up Automated Rotation</span>
                  <span class="recommendation-description">Configure automatic credential rotation to prevent future expiration issues</span>
                </div>
              </div>
              <div class="recommendation-item">
                <span class="recommendation-icon">🔔</span>
                <div class="recommendation-content">
                  <span class="recommendation-title">Enable Expiration Alerts</span>
                  <span class="recommendation-description">Set up notifications 30 days before credential expiration</span>
                </div>
              </div>
              <div class="recommendation-item">
                <span class="recommendation-icon">📊</span>
                <div class="recommendation-content">
                  <span class="recommendation-title">Monitor Credential Usage</span>
                  <span class="recommendation-description">Regularly review credential usage patterns to identify optimization opportunities</span>
                </div>
              </div>
            </div>
          </div>

          <div class="resolution-actions">
            <button ibmButton="secondary" (click)="viewInsight()">
              View Insight Details
            </button>
            <button ibmButton="primary" (click)="backToInsights()">
              Back to Insights
            </button>
          </div>
        </div>

        <ng-template #loading>
          <div class="loading-state">
            <p>Loading resolution summary...</p>
          </div>
        </ng-template>
      </div>
    </div>
  `,
  styles: [`
    .page-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }

    .resolution-container {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .success-header {
      text-align: center;
      margin-bottom: 3rem;
    }

    .success-icon {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: #24a148;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2.5rem;
      font-weight: 600;
      margin: 0 auto 1.5rem;
    }

    .success-header h1 {
      font-size: 2.5rem;
      font-weight: 600;
      color: var(--linear-text-primary);
      margin: 0 0 0.75rem 0;
    }

    .success-message {
      font-size: 1.125rem;
      color: var(--linear-text-secondary);
      margin: 0;
    }

    .resolution-content {
      width: 100%;
      max-width: 900px;
    }

    .summary-card,
    .actions-taken-card,
    .impact-card,
    .recommendations-card {
      background: var(--linear-surface);
      border: 1px solid var(--linear-border);
      border-radius: 6px;
      padding: 2rem;
      margin-bottom: 1.5rem;
    }

    .card-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--linear-text-primary);
      margin: 0 0 1.5rem 0;
    }

    .summary-details {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .summary-item {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .summary-label {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--linear-text-secondary);
      min-width: 140px;
    }

    .summary-value {
      font-size: 0.875rem;
      color: var(--linear-text-primary);
    }

    .actions-list {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .action-item {
      display: flex;
      gap: 1rem;
      align-items: flex-start;
    }

    .action-icon {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #24a148;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1rem;
      font-weight: 600;
      flex-shrink: 0;
    }

    .action-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .action-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--linear-text-primary);
    }

    .action-description {
      font-size: 0.875rem;
      color: var(--linear-text-secondary);
      line-height: 1.5;
    }

    .impact-stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 2rem;
    }

    .stat-item {
      text-align: center;
    }

    .stat-value {
      font-size: 2rem;
      font-weight: 700;
      color: var(--cds-link-primary, #0f62fe);
      margin-bottom: 0.5rem;
    }

    .stat-label {
      font-size: 0.875rem;
      color: var(--linear-text-secondary);
    }

    .recommendations-list {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .recommendation-item {
      display: flex;
      gap: 1rem;
      align-items: flex-start;
    }

    .recommendation-icon {
      font-size: 1.5rem;
      flex-shrink: 0;
    }

    .recommendation-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .recommendation-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--linear-text-primary);
    }

    .recommendation-description {
      font-size: 0.875rem;
      color: var(--linear-text-secondary);
      line-height: 1.5;
    }

    .resolution-actions {
      display: flex;
      justify-content: center;
      gap: 1rem;
      margin-top: 2rem;
    }

    .loading-state {
      text-align: center;
      padding: 3rem;
      color: var(--linear-text-secondary);
    }

    @media (max-width: 768px) {
      .impact-stats {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class AiAssistantResolutionComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private aiAssistant = inject(AiAssistantService);

  insight = signal<Insight | null>(null);
  loading = signal(true);

  ngOnInit() {
    const insightId = this.route.snapshot.paramMap.get('id');
    if (insightId) {
      this.aiAssistant.getInsightById(insightId).subscribe(insight => {
        if (insight) {
          this.insight.set(insight);
        }
        this.loading.set(false);
      });
    } else {
      this.loading.set(false);
    }
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

  calculateResolutionTime(): string {
    const insight = this.insight();
    if (!insight || !insight.detectedAt || !insight.resolvedAt) {
      return 'N/A';
    }

    const detected = new Date(insight.detectedAt);
    const resolved = new Date(insight.resolvedAt);
    const diffMs = resolved.getTime() - detected.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`;
    }
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`;
  }

  viewInsight() {
    const insightId = this.route.snapshot.paramMap.get('id');
    if (insightId) {
      this.router.navigate(['/ai-assistant/insights', insightId]);
    }
  }

  backToInsights() {
    this.router.navigate(['/ai-assistant/insights']);
  }
}

