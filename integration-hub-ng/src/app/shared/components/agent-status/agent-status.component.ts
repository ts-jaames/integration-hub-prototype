import { Component, Input, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TagModule } from 'carbon-components-angular';

export interface AgentStep {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  duration?: number;
  result?: string;
}

@Component({
  selector: 'app-agent-status',
  standalone: true,
  imports: [CommonModule, TagModule],
  template: `
    <div class="agent-status">
      <div class="status-header">
        <div class="agent-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="currentColor"/>
          </svg>
        </div>
        <div class="status-text">
          <h3 class="status-title">AI Agent is working...</h3>
          <p class="status-subtitle" *ngIf="currentStep()">{{ currentStep()?.label }}</p>
        </div>
      </div>

      <div class="steps-container">
        <div 
          *ngFor="let step of steps(); let i = index" 
          class="step-bubble"
          [class.pending]="step.status === 'pending'"
          [class.running]="step.status === 'running'"
          [class.completed]="step.status === 'completed'"
          [class.failed]="step.status === 'failed'">
          
          <div class="bubble-content">
            <div class="bubble-icon">
              <div class="icon-circle" *ngIf="step.status === 'pending'">
                <span class="step-number">{{ i + 1 }}</span>
              </div>
              <div class="icon-circle running" *ngIf="step.status === 'running'">
                <div class="spinner"></div>
              </div>
              <div class="icon-circle completed" *ngIf="step.status === 'completed'">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13.5 4L6 11.5L2.5 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <div class="icon-circle failed" *ngIf="step.status === 'failed'">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
            </div>
            <div class="bubble-label">
              <span class="step-label">{{ step.label }}</span>
              <span class="step-duration" *ngIf="step.duration && step.status === 'completed'">
                {{ formatDuration(step.duration) }}
              </span>
            </div>
          </div>
          
          <div class="step-result" *ngIf="step.result && step.status === 'completed'">
            <p class="result-text">{{ step.result }}</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .agent-status {
      background: var(--agent-surface, rgba(255, 255, 255, 0.95));
      border: 1px solid var(--agent-border, rgba(0, 0, 0, 0.08));
      border-radius: 12px;
      padding: 2rem;
      margin: 1.5rem 0;
    }

    .status-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 2rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid var(--agent-border, rgba(0, 0, 0, 0.08));
    }

    .agent-icon {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: linear-gradient(135deg, #0f62fe 0%, #0043ce 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      flex-shrink: 0;
      box-shadow: 0 4px 12px rgba(15, 98, 254, 0.3);
      animation: pulse 2s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% {
        box-shadow: 0 4px 12px rgba(15, 98, 254, 0.3);
      }
      50% {
        box-shadow: 0 4px 20px rgba(15, 98, 254, 0.5);
      }
    }

    .status-text {
      flex: 1;
    }

    .status-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--agent-text-primary, #161616);
      margin: 0 0 0.25rem 0;
    }

    .status-subtitle {
      font-size: 0.875rem;
      color: var(--agent-text-secondary, #6b6b6b);
      margin: 0;
    }

    .steps-container {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .step-bubble {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding: 1rem;
      background: var(--agent-step-bg, rgba(0, 0, 0, 0.02));
      border: 1px solid var(--agent-border, rgba(0, 0, 0, 0.08));
      border-radius: 8px;
      transition: all 0.3s ease;
    }

    .step-bubble.pending {
      opacity: 0.5;
    }

    .step-bubble.running {
      background: var(--agent-step-running, rgba(15, 98, 254, 0.08));
      border-color: var(--agent-accent, #0f62fe);
      box-shadow: 0 0 0 3px rgba(15, 98, 254, 0.1);
      animation: stepPulse 2s ease-in-out infinite;
    }

    @keyframes stepPulse {
      0%, 100% {
        box-shadow: 0 0 0 3px rgba(15, 98, 254, 0.1);
      }
      50% {
        box-shadow: 0 0 0 6px rgba(15, 98, 254, 0.15);
      }
    }

    .step-bubble.completed {
      background: var(--agent-step-completed, rgba(36, 161, 72, 0.08));
      border-color: #24a148;
    }

    .step-bubble.failed {
      background: var(--agent-step-failed, rgba(218, 30, 40, 0.08));
      border-color: #da1e28;
    }

    .bubble-content {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .bubble-icon {
      flex-shrink: 0;
    }

    .icon-circle {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--agent-icon-bg, rgba(0, 0, 0, 0.05));
      border: 2px solid var(--agent-border, rgba(0, 0, 0, 0.1));
      color: var(--agent-text-secondary, #6b6b6b);
    }

    .icon-circle.running {
      background: var(--agent-accent, #0f62fe);
      border-color: var(--agent-accent, #0f62fe);
      color: white;
    }

    .icon-circle.completed {
      background: #24a148;
      border-color: #24a148;
      color: white;
    }

    .icon-circle.failed {
      background: #da1e28;
      border-color: #da1e28;
      color: white;
    }

    .step-number {
      font-size: 0.875rem;
      font-weight: 600;
    }

    .spinner {
      width: 20px;
      height: 20px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .bubble-label {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .step-label {
      font-size: 0.9375rem;
      font-weight: 500;
      color: var(--agent-text-primary, #161616);
    }

    .step-duration {
      font-size: 0.75rem;
      color: var(--agent-text-secondary, #6b6b6b);
    }

    .step-result {
      margin-top: 0.5rem;
      padding-top: 0.75rem;
      border-top: 1px solid var(--agent-border, rgba(0, 0, 0, 0.08));
    }

    .result-text {
      font-size: 0.875rem;
      color: var(--agent-text-secondary, #6b6b6b);
      margin: 0;
      line-height: 1.5;
    }

    /* Dark mode */
    @media (prefers-color-scheme: dark) {
      .agent-status {
        --agent-surface: rgba(26, 26, 26, 0.95);
        --agent-border: rgba(255, 255, 255, 0.1);
        --agent-text-primary: #f4f4f4;
        --agent-text-secondary: #a8a8a8;
        --agent-step-bg: rgba(255, 255, 255, 0.05);
        --agent-step-running: rgba(15, 98, 254, 0.15);
        --agent-step-completed: rgba(36, 161, 72, 0.15);
        --agent-step-failed: rgba(218, 30, 40, 0.15);
        --agent-icon-bg: rgba(255, 255, 255, 0.1);
        --agent-accent: #4589ff;
      }
    }
  `]
})
export class AgentStatusComponent {
  @Input() steps = signal<AgentStep[]>([]);

  currentStep = computed(() => {
    return this.steps().find(step => step.status === 'running') || 
           this.steps().find(step => step.status === 'pending');
  });

  formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }
}

