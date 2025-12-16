import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { InputModule } from 'carbon-components-angular';

@Component({
  selector: 'app-text-input',
  standalone: false,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TextInputComponent),
      multi: true
    }
  ],
  template: `
    <div class="text-input-wrapper" [class.has-label]="label">
      <label *ngIf="label" class="text-input-label" [for]="inputId">
        {{ label }}
      </label>
      <input
        [id]="inputId"
        ibmText
        class="app-text-input"
        [placeholder]="placeholder"
        [ngModel]="value"
        [disabled]="disabled"
        [attr.aria-label]="ariaLabel || label || placeholder"
        [attr.aria-describedby]="ariaDescribedBy"
        (ngModelChange)="onModelChange($event)"
        (keydown)="onKeydown($event)"
        (blur)="onBlur()"
        (focus)="onFocus()">
    </div>
  `,
  styles: [`
    .text-input-wrapper {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      width: 100%;
    }

    .text-input-label {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--linear-text-secondary);
      line-height: 1.25rem;
    }

    .app-text-input {
      height: 48px;
      padding: 0 1rem;
      font-size: 0.875rem;
      line-height: 1.5;
      border-radius: var(--radius-md);
      background: #262626;
      border: 1px solid #404040;
      color: var(--linear-text-primary);
      transition: all 0.2s ease;
      box-sizing: border-box;
      width: 100%;
    }

    .app-text-input::placeholder {
      color: #737373;
    }

    .app-text-input:hover:not(:disabled) {
      border-color: #525252;
    }

    .app-text-input:focus {
      outline: none;
      border-color: var(--linear-accent);
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      background: #262626;
    }

    .app-text-input:disabled {
      background: var(--field-disabled) !important;
      border-color: var(--border-disabled) !important;
      color: var(--text-placeholder);
      cursor: not-allowed;
    }
  `]
})
export class TextInputComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() placeholder = '';
  @Input() disabled = false;
  @Input() ariaLabel = '';
  @Input() ariaDescribedBy = '';
  @Output() enter = new EventEmitter<void>();
  @Output() escape = new EventEmitter<void>();

  value = '';
  inputId = `text-input-${Math.random().toString(36).substr(2, 9)}`;

  private onChange = (value: string) => {};
  private onTouched = () => {};

  onModelChange(value: string) {
    this.value = value;
    this.onChange(this.value);
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.enter.emit();
    } else if (event.key === 'Escape') {
      this.escape.emit();
    }
  }

  onBlur() {
    this.onTouched();
  }

  onFocus() {
    // Focus handling if needed
  }

  // ControlValueAccessor implementation
  writeValue(value: string): void {
    this.value = value || '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}

