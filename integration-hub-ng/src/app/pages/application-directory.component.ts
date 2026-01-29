import { Component, OnInit, signal, computed, inject, effect, ViewChild, TemplateRef, AfterViewInit } from '@angular/core';
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
import { DataTableComponent } from '../shared/components/data-table/data-table.component';
import { TextInputComponent } from '../shared/components/primitives/text-input/text-input.component';
import { SelectComponent, SelectOption } from '../shared/components/primitives/select/select.component';
import { IconButtonComponent } from '../shared/components/primitives/icon-button/icon-button.component';
import { FilterChipComponent } from '../shared/components/primitives/filter-chip/filter-chip.component';
import { LoggerService } from '../core/services/logger.service';

// Application model
export interface Application {
  id: string;
  name: string;
  shortName: string;
  status: 'Active' | 'Inactive' | 'Suspended' | 'Draft' | 'Archived';
  type: 'Internal' | 'External';
  environments: ('Sandbox' | 'Production')[];
  owner: string;
  ownerType: 'team' | 'vendor';
  apiCount: number;
  apis: string[];
  createdAt: string;
  updatedAt: string;
  description?: string;
}

@Component({
  selector: 'app-application-directory',
  standalone: false,
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1>Application Directory</h1>
          <p class="page-subtitle">Manage all integration applications that consume FSR APIs.</p>
        </div>
        <div class="header-actions">
          <button ibmButton="primary" (click)="addNewApplication()" type="button">Add New Application</button>
        </div>
      </div>

      <div class="toolbar-container">
        <div class="toolbar">
          <div class="toolbar-row toolbar-row-primary">
            <div class="toolbar-search">
              <app-text-input
                label="Search"
                placeholder="Search by application name, owner, or ID..."
                [ngModel]="searchQuery()"
                (ngModelChange)="searchQuery.set($event); onSearchChange()"
                (escape)="clearSearch()"
                ariaLabel="Search applications">
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
                label="Type"
                [options]="typeSelectOptions"
                [ngModel]="selectedType()"
                (ngModelChange)="selectedType.set($event); onSearchChange()"
                ariaLabel="Filter by type">
              </app-select>
              
              <app-select
                label="Show Archived"
                [options]="showArchivedOptions"
                [ngModel]="showArchived()"
                (ngModelChange)="showArchived.set($event); onSearchChange()"
                ariaLabel="Show archived applications">
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
              *ngIf="selectedType()"
              label="Type"
              [value]="selectedType()"
              (remove)="clearType()">
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

    <!-- Status cell template -->
    <ng-template #statusTemplate let-data="data">
      <span class="status-pill" [attr.data-status]="data">{{ data }}</span>
    </ng-template>
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

    /* Status pill styles */
    .status-pill {
      display: inline-flex;
      align-items: center;
      padding: 0.125rem 0.5rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 500;
      white-space: nowrap;
    }

    .status-pill[data-status="Active"] {
      background: rgba(16, 185, 129, 0.15);
      color: #10b981;
    }

    .status-pill[data-status="Inactive"] {
      background: rgba(255, 255, 255, 0.08);
      color: var(--linear-text-secondary);
    }

    .status-pill[data-status="Draft"] {
      background: rgba(255, 255, 255, 0.08);
      color: var(--linear-text-secondary);
    }

    .status-pill[data-status="Suspended"] {
      background: rgba(239, 68, 68, 0.15);
      color: #ef4444;
    }

    .status-pill[data-status="Archived"] {
      background: rgba(255, 255, 255, 0.08);
      color: var(--linear-text-tertiary);
    }
  `]
})
export class ApplicationDirectoryComponent implements OnInit, AfterViewInit {
  private router = inject(Router);
  private logger = inject(LoggerService);

  @ViewChild('statusTemplate', { static: false }) statusTemplate!: TemplateRef<any>;

  loading = signal(false);
  applications = signal<Application[]>([]);
  searchQuery = signal('');
  selectedStatus = signal('');
  selectedType = signal('');
  showArchived = signal('false');
  sortBy = signal('name');
  private isUpdatingTable = false;
  private updateTableTimeout: any = null;

  readonly statusSelectOptions: SelectOption[] = [
    { value: '', label: 'All Statuses' },
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' },
    { value: 'Suspended', label: 'Suspended' },
    { value: 'Draft', label: 'Draft' }
  ];

  readonly typeSelectOptions: SelectOption[] = [
    { value: '', label: 'All' },
    { value: 'Internal', label: 'Internal' },
    { value: 'External', label: 'External' }
  ];

  readonly showArchivedOptions: SelectOption[] = [
    { value: 'false', label: 'Hide Archived' },
    { value: 'true', label: 'Show Archived' }
  ];

  readonly sortSelectOptions: SelectOption[] = [
    { value: 'name', label: 'Name (A-Z)' },
    { value: 'name-desc', label: 'Name (Z-A)' },
    { value: 'updated', label: 'Last Updated' },
    { value: 'usage', label: 'Most Used' }
  ];

  tableModel = new TableModel();

  filteredApplications = computed(() => {
    let filtered = [...this.applications()];
    const searchQuery = this.searchQuery();
    const selectedStatus = this.selectedStatus();
    const selectedType = this.selectedType();
    const showArchived = this.showArchived();
    const sortBy = this.sortBy();
    
    // By default, exclude archived applications unless explicitly showing them
    if (showArchived !== 'true') {
      filtered = filtered.filter(app => app.status !== 'Archived');
    }
    
    // Search by name, short name, owner, or ID
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(app => 
        app.name.toLowerCase().includes(query) || 
        app.shortName.toLowerCase().includes(query) ||
        app.owner.toLowerCase().includes(query) ||
        app.id.toLowerCase().includes(query)
      );
    }
    
    // Filter by status
    if (selectedStatus) {
      filtered = filtered.filter(app => app.status === selectedStatus);
    }
    
    // Filter by type
    if (selectedType) {
      filtered = filtered.filter(app => app.type === selectedType);
    }
    
    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'updated':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'usage':
          return b.apiCount - a.apiCount;
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
      this.selectedType() ||
      this.showArchived() === 'true'
    );
  });

  constructor() {
    effect(() => {
      const filtered = this.filteredApplications();
      this.logger.debug('[ApplicationDirectory] filteredApplications changed, updating table with', filtered.length, 'applications');
      this.updateTableData();
    });
  }

  ngOnInit() {
    this.buildTable();
    this.loadApplications();
  }

  ngAfterViewInit() {
    // Re-render table to apply status template after view init
    if (this.applications().length > 0) {
      this.updateTableData();
    }
  }

  loadApplications() {
    this.loading.set(true);
    
    // Mock data - in production this would come from a service
    const mockApplications: Application[] = [
      {
        id: 'app-1',
        name: 'RentalAid',
        shortName: 'RA',
        status: 'Active',
        type: 'External',
        environments: ['Sandbox', 'Production'],
        owner: 'RentalAid Team',
        ownerType: 'team',
        apiCount: 3,
        apis: ['Orders API', 'Inventory API', 'Payments API'],
        createdAt: '2024-01-10T10:00:00Z',
        updatedAt: '2024-06-15T14:30:00Z',
        description: 'Property rental management platform'
      },
      {
        id: 'app-2',
        name: 'PropertyLLC Portal',
        shortName: 'PLLC',
        status: 'Active',
        type: 'External',
        environments: ['Sandbox', 'Production'],
        owner: 'PropertyLLC Team',
        ownerType: 'team',
        apiCount: 2,
        apis: ['Orders API', 'Reporting API'],
        createdAt: '2024-02-15T09:00:00Z',
        updatedAt: '2024-06-20T11:00:00Z',
        description: 'Commercial property management system'
      },
      {
        id: 'app-3',
        name: 'Leasing Portal',
        shortName: 'LP',
        status: 'Active',
        type: 'Internal',
        environments: ['Sandbox', 'Production'],
        owner: 'Internal Systems',
        ownerType: 'team',
        apiCount: 4,
        apis: ['Orders API', 'Inventory API', 'Users API', 'Documents API'],
        createdAt: '2023-11-20T14:00:00Z',
        updatedAt: '2024-06-18T16:45:00Z',
        description: 'Internal leasing management application'
      },
      {
        id: 'app-4',
        name: 'Resident Mobile App',
        shortName: 'RMA',
        status: 'Active',
        type: 'Internal',
        environments: ['Sandbox', 'Production'],
        owner: 'Mobile Team',
        ownerType: 'team',
        apiCount: 5,
        apis: ['Users API', 'Notifications API', 'Payments API', 'Maintenance API', 'Documents API'],
        createdAt: '2024-01-05T08:00:00Z',
        updatedAt: '2024-06-22T09:15:00Z',
        description: 'Mobile app for property residents'
      },
      {
        id: 'app-5',
        name: 'Vendor Portal',
        shortName: 'VP',
        status: 'Active',
        type: 'Internal',
        environments: ['Production'],
        owner: 'Vendor Relations',
        ownerType: 'team',
        apiCount: 2,
        apis: ['Vendors API', 'Documents API'],
        createdAt: '2024-03-01T10:00:00Z',
        updatedAt: '2024-06-10T13:20:00Z',
        description: 'Portal for vendor onboarding and management'
      },
      {
        id: 'app-6',
        name: 'Accounting Sync',
        shortName: 'AS',
        status: 'Active',
        type: 'Internal',
        environments: ['Sandbox', 'Production'],
        owner: 'Finance Team',
        ownerType: 'team',
        apiCount: 3,
        apis: ['Payments API', 'Reporting API', 'Transactions API'],
        createdAt: '2024-02-20T11:00:00Z',
        updatedAt: '2024-06-21T10:00:00Z',
        description: 'Integration with accounting systems'
      },
      {
        id: 'app-7',
        name: 'Maintenance Ops',
        shortName: 'MO',
        status: 'Active',
        type: 'Internal',
        environments: ['Sandbox', 'Production'],
        owner: 'Operations Team',
        ownerType: 'team',
        apiCount: 2,
        apis: ['Maintenance API', 'Inventory API'],
        createdAt: '2024-04-10T09:00:00Z',
        updatedAt: '2024-06-19T15:30:00Z',
        description: 'Maintenance request management system'
      },
      {
        id: 'app-8',
        name: 'Acme Integration',
        shortName: 'ACME',
        status: 'Active',
        type: 'External',
        environments: ['Production'],
        owner: 'Vendor: Acme Corp',
        ownerType: 'vendor',
        apiCount: 1,
        apis: ['Orders API'],
        createdAt: '2024-05-01T14:00:00Z',
        updatedAt: '2024-06-05T16:00:00Z',
        description: 'Acme Corporation vendor integration'
      },
      {
        id: 'app-9',
        name: 'Analytics Dashboard',
        shortName: 'AD',
        status: 'Inactive',
        type: 'Internal',
        environments: ['Sandbox'],
        owner: 'BI Team',
        ownerType: 'team',
        apiCount: 2,
        apis: ['Reporting API', 'Analytics API'],
        createdAt: '2024-03-15T10:00:00Z',
        updatedAt: '2024-05-20T11:00:00Z',
        description: 'Business intelligence dashboard'
      },
      {
        id: 'app-10',
        name: 'Test Harness',
        shortName: 'TH',
        status: 'Draft',
        type: 'Internal',
        environments: ['Sandbox'],
        owner: 'QA Team',
        ownerType: 'team',
        apiCount: 0,
        apis: [],
        createdAt: '2024-06-01T09:00:00Z',
        updatedAt: '2024-06-01T09:00:00Z',
        description: 'QA testing application'
      },
      {
        id: 'app-11',
        name: 'Legacy CRM Connector',
        shortName: 'LCC',
        status: 'Archived',
        type: 'Internal',
        environments: [],
        owner: 'IT Team',
        ownerType: 'team',
        apiCount: 1,
        apis: ['Users API'],
        createdAt: '2023-06-01T10:00:00Z',
        updatedAt: '2024-01-15T14:00:00Z',
        description: 'Deprecated CRM integration'
      },
      {
        id: 'app-12',
        name: 'Partner API Gateway',
        shortName: 'PAG',
        status: 'Suspended',
        type: 'External',
        environments: ['Production'],
        owner: 'Vendor: TechPartner Inc',
        ownerType: 'vendor',
        apiCount: 2,
        apis: ['Orders API', 'Inventory API'],
        createdAt: '2024-04-20T11:00:00Z',
        updatedAt: '2024-06-10T09:00:00Z',
        description: 'Suspended due to compliance review'
      }
    ];

    // Simulate API delay
    setTimeout(() => {
      this.applications.set(mockApplications);
      this.loading.set(false);
    }, 300);
  }

  buildTable() {
    this.tableModel.header = [
      new TableHeaderItem({ data: 'Application Name' }),
      new TableHeaderItem({ data: 'Status' }),
      new TableHeaderItem({ data: 'Environments' }),
      new TableHeaderItem({ data: 'Owner' }),
      new TableHeaderItem({ data: 'API Usage' }),
      new TableHeaderItem({ data: 'Last Updated' })
    ];
  }

  private updateTableData() {
    if (this.updateTableTimeout) {
      clearTimeout(this.updateTableTimeout);
    }
    
    this.updateTableTimeout = setTimeout(() => {
      if (this.isUpdatingTable) {
        return;
      }
      
      this.isUpdatingTable = true;
      
      try {
        const filtered = this.filteredApplications();
        this.tableModel.data = filtered.map((app, index) => {
          const firstCell = new TableItem({ 
            data: app.name + (app.shortName ? ` (${app.shortName})` : ''), 
            expandedData: app.id,
            rawData: { applicationId: app.id, index: index }
          });
          
          // Format environments
          const envText = app.environments.length > 0 
            ? app.environments.join(', ')
            : '—';
          
          // Format API usage
          const apiText = app.apiCount > 0 
            ? `Uses ${app.apiCount} API${app.apiCount > 1 ? 's' : ''}`
            : 'No APIs';
          
          // Status cell with template for styled pill
          const statusCell = new TableItem({ data: app.status });
          if (this.statusTemplate) {
            statusCell.template = this.statusTemplate;
          }

          return [
            firstCell,
            statusCell,
            new TableItem({ data: envText }),
            new TableItem({ data: app.owner }),
            new TableItem({ data: apiText }),
            new TableItem({ data: this.formatDate(app.updatedAt) })
          ];
        });
      } finally {
        this.isUpdatingTable = false;
        this.updateTableTimeout = null;
      }
    }, 10);
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

  clearType() {
    this.selectedType.set('');
    this.updateTableData();
  }

  clearAllFilters() {
    this.searchQuery.set('');
    this.selectedStatus.set('');
    this.selectedType.set('');
    this.showArchived.set('false');
    this.updateTableData();
  }

  onRowClick(event: any) {
    const rowIndex = event?.selectedRowIndex ?? event?.rowIndex ?? event?.index;
    
    if (rowIndex === undefined || rowIndex === null || rowIndex < 0) {
      this.logger.warn('Could not determine row index from event', { event });
      return;
    }
    
    const filtered = this.filteredApplications();
    if (rowIndex >= filtered.length) {
      this.logger.warn('Row index out of bounds', { rowIndex, filteredCount: filtered.length });
      return;
    }
    
    const application = filtered[rowIndex];
    if (!application || !application.id) {
      this.logger.warn('Could not find application at row index', { rowIndex });
      return;
    }
    
    // Navigate to application detail page
    this.router.navigate(['/applications', application.id]);
  }

  addNewApplication() {
    // Placeholder - will be implemented later
    this.logger.info('Add New Application clicked');
    alert('Add New Application flow coming soon!');
  }
}
