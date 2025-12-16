import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'carbon-components-angular';

@Component({
  selector: 'app-icon-button',
  standalone: false,
  template: `
    <button
      [ibmButton]="buttonKind"
      [class]="buttonClass"
      [disabled]="disabled"
      [attr.aria-label]="ariaLabel || tooltip"
      [attr.title]="tooltip"
      (click)="onClick()"
      (keydown.enter)="onClick()"
      (keydown.space)="onClick(); $event.preventDefault()">
      <ng-content></ng-content>
    </button>
  `,
  styles: [`
    :host {
      display: inline-flex;
    }

    button {
      height: 48px;
      min-width: 48px;
      padding: 0 1rem;
      border-radius: var(--radius-md);
      font-size: 0.875rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      transition: all 0.2s ease;
      cursor: pointer;
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    button:focus {
      outline: 2px solid var(--linear-accent);
      outline-offset: 2px;
    }
  `]
})
export class IconButtonComponent {
  @Input() buttonKind: 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'danger' = 'secondary';
  @Input() disabled = false;
  @Input() ariaLabel = '';
  @Input() tooltip = '';
  @Output() clicked = new EventEmitter<void>();

  get buttonClass(): string {
    return 'app-icon-button';
  }

  onClick() {
    if (!this.disabled) {
      this.clicked.emit();
    }
  }
}

