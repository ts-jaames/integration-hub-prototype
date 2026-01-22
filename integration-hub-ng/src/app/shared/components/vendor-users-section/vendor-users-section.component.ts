import { Component, Input, Output, EventEmitter, signal, inject, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TableModule, TableModel, TableItem, TableHeaderItem, ButtonModule, ModalModule, InputModule, SelectModule, TagModule } from 'carbon-components-angular';
import { VendorCompany, VendorUser } from '../../models/vendor-company.model';
import { VendorCompanyService } from '../../services/vendor-company.service';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { LoggerService } from '../../../core/services/logger.service';

@Component({
  selector: 'app-vendor-users-section',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    ModalModule,
    InputModule,
    SelectModule,
    TagModule,
    ConfirmDialogComponent
  ],
  template: `
    <div class="users-section">
      <div class="section-header">
        <h3>Vendor Users</h3>
        <button 
          ibmButton="primary" 
          size="sm"
          [disabled]="!canManageUsers()"
          (click)="openInviteModal()">
          Invite User
        </button>
      </div>

      <div class="section-message" *ngIf="!canManageUsers()">
        <p>⚠️ Cannot invite or modify users until vendor is approved.</p>
      </div>

      <div class="users-table" *ngIf="vendor.users && vendor.users.length > 0">
        <ibm-table [model]="tableModel" size="sm" (rowClick)="onTableRowClick($event)"></ibm-table>
      </div>

      <div class="empty-state" *ngIf="!vendor.users || vendor.users.length === 0">
        <p>No users yet. Invite a user to get started.</p>
        <button 
          ibmButton="secondary" 
          size="sm"
          [disabled]="!canManageUsers()"
          (click)="openInviteModal()">
          Invite First User
        </button>
      </div>
    </div>

    <!-- Invite User Modal -->
    <ibm-modal
      [open]="inviteModalOpen()"
      [size]="'md'"
      (overlaySelected)="closeInviteModal()">
      <ibm-modal-header (closeSelect)="closeInviteModal()">
        <p class="bx--modal-header__heading">Invite Vendor User</p>
      </ibm-modal-header>
      <div ibmModalContent>
        <form [formGroup]="inviteForm">
          <ibm-label>
            Name
            <input ibmText formControlName="name" placeholder="John Doe" required>
          </ibm-label>

          <ibm-label>
            Email
            <input ibmText type="email" formControlName="email" placeholder="john.doe@example.com" required>
          </ibm-label>

          <ibm-label>
            Role
            <select ibmSelect formControlName="role" required>
              <option value="">Select role</option>
              <option value="Administrator">Administrator</option>
              <option value="Developer">Developer</option>
              <option value="Viewer">Viewer</option>
              <option value="Support">Support</option>
            </select>
          </ibm-label>
        </form>
      </div>
      <ibm-modal-footer>
        <button ibmButton="secondary" (click)="closeInviteModal()">Cancel</button>
        <button 
          ibmButton="primary" 
          [disabled]="inviteForm.invalid || inviting()"
          (click)="onInviteUser()">
          Invite
        </button>
      </ibm-modal-footer>
    </ibm-modal>

    <!-- Delete Confirmation -->
    <app-confirm-dialog
      [open]="deleteConfirmOpen()"
      title="Remove User"
      [message]="'Are you sure you want to remove this user?'"
      confirmLabel="Remove"
      [danger]="true"
      (confirmed)="confirmDelete()"
      (cancelled)="cancelDelete()">
    </app-confirm-dialog>
  `,
  styles: [`
    .users-section {
      margin-bottom: 2rem;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    .section-header h3 {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--linear-text-primary);
      margin: 0;
    }

    .section-message {
      padding: 1rem;
      background: var(--linear-surface);
      border: 1px solid var(--linear-border);
      border-radius: 8px;
      margin-bottom: 1.5rem;
    }

    .section-message p {
      margin: 0;
      font-size: 0.875rem;
      color: var(--linear-text-secondary);
    }

    .users-table {
      margin-top: 1rem;
    }

    .empty-state {
      padding: 3rem;
      text-align: center;
      background: var(--linear-surface);
      border: 1px solid var(--linear-border);
      border-radius: 8px;
    }

    .empty-state p {
      margin: 0 0 1rem 0;
      color: var(--linear-text-secondary);
    }

    // Style action cells to look clickable
    ::ng-deep {
      .bx--data-table tbody td:last-child,
      .cds--data-table tbody td:last-child {
        color: var(--linear-accent);
        cursor: pointer;
        text-decoration: underline;
        
        &:hover {
          color: var(--linear-text-primary);
        }
      }
    }
  `]
})
export class VendorUsersSectionComponent implements OnInit, OnChanges {
  @Input() vendor!: VendorCompany;
  @Output() vendorUpdated = new EventEmitter<VendorCompany>();

