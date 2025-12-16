import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TagModule } from 'carbon-components-angular';

@Component({
  selector: 'app-filter-chip',
  standalone: false,
  template: `
    <span class="filter-chip">
      <span class="filter-chip-label">{{ label }}:</span>
      <span class="filter-chip-value">{{ value }}</span>
      <button
        class="filter-chip-remove"
        type="button"
        [attr.aria-label]="'Remove ' + label + ' filter'"
        (click)="onRemove()"
        (keydown.enter)="onRemove()"
        (keydown.space)="onRemove(); $event.preventDefault()">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 3L3 9M3 3L9 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
    </span>
  `,
  styles: [`
    .filter-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.375rem 0.75rem;
      background: var(--linear-surface);
      border: 1px solid var(--linear-border);
      border-radius: var(--radius-md);
      font-size: 0.875rem;
      line-height: 1.5;
      color: var(--linear-text-primary);
    }

    .filter-chip-label {
      color: var(--linear-text-secondary);
      font-weight: 500;
    }

    .filter-chip-value {
      color: var(--linear-text-primary);
    }

    .filter-chip-remove {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      padding: 0;
      margin-left: 0.25rem;
      background: transparent;
      border: none;
      color: var(--linear-text-secondary);
      cursor: pointer;
      transition: color 0.2s ease;
      flex-shrink: 0;
    }

    .filter-chip-remove:hover {
      color: var(--linear-text-primary);
    }

    .filter-chip-remove:focus {
      outline: 2px solid var(--linear-accent);
      outline-offset: 2px;
      border-radius: 2px;
    }

    .filter-chip-remove svg {
      width: 12px;
      height: 12px;
    }
  `]
})
export class FilterChipComponent {
  @Input() label = '';
  @Input() value = '';
  @Output() remove = new EventEmitter<void>();

  onRemove() {
    this.remove.emit();
  }
}

