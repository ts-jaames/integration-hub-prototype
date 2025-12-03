import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  TableModule,
  TableModel,
  TableItem,
  TableHeaderItem,
  ButtonModule,
  TagModule,
  ModalModule,
  InputModule,
  InlineLoadingModule
} from 'carbon-components-angular';
import { InMemoryAdminApiService } from '../../services/in-memory-admin-api.service';
import { RegistrationRequest } from '../../models';
import { StatusTagComponent } from '../../shared/components/status-tag/status-tag.component';

@Component({
  selector: 'app-company-registration-review',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    TagModule,
    ModalModule,
    InputModule,
    InlineLoadingModule,
    StatusTagComponent
  ],
  template: `
    <div class="container">
      <div class="page-header">
        <h1>Company registration requests</h1>
      </div>

      <div class="table-container">
        <ibm-table 
          [model]="tableModel" 
          [skeleton]="loading()" 
          size="sm"
          (rowClick)="onRowClick($event)">
        </ibm-table>
      </div>
    </div>

    <!-- Review Panel -->
    <ibm-modal
      [open]="reviewPanelOpen()"
      [size]="'md'"
      (overlaySelected)="closeReviewPanel()">
      <ibm-modal-header (closeSelect)="closeReviewPanel()">
        <p class="bx--modal-header__heading">Review Registration Request</p>
      </ibm-modal-header>
      <div ibmModalContent>
        <div *ngIf="selectedRequest()">
          <div class="request-details">
            <h3>{{ selectedRequest()!.companyName }}</h3>
            <p><strong>Submitted by:</strong> {{ selectedRequest()!.submittedByEmail }}</p>
            <p><strong>Submitted at:</strong> {{ formatDate(selectedRequest()!.submittedAt) }}</p>
            <p *ngIf="selectedRequest()!.notes"><strong>Notes:</strong> {{ selectedRequest()!.notes }}</p>
          </div>

          <div class="rejection-reason" *ngIf="showRejectReason()">
            <ibm-label>
              Rejection reason (optional)
              <textarea
                ibmText
                [(ngModel)]="rejectionReason"
                rows="3"
                placeholder="Provide a reason for rejection...">
              </textarea>
            </ibm-label>
          </div>
        </div>
      </div>
      <ibm-modal-footer>
        <button ibmButton="secondary" (click)="closeReviewPanel()">Cancel</button>
        <button
          ibmButton="danger"
          *ngIf="!approving()"
          (click)="showRejectReason.set(true)">
          Reject
        </button>
        <button
          ibmButton="primary"
          [disabled]="approving() || rejecting()"
          (click)="approveRequest()">
          <ibm-inline-loading *ngIf="approving()" [state]="'active'"></ibm-inline-loading>
          <span *ngIf="!approving()">Approve</span>
        </button>
        <button
          ibmButton="danger"
          *ngIf="showRejectReason()"
          [disabled]="rejecting()"
          (click)="rejectRequest()">
          <ibm-inline-loading *ngIf="rejecting()" [state]="'active'"></ibm-inline-loading>
          <span *ngIf="!rejecting()">Confirm Reject</span>
        </button>
      </ibm-modal-footer>
    </ibm-modal>
  `,
  styles: [`
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }

    .page-header {
      margin-bottom: 2rem;
    }

    .page-header h1 {
      font-size: 2rem;
      font-weight: 600;
      color: var(--linear-text-primary);
      margin: 0;
    }

    .table-container {
      // No border - matching Recent Activity table aesthetic
    }

    .request-details {
      margin-bottom: 1.5rem;
    }

    .request-details h3 {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--linear-text-primary);
      margin: 0 0 1rem 0;
    }

    .request-details p {
      margin: 0.5rem 0;
      color: var(--linear-text-secondary);
    }

    .rejection-reason {
      margin-top: 1.5rem;
    }
  `]
})
export class CompanyRegistrationReviewPage implements OnInit {
  private api = inject(InMemoryAdminApiService);

  loading = signal(false);
  requests = signal<RegistrationRequest[]>([]);
  reviewPanelOpen = signal(false);
  selectedRequest = signal<RegistrationRequest | null>(null);
  approving = signal(false);
  rejecting = signal(false);
  showRejectReason = signal(false);
  rejectionReason = '';

  tableModel = new TableModel();

  ngOnInit() {
    this.loadRequests();
    this.setupTable();
  }

  loadRequests() {
    this.loading.set(true);
    this.api.listRegistrationRequests('new').subscribe({
      next: (requests) => {
        this.requests.set(requests);
        this.loading.set(false);
        this.updateTable();
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  setupTable() {
    this.tableModel.header = [
      new TableHeaderItem({ data: 'Submitted' }),
      new TableHeaderItem({ data: 'Company name' }),
      new TableHeaderItem({ data: 'Submitted by' }),
      new TableHeaderItem({ data: 'Status' }),
      new TableHeaderItem({ data: 'Actions' })
    ];
  }

  updateTable() {
    const requests = this.requests();
    this.tableModel.data = requests.map(req => [
      new TableItem({ data: this.formatDate(req.submittedAt) }),
      new TableItem({ data: req.companyName }),
      new TableItem({ data: req.submittedByEmail }),
      new TableItem({ data: req.status }),
      new TableItem({ data: 'Review' })
    ]);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  onRowClick(event: any) {
    const rowIndex = event.selectedRowIndex;
    const request = this.requests()[rowIndex];
    if (request) {
      this.openReviewPanel(request);
    }
  }

  openReviewPanel(request: RegistrationRequest) {
    this.selectedRequest.set(request);
    this.reviewPanelOpen.set(true);
    this.showRejectReason.set(false);
    this.rejectionReason = '';
  }

  closeReviewPanel() {
    this.reviewPanelOpen.set(false);
    this.selectedRequest.set(null);
    this.showRejectReason.set(false);
  }

  approveRequest() {
    const request = this.selectedRequest();
    if (!request) return;

    this.approving.set(true);
    this.api.approveRegistration(request.id).subscribe({
      next: () => {
        this.approving.set(false);
        this.closeReviewPanel();
        this.loadRequests();
        console.log({
          type: 'success',
          title: 'Success',
          message: `Registration approved. Company created and invitation sent to ${request.submittedByEmail}`
        });
      },
      error: () => {
        this.approving.set(false);
        console.log({
          type: 'error',
          title: 'Error',
          message: 'Failed to approve registration'
        });
      }
    });
  }

  rejectRequest() {
    const request = this.selectedRequest();
    if (!request) return;

    this.rejecting.set(true);
    this.api.rejectRegistration(request.id, this.rejectionReason || undefined).subscribe({
      next: () => {
        this.rejecting.set(false);
        this.closeReviewPanel();
        this.loadRequests();
        console.log({
          type: 'success',
          title: 'Success',
          message: 'Registration rejected'
        });
      },
      error: () => {
        this.rejecting.set(false);
        console.log({
          type: 'error',
          title: 'Error',
          message: 'Failed to reject registration'
        });
      }
    });
  }
}

