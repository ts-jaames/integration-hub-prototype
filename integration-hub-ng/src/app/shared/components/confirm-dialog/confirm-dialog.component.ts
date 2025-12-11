import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalModule, ButtonModule, InputModule } from 'carbon-components-angular';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalModule, ButtonModule, InputModule],
  template: `
    <ibm-modal
      [open]="open"
      [size]="size || 'sm'"
      [hasScrollingContent]="false"
      (overlaySelected)="onCancel()">
      <ibm-modal-header (closeSelect)="onCancel()">
        <p class="bx--modal-header__heading">{{ title }}</p>
      </ibm-modal-header>
      <div ibmModalContent>
        <p>{{ message }}</p>
        <div *ngIf="requireTextConfirmation" class="confirmation-input">
          <ibm-label>
            Type "{{ confirmationText }}" to confirm:
            <input
              ibmText
              [(ngModel)]="enteredText"
              [placeholder]="confirmationText"
              (keyup.enter)="onConfirm()"
              autofocus>
          </ibm-label>
        </div>
      </div>
      <ibm-modal-footer>
        <button ibmButton="secondary" (click)="onCancel()">Cancel</button>
        <button 
          [ibmButton]="danger ? 'danger' : 'primary'"
          [disabled]="requireTextConfirmation && enteredText !== confirmationText"
          (click)="onConfirm()">
          {{ confirmLabel || 'Confirm' }}
        </button>
      </ibm-modal-footer>
    </ibm-modal>
  `,
  styles: [`
    .confirmation-input {
      margin-top: 1.5rem;
    }
  `]
})
export class ConfirmDialogComponent {
  @Input() open = false;
  @Input() title = 'Confirm action';
  @Input() message = 'Are you sure you want to proceed?';
  @Input() confirmLabel = 'Confirm';
  @Input() danger = false;
  @Input() size?: 'xs' | 'sm' | 'md' | 'lg';
  @Input() requireTextConfirmation = false;
  @Input() confirmationText = '';

  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  enteredText = '';

  onConfirm() {
    if (this.requireTextConfirmation && this.enteredText !== this.confirmationText) {
      return;
    }
    this.confirmed.emit();
    this.open = false;
    this.enteredText = '';
  }

  onCancel() {
    this.cancelled.emit();
    this.open = false;
    this.enteredText = '';
  }
}