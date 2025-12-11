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
import { VendorCompany, VendorStatus, VendorComplianceState, VendorOnboardingPhase } from '../shared/models/vendor-company.model';
import { DataTableComponent } from '../shared/components/data-table/data-table.component';
import { AddVendorCompanyDrawerComponent } from '../shared/components/add-vendor-company-drawer/add-vendor-company-drawer.component';
import { VendorOnboardingWizardComponent } from '../shared/components/vendor-onboarding-wizard/vendor-onboarding-wizard.component';
import { VendorCompanyService } from '../shared/services/vendor-company.service';

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
        <div class="header-actions">
          <button ibmButton="secondary" (click)="openOnboardingWizard()">New Vendor Onboarding</button>
          <button ibmButton="primary" (click)="openNewCompanyModal()">New Company</button>
        </div>
      </div>

      <div class="toolbar">
        <div class="search-input">
          <input
            ibmText
            placeholder="Search by name, DBA, or email..."
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
          <label class="filter-label">Compliance:</label>
          <select ibmSelect [(ngModel)]="selectedComplianceState" (ngModelChange)="onSearchChange()" class="filter-select">
            <option value="">All</option>
            <option *ngFor="let state of complianceStateOptions" [value]="state">{{ state }}</option>
          </select>
        </div>

        <div class="filter-group">
          <label class="filter-label">Onboarding:</label>
          <select ibmSelect [(ngModel)]="selectedOnboardingPhase" (ngModelChange)="onSearchChange()" class="filter-select">
            <option value="">All</option>
            <option *ngFor="let phase of onboardingPhaseOptions" [value]="phase">{{ phase }}</option>
          </select>
        </div>

        <div class="filter-group">
          <label class="filter-label">Sort by:</label>
          <select ibmSelect [(ngModel)]="sortBy" (ngModelChange)="onSearchChange()" class="filter-select">
            <option value="name">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
            <option value="updated">Last Updated</option>
            <option value="status">Status</option>
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

    <!-- Vendor Onboarding Wizard -->
    <app-vendor-onboarding-wizard
      [open]="wizardOpen()"
      (closed)="closeWizard()"
      (completed)="onOnboardingCompleted($event)">
    </app-vendor-onboarding-wizard>

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

    .header-actions {
      display: flex;
      gap: 0.75rem;
      align-items: center;
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

    .table-note {
      margin-bottom: 1rem;
      padding: 0.75rem 1rem;
      background: var(--linear-surface);
      border: 1px solid var(--linear-border);
      border-radius: 6px;
      font-size: 0.875rem;
      color: var(--linear-text-secondary);
    }

    .table-note code {
      background: rgba(0, 0, 0, 0.05);
      padding: 0.125rem 0.375rem;
      border-radius: 3px;
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 0.8125rem;
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
  private vendorService = inject(VendorCompanyService);

  loading = signal(false);
  companies = signal<VendorCompany[]>([]);
  searchQuery = '';
  selectedStatus = '';
  selectedComplianceState = '';
  selectedOnboardingPhase = '';
  sortBy = 'name';
  editModalOpen = signal(false);
  selectedCompany = signal<VendorCompany | null>(null);
  drawerOpen = signal(false);
  wizardOpen = signal(false);

  statusOptions: VendorStatus[] = ['Pending', 'Approved', 'Rejected', 'Archived'];
  complianceStateOptions: VendorComplianceState[] = ['Complete', 'Missing Docs', 'Expired'];
  onboardingPhaseOptions: VendorOnboardingPhase[] = ['New', 'In Review', 'Ready', 'Blocked'];

  tableModel = new TableModel();

  get filteredCompanies(): VendorCompany[] {
    let filtered = [...this.companies()];
    
    // Search by name, DBA, or email
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(query) || 
        (c.dba && c.dba.toLowerCase().includes(query)) ||
        c.primaryEmail.toLowerCase().includes(query)
      );
    }
    
    // Filter by status
    if (this.selectedStatus) {
      filtered = filtered.filter(c => c.status === this.selectedStatus);
    }
    
    // Filter by compliance state
    if (this.selectedComplianceState) {
      filtered = filtered.filter(c => {
        if (!c.complianceState) return false;
        return c.complianceState === this.selectedComplianceState;
      });
    }
    
    // Filter by onboarding phase
    if (this.selectedOnboardingPhase) {
      filtered = filtered.filter(c => {
        if (!c.onboardingPhase) return false;
        return c.onboardingPhase === this.selectedOnboardingPhase;
      });
    }
    
    // Sort
    filtered.sort((a, b) => {
      switch (this.sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'updated':
          return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });
    
    return filtered;
  }

  ngOnInit() {
    this.loadVendors();
    this.buildTable();
  }

  loadVendors() {
    this.loading.set(true);
    this.vendorService.getVendors().subscribe({
      next: (vendors) => {
        this.companies.set(vendors);
        this.updateTableData();
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading vendors:', err);
        this.loading.set(false);
      }
    });
  }

  buildTable() {
    this.tableModel.header = [
      new TableHeaderItem({ data: 'Vendor Name' }),
      new TableHeaderItem({ data: 'DBA' }),
      new TableHeaderItem({ data: 'Status' }),
      new TableHeaderItem({ data: 'Compliance' }),
      new TableHeaderItem({ data: 'Readiness' }),
      new TableHeaderItem({ data: 'Last Updated' })
    ];

    this.updateTableData();
  }

  updateTableData() {
    const filtered = this.filteredCompanies;
    this.tableModel.data = filtered.map((company, index) => {
      // Store company ID in the first cell's expandedData for easy retrieval
      const firstCell = new TableItem({ 
        data: company.name, 
        expandedData: company.id,
        rawData: { companyId: company.id, index: index }
      });
      return [
        firstCell,
        new TableItem({ data: company.dba || '—' }),
        new TableItem({ data: company.status }),
        new TableItem({ data: company.complianceState || '—' }),
        new TableItem({ data: company.readiness || '—' }),
        new TableItem({ data: this.formatDate(company.updatedAt || company.createdAt) })
      ];
    });
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
    let companyId: string | null = null;
    let company: VendorCompany | null = null;
    
    // Method 1: Try to get company ID from the first cell's expandedData
    const rowIndex = event?.selectedRowIndex ?? event?.rowIndex ?? event?.index;
    if (rowIndex !== undefined && rowIndex !== null && rowIndex >= 0) {
      // Try to get from model data
      if (event?.model?.data && Array.isArray(event.model.data) && event.model.data[rowIndex]) {
        const rowData = event.model.data[rowIndex];
        if (Array.isArray(rowData) && rowData.length > 0) {
          const firstCell = rowData[0];
          if (firstCell?.expandedData) {
            companyId = firstCell.expandedData;
          } else if (firstCell?.rawData?.companyId) {
            companyId = firstCell.rawData.companyId;
          }
        }
      }
      
      // Fallback: use rowIndex with filteredCompanies
      if (!companyId) {
        const filtered = this.filteredCompanies;
        if (rowIndex < filtered.length) {
          company = filtered[rowIndex];
          if (company) {
            companyId = company.id;
          }
        }
      }
    }
    
    // Method 2: Try to get company directly if we have the ID
    if (companyId && !company) {
      company = this.filteredCompanies.find(c => c.id === companyId) || null;
    }
    
    if (company && companyId) {
      // Right-click or Ctrl+Click for edit, regular click for view
      const clickEvent = event?.event || event;
      if (clickEvent?.ctrlKey || clickEvent?.button === 2) {
        this.selectedCompany.set(company);
        this.editModalOpen.set(true);
      } else {
        // Navigate to vendor detail page
        this.router.navigate(['/vendors/companies', companyId]);
      }
    } else {
      console.error('Could not determine company from row click event:', event);
      console.error('Row index:', rowIndex);
      console.error('Filtered companies count:', this.filteredCompanies.length);
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

  openOnboardingWizard() {
    this.wizardOpen.set(true);
  }

  closeWizard() {
    this.wizardOpen.set(false);
  }

  onOnboardingCompleted(data: any) {
    console.log('Onboarding completed:', data);
    // In a real app, this would create the vendor company with lifecycle data
    alert('Vendor onboarding completed! (Demo only - data not saved)');
    // You could navigate to the new company detail page here
    // this.router.navigate(['/vendors/companies', newCompanyId]);
  }

  onVendorCompanySaved(data: any) {
    console.log('Vendor company saved from drawer:', data);
    // Reload vendors to get the new one
    this.loadVendors();
  }
}

