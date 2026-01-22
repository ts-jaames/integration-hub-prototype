import { Component, OnInit, OnDestroy, signal, computed, inject, effect } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
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
import { VendorCompany, VendorStatus, VendorComplianceState } from '../shared/models/vendor-company.model';
import { DataTableComponent } from '../shared/components/data-table/data-table.component';
import { VendorCompanyService } from '../shared/services/vendor-company.service';
import { TextInputComponent } from '../shared/components/primitives/text-input/text-input.component';
import { SelectComponent, SelectOption } from '../shared/components/primitives/select/select.component';
import { IconButtonComponent } from '../shared/components/primitives/icon-button/icon-button.component';
import { FilterChipComponent } from '../shared/components/primitives/filter-chip/filter-chip.component';
import { LoggerService } from '../core/services/logger.service';

@Component({
  selector: 'app-company-directory',
  standalone: false,
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1>Vendor Directory</h1>
          <p class="page-subtitle">Manage all vendor entities in the platform — from draft to active.</p>
        </div>
        <div class="header-actions">
          <button ibmButton="primary" (click)="navigateToOnboarding()" type="button">Add New Vendor</button>
        </div>
      </div>

      <div class="toolbar-container">
        <div class="toolbar">
          <div class="toolbar-row toolbar-row-primary">
            <div class="toolbar-search">
              <app-text-input
                label="Search"
                placeholder="Search by name, DBA, or email..."
                [ngModel]="searchQuery()"
                (ngModelChange)="searchQuery.set($event); onSearchChange()"
                (escape)="clearSearch()"
                ariaLabel="Search vendors">
              </app-text-input>
            </div>
            
            <div class="toolbar-filters">
              <app-select
                label="Status"
                [options]="statusSelectOptions"
                [ngModel]="selectedStatus()"
                (ngModelChange)="selectedStatus.set($event); onSearchChange()"
                ariaLabel="Filter by status">
              </app-select>
              
              <app-select
                label="Compliance"
                [options]="complianceSelectOptions"
                [ngModel]="selectedComplianceState()"
                (ngModelChange)="selectedComplianceState.set($event); onSearchChange()"
                ariaLabel="Filter by compliance state">
              </app-select>
              
              <app-select
                label="Show Archived"
                [options]="showArchivedOptions"
                [ngModel]="showArchived()"
                (ngModelChange)="showArchived.set($event); onSearchChange()"
                ariaLabel="Show archived vendors">
              </app-select>
            </div>
            
            <div class="toolbar-sort-actions">
              <div class="toolbar-sort">
                <app-select
                  label="Sort by"
                  [options]="sortSelectOptions"
                  [ngModel]="sortBy()"
                  (ngModelChange)="sortBy.set($event); onSearchChange()"
                  ariaLabel="Sort results">
                </app-select>
              </div>
              
              <div class="toolbar-actions" *ngIf="hasActiveFilters()">
                <app-icon-button
                  buttonKind="tertiary"
                  tooltip="Clear all filters"
                  ariaLabel="Clear all filters"
                  (clicked)="clearAllFilters()">
                  Clear all
                </app-icon-button>
              </div>
            </div>
          </div>
        </div>
        
        <div class="active-filters" *ngIf="hasActiveFilters()">
          <div class="active-filters-label">Active filters:</div>
          <div class="active-filters-chips">
            <app-filter-chip
              *ngIf="searchQuery()"
              label="Search"
              [value]="searchQuery()"
              (remove)="clearSearch()">
            </app-filter-chip>
            <app-filter-chip
              *ngIf="selectedStatus()"
              label="Status"
              [value]="selectedStatus()"
              (remove)="clearStatus()">
            </app-filter-chip>
            <app-filter-chip
              *ngIf="selectedComplianceState()"
              label="Compliance"
              [value]="selectedComplianceState()"
              (remove)="clearCompliance()">
            </app-filter-chip>
            <app-filter-chip
              *ngIf="showArchived() === 'true'"
              label="Showing"
              value="Archived"
              (remove)="showArchived.set('false'); onSearchChange()">
            </app-filter-chip>
          </div>
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

    .toolbar-container {
      margin-bottom: 1.5rem;
    }

    .toolbar {
      width: 100%;
    }

    .toolbar-row {
      display: grid;
      gap: 1rem;
      align-items: end;
    }

    .toolbar-row-primary {
      /* Desktop: one row with Search (flex-grow), then 3 filters, then Sort aligned right */
      grid-template-columns: 1fr auto auto auto auto;
      grid-template-areas: "search filters filters filters sort-actions";
    }

    .toolbar-search {
      grid-area: search;
      min-width: 320px;
    }

    .toolbar-filters {
      grid-area: filters;
      display: grid;
      grid-template-columns: repeat(3, auto);
      gap: 1rem;
    }

    .toolbar-sort-actions {
      grid-area: sort-actions;
      display: flex;
      gap: 1rem;
      align-items: end;
      justify-content: flex-end;
    }

    .toolbar-sort {
      flex: 0 0 auto;
    }

    .toolbar-actions {
      flex: 0 0 auto;
    }

    /* Tablet: Search on first row, filters and sort on second row */
    @media (max-width: 1024px) {
      .toolbar-row-primary {
        grid-template-columns: 1fr;
        grid-template-areas: 
          "search"
          "filters"
          "sort-actions";
      }

      .toolbar-search {
        min-width: 100%;
      }

      .toolbar-filters {
        grid-template-columns: repeat(3, 1fr);
      }

      .toolbar-sort-actions {
        justify-content: space-between;
      }
    }

    /* Mobile: stack vertically with full-width controls */
    @media (max-width: 768px) {
      .toolbar-row-primary {
        grid-template-areas: 
          "search"
          "filters"
          "sort"
          "actions";
      }

      .toolbar-filters {
        grid-template-columns: 1fr;
      }

      .toolbar-actions {
        justify-self: stretch;
      }
    }

    .active-filters {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.75rem;
      margin-top: 1rem;
      padding: 0.75rem 1rem;
      background: var(--linear-surface);
      border: 1px solid var(--linear-border);
      border-radius: var(--radius-md);
    }

    .active-filters-label {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--linear-text-secondary);
      margin-right: 0.25rem;
    }

    .active-filters-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      flex: 1;
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
export class CompanyDirectoryComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private vendorService = inject(VendorCompanyService);
  private logger = inject(LoggerService);

  loading = signal(false);
  companies = signal<VendorCompany[]>([]);
  searchQuery = signal('');
  selectedStatus = signal('');
  selectedComplianceState = signal('');
  showArchived = signal('false'); // Default to hide archived
  sortBy = signal('name');
  editModalOpen = signal(false);
  selectedCompany = signal<VendorCompany | null>(null);
  private isUpdatingTable = false;
  private updateTableTimeout: any = null;
  private routerSubscription?: Subscription;

  statusOptions: VendorStatus[] = ['Draft', 'Pending Approval', 'Active', 'Rejected', 'Archived'];
  complianceStateOptions: VendorComplianceState[] = ['Complete', 'Missing Docs', 'Expired'];

  // Unified status options (excluding Archived by default - handled separately)
  readonly statusSelectOptions: SelectOption[] = [
    { value: '', label: 'All Statuses' },
    { value: 'Draft', label: 'Draft' },
    { value: 'Pending Approval', label: 'Pending Approval' },
    { value: 'Active', label: 'Active' },
    { value: 'Rejected', label: 'Rejected' }
  ];

  readonly complianceSelectOptions: SelectOption[] = [
    { value: '', label: 'All' },
    { value: 'Complete', label: 'Complete' },
    { value: 'Missing Docs', label: 'Missing Docs' },
    { value: 'Expired', label: 'Expired' }
  ];

  readonly showArchivedOptions: SelectOption[] = [
    { value: 'false', label: 'Hide Archived' },
    { value: 'true', label: 'Show Archived' }
  ];

  readonly sortSelectOptions: SelectOption[] = [
    { value: 'name', label: 'Name (A-Z)' },
    { value: 'name-desc', label: 'Name (Z-A)' },
    { value: 'updated', label: 'Last Updated' },
    { value: 'status', label: 'Status' }
  ];

  tableModel = new TableModel();

  filteredCompanies = computed(() => {
    let filtered = [...this.companies()];
    const searchQuery = this.searchQuery();
    const selectedStatus = this.selectedStatus();
    const selectedComplianceState = this.selectedComplianceState();
    const showArchived = this.showArchived();
    const sortBy = this.sortBy();
    
    // By default, exclude archived vendors unless explicitly showing them
    if (showArchived !== 'true') {
      filtered = filtered.filter(c => c.status !== 'Archived');
    }
    
    // Search by name, DBA, or email
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(query) || 
        (c.dba && c.dba.toLowerCase().includes(query)) ||
        c.primaryEmail.toLowerCase().includes(query)
      );
    }
    
    // Filter by status
    if (selectedStatus) {
      filtered = filtered.filter(c => c.status === selectedStatus);
    }
    
    // Filter by compliance state
    if (selectedComplianceState) {
      filtered = filtered.filter(c => {
        if (!c.complianceState) return false;
        return c.complianceState === selectedComplianceState;
      });
    }
    
    // Sort (with status priority: Draft and Pending Approval first)
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'updated':
          return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
        case 'status':
          const statusOrder = ['Draft', 'Pending Approval', 'Active', 'Rejected', 'Archived'];
          return statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
        default:
          return 0;
      }
    });
    
    return filtered;
  });

  hasActiveFilters = computed(() => {
    return !!(
      this.searchQuery() ||
      this.selectedStatus() ||
      this.selectedComplianceState() ||
      this.showArchived() === 'true'
    );
  });

  constructor() {
    // Automatically update table whenever filteredCompanies changes
    effect(() => {
      const filtered = this.filteredCompanies();
      console.log('[CompanyDirectory] filteredCompanies changed, updating table with', filtered.length, 'vendors');
      this.updateTableData();
    });
  }

  ngOnInit() {
    this.buildTable();
    this.loadVendors();

    // Subscribe to router events to reload vendors when navigating back to this page
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        // Reload vendors if we're on the vendors/companies route
        if (event.url === '/vendors/companies' || event.urlAfterRedirects === '/vendors/companies') {
          this.logger.debug('Reloading vendors after navigation back to directory');
          this.loadVendors();
        }
      });
  }

  ngOnDestroy() {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  loadVendors() {
    this.loading.set(true);
    this.logger.debug('Loading vendors from service');
    this.vendorService.getVendors().subscribe({
      next: (vendors) => {
        this.logger.debug(`Loaded ${vendors.length} vendors`);
        this.companies.set(vendors);
        // Table will update automatically via effect
        this.loading.set(false);
      },
      error: (err) => {
        this.logger.error('Error loading vendors', err);
        this.loading.set(false);
      }
    });
  }

  buildTable() {
    this.tableModel.header = [
      new TableHeaderItem({ data: 'Vendor Name' }),
      new TableHeaderItem({ data: 'Status' }),
      new TableHeaderItem({ data: 'Onboarding Progress' }),
      new TableHeaderItem({ data: 'Primary Contact' }),
      new TableHeaderItem({ data: 'Last Updated' })
    ];
  }

  private updateTableData() {
    // Clear any pending update
    if (this.updateTableTimeout) {
      clearTimeout(this.updateTableTimeout);
    }
    
    // Debounce table updates to prevent infinite loops
    this.updateTableTimeout = setTimeout(() => {
      // Prevent multiple simultaneous updates
      if (this.isUpdatingTable) {
        return;
      }
      
      this.isUpdatingTable = true;
      
      try {
        const filtered = this.filteredCompanies();
        this.tableModel.data = filtered.map((company, index) => {
          // Store company ID in the first cell's expandedData for easy retrieval
          const firstCell = new TableItem({ 
            data: company.name + (company.dba ? ` (${company.dba})` : ''), 
            expandedData: company.id,
            rawData: { companyId: company.id, index: index }
          });
          
          // Format onboarding progress
          const progress = company.onboardingProgress;
          const progressText = progress 
            ? `${progress.completedSteps} of ${progress.totalSteps} steps`
            : company.status === 'Active' ? 'Complete' : '—';
          
          return [
            firstCell,
            new TableItem({ data: company.status }),
            new TableItem({ data: progressText }),
            new TableItem({ data: `${company.primaryContact} (${company.primaryEmail})` }),
            new TableItem({ data: this.formatDate(company.updatedAt || company.createdAt) })
          ];
        });
      } finally {
        this.isUpdatingTable = false;
        this.updateTableTimeout = null;
      }
    }, 10); // Small delay to batch rapid updates
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

  clearSearch() {
    this.searchQuery.set('');
    this.updateTableData();
  }

  clearStatus() {
    this.selectedStatus.set('');
    this.updateTableData();
  }

  clearCompliance() {
    this.selectedComplianceState.set('');
    this.updateTableData();
  }

  clearAllFilters() {
    this.searchQuery.set('');
    this.selectedStatus.set('');
    this.selectedComplianceState.set('');
    this.showArchived.set('false');
    this.updateTableData();
  }

  onRowClick(event: any) {
    // Get row index from the event (data-table component should have normalized it)
    const rowIndex = event?.selectedRowIndex ?? event?.rowIndex ?? event?.index;
    
    if (rowIndex === undefined || rowIndex === null || rowIndex < 0) {
      this.logger.warn('Could not determine row index from event', { event });
      return;
    }
    
    // Get company directly from filteredCompanies array using row index
    const filtered = this.filteredCompanies();
    if (rowIndex >= filtered.length) {
      this.logger.warn('Row index out of bounds', { rowIndex, filteredCount: filtered.length });
      return;
    }
    
    const company = filtered[rowIndex];
    if (!company || !company.id) {
      this.logger.warn('Could not find company at row index', { rowIndex });
      return;
    }
    
    // Right-click or Ctrl+Click for edit, regular click for view
    const clickEvent = event?.event || event;
    if (clickEvent?.ctrlKey || clickEvent?.button === 2 || clickEvent?.metaKey) {
      this.selectedCompany.set(company);
      this.editModalOpen.set(true);
    } else {
      // Navigate to vendor detail page
      this.router.navigate(['/vendors/companies', company.id]);
    }
  }

  editCompany(index: number) {
    const filtered = this.filteredCompanies();
    const company = filtered[index];
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
    const filtered = this.filteredCompanies();
    const company = filtered[index];
    if (company && confirm(`Deactivate ${company.name}?`)) {
      company.status = 'Archived';
      this.updateTableData();
      alert('Company deactivated (demo only)');
    }
  }

  // Helper method for deactivate from edit modal
  deactivateFromModal() {
    const company = this.selectedCompany();
    if (company && confirm(`Deactivate ${company.name}?`)) {
      company.status = 'Archived';
      this.updateTableData();
      this.closeEditModal();
      alert('Company deactivated (demo only)');
    }
  }


  navigateToOnboarding() {
    console.log('navigateToOnboarding called - should navigate to /vendors/new/onboarding');
    this.logger.info('Navigating to vendor onboarding page');
    this.router.navigate(['/vendors/new/onboarding']).then(
      (success) => {
        console.log('Navigation result:', success);
        if (success) {
          this.logger.info('Navigation successful');
        } else {
          this.logger.error('Navigation failed - route not found');
          console.error('Navigation failed - route not found');
        }
      },
      (error) => {
        this.logger.error('Navigation error', error);
        console.error('Navigation error:', error);
      }
    );
  }
}

