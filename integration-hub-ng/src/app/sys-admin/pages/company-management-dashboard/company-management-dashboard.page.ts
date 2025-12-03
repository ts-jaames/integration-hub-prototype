import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, switchMap, startWith } from 'rxjs/operators';
import { Subject, combineLatest } from 'rxjs';
import {
  TableModule,
  TableModel,
  TableItem,
  TableHeaderItem,
  ButtonModule,
  TagModule,
  ModalModule,
  InputModule,
  CheckboxModule,
  InlineLoadingModule
} from 'carbon-components-angular';
import { InMemoryAdminApiService } from '../../services/in-memory-admin-api.service';
import { Company, CompanyStatus } from '../../models';
import { StatusTagComponent } from '../../shared/components/status-tag/status-tag.component';
import { TableEmptyStateComponent } from '../../shared/components/table-empty-state/table-empty-state.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { RightRailAnchorsComponent, Anchor } from '../../shared/components/right-rail-anchors/right-rail-anchors.component';

@Component({
  selector: 'app-company-management-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    TagModule,
    ModalModule,
    InputModule,
    CheckboxModule,
    InlineLoadingModule,
    StatusTagComponent,
    TableEmptyStateComponent,
    ConfirmDialogComponent,
    RightRailAnchorsComponent
  ],
  template: `
    <div class="container">
      <div class="page-header">
        <h1>Companies</h1>
        <button ibmButton="primary" (click)="openNewCompanyModal()">New company</button>
      </div>

      <div class="page-content">
        <div class="main-content">
          <section id="overview" class="section">
            <div class="filters-row">
              <div class="search-input">
                <input
                  ibmText
                  placeholder="Search companies..."
                  [(ngModel)]="searchQuery"
                  (ngModelChange)="onSearchChange($event)">
              </div>
              
              <div class="filter-group">
                <label class="filter-label">Status:</label>
                <div class="checkbox-group">
                  <ibm-checkbox
                    *ngFor="let status of statusOptions"
                    [checked]="selectedStatuses().includes(status)"
                    (checkedChange)="toggleStatus(status, $event)">
                    {{ status }}
                  </ibm-checkbox>
                </div>
              </div>

              <div class="filter-group">
                <ibm-checkbox
                  [checked]="vendorOnly()"
                  (checkedChange)="vendorOnly.set($event)">
                  Vendor companies only
                </ibm-checkbox>
              </div>
            </div>

            <div class="table-container" id="companies">
              <ibm-table
                [model]="tableModel"
                [skeleton]="loading()"
                size="sm"
                [showSelectionColumn]="true"
                (selectRow)="onRowSelect($event)">
              </ibm-table>

              <app-table-empty-state
                *ngIf="!loading() && filteredCompanies().length === 0"
                title="No companies found"
                description="Try adjusting your filters or create a new company."
                actionLabel="New company"
                (action)="openNewCompanyModal()">
              </app-table-empty-state>
            </div>

            <div class="bulk-actions" id="bulk-actions" *ngIf="selectedCompanies().length > 0">
              <div class="bulk-actions-info">
                {{ selectedCompanies().length }} selected
              </div>
              <div class="bulk-actions-buttons">
                <button ibmButton="secondary" (click)="bulkSuspend()">Suspend</button>
                <button ibmButton="danger" (click)="bulkDelete()">Delete</button>
              </div>
            </div>
          </section>
        </div>

        <app-right-rail-anchors [anchors]="anchors"></app-right-rail-anchors>
      </div>
    </div>

    <!-- New Company Modal -->
    <ibm-modal
      [open]="newCompanyModalOpen()"
      [size]="'md'"
      (overlaySelected)="closeNewCompanyModal()">
      <ibm-modal-header (closeSelect)="closeNewCompanyModal()">
        <p class="bx--modal-header__heading">New Company</p>
      </ibm-modal-header>
      <div ibmModalContent>
        <form [formGroup]="newCompanyForm" (ngSubmit)="onSubmitNewCompany()">
          <ibm-label>
            Company name
            <input ibmText formControlName="name" placeholder="Acme Corporation" required>
            <span class="bx--form__requirement" *ngIf="newCompanyForm.get('name')?.hasError('required')">
              Required
            </span>
          </ibm-label>

          <ibm-label>
            Slug
            <input ibmText formControlName="slug" placeholder="acme-corporation" required>
            <span class="bx--form__requirement" *ngIf="newCompanyForm.get('slug')?.hasError('required')">
              Required
            </span>
            <span class="bx--form__requirement" *ngIf="newCompanyForm.get('slug')?.hasError('pattern')">
              Must be lowercase letters, numbers, and hyphens only
            </span>
          </ibm-label>

          <ibm-checkbox formControlName="vendor">Vendor company</ibm-checkbox>

          <ibm-label>
            Website (optional)
            <input ibmText formControlName="website" placeholder="https://example.com">
          </ibm-label>

          <ibm-label>
            Address (optional)
            <input ibmText formControlName="address" placeholder="123 Main St, City, State">
          </ibm-label>

                  <ibm-label>
                    Notes (optional)
                    <textarea
                      ibmText
                      formControlName="notes"
                      rows="3"
                      placeholder="Additional notes...">
                    </textarea>
                  </ibm-label>
        </form>
      </div>
      <ibm-modal-footer>
        <button ibmButton="secondary" (click)="closeNewCompanyModal()">Cancel</button>
        <button
          ibmButton="primary"
          [disabled]="newCompanyForm.invalid || creating()"
          (click)="onSubmitNewCompany()">
          <ibm-inline-loading *ngIf="creating()" [state]="'active'"></ibm-inline-loading>
          <span *ngIf="!creating()">Create</span>
        </button>
      </ibm-modal-footer>
    </ibm-modal>

    <!-- Delete Confirmation -->
    <app-confirm-dialog
      [open]="deleteConfirmOpen()"
      title="Delete Company"
      [message]="deleteConfirmMessage()"
      confirmLabel="Delete"
      [danger]="true"
      [requireTextConfirmation]="true"
      [confirmationText]="companyToDelete()?.name || ''"
      (confirmed)="confirmDelete()"
      (cancelled)="cancelDelete()">
    </app-confirm-dialog>
  `,
  styles: [`
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }

    .page-header h1 {
      font-size: 2rem;
      font-weight: 600;
      color: var(--linear-text-primary);
      margin: 0;
    }

    .page-content {
      display: grid;
      grid-template-columns: 1fr 280px;
      gap: 2rem;
    }

    @media (max-width: 991px) {
      .page-content {
        grid-template-columns: 1fr;
      }
    }

    .filters-row {
      display: flex;
      gap: 1.5rem;
      align-items: flex-start;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
    }

    .search-input {
      flex: 1;
      min-width: 200px;
    }

    .filter-group {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .filter-label {
      font-size: 0.875rem;
      color: var(--linear-text-secondary);
      margin-right: 0.5rem;
    }

    .checkbox-group {
      display: flex;
      gap: 1rem;
    }

    .table-container {
      // No border - matching Recent Activity table aesthetic
      margin-bottom: 1.5rem;
    }

    .bulk-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      background: var(--linear-surface);
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 6px;
    }

    .bulk-actions-buttons {
      display: flex;
      gap: 0.5rem;
    }

    .section {
      margin-bottom: 3rem;
    }
  `]
})
export class CompanyManagementDashboardPage implements OnInit {
  private api = inject(InMemoryAdminApiService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  loading = signal(false);
  companies = signal<Company[]>([]);
  users = signal<any[]>([]);
  selectedCompanies = signal<Company[]>([]);
  searchQuery = '';
  selectedStatuses = signal<CompanyStatus[]>([]);
  vendorOnly = signal(false);
  
  newCompanyModalOpen = signal(false);
  creating = signal(false);
  deleteConfirmOpen = signal(false);
  companyToDelete = signal<Company | null>(null);

  statusOptions: CompanyStatus[] = ['active', 'suspended', 'deleted', 'pending'];

  tableModel = new TableModel();
  
  anchors: Anchor[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'companies', label: 'Companies' },
    { id: 'bulk-actions', label: 'Bulk actions' }
  ];

