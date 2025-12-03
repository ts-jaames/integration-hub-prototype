import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
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
  ModalModule,
  SelectModule
} from 'carbon-components-angular';
import { VendorCompany } from '../shared/models/vendor-company.model';
import { DataTableComponent } from '../shared/components/data-table/data-table.component';
import { AddVendorCompanyDrawerComponent } from '../shared/components/add-vendor-company-drawer/add-vendor-company-drawer.component';

@Component({
  selector: 'app-company-directory',
  standalone: false,
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1>Vendor Companies</h1>
          <p class="page-subtitle">Manage all vendor entities in the platform.</p>
        </div>
        <button ibmButton="primary" (click)="openNewCompanyModal()">New Company</button>
      </div>

      <div class="toolbar">
        <div class="search-input">
          <input
            ibmText
            placeholder="Search companies..."
            [(ngModel)]="searchQuery"
            (ngModelChange)="onSearchChange()">
        </div>
        
        <div class="filter-group">
          <label class="filter-label">Status:</label>
          <select ibmSelect [(ngModel)]="selectedStatus" (ngModelChange)="onSearchChange()" class="filter-select">
            <option value="">All</option>
            <option *ngFor="let status of statusOptions" [value]="status">{{ status }}</option>
          </select>
        </div>

        <div class="filter-group">
          <label class="filter-label">Tier:</label>
          <select ibmSelect [(ngModel)]="selectedTier" (ngModelChange)="onSearchChange()" class="filter-select">
            <option value="">All</option>
            <option value="Tier 1">Tier 1</option>
            <option value="Tier 2">Tier 2</option>
            <option value="Tier 3">Tier 3</option>
          </select>
        </div>

        <div class="filter-group">
          <label class="filter-label">Risk Level:</label>
          <select ibmSelect [(ngModel)]="selectedRiskLevel" (ngModelChange)="onSearchChange()" class="filter-select">
            <option value="">All</option>
            <option *ngFor="let risk of riskOptions" [value]="risk">{{ risk }}</option>
          </select>
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

    <!-- Add Vendor Company Drawer -->
    <app-add-vendor-company-drawer
      [open]="drawerOpen()"
      (closed)="closeDrawer()"
      (saved)="onVendorCompanySaved($event)">
    </app-add-vendor-company-drawer>

    <!-- Edit Modal -->
    <ibm-modal
      [open]="editModalOpen()"
      [size]="'md'"
      (overlaySelected)="closeEditModal()">
      <ibm-modal-header (closeSelect)="closeEditModal()">
        <p class="bx--modal-header__heading">Edit Company</p>
      </ibm-modal-header>
      <div ibmModalContent>
        <div *ngIf="selectedCompany()">
          <p><strong>Company:</strong> {{ selectedCompany()!.name }}</p>
          <p><strong>Status:</strong> {{ selectedCompany()!.status }}</p>
          <p><strong>Tier:</strong> {{ selectedCompany()!.tier || 'N/A' }}</p>
          <p><strong>Risk Level:</strong> {{ selectedCompany()!.riskLevel }}</p>
          <p class="demo-note">This is a read-only demo view. Changes are not saved.</p>
        </div>
      </div>
      <ibm-modal-footer>
        <button ibmButton="danger" (click)="deactivateFromModal()">Deactivate</button>
        <button ibmButton="secondary" (click)="closeEditModal()">Close</button>
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
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
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
      display: flex;
      gap: 1rem;
      align-items: flex-end;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
    }

    .search-input {
      flex: 1;
      min-width: 250px;
    }

    .filter-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      min-width: 120px;
    }

    .filter-label {
      font-size: 0.75rem;
      color: var(--linear-text-secondary);
      font-weight: 500;
    }

    .filter-select {
      width: 100%;
    }

    .table-container {
      // No border - matching Recent Activity table aesthetic
    }

    .table-actions-hint {
      padding: 0.75rem 1rem;
      background: var(--linear-surface);
      border-top: 1px solid var(--linear-border);
      font-size: 0.75rem;
      color: var(--linear-text-secondary);
      text-align: center;
    }

    .demo-note {
      margin-top: 1rem;
      padding: 0.75rem;
      background: var(--linear-surface);
      border: 1px solid var(--linear-border);
      border-radius: 4px;
      font-size: 0.875rem;
      color: var(--linear-text-secondary);
    }
  `]
})
export class CompanyDirectoryComponent implements OnInit {
  private router = inject(Router);

  loading = signal(false);
  companies: VendorCompany[] = [];
  searchQuery = '';
  selectedStatus = '';
  selectedTier = '';
  selectedRiskLevel = '';
  editModalOpen = signal(false);
  selectedCompany = signal<VendorCompany | null>(null);
  drawerOpen = signal(false);

  statusOptions = ['Pending', 'Active', 'Rejected', 'Deactivated'];
  riskOptions = ['Low', 'Medium', 'High'];

  tableModel = new TableModel();

  get filteredCompanies(): VendorCompany[] {
    let filtered = [...this.companies];
    
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(query) || 
        c.primaryContact.toLowerCase().includes(query) ||
        c.primaryEmail.toLowerCase().includes(query)
      );
    }
    
    if (this.selectedStatus) {
      filtered = filtered.filter(c => c.status === this.selectedStatus);
    }
    
    if (this.selectedTier) {
      filtered = filtered.filter(c => c.tier === this.selectedTier);
    }
    
    if (this.selectedRiskLevel) {
      filtered = filtered.filter(c => c.riskLevel === this.selectedRiskLevel);
    }
    
    return filtered;
  }

  ngOnInit() {
    this.loadMockData();
    this.buildTable();
  }

  loadMockData() {
    this.companies = [
      {
        id: '1',
        name: 'Acme Corporation',
        primaryContact: 'John Smith',
        primaryEmail: 'john.smith@acme.com',
        status: 'Active',
        tier: 'Tier 1',
        riskLevel: 'Low',
        createdAt: '2024-01-15T10:00:00Z',
        website: 'https://acme.com',
        address: '123 Main St, San Francisco, CA',
        vendor: true
      },
      {
        id: '2',
        name: 'TechStart Inc',
        primaryContact: 'Sarah Johnson',
        primaryEmail: 'sarah.j@techstart.com',
        status: 'Pending',
        tier: 'Tier 2',
        riskLevel: 'Medium',
        createdAt: '2024-02-20T14:30:00Z',
        submittedAt: '2024-02-20T14:30:00Z',
        website: 'https://techstart.com',
        vendor: true
      },
      {
        id: '3',
        name: 'Global Solutions Ltd',
        primaryContact: 'Michael Chen',
        primaryEmail: 'm.chen@globalsolutions.com',
        status: 'Active',
        tier: 'Tier 1',
        riskLevel: 'Low',
        createdAt: '2023-11-10T09:15:00Z',
        website: 'https://globalsolutions.com',
        address: '456 Business Ave, New York, NY',
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
        submittedAt: '2024-03-05T11:20:00Z',
        website: 'https://innovateco.com',
        vendor: true
      },
      {
        id: '5',
        name: 'DataFlow Systems',
        primaryContact: 'Robert Wilson',
        primaryEmail: 'r.wilson@dataflow.com',
        status: 'Active',
        tier: 'Tier 2',
        riskLevel: 'Medium',
        createdAt: '2024-01-28T16:45:00Z',
        website: 'https://dataflow.com',
        address: '789 Tech Blvd, Austin, TX',
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
        submittedAt: '2024-02-10T13:00:00Z',
        vendor: true
      },
      {
        id: '7',
        name: 'SecureNet Partners',
        primaryContact: 'David Martinez',
        primaryEmail: 'd.martinez@securenet.com',
        status: 'Deactivated',
        tier: 'Tier 1',
        riskLevel: 'Low',
        createdAt: '2023-09-15T08:30:00Z',
        website: 'https://securenet.com',
        vendor: true
      }
    ];
  }

  buildTable() {
    this.tableModel.header = [
      new TableHeaderItem({ data: 'Company Name' }),
      new TableHeaderItem({ data: 'Status' }),
      new TableHeaderItem({ data: 'Tier' }),
      new TableHeaderItem({ data: 'Risk Level' }),
      new TableHeaderItem({ data: 'Date Registered' })
    ];

    this.updateTableData();
  }

  updateTableData() {
    const filtered = this.filteredCompanies;
    this.tableModel.data = filtered.map((company) => [
      new TableItem({ data: company.name }),
      new TableItem({ data: company.status }),
      new TableItem({ data: company.tier || 'N/A' }),
      new TableItem({ data: company.riskLevel }),
      new TableItem({ data: this.formatDate(company.createdAt) })
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

  onSearchChange() {
    this.updateTableData();
  }

  onRowClick(event: any) {
    const rowIndex = event.selectedRowIndex;
    const company = this.filteredCompanies[rowIndex];
    if (company) {
      // Right-click or Ctrl+Click for edit, regular click for view
      if (event.event?.ctrlKey || event.event?.button === 2) {
        this.editCompany(rowIndex);
      } else {
        this.router.navigate(['/vendors/companies', company.id]);
      }
    }
  }

  editCompany(index: number) {
    const company = this.filteredCompanies[index];
    if (company) {
      this.selectedCompany.set(company);
      this.editModalOpen.set(true);
    }
  }

  closeEditModal() {
    this.editModalOpen.set(false);
    this.selectedCompany.set(null);
  }

  deactivateCompany(index: number) {
    const company = this.filteredCompanies[index];
    if (company && confirm(`Deactivate ${company.name}?`)) {
      company.status = 'Deactivated';
      this.updateTableData();
      alert('Company deactivated (demo only)');
    }
  }

  // Helper method for deactivate from edit modal
  deactivateFromModal() {
    const company = this.selectedCompany();
    if (company && confirm(`Deactivate ${company.name}?`)) {
      company.status = 'Deactivated';
      this.updateTableData();
      this.closeEditModal();
      alert('Company deactivated (demo only)');
    }
  }

  openNewCompanyModal() {
    this.drawerOpen.set(true);
  }

  closeDrawer() {
    this.drawerOpen.set(false);
  }

  onVendorCompanySaved(data: any) {
    console.log('Vendor company saved from drawer:', data);
    // In a real app, you would refresh the table or add the new company to the list
    // For demo purposes, we'll just log it
    this.updateTableData();
  }
}

