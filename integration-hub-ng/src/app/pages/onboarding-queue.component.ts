import { Component, OnInit, signal, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  TableModule,
  TableModel,
  TableItem,
  TableHeaderItem,
  ButtonModule,
  TagModule,
  InputModule,
  ModalModule
} from 'carbon-components-angular';
import { VendorCompany } from '../shared/models/vendor-company.model';
import { DataTableComponent } from '../shared/components/data-table/data-table.component';

@Component({
  selector: 'app-onboarding-queue',
  standalone: false,
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1>Onboarding Queue</h1>
          <p class="page-subtitle">Review and approve or reject new vendor registrations.</p>
        </div>
      </div>

      <div class="toolbar">
        <div class="filter-pills">
          <button 
            class="pill-button"
            [class.active]="selectedFilter() === 'all'"
            (click)="setFilter('all')">
            All
          </button>
          <button 
            class="pill-button"
            [class.active]="selectedFilter() === 'new'"
            (click)="setFilter('new')">
            New
          </button>
          <button 
            class="pill-button"
            [class.active]="selectedFilter() === 'approved'"
            (click)="setFilter('approved')">
            Approved
          </button>
          <button 
            class="pill-button"
            [class.active]="selectedFilter() === 'rejected'"
            (click)="setFilter('rejected')">
            Rejected
          </button>
        </div>
      </div>

      <div class="table-container">
        <app-data-table
          [model]="tableModel"
          [loading]="loading()"
          size="sm"
          (rowClick)="onRowClick($event)">
        </app-data-table>
      </div>
    </div>

    <!-- Application Details Modal -->
    <ibm-modal
      [open]="detailsModalOpen()"
      [size]="'md'"
      (overlaySelected)="closeDetailsModal()">
      <ibm-modal-header (closeSelect)="closeDetailsModal()">
        <p class="bx--modal-header__heading">Application Details</p>
      </ibm-modal-header>
      <div ibmModalContent>
        <div *ngIf="selectedCompany()">
          <div class="detail-section">
            <h3>{{ selectedCompany()!.name }}</h3>
            <p><strong>Primary Contact:</strong> {{ selectedCompany()!.primaryContact }}</p>
            <p><strong>Email:</strong> {{ selectedCompany()!.primaryEmail }}</p>
            <p><strong>Submitted:</strong> {{ formatDate(selectedCompany()!.submittedAt || selectedCompany()!.createdAt) }}</p>
            <p><strong>Status:</strong> {{ selectedCompany()!.status }}</p>
            <p><strong>Risk Level:</strong> {{ selectedCompany()!.riskLevel }} <span class="ai-label">(AI-estimated)</span></p>
            <p *ngIf="selectedCompany()!.website"><strong>Website:</strong> {{ selectedCompany()!.website }}</p>
            <p *ngIf="selectedCompany()!.address"><strong>Address:</strong> {{ selectedCompany()!.address }}</p>
            <p *ngIf="selectedCompany()!.notes"><strong>Notes:</strong> {{ selectedCompany()!.notes }}</p>
          </div>
        </div>
      </div>
      <ibm-modal-footer>
        <button 
          *ngIf="selectedCompany()?.status === 'Pending'"
          ibmButton="danger" 
          (click)="rejectApplication()">
          Reject
        </button>
        <button 
          *ngIf="selectedCompany()?.status === 'Pending'"
          ibmButton="primary" 
          (click)="approveApplication()">
          Approve
        </button>
        <button ibmButton="secondary" (click)="closeDetailsModal()">Close</button>
      </ibm-modal-footer>
    </ibm-modal>
  `,
  styles: [`
    .page-container {
      max-width: 1400px;
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
      margin: 0 0 0.5rem 0;
    }

    .page-subtitle {
      font-size: 0.875rem;
      color: var(--linear-text-secondary);
      margin: 0;
    }

    .toolbar {
      margin-bottom: 1.5rem;
    }

    .filter-pills {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .pill-button {
      padding: 0.5rem 1rem;
      border: 1px solid var(--linear-border);
      background: var(--linear-surface);
      color: var(--linear-text-primary);
      border-radius: 20px;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 150ms ease;
    }

    .pill-button:hover {
      background: var(--linear-surface-hover);
    }

    .pill-button.active {
      background: var(--linear-accent);
      color: white;
      border-color: var(--linear-accent);
    }

    .table-container {
      // No border - matching Recent Activity table aesthetic
    }

    .detail-section {
      padding: 1rem 0;
    }

    .detail-section h3 {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--linear-text-primary);
      margin: 0 0 1rem 0;
    }

    .detail-section p {
      margin: 0.75rem 0;
      font-size: 0.875rem;
      color: var(--linear-text-primary);
    }

    .ai-label {
      font-size: 0.75rem;
      color: var(--linear-text-secondary);
      font-style: italic;
    }
  `]
})
export class OnboardingQueueComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  loading = signal(false);
  companies: VendorCompany[] = [];
  selectedFilter = signal<'all' | 'new' | 'approved' | 'rejected'>('all');
  detailsModalOpen = signal(false);
  selectedCompany = signal<VendorCompany | null>(null);

  tableModel = new TableModel();

  get filteredCompanies(): VendorCompany[] {
    const filter = this.selectedFilter();
    if (filter === 'all') {
      return this.companies;
    } else if (filter === 'new') {
      return this.companies.filter(c => c.status === 'Pending');
    } else if (filter === 'approved') {
      return this.companies.filter(c => c.status === 'Approved');
    } else {
      return this.companies.filter(c => c.status === 'Rejected');
    }
  }

  ngOnInit() {
    this.loadMockData();
    this.buildTable();
  }

  loadMockData() {
    this.companies = [
      {
        id: '2',
        name: 'TechStart Inc',
        primaryContact: 'Sarah Johnson',
        primaryEmail: 'sarah.j@techstart.com',
        status: 'Pending',
        tier: 'Tier 2',
        riskLevel: 'Medium',
        createdAt: '2024-02-20T14:30:00Z',
        updatedAt: '2024-02-20T14:30:00Z',
        submittedAt: '2024-02-20T14:30:00Z',
        website: 'https://techstart.com',
        notes: 'New startup company, requires review',
        vendor: true
      },
      {
        id: '4',
        name: 'InnovateCo',
        primaryContact: 'Emily Davis',
        primaryEmail: 'emily.d@innovateco.com',
        status: 'Pending',
        tier: 'Tier 3',
        riskLevel: 'High',
        createdAt: '2024-03-05T11:20:00Z',
        updatedAt: '2024-03-05T11:20:00Z',
        submittedAt: '2024-03-05T11:20:00Z',
        website: 'https://innovateco.com',
        notes: 'High-risk vendor, needs additional verification',
        vendor: true
      },
      {
        id: '8',
        name: 'NextGen Solutions',
        primaryContact: 'James Brown',
        primaryEmail: 'j.brown@nextgen.com',
        status: 'Pending',
        tier: 'Tier 1',
        riskLevel: 'Low',
        createdAt: '2024-03-10T09:00:00Z',
        updatedAt: '2024-03-10T09:00:00Z',
        submittedAt: '2024-03-10T09:00:00Z',
        website: 'https://nextgen.com',
        address: '100 Innovation Drive, Seattle, WA',
        vendor: true
      },
      {
        id: '9',
        name: 'CloudFirst Technologies',
        primaryContact: 'Maria Garcia',
        primaryEmail: 'm.garcia@cloudfirst.com',
        status: 'Pending',
        tier: 'Tier 2',
        riskLevel: 'Medium',
        createdAt: '2024-03-12T15:30:00Z',
        updatedAt: '2024-03-12T15:30:00Z',
        submittedAt: '2024-03-12T15:30:00Z',
        website: 'https://cloudfirst.com',
        vendor: true
      },
      {
        id: '6',
        name: 'CloudVendor Pro',
        primaryContact: 'Lisa Anderson',
        primaryEmail: 'lisa.a@cloudvendor.com',
        status: 'Rejected',
        tier: 'Tier 3',
        riskLevel: 'High',
        createdAt: '2024-02-10T13:00:00Z',
        updatedAt: '2024-02-10T13:00:00Z',
        submittedAt: '2024-02-10T13:00:00Z',
        notes: 'Rejected due to compliance concerns',
        vendor: true
      }
    ];
  }

  buildTable() {
    this.tableModel.header = [
      new TableHeaderItem({ data: 'Company Name' }),
      new TableHeaderItem({ data: 'Primary Contact' }),
      new TableHeaderItem({ data: 'Submitted Date' }),
      new TableHeaderItem({ data: 'Risk Level' }),
      new TableHeaderItem({ data: 'Status' })
    ];

    this.updateTableData();
  }

  updateTableData() {
    const filtered = this.filteredCompanies;
    this.tableModel.data = filtered.map((company) => [
      new TableItem({ data: company.name }),
      new TableItem({ data: company.primaryContact }),
      new TableItem({ data: this.formatDate(company.submittedAt || company.createdAt) }),
      new TableItem({ data: `${company.riskLevel} (AI-estimated)` }),
      new TableItem({ data: company.status })
    ]);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  onRowClick(event: any) {
    const rowIndex = event.selectedRowIndex;
    const company = this.filteredCompanies[rowIndex];
    if (company) {
      this.selectedCompany.set(company);
      this.detailsModalOpen.set(true);
    }
  }

  closeDetailsModal() {
    this.detailsModalOpen.set(false);
    this.selectedCompany.set(null);
  }

  approveApplication() {
    const company = this.selectedCompany();
    if (company) {
      company.status = 'Approved';
      this.updateTableData();
      this.closeDetailsModal();
      alert('Vendor approved (demo only)');
    }
  }

  rejectApplication() {
    const company = this.selectedCompany();
    if (company && confirm(`Reject ${company.name}?`)) {
      company.status = 'Rejected';
      this.updateTableData();
      this.closeDetailsModal();
      alert('Vendor rejected (demo only)');
    }
  }

  setFilter(filter: 'all' | 'new' | 'approved' | 'rejected') {
    this.selectedFilter.set(filter);
    this.updateTableData();
  }
}

