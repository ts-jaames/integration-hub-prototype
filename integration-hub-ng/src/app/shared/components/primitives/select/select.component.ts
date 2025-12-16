import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { SelectModule } from 'carbon-components-angular';

export interface SelectOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-select',
  standalone: false,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectComponent),
      multi: true
    }
  ],
  template: `
    <div class="select-wrapper" [class.has-label]="label">
      <label *ngIf="label" class="select-label" [for]="selectId">
        {{ label }}
      </label>
      <select
        [id]="selectId"
        ibmSelect
        class="app-select"
        [ngModel]="value"
        [disabled]="disabled"
        [attr.aria-label]="ariaLabel || label"
        [attr.aria-describedby]="ariaDescribedBy"
        (ngModelChange)="onModelChange($event)"
        (blur)="onBlur()"
        (focus)="onFocus()">
        <option *ngFor="let option of options" [value]="option.value">
          {{ option.label }}
        </option>
      </select>
    </div>
  `,
  styles: [`
    .select-wrapper {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      width: 100%;
    }

    .select-label {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--linear-text-secondary);
      line-height: 1.25rem;
    }

    .app-select {
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
      cursor: pointer;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Cpath fill='%23f5f5f5' d='M8 11L3 6h10z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 0.75rem center;
      padding-right: 2.5rem;
    }

    .app-select:hover:not(:disabled) {
      border-color: #525252;
    }

    .app-select:focus {
      outline: none;
      border-color: var(--linear-accent);
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      background-color: #262626;
    }

    .app-select:disabled {
      background: var(--field-disabled) !important;
      border-color: var(--border-disabled) !important;
      color: var(--text-placeholder);
      cursor: not-allowed;
      opacity: 0.6;
    }

    .app-select option {
      background: #262626;
      color: var(--linear-text-primary);
    }
  `]
})
export class SelectComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() options: SelectOption[] = [];
  @Input() disabled = false;
  @Input() ariaLabel = '';
  @Input() ariaDescribedBy = '';

  value = '';
  selectId = `select-${Math.random().toString(36).substr(2, 9)}`;

  private onChangeFn = (value: string) => {};
  private onTouchedFn = () => {};

  onModelChange(value: string) {
    this.value = value;
    this.onChangeFn(this.value);
  }

  onBlur() {
    this.onTouchedFn();
  }

  onFocus() {
    // Focus handling if needed
  }

  // ControlValueAccessor implementation
  writeValue(value: string): void {
    this.value = value || '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChangeFn = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouchedFn = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}

