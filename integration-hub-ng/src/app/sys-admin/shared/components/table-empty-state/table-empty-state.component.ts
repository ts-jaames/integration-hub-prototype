import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'carbon-components-angular';

@Component({
  selector: 'app-table-empty-state',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  template: `
    <div class="empty-state">
      <div class="empty-state-icon" *ngIf="icon">
        <ng-content select="[icon]"></ng-content>
      </div>
      <h3 class="empty-state-title">{{ title }}</h3>
      <p class="empty-state-description" *ngIf="description">{{ description }}</p>
      <div class="empty-state-action" *ngIf="actionLabel">
        <button 
          [ibmButton]="actionKind || 'primary'"
          (click)="onAction()">
          {{ actionLabel }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .empty-state {
      padding: 4rem 2rem;
      text-align: center;
      color: var(--linear-text-secondary);
    }

    .empty-state-icon {
      margin-bottom: 1.5rem;
      color: var(--linear-text-secondary);
      opacity: 0.5;
    }

    .empty-state-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--linear-text-primary);
      margin: 0 0 0.5rem 0;
    }

    .empty-state-description {
      font-size: 0.875rem;
      color: var(--linear-text-secondary);
      margin: 0 0 1.5rem 0;
      max-width: 400px;
      margin-left: auto;
      margin-right: auto;
    }

    .empty-state-action {
      margin-top: 1.5rem;
    }
  `]
})
export class TableEmptyStateComponent {
  @Input() title = 'No items found';
  @Input() description?: string;
  @Input() actionLabel?: string;
  @Input() actionKind?: 'primary' | 'secondary' | 'danger' = 'primary';
  @Input() icon?: boolean;
  @Output() action = new EventEmitter<void>();

  onAction() {
    this.action.emit();
  }
}