  newCompanyForm: FormGroup = this.fb.group({
    name: ['', Validators.required],
    slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
    vendor: [false],
    website: [''],
    address: [''],
    notes: ['']
  });

  private searchSubject = new Subject<string>();

  filteredCompanies = computed(() => {
    let filtered = [...this.companies()];
    
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(query) || 
        c.slug.toLowerCase().includes(query)
      );
    }
    
    if (this.selectedStatuses().length > 0) {
      filtered = filtered.filter(c => this.selectedStatuses().includes(c.status));
    }
    
    if (this.vendorOnly()) {
      filtered = filtered.filter(c => c.vendor === true);
    }
    
    return filtered;
  });

  deleteConfirmMessage = computed(() => {
    const company = this.companyToDelete();
    if (!company) return '';
    return `Are you sure you want to delete "${company.name}"? This action cannot be undone. Type the company name to confirm.`;
  });

  ngOnInit() {
    this.loadCompanies();
    this.loadUsers();
    this.setupTable();
    
    this.newCompanyForm.get('name')?.valueChanges.subscribe(name => {
      if (name && !this.newCompanyForm.get('slug')?.dirty) {
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        this.newCompanyForm.patchValue({ slug }, { emitEvent: false });
      }
    });
  }

  loadUsers() {
    this.api.listUsers().subscribe({
      next: (users) => {
        this.users.set(users);
      }
    });
  }

  loadCompanies() {
    this.loading.set(true);
    this.api.listCompanies().subscribe({
      next: (companies) => {
        this.companies.set(companies);
        this.loading.set(false);
        this.updateTable();
      },
      error: () => {
        this.loading.set(false);
        console.log({
          type: 'error',
          title: 'Error',
          message: 'Failed to load companies'
        });
      }
    });
  }

  setupTable() {
    this.tableModel.header = [
      new TableHeaderItem({ data: 'Company' }),
      new TableHeaderItem({ data: 'Status' }),
      new TableHeaderItem({ data: 'Teams' }),
      new TableHeaderItem({ data: 'Users' }),
      new TableHeaderItem({ data: 'Updated' }),
      new TableHeaderItem({ data: 'Actions' })
    ];
  }

  updateTable() {
    const companies = this.filteredCompanies();
    this.tableModel.data = companies.map(company => [
      new TableItem({ 
        data: company.name,
        expandedData: company.id // Store ID for row actions
      }),
      new TableItem({ data: company.status }),
      new TableItem({ data: company.teams.length.toString() }),
      new TableItem({ data: this.getUserCount(company.id).toString() }),
      new TableItem({ data: this.formatDate(company.updatedAt) }),
      new TableItem({ data: company.id })
    ]);
  }

  viewCompany(companyId: string) {
    this.router.navigate(['/admin/companies', companyId]);
  }

  suspendCompany(company: Company) {
    this.api.suspendCompany(company.id).subscribe({
      next: () => {
        this.loadCompanies();
        console.log({
          type: 'success',
          title: 'Success',
          message: `Company "${company.name}" ${company.status === 'suspended' ? 'activated' : 'suspended'}`
        });
      },
      error: () => {
        console.log({
          type: 'error',
          title: 'Error',
          message: 'Failed to update company status'
        });
      }
    });
  }

  deleteCompany(company: Company) {
    this.companyToDelete.set(company);
    this.deleteConfirmOpen.set(true);
  }

  getUserCount(companyId: string): number {
    return this.users().filter(u => u.companyId === companyId).length;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  }

  onSearchChange(query: string) {
    this.searchQuery = query;
    this.updateTable();
  }

  toggleStatus(status: CompanyStatus, checked: boolean) {
    const current = this.selectedStatuses();
    if (checked) {
      this.selectedStatuses.set([...current, status]);
    } else {
      this.selectedStatuses.set(current.filter(s => s !== status));
    }
    this.updateTable();
  }

  onRowSelect(event: any) {
    // Handle row selection for bulk actions
    const selectedIndices = event.selectedRowsIndices || [];
    const selected = selectedIndices.map((idx: number) => this.filteredCompanies()[idx]).filter(Boolean);
    this.selectedCompanies.set(selected);
  }

  openNewCompanyModal() {
    this.newCompanyModalOpen.set(true);
  }

  closeNewCompanyModal() {
    this.newCompanyModalOpen.set(false);
    this.newCompanyForm.reset();
  }

  onSubmitNewCompany() {
    if (this.newCompanyForm.invalid) return;
    
    this.creating.set(true);
    const formValue = this.newCompanyForm.value;
    
    this.api.createCompany({
      name: formValue.name,
      slug: formValue.slug,
      vendor: formValue.vendor,
      metadata: {
        website: formValue.website || undefined,
        address: formValue.address || undefined,
        notes: formValue.notes || undefined
      }
    }).subscribe({
      next: () => {
        this.creating.set(false);
        this.closeNewCompanyModal();
        this.loadCompanies();
        console.log({
          type: 'success',
          title: 'Success',
          message: `Company "${formValue.name}" created successfully`
        });
      },
      error: () => {
        this.creating.set(false);
        console.log({
          type: 'error',
          title: 'Error',
          message: 'Failed to create company'
        });
      }
    });
  }

  bulkSuspend() {
    // Implement bulk suspend
  }

  bulkDelete() {
    // Implement bulk delete
  }

  confirmDelete() {
    const company = this.companyToDelete();
    if (!company) return;
    
    this.api.deleteCompany(company.id).subscribe({
      next: () => {
        this.deleteConfirmOpen.set(false);
        this.companyToDelete.set(null);
        this.loadCompanies();
        console.log({
          type: 'success',
          title: 'Success',
          message: `Company "${company.name}" deleted successfully`
        });
      },
      error: () => {
        console.log({
          type: 'error',
          title: 'Error',
          message: 'Failed to delete company'
        });
      }
    });
  }

  cancelDelete() {
    this.deleteConfirmOpen.set(false);
    this.companyToDelete.set(null);
  }
}

