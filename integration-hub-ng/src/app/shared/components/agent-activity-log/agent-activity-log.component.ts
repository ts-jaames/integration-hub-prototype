import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TagModule, ButtonModule } from 'carbon-components-angular';
import { AgentStep } from '../../../core/models/agent-resolution.model';

// Keep for backward compatibility
export interface AgentActivity {
  id: string;
  timestamp: string;
  action: string;
  details?: string;
  status: 'info' | 'success' | 'warning' | 'error';
  metadata?: Record<string, any>;
}

@Component({
  selector: 'app-agent-activity-log',
  standalone: true,
  imports: [CommonModule, TagModule, ButtonModule],
  template: `
    <div class="activity-log">
      <div class="log-header">
        <h3 class="log-title">Agent Activity Log</h3>
        <p class="log-subtitle">Real-time transcript of agent actions</p>
      </div>

      <div class="log-container">
        <div 
          *ngFor="let step of steps()" 
          class="log-entry"
          [class.info]="step.type === 'info' || (!step.type && step.status === 'started')"
          [class.success]="step.type === 'success' || (!step.type && step.status === 'completed')"
          [class.warning]="step.type === 'warning'"
          [class.error]="step.type === 'error' || step.status === 'failed'"
          [class.needs-review]="teachMode() && step.needsReview"
          [class.low-confidence]="teachMode() && step.confidence !== undefined && step.confidence < 70">
          
          <div class="entry-icon">
            <svg *ngIf="step.type === 'info' || (!step.type && step.status === 'started')" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="currentColor"/>
            </svg>
            <svg *ngIf="step.type === 'success' || (!step.type && step.status === 'completed')" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13.5 4L6 11.5L2.5 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <svg *ngIf="step.type === 'warning'" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 22H22L12 2ZM12 16V18M12 10V14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <svg *ngIf="step.type === 'error' || step.status === 'failed'" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>

          <div class="entry-content">
            <div class="entry-header">
              <div class="entry-main">
                <span class="entry-action">{{ step.label }}</span>
                <span class="entry-time">{{ formatTime(step.timestamp) }}</span>
              </div>
              <div class="entry-actions" *ngIf="teachMode()">
                <div class="confidence-display" *ngIf="step.confidence !== undefined">
                  <span class="confidence-label" [class.low]="step.confidence < 70">
                    {{ step.confidence }}%
                  </span>
                  <div class="confidence-bar">
                    <div 
                      class="confidence-fill" 
                      [style.width.%]="step.confidence"
                      [class.low]="step.confidence < 70">
                    </div>
                  </div>
                </div>
                <button 
                  ibmButton="secondary" 
                  size="sm"
                  (click)="onCorrect(step)"
                  class="correct-button">
                  Correct
                </button>
              </div>
            </div>
            <p class="entry-details">{{ step.message }}</p>
            <div class="review-badges" *ngIf="step.feedback">
              <ibm-tag type="green" *ngIf="step.feedback.verdict === 'correct'">Reviewed</ibm-tag>
              <ibm-tag type="purple" *ngIf="step.feedback.verdict === 'partial'">Corrected</ibm-tag>
              <ibm-tag type="red" *ngIf="step.feedback.verdict === 'incorrect'">Corrected</ibm-tag>
            </div>
            <div class="low-confidence-badge" *ngIf="teachMode() && step.needsReview && step.confidence !== undefined && step.confidence < 70">
              <ibm-tag type="warm-gray">Low confidence</ibm-tag>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .activity-log {
      background: var(--log-surface, rgba(255, 255, 255, 0.95));
      border: 1px solid var(--log-border, rgba(0, 0, 0, 0.08));
      border-radius: 12px;
      padding: 1.5rem;
      max-height: 500px;
      display: flex;
      flex-direction: column;
    }

    .log-header {
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--log-border, rgba(0, 0, 0, 0.08));
    }

    .log-title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--log-text-primary, #161616);
      margin: 0 0 0.25rem 0;
    }

    .log-subtitle {
      font-size: 0.75rem;
      color: var(--log-text-secondary, #6b6b6b);
      margin: 0;
    }

    .log-container {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .log-container::-webkit-scrollbar {
      width: 6px;
    }

    .log-container::-webkit-scrollbar-track {
      background: transparent;
    }

    .log-container::-webkit-scrollbar-thumb {
      background: var(--log-scrollbar, rgba(0, 0, 0, 0.2));
      border-radius: 3px;
    }

    .log-container::-webkit-scrollbar-thumb:hover {
      background: var(--log-scrollbar-hover, rgba(0, 0, 0, 0.3));
    }

    .log-entry {
      display: flex;
      gap: 0.75rem;
      padding: 0.75rem;
      background: var(--log-entry-bg, rgba(0, 0, 0, 0.02));
      border-left: 3px solid transparent;
      border-radius: 6px;
      animation: entrySlideIn 0.3s ease-out;
    }

    .log-entry.needs-review {
      border: 2px solid rgba(255, 131, 43, 0.3);
      background: rgba(255, 131, 43, 0.05);
    }

    .log-entry.low-confidence {
      border: 2px solid rgba(255, 131, 43, 0.3);
      background: rgba(255, 131, 43, 0.05);
    }

    @keyframes entrySlideIn {
      from {
        opacity: 0;
        transform: translateX(-8px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    .log-entry.info {
      border-left-color: var(--log-accent, #0f62fe);
    }

    .log-entry.success {
      border-left-color: #24a148;
      background: rgba(36, 161, 72, 0.05);
    }

    .log-entry.warning {
      border-left-color: #ff832b;
      background: rgba(255, 131, 43, 0.05);
    }

    .log-entry.error {
      border-left-color: #da1e28;
      background: rgba(218, 30, 40, 0.05);
    }

    .entry-icon {
      flex-shrink: 0;
      width: 20px;
      height: 20px;
      margin-top: 0.125rem;
      color: var(--log-text-secondary, #6b6b6b);
    }

    .log-entry.info .entry-icon {
      color: var(--log-accent, #0f62fe);
    }

    .log-entry.success .entry-icon {
      color: #24a148;
    }

    .log-entry.warning .entry-icon {
      color: #ff832b;
    }

    .log-entry.error .entry-icon {
      color: #da1e28;
    }

    .entry-content {
      flex: 1;
      min-width: 0;
    }

    .entry-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      margin-bottom: 0.25rem;
    }

    .entry-main {
      flex: 1;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
    }

    .entry-action {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--log-text-primary, #161616);
      flex: 1;
    }

    .entry-time {
      font-size: 0.75rem;
      color: var(--log-text-secondary, #6b6b6b);
      flex-shrink: 0;
    }

    .entry-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-shrink: 0;
    }

    .confidence-display {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      min-width: 100px;
    }

    .confidence-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--log-text-primary, #161616);
      min-width: 40px;
    }

    .confidence-label.low {
      color: #ff832b;
    }

    .confidence-bar {
      flex: 1;
      height: 4px;
      background: var(--log-border, rgba(0, 0, 0, 0.1));
      border-radius: 2px;
      overflow: hidden;
      min-width: 60px;
    }

    .confidence-fill {
      height: 100%;
      background: var(--log-accent, #0f62fe);
      transition: width 0.3s ease;
    }

    .confidence-fill.low {
      background: #ff832b;
    }

    .correct-button {
      flex-shrink: 0;
    }

    .entry-details {
      font-size: 0.8125rem;
      color: var(--log-text-secondary, #6b6b6b);
      margin: 0.5rem 0 0 0;
      line-height: 1.5;
    }

    .review-badges {
      margin-top: 0.5rem;
      display: flex;
      gap: 0.5rem;
    }

    .low-confidence-badge {
      margin-top: 0.5rem;
    }

    /* Dark mode */
    @media (prefers-color-scheme: dark) {
      .activity-log {
        --log-surface: rgba(26, 26, 26, 0.95);
        --log-border: rgba(255, 255, 255, 0.1);
        --log-text-primary: #f4f4f4;
        --log-text-secondary: #a8a8a8;
        --log-entry-bg: rgba(255, 255, 255, 0.05);
        --log-scrollbar: rgba(255, 255, 255, 0.2);
        --log-scrollbar-hover: rgba(255, 255, 255, 0.3);
        --log-accent: #4589ff;
      }
    }
  `]
})
export class AgentActivityLogComponent {
  @Input() steps = signal<AgentStep[]>([]);
  @Input() teachMode = signal(false);
  @Input() activities = signal<any[]>([]); // Keep for backward compatibility
  @Output() correctStep = new EventEmitter<AgentStep>();

  formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  }

  onCorrect(step: AgentStep) {
    this.correctStep.emit(step);
  }
}