  private vendorService = inject(VendorCompanyService);
  private fb = inject(FormBuilder);
  private logger = inject(LoggerService);

  inviteModalOpen = signal(false);
  deleteConfirmOpen = signal(false);
  inviting = signal(false);
  userToDelete = signal<string | null>(null);

  inviteForm!: FormGroup;
  tableModel = new TableModel();

  ngOnInit() {
    this.buildInviteForm();
    this.buildTable();
  }

  ngOnChanges() {
    if (this.vendor) {
      this.buildTable();
    }
  }

  canManageUsers(): boolean {
    return this.vendor.status === 'Active';
  }

  buildInviteForm() {
    this.inviteForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      role: ['', Validators.required]
    });
  }

  buildTable() {
    if (!this.vendor.users || this.vendor.users.length === 0) {
      this.tableModel.data = [];
      return;
    }

    this.tableModel.header = [
      new TableHeaderItem({ data: 'Name' }),
      new TableHeaderItem({ data: 'Email' }),
      new TableHeaderItem({ data: 'Role' }),
      new TableHeaderItem({ data: 'Status' }),
      new TableHeaderItem({ data: 'Actions' })
    ];

    this.tableModel.data = this.vendor.users.map(user => [
      new TableItem({ data: user.name, rawData: { userId: user.id } }),
      new TableItem({ data: user.email, rawData: { userId: user.id } }),
      new TableItem({ data: user.role, rawData: { userId: user.id } }),
      new TableItem({ data: user.status, rawData: { userId: user.id } }),
      new TableItem({ 
        data: 'Remove',
        rawData: { userId: user.id, isAction: true }
      })
    ]);
  }

  openInviteModal() {
    this.inviteModalOpen.set(true);
  }

  closeInviteModal() {
    this.inviteModalOpen.set(false);
    this.inviteForm.reset();
  }

  onInviteUser() {
    if (this.inviteForm.invalid) return;

    const formValue = this.inviteForm.value;
    this.inviting.set(true);

    this.vendorService.addVendorUser(this.vendor.id, {
      name: formValue.name,
      email: formValue.email,
      role: formValue.role,
      status: 'Invited'
    }).subscribe({
      next: () => {
        this.inviting.set(false);
        this.closeInviteModal();
        this.reloadVendor();
      },
      error: (err) => {
        this.logger.error('Error inviting user', err);
        this.inviting.set(false);
        alert(err.message || 'Failed to invite user. Please try again.');
      }
    });
  }

  onRemoveUser(userId: string) {
    this.userToDelete.set(userId);
    this.deleteConfirmOpen.set(true);
  }

  confirmDelete() {
    const userId = this.userToDelete();
    if (!userId) return;

    this.vendorService.removeVendorUser(this.vendor.id, userId).subscribe({
      next: () => {
        this.deleteConfirmOpen.set(false);
        this.userToDelete.set(null);
        this.reloadVendor();
      },
      error: (err) => {
        this.logger.error('Error removing user', err);
        alert('Failed to remove user. Please try again.');
      }
    });
  }

  cancelDelete() {
    this.deleteConfirmOpen.set(false);
    this.userToDelete.set(null);
  }

  reloadVendor() {
    this.vendorService.getVendorById(this.vendor.id).subscribe({
      next: (vendor) => {
        if (vendor) {
          this.vendorUpdated.emit(vendor);
        }
      }
    });
  }

  onTableRowClick(event: any) {
    const rowIndex = event?.selectedRowIndex ?? event?.rowIndex ?? event?.index;
    if (rowIndex === undefined || rowIndex === null) return;

    const rowData = this.tableModel.data[rowIndex];
    if (!rowData || !Array.isArray(rowData)) return;

    // Check if the click was on the action column (last column)
    const actionCell = rowData[rowData.length - 1] as any;
    
    if (actionCell?.rawData?.isAction && actionCell?.rawData?.userId) {
      this.onRemoveUser(actionCell.rawData.userId);
    }
  }
}