import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ButtonModule,
  TagModule,
  IconModule
} from 'carbon-components-angular';
import { AiAssistantService, Insight } from '../core/ai-assistant.service';

@Component({
  selector: 'app-ai-assistant-insights',
  standalone: false,
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1>AI Assistant Insights</h1>
          <p class="page-subtitle">Proactive risk detection and resolution guidance</p>
        </div>
      </div>

      <div class="tabs-container">
        <div class="custom-tabs">
          <button 
            class="tab-button"
            [class.active]="selectedTab() === 0"
            (click)="selectedTab.set(0)">
            Active ({{ activeInsights().length }})
          </button>
          <button 
            class="tab-button"
            [class.active]="selectedTab() === 1"
            (click)="selectedTab.set(1)">
            Resolved ({{ resolvedInsights().length }})
          </button>
        </div>
        
        <div class="tab-content" *ngIf="selectedTab() === 0">
          <div class="insights-list">
            <div *ngIf="activeInsights().length === 0" class="empty-state">
              <p>No active insights at this time.</p>
            </div>
            <div 
              *ngFor="let insight of activeInsights()" 
              class="insight-card"
              [class.critical]="insight.severity === 'critical'"
              [class.high]="insight.severity === 'high'"
              [class.medium]="insight.severity === 'medium'"
              [class.low]="insight.severity === 'low'"
              (click)="viewInsight(insight.id)">
              <div class="insight-header">
                <div class="insight-title-row">
                  <h3 class="insight-title">{{ insight.title }}</h3>
                  <ibm-tag [type]="getSeverityType(insight.severity)" class="severity-tag">
                    {{ insight.severity | titlecase }}
                  </ibm-tag>
                </div>
                <p class="insight-description">{{ insight.description }}</p>
              </div>
              <div class="insight-meta">
                <div class="meta-item">
                  <span class="meta-label">Detected:</span>
                  <span class="meta-value">{{ formatDate(insight.detectedAt) }}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">Risk Score:</span>
                  <span class="meta-value risk-score">{{ insight.riskAnalysis.riskScore }}/10</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">Affected:</span>
                  <span class="meta-value">{{ insight.affectedEntities.length }} integration(s)</span>
                </div>
              </div>
              <div class="insight-actions">
                <button 
                  ibmButton="primary" 
                  size="sm"
                  (click)="startWorkflow(insight.id, $event)">
                  {{ insight.workflowType ? 'Start Resolution' : 'View Details' }}
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div class="tab-content" *ngIf="selectedTab() === 1">
          <div class="insights-list">
            <div *ngIf="resolvedInsights().length === 0" class="empty-state">
              <p>No resolved insights.</p>
            </div>
            <div 
              *ngFor="let insight of resolvedInsights()" 
              class="insight-card resolved"
              (click)="viewInsight(insight.id)">
              <div class="insight-header">
                <div class="insight-title-row">
                  <h3 class="insight-title">{{ insight.title }}</h3>
                  <ibm-tag type="gray" class="severity-tag">Resolved</ibm-tag>
                </div>
                <p class="insight-description">{{ insight.description }}</p>
              </div>
              <div class="insight-meta">
                <div class="meta-item">
                  <span class="meta-label">Resolved:</span>
                  <span class="meta-value">{{ formatDate(insight.resolvedAt!) }}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">Detected:</span>
                  <span class="meta-value">{{ formatDate(insight.detectedAt) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
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

    .insights-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-top: 1.5rem;
    }

    .insight-card {
      background: var(--linear-surface);
      border: 1px solid var(--linear-border);
      border-radius: 6px;
      padding: 1.5rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .insight-card:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      border-color: var(--cds-link-primary, #0f62fe);
    }

    .insight-card.critical {
      border-left: 4px solid #da1e28;
    }

    .insight-card.high {
      border-left: 4px solid #ff832b;
    }

    .insight-card.medium {
      border-left: 4px solid #f1c21b;
    }

    .insight-card.low {
      border-left: 4px solid #24a148;
    }

    .insight-card.resolved {
      opacity: 0.7;
      border-left: 4px solid #8d8d8d;
    }

    .insight-header {
      margin-bottom: 1rem;
    }

    .insight-title-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      margin-bottom: 0.5rem;
    }

    .insight-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--linear-text-primary);
      margin: 0;
      flex: 1;
    }

    .severity-tag {
      flex-shrink: 0;
    }

    .insight-description {
      font-size: 0.875rem;
      color: var(--linear-text-secondary);
      margin: 0;
      line-height: 1.5;
    }

    .insight-meta {
      display: flex;
      gap: 2rem;
      margin-bottom: 1rem;
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

    .meta-value.risk-score {
      font-weight: 600;
      color: var(--cds-link-primary, #0f62fe);
    }

    .insight-actions {
      display: flex;
      gap: 0.75rem;
      margin-top: 1rem;
    }

    .insight-actions button {
      pointer-events: auto;
    }

    .empty-state {
      text-align: center;
      padding: 3rem;
      color: var(--linear-text-secondary);
    }

    .tabs-container {
      margin-top: 1.5rem;
    }

    .custom-tabs {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
      border-bottom: 1px solid var(--linear-border);
    }

    .tab-button {
      padding: 0.75rem 1.5rem;
      border: none;
      background: transparent;
      color: var(--linear-text-secondary);
      font-size: 0.875rem;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
      transition: all 150ms ease;
    }

    .tab-button:hover {
      color: var(--linear-text-primary);
    }

    .tab-button.active {
      color: var(--cds-link-primary, #0f62fe);
      border-bottom-color: var(--cds-link-primary, #0f62fe);
    }

    .tab-content {
      margin-top: 1rem;
    }
  `]
})
export class AiAssistantInsightsComponent implements OnInit {
  private router = inject(Router);
  private aiAssistant = inject(AiAssistantService);

  selectedTab = signal(0);
  activeInsights = computed(() => this.aiAssistant.activeInsights());
  resolvedInsights = computed(() => this.aiAssistant.resolvedInsights());

  ngOnInit() {
    // Service already initialized with seed data
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

  viewInsight(insightId: string) {
    this.router.navigate(['/ai-assistant/insights', insightId]);
  }

  startWorkflow(insightId: string, event: Event) {
    event.stopPropagation();
    const insight = this.activeInsights().find(i => i.id === insightId);
    if (insight?.workflowType) {
      this.router.navigate(['/ai-assistant/workflow', insightId]);
    } else {
      this.viewInsight(insightId);
    }
  }
}

