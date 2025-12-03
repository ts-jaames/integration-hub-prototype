import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  ButtonModule,
  TagModule,
  IconModule
} from 'carbon-components-angular';
import { AiAssistantService, Insight } from '../core/ai-assistant.service';

@Component({
  selector: 'app-ai-assistant-insight-detail',
  standalone: false,
  template: `
    <div class="page-container">
      <div class="page-header">
        <button ibmButton="ghost" size="sm" (click)="goBack()" class="back-button">
          ← Back to Insights
        </button>
        <div class="header-content">
          <div>
            <h1>{{ insight()?.title }}</h1>
            <p class="page-subtitle">{{ insight()?.description }}</p>
          </div>
          <div class="header-actions">
            <ibm-tag [type]="getSeverityType(insight()?.severity || 'low')" class="severity-tag-large">
              {{ insight()?.severity | titlecase }}
            </ibm-tag>
            <button 
              *ngIf="insight()?.workflowType && insight()?.status === 'active'"
              ibmButton="primary" 
              (click)="startWorkflow()">
              Start Resolution Workflow
            </button>
          </div>
        </div>
      </div>

      <div *ngIf="insight(); else loading" class="detail-content">
        <div class="detail-grid">
          <div class="detail-section">
            <h2 class="section-title">Business Impact</h2>
            <div class="impact-card">
              <p class="impact-description">{{ insight()!.businessImpact.description }}</p>
              <div class="impact-metrics">
                <div class="metric">
                  <span class="metric-label">Affected Users</span>
                  <span class="metric-value">{{ insight()!.businessImpact.affectedUsers.toLocaleString() }}</span>
                </div>
                <div class="metric" *ngIf="insight()!.businessImpact.estimatedDowntime">
                  <span class="metric-label">Estimated Downtime</span>
                  <span class="metric-value">{{ insight()!.businessImpact.estimatedDowntime }}</span>
                </div>
                <div class="metric" *ngIf="insight()!.businessImpact.financialImpact">
                  <span class="metric-label">Financial Impact</span>
                  <span class="metric-value financial">{{ insight()!.businessImpact.financialImpact }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <h2 class="section-title">Risk Analysis</h2>
            <div class="risk-card">
              <div class="risk-score-display">
                <div class="risk-score-circle">
                  <span class="risk-score-value">{{ insight()!.riskAnalysis.riskScore }}</span>
                  <span class="risk-score-label">/10</span>
                </div>
                <div class="risk-score-details">
                  <div class="risk-dimension">
                    <span class="dimension-label">Likelihood:</span>
                    <ibm-tag [type]="getLikelihoodType(insight()!.riskAnalysis.likelihood)">
                      {{ insight()!.riskAnalysis.likelihood | titlecase }}
                    </ibm-tag>
                  </div>
                  <div class="risk-dimension">
                    <span class="dimension-label">Impact:</span>
                    <ibm-tag [type]="getImpactType(insight()!.riskAnalysis.impact)">
                      {{ insight()!.riskAnalysis.impact | titlecase }}
                    </ibm-tag>
                  </div>
                </div>
              </div>
              <div class="risk-factors">
                <h3 class="factors-title">Risk Factors</h3>
                <ul class="factors-list">
                  <li *ngFor="let factor of insight()!.riskAnalysis.factors">{{ factor }}</li>
                </ul>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <h2 class="section-title">Affected Entities</h2>
            <div class="entities-list">
              <div *ngFor="let entity of insight()!.affectedEntities" class="entity-item">
                <span class="entity-name">{{ entity }}</span>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <h2 class="section-title">Recommended Actions</h2>
            <div class="actions-list">
              <div *ngFor="let action of insight()!.recommendedActions; let i = index" class="action-item">
                <span class="action-number">{{ i + 1 }}</span>
                <span class="action-text">{{ action }}</span>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <h2 class="section-title">Timeline</h2>
            <div class="timeline">
              <div class="timeline-item">
                <div class="timeline-marker"></div>
                <div class="timeline-content">
                  <span class="timeline-label">Detected</span>
                  <span class="timeline-date">{{ formatDate(insight()!.detectedAt) }}</span>
                </div>
              </div>
              <div class="timeline-item" *ngIf="insight()!.resolvedAt">
                <div class="timeline-marker resolved"></div>
                <div class="timeline-content">
                  <span class="timeline-label">Resolved</span>
                  <span class="timeline-date">{{ formatDate(insight()!.resolvedAt!) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ng-template #loading>
        <div class="loading-state">
          <p>Loading insight details...</p>
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

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 2rem;
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

    .header-actions {
      display: flex;
      gap: 1rem;
      align-items: center;
    }

    .severity-tag-large {
      font-size: 0.875rem;
      padding: 0.5rem 1rem;
    }

    .detail-content {
      margin-top: 2rem;
    }

    .detail-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1.5rem;
    }

    .detail-section {
      background: var(--linear-surface);
      border: 1px solid var(--linear-border);
      border-radius: 6px;
      padding: 1.5rem;
    }

    .section-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--linear-text-primary);
      margin: 0 0 1rem 0;
    }

    .impact-card {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .impact-description {
      font-size: 0.875rem;
      color: var(--linear-text-secondary);
      line-height: 1.5;
      margin: 0;
    }

    .impact-metrics {
      display: flex;
      gap: 2rem;
      flex-wrap: wrap;
    }

    .metric {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .metric-label {
      font-size: 0.75rem;
      color: var(--linear-text-secondary);
      font-weight: 500;
    }

    .metric-value {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--linear-text-primary);
    }

    .metric-value.financial {
      color: #da1e28;
    }

    .risk-card {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .risk-score-display {
      display: flex;
      align-items: center;
      gap: 2rem;
    }

    .risk-score-circle {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      border: 4px solid var(--cds-link-primary, #0f62fe);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(15, 98, 254, 0.1);
    }

    .risk-score-value {
      font-size: 2rem;
      font-weight: 700;
      color: var(--cds-link-primary, #0f62fe);
      line-height: 1;
    }

    .risk-score-label {
      font-size: 0.875rem;
      color: var(--linear-text-secondary);
    }

    .risk-score-details {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .risk-dimension {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .dimension-label {
      font-size: 0.875rem;
      color: var(--linear-text-secondary);
      font-weight: 500;
      min-width: 80px;
    }

    .risk-factors {
      margin-top: 0.5rem;
    }

    .factors-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--linear-text-primary);
      margin: 0 0 0.75rem 0;
    }

    .factors-list {
      margin: 0;
      padding-left: 1.5rem;
      list-style-type: disc;
    }

    .factors-list li {
      font-size: 0.875rem;
      color: var(--linear-text-secondary);
      margin-bottom: 0.5rem;
      line-height: 1.5;
    }

    .entities-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .entity-item {
      padding: 0.75rem;
      background: var(--linear-surface);
      border: 1px solid var(--linear-border);
      border-radius: 4px;
    }

    .entity-name {
      font-size: 0.875rem;
      color: var(--linear-text-primary);
    }

    .actions-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .action-item {
      display: flex;
      gap: 1rem;
      align-items: flex-start;
    }

    .action-number {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: var(--cds-link-primary, #0f62fe);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 600;
      flex-shrink: 0;
    }

    .action-text {
      font-size: 0.875rem;
      color: var(--linear-text-primary);
      line-height: 1.5;
      flex: 1;
    }

    .timeline {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      position: relative;
    }

    .timeline-item {
      display: flex;
      gap: 1rem;
      align-items: flex-start;
    }

    .timeline-marker {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: var(--cds-link-primary, #0f62fe);
      border: 2px solid var(--linear-surface);
      flex-shrink: 0;
      margin-top: 4px;
    }

    .timeline-marker.resolved {
      background: #24a148;
    }

    .timeline-content {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .timeline-label {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--linear-text-primary);
    }

    .timeline-date {
      font-size: 0.75rem;
      color: var(--linear-text-secondary);
    }

    .loading-state {
      text-align: center;
      padding: 3rem;
      color: var(--linear-text-secondary);
    }

    @media (max-width: 1024px) {
      .detail-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class AiAssistantInsightDetailComponent implements OnInit {
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

  getSeverityType(severity: string): 'red' | 'warm-gray' | 'magenta' | 'purple' | 'blue' | 'cyan' | 'teal' | 'green' | 'cool-gray' | 'gray' {
    switch (severity) {
      case 'critical': return 'red';
      case 'high': return 'magenta';
      case 'medium': return 'purple';
      case 'low': return 'green';
      default: return 'gray';
    }
  }

  getLikelihoodType(likelihood: string): 'red' | 'warm-gray' | 'magenta' | 'purple' | 'blue' | 'cyan' | 'teal' | 'green' | 'cool-gray' | 'gray' {
    switch (likelihood) {
      case 'high': return 'red';
      case 'medium': return 'purple';
      case 'low': return 'green';
      default: return 'gray';
    }
  }

  getImpactType(impact: string): 'red' | 'warm-gray' | 'magenta' | 'purple' | 'blue' | 'cyan' | 'teal' | 'green' | 'cool-gray' | 'gray' {
    switch (impact) {
      case 'high': return 'red';
      case 'medium': return 'purple';
      case 'low': return 'green';
      default: return 'gray';
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

  goBack() {
    this.router.navigate(['/ai-assistant/insights']);
  }

  startWorkflow() {
    const insightId = this.route.snapshot.paramMap.get('id');
    if (insightId) {
      this.router.navigate(['/ai-assistant/workflow', insightId]);
    }
  }
}

