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
        class="app-select form-control"
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
      display: block;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--form-control-text);
      margin-bottom: var(--form-field-gap);
      line-height: 1.25rem;
    }

    .app-select {
      // Base styles come from .form-control class
      // Select-specific styles (dropdown arrow) are handled in global styles
    }

    .app-select option {
      background: var(--form-control-bg);
      color: var(--form-control-text);
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

