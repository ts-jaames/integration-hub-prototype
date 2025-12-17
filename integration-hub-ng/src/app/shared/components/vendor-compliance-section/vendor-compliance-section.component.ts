import { Component, Input, Output, EventEmitter, signal, inject, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TableModule, TableModel, TableItem, TableHeaderItem, ButtonModule, ModalModule, InputModule, SelectModule, TagModule } from 'carbon-components-angular';
import { VendorCompany, VendorDocument } from '../../models/vendor-company.model';
import { VendorCompanyService } from '../../services/vendor-company.service';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { LoggerService } from '../../../core/services/logger.service';

@Component({
  selector: 'app-vendor-compliance-section',
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
    <div class="compliance-section">
      <div class="section-header">
        <h3>Compliance & Documentation</h3>
        <button 
          ibmButton="primary" 
          size="sm"
          [disabled]="!canUploadDocuments()"
          (click)="openUploadModal()">
          Upload Document
        </button>
      </div>

      <div class="section-message" *ngIf="!canUploadDocuments()">
        <p>⚠️ Cannot upload documents for an archived vendor.</p>
      </div>

      <div class="documents-table" *ngIf="vendor.documents && vendor.documents.length > 0">
        <ibm-table [model]="tableModel" size="sm" (rowClick)="onTableRowClick($event)"></ibm-table>
      </div>

      <div class="empty-state" *ngIf="!vendor.documents || vendor.documents.length === 0">
        <p>No compliance documents uploaded yet.</p>
        <button 
          ibmButton="secondary" 
          size="sm"
          [disabled]="!canUploadDocuments()"
          (click)="openUploadModal()">
          Upload First Document
        </button>
      </div>
    </div>

    <!-- Upload Document Modal -->
    <ibm-modal
      [open]="uploadModalOpen()"
      [size]="'md'"
      (overlaySelected)="closeUploadModal()">
      <ibm-modal-header (closeSelect)="closeUploadModal()">
        <p class="bx--modal-header__heading">Upload Compliance Document</p>
      </ibm-modal-header>
      <div ibmModalContent>
        <form [formGroup]="uploadForm">
          <ibm-label>
            Document Type
            <select ibmSelect formControlName="type" required>
              <option value="">Select type</option>
              <option value="Agreement">Agreement / Contract</option>
              <option value="Security Certificate">Security Certificate</option>
              <option value="Insurance Certificate">Insurance Certificate</option>
              <option value="Other">Other</option>
            </select>
          </ibm-label>

          <ibm-label>
            File Name
            <input ibmText formControlName="fileName" placeholder="document.pdf" required>
            <div class="helper-text">Note: This is a mock upload. In production, actual file upload would occur here.</div>
          </ibm-label>

          <ibm-label>
            Expiration Date (optional)
            <input ibmText type="date" formControlName="expirationDate">
          </ibm-label>

          <ibm-label>
            Notes (optional)
            <textarea ibmText formControlName="notes" rows="3" placeholder="Additional notes about this document"></textarea>
          </ibm-label>
        </form>
      </div>
      <ibm-modal-footer>
        <button ibmButton="secondary" (click)="closeUploadModal()">Cancel</button>
        <button 
          ibmButton="primary" 
          [disabled]="uploadForm.invalid || uploading()"
          (click)="onUploadDocument()">
          Upload
        </button>
      </ibm-modal-footer>
    </ibm-modal>

    <!-- Delete Confirmation -->
    <app-confirm-dialog
      [open]="deleteConfirmOpen()"
      title="Remove Document"
      [message]="'Are you sure you want to remove this document?'"
      confirmLabel="Remove"
      [danger]="true"
      (confirmed)="confirmDelete()"
      (cancelled)="cancelDelete()">
    </app-confirm-dialog>
  `,
  styles: [`
    .compliance-section {
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

    .documents-table {
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

    .helper-text {
      font-size: 0.75rem;
      color: var(--linear-text-secondary);
      margin-top: 0.25rem;
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
export class VendorComplianceSectionComponent implements OnInit, OnChanges {
  @Input() vendor!: VendorCompany;
  @Output() vendorUpdated = new EventEmitter<VendorCompany>();

  private vendorService = inject(VendorCompanyService);
  private fb = inject(FormBuilder);
  private logger = inject(LoggerService);

  uploadModalOpen = signal(false);
  deleteConfirmOpen = signal(false);
  uploading = signal(false);
  documentToDelete = signal<string | null>(null);

  uploadForm!: FormGroup;
  tableModel = new TableModel();

  ngOnInit() {
    this.buildUploadForm();
    this.buildTable();
  }

  ngOnChanges() {
    if (this.vendor) {
      this.buildTable();
    }
  }

  canUploadDocuments(): boolean {
    return this.vendor.status !== 'Archived';
  }

  buildUploadForm() {
    this.uploadForm = this.fb.group({
      type: ['', Validators.required],
      fileName: ['', Validators.required],
      expirationDate: [''],
      notes: ['']
    });
  }

  buildTable() {
    if (!this.vendor.documents || this.vendor.documents.length === 0) {
      this.tableModel.data = [];
      return;
    }

    this.tableModel.header = [
      new TableHeaderItem({ data: 'Type' }),
      new TableHeaderItem({ data: 'File Name' }),
      new TableHeaderItem({ data: 'Expiration Date' }),
      new TableHeaderItem({ data: 'Uploaded By' }),
      new TableHeaderItem({ data: 'Uploaded Date' }),
      new TableHeaderItem({ data: 'Actions' })
    ];

    this.tableModel.data = this.vendor.documents.map(doc => {
      const expirationDate = doc.expirationDate 
        ? new Date(doc.expirationDate).toLocaleDateString()
        : 'N/A';
      
      const isExpired = doc.expirationDate && new Date(doc.expirationDate) < new Date();
      const isExpiringSoon = doc.expirationDate && 
        new Date(doc.expirationDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) &&
        new Date(doc.expirationDate) > new Date();

      const statusText = isExpired ? ' (Expired)' : isExpiringSoon ? ' (Expiring Soon)' : '';

      return [
        new TableItem({ 
          data: doc.type + statusText,
          rawData: { docId: doc.id, type: doc.type, isExpired, isExpiringSoon }
        }),
        new TableItem({ data: doc.fileName, rawData: { docId: doc.id } }),
        new TableItem({ data: expirationDate, rawData: { docId: doc.id } }),
        new TableItem({ data: doc.uploadedBy || 'N/A', rawData: { docId: doc.id } }),
        new TableItem({ data: new Date(doc.uploadedAt).toLocaleDateString(), rawData: { docId: doc.id } }),
        new TableItem({ 
          data: 'Remove',
          rawData: { docId: doc.id, isAction: true }
        })
      ];
    });
  }

  openUploadModal() {
    this.uploadModalOpen.set(true);
  }

  closeUploadModal() {
    this.uploadModalOpen.set(false);
    this.uploadForm.reset();
  }

  onUploadDocument() {
    if (this.uploadForm.invalid) return;

    const formValue = this.uploadForm.value;
    this.uploading.set(true);

    this.vendorService.uploadDocument(this.vendor.id, {
      type: formValue.type,
      fileName: formValue.fileName,
      expirationDate: formValue.expirationDate || undefined,
      notes: formValue.notes || undefined
    }).subscribe({
      next: () => {
        this.uploading.set(false);
        this.closeUploadModal();
        this.reloadVendor();
      },
      error: (err) => {
        this.logger.error('Error uploading document', err);
        this.uploading.set(false);
        alert('Failed to upload document. Please try again.');
      }
    });
  }

  onRemoveDocument(docId: string) {
    this.documentToDelete.set(docId);
    this.deleteConfirmOpen.set(true);
  }

  confirmDelete() {
    const docId = this.documentToDelete();
    if (!docId) return;

    this.vendorService.removeDocument(this.vendor.id, docId).subscribe({
      next: () => {
        this.deleteConfirmOpen.set(false);
        this.documentToDelete.set(null);
        this.reloadVendor();
      },
      error: (err) => {
        this.logger.error('Error removing document', err);
        alert('Failed to remove document. Please try again.');
      }
    });
  }

  cancelDelete() {
    this.deleteConfirmOpen.set(false);
    this.documentToDelete.set(null);
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
    const clickedColumn = event?.columnIndex ?? event?.colIndex;
    const actionCell = rowData[rowData.length - 1] as any;
    
    if (actionCell?.rawData?.isAction && actionCell?.rawData?.docId) {
      this.onRemoveDocument(actionCell.rawData.docId);
    }
  }
}