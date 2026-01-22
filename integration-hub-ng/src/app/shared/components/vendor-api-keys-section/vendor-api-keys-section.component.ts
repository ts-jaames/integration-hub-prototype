import { Component, Input, Output, EventEmitter, signal, inject, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TableModule, TableModel, TableItem, TableHeaderItem, ButtonModule, ModalModule, InputModule, SelectModule, TagModule } from 'carbon-components-angular';
import { VendorCompany, VendorApiKey } from '../../models/vendor-company.model';
import { VendorCompanyService } from '../../services/vendor-company.service';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { LoggerService } from '../../../core/services/logger.service';

@Component({
  selector: 'app-vendor-api-keys-section',
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
    <div class="api-keys-section">
      <div class="section-header">
        <h3>API Keys</h3>
        <button 
          ibmButton="primary" 
          size="sm"
          [disabled]="!canManageKeys()"
          (click)="openGenerateModal()">
          Generate Key
        </button>
      </div>

      <div class="section-message" *ngIf="!canManageKeys()">
        <p>⚠️ Cannot generate API keys until vendor is approved.</p>
      </div>

      <div class="keys-table" *ngIf="vendor.apiKeys && vendor.apiKeys.length > 0">
        <ibm-table [model]="tableModel" size="sm" (rowClick)="onTableRowClick($event)"></ibm-table>
      </div>

      <div class="empty-state" *ngIf="!vendor.apiKeys || vendor.apiKeys.length === 0">
        <p>No API keys generated yet.</p>
        <button 
          ibmButton="secondary" 
          size="sm"
          [disabled]="!canManageKeys()"
          (click)="openGenerateModal()">
          Generate First Key
        </button>
      </div>
    </div>

    <!-- Generate Key Modal -->
    <ibm-modal
      [open]="generateModalOpen()"
      [size]="'md'"
      (overlaySelected)="closeGenerateModal()">
      <ibm-modal-header (closeSelect)="closeGenerateModal()">
        <p class="bx--modal-header__heading">Generate API Key</p>
      </ibm-modal-header>
      <div ibmModalContent>
        <form [formGroup]="generateForm">
          <ibm-label>
            Environment
            <select ibmSelect formControlName="environment" required>
              <option value="">Select environment</option>
              <option value="Sandbox">Sandbox</option>
              <option value="Production">Production</option>
            </select>
          </ibm-label>

          <ibm-label>
            Description (optional)
            <input ibmText formControlName="description" placeholder="e.g., Production key for main integration">
          </ibm-label>
        </form>
      </div>
      <ibm-modal-footer>
        <button ibmButton="secondary" (click)="closeGenerateModal()">Cancel</button>
        <button 
          ibmButton="primary" 
          [disabled]="generateForm.invalid || generating()"
          (click)="onGenerateKey()">
          Generate
        </button>
      </ibm-modal-footer>
    </ibm-modal>

    <!-- Key Display Modal -->
    <ibm-modal
      [open]="keyDisplayModalOpen()"
      [size]="'md'"
      (overlaySelected)="closeKeyDisplayModal()">
      <ibm-modal-header (closeSelect)="closeKeyDisplayModal()">
        <p class="bx--modal-header__heading">API Key Generated</p>
      </ibm-modal-header>
      <div ibmModalContent>
        <div class="key-display">
          <p class="warning-text">⚠️ This is the only time you'll see this key. Make sure to copy it now.</p>
          <div class="key-value">
            <code>{{ displayedKey() }}</code>
            <button ibmButton="ghost" size="sm" (click)="copyKey()">Copy</button>
          </div>
        </div>
      </div>
      <ibm-modal-footer>
        <button ibmButton="primary" (click)="closeKeyDisplayModal()">Done</button>
      </ibm-modal-footer>
    </ibm-modal>

    <!-- Revoke Confirmation -->
    <app-confirm-dialog
      [open]="revokeConfirmOpen()"
      title="Revoke API Key"
      [message]="'Are you sure you want to revoke this API key? This action cannot be undone.'"
      confirmLabel="Revoke"
      [danger]="true"
      (confirmed)="confirmRevoke()"
      (cancelled)="cancelRevoke()">
    </app-confirm-dialog>
  `,
  styles: [`
    .api-keys-section {
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

    .keys-table {
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

    .key-display {
      margin: 1rem 0;
    }

    .warning-text {
      color: #f59e0b;
      margin-bottom: 1rem;
      font-size: 0.875rem;
    }

    .key-value {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem;
      background: var(--linear-surface);
      border: 1px solid var(--linear-border);
      border-radius: 8px;
    }

    .key-value code {
      flex: 1;
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 0.875rem;
      word-break: break-all;
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
export class VendorApiKeysSectionComponent implements OnInit, OnChanges {
  @Input() vendor!: VendorCompany;
  @Output() vendorUpdated = new EventEmitter<VendorCompany>();

  private vendorService = inject(VendorCompanyService);
  private fb = inject(FormBuilder);
  private logger = inject(LoggerService);

  generateModalOpen = signal(false);
  keyDisplayModalOpen = signal(false);
  revokeConfirmOpen = signal(false);
  generating = signal(false);
  displayedKey = signal('');
  keyToRevoke = signal<string | null>(null);

  generateForm!: FormGroup;
  tableModel = new TableModel();

  ngOnInit() {
    this.buildGenerateForm();
    this.buildTable();
  }

  ngOnChanges() {
    if (this.vendor) {
      this.buildTable();
    }
  }

  canManageKeys(): boolean {
    return this.vendor.status === 'Active';
  }

  buildGenerateForm() {
    this.generateForm = this.fb.group({
      environment: ['', Validators.required],
      description: ['']
    });
  }

  buildTable() {
    if (!this.vendor.apiKeys || this.vendor.apiKeys.length === 0) {
      this.tableModel.data = [];
      return;
    }

    this.tableModel.header = [
      new TableHeaderItem({ data: 'Key' }),
      new TableHeaderItem({ data: 'Environment' }),
      new TableHeaderItem({ data: 'Status' }),
      new TableHeaderItem({ data: 'Created' }),
      new TableHeaderItem({ data: 'Actions' })
    ];

    this.tableModel.data = this.vendor.apiKeys.map(key => [
      new TableItem({ data: key.maskedKey, rawData: { keyId: key.id } }),
      new TableItem({ data: key.environment, rawData: { keyId: key.id } }),
      new TableItem({ data: key.status, rawData: { keyId: key.id } }),
      new TableItem({ data: new Date(key.createdAt).toLocaleDateString(), rawData: { keyId: key.id } }),
      new TableItem({ 
        data: 'Revoke',
        rawData: { keyId: key.id, isAction: true }
      })
    ]);
  }

  openGenerateModal() {
    this.generateModalOpen.set(true);
  }

  closeGenerateModal() {
    this.generateModalOpen.set(false);
    this.generateForm.reset();
  }

  onGenerateKey() {
    if (this.generateForm.invalid) return;

    const formValue = this.generateForm.value;
    this.generating.set(true);

    this.vendorService.generateApiKey(
      this.vendor.id,
      formValue.environment,
      formValue.description || undefined
    ).subscribe({
      next: (result) => {
        this.generating.set(false);
        this.closeGenerateModal();
        this.displayedKey.set(result.fullKey);
        this.keyDisplayModalOpen.set(true);
        this.reloadVendor();
      },
      error: (err) => {
        this.logger.error('Error generating key', err);
        this.generating.set(false);
        alert(err.message || 'Failed to generate API key. Please try again.');
      }
    });
  }

  closeKeyDisplayModal() {
    this.keyDisplayModalOpen.set(false);
    this.displayedKey.set('');
  }

  copyKey() {
    navigator.clipboard.writeText(this.displayedKey()).then(() => {
      alert('Key copied to clipboard!');
    });
  }

  onRevokeKey(keyId: string) {
    this.keyToRevoke.set(keyId);
    this.revokeConfirmOpen.set(true);
  }

  confirmRevoke() {
    const keyId = this.keyToRevoke();
    if (!keyId) return;

    this.vendorService.revokeApiKey(this.vendor.id, keyId).subscribe({
      next: () => {
        this.revokeConfirmOpen.set(false);
        this.keyToRevoke.set(null);
        this.reloadVendor();
      },
      error: (err) => {
        this.logger.error('Error revoking key', err);
        alert('Failed to revoke key. Please try again.');
      }
    });
  }

  cancelRevoke() {
    this.revokeConfirmOpen.set(false);
    this.keyToRevoke.set(null);
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
    
    if (actionCell?.rawData?.isAction && actionCell?.rawData?.keyId) {
      this.onRevokeKey(actionCell.rawData.keyId);
    }
  }
}