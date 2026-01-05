import { Component, OnInit, OnDestroy, signal, computed, inject, effect } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  TableModule,
  TableModel,
  TableItem,
  TableHeaderItem,
  ButtonModule,
  TagModule,
  ModalModule,
  InputModule,
  SelectModule
} from 'carbon-components-angular';
import { User, UserStatus, UserRole, InviteUserPayload } from '../shared/models/user.model';
import { UsersService } from '../shared/services/users.service';
import { DataTableComponent } from '../shared/components/data-table/data-table.component';
import { TextInputComponent } from '../shared/components/primitives/text-input/text-input.component';
import { SelectComponent, SelectOption } from '../shared/components/primitives/select/select.component';
import { IconButtonComponent } from '../shared/components/primitives/icon-button/icon-button.component';
import { FilterChipComponent } from '../shared/components/primitives/filter-chip/filter-chip.component';
import { ConfirmDialogComponent } from '../shared/components/confirm-dialog/confirm-dialog.component';
import { UserDetailsDrawerComponent } from '../shared/components/user-details-drawer/user-details-drawer.component';
import { LoggerService } from '../core/services/logger.service';

@Component({
  selector: 'app-users',
  standalone: false,
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1>Users</h1>
          <p class="page-subtitle">Manage user accounts and role assignments</p>
        </div>
        <div class="header-actions">
          <button ibmButton="primary" (click)="openInviteDrawer()" type="button">Invite User</button>
        </div>
      </div>

      <div class="toolbar-container">
        <div class="toolbar">
          <div class="toolbar-row toolbar-row-primary">
            <div class="toolbar-search">
              <app-text-input
                label="Search"
                placeholder="Search by name or email…"
                [ngModel]="searchQuery()"
                (ngModelChange)="searchQuery.set($event); onSearchChange()"
                (escape)="clearSearch()"
                ariaLabel="Search users">
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
                label="Company"
                [options]="companySelectOptions()"
                [ngModel]="selectedCompany()"
                (ngModelChange)="selectedCompany.set($event); onSearchChange()"
                ariaLabel="Filter by company">
              </app-select>
              
              <app-select
                label="Role"
                [options]="roleSelectOptions"
                [ngModel]="selectedRole()"
                (ngModelChange)="selectedRole.set($event); onSearchChange()"
                ariaLabel="Filter by role">
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
              *ngIf="selectedCompany()"
              label="Company"
              [value]="getCompanyName(selectedCompany()!)"
              (remove)="clearCompany()">
            </app-filter-chip>
            <app-filter-chip
              *ngIf="selectedRole()"
              label="Role"
              [value]="selectedRole()"
              (remove)="clearRole()">
            </app-filter-chip>
          </div>
        </div>
      </div>

      <div class="table-container" (click)="onTableClick($event)">
        <app-data-table
          [model]="tableModel"
          [loading]="loading()"
          size="sm"
          (rowClick)="onRowClick($event)">
        </app-data-table>
        
        <div class="empty-state" *ngIf="!loading() && filteredUsers().length === 0">
          <p class="empty-state-title">No users found</p>
          <p class="empty-state-description" *ngIf="hasActiveFilters()">
            Try clearing your filters to see more results.
          </p>
          <p class="empty-state-description" *ngIf="!hasActiveFilters()">
            Get started by inviting a new user.
          </p>
        </div>
      </div>
    </div>

    <!-- Invite User Drawer -->
    <ibm-modal
      [open]="inviteDrawerOpen()"
      [size]="'md'"
      (overlaySelected)="closeInviteDrawer()">
      <ibm-modal-header (closeSelect)="closeInviteDrawer()">
        <p class="bx--modal-header__heading">Invite User</p>
      </ibm-modal-header>
      <div ibmModalContent>
        <form [formGroup]="inviteForm">
          <ibm-label>
            Email <span class="required">*</span>
            <input
              ibmText
              formControlName="email"
              type="email"
              placeholder="user@example.com"
              required>
            <span class="bx--form__requirement" *ngIf="inviteForm.get('email')?.hasError('required') && inviteForm.get('email')?.touched">
              Email is required
            </span>
            <span class="bx--form__requirement" *ngIf="inviteForm.get('email')?.hasError('email') && inviteForm.get('email')?.touched">
              Please enter a valid email address
            </span>
          </ibm-label>

          <ibm-label>
            First name (optional)
            <input
              ibmText
              formControlName="firstName"
              placeholder="John">
          </ibm-label>

          <ibm-label>
            Last name (optional)
            <input
              ibmText
              formControlName="lastName"
              placeholder="Doe">
          </ibm-label>

          <ibm-label>
            Company <span class="required">*</span>
            <select
              ibmSelect
              formControlName="companyId"
              required>
              <option value="">Select company</option>
              <option *ngFor="let company of companies()" [value]="company.id">
                {{ company.name }}
              </option>
            </select>
            <span class="bx--form__requirement" *ngIf="inviteForm.get('companyId')?.hasError('required') && inviteForm.get('companyId')?.touched">
              Company is required
            </span>
          </ibm-label>

          <ibm-label>
            Role(s) <span class="required">*</span>
            <select
              ibmSelect
              formControlName="roles"
              required>
              <option value="">Select role</option>
              <option *ngFor="let role of roleOptions" [value]="role">
                {{ role }}
              </option>
            </select>
            <span class="bx--form__requirement" *ngIf="inviteForm.get('roles')?.hasError('required') && inviteForm.get('roles')?.touched">
              At least one role is required
            </span>
          </ibm-label>

          <ibm-label>
            Message (optional)
            <textarea
              ibmText
              formControlName="message"
              rows="3"
              placeholder="Optional message to include in the invitation email">
            </textarea>
          </ibm-label>
        </form>
      </div>
      <ibm-modal-footer>
        <button ibmButton="secondary" (click)="closeInviteDrawer()">Cancel</button>
        <button
          ibmButton="primary"
          [disabled]="!inviteForm || inviteForm.invalid || inviting()"
          (click)="onInviteUser()">
          Send Invite
        </button>
      </ibm-modal-footer>
    </ibm-modal>

    <!-- User Details Drawer -->
    <app-user-details-drawer
      [user]="selectedUser()"
      [isOpen]="detailsDrawerOpen()"
      [companies]="companies()"
      [allUsers]="users()"
      (closed)="closeDetailsDrawer()"
      (userUpdated)="onUserUpdated($event)"
      (deactivateRequested)="deactivateUser()"
      (reactivateRequested)="reactivateUser()">
    </app-user-details-drawer>

    <!-- Actions Menu (kebab menu) -->
    <div class="actions-menu" *ngIf="actionsMenuOpen() && selectedUser()" [style.top.px]="actionsMenuPosition().top" [style.left.px]="actionsMenuPosition().left">
      <button class="menu-item" (click)="copyEmail()">Copy email</button>
      <button class="menu-item" *ngIf="selectedUser()!.status === 'Invited'" (click)="resendInvite()">Resend invite</button>
      <button 
        class="menu-item" 
        *ngIf="selectedUser()!.status === 'Active'" 
        (click)="deactivateUser()"
        [disabled]="isLastSystemAdmin(selectedUser()!)">
        Deactivate
      </button>
      <button 
        class="menu-item" 
        *ngIf="selectedUser()!.status === 'Deactivated' || selectedUser()!.status === 'Suspended'" 
        (click)="reactivateUser()">
        Reactivate
      </button>
      <div class="menu-helper" *ngIf="selectedUser()!.status === 'Active' && isLastSystemAdmin(selectedUser()!)">
        Cannot deactivate the last System Admin
      </div>
    </div>

    <!-- Confirm Dialogs -->
    <app-confirm-dialog
      [open]="deactivateConfirmOpen()"
      title="Deactivate User"
      [message]="'Deactivate this user? They will lose access immediately.'"
      confirmLabel="Deactivate"
      [danger]="true"
      (confirmed)="confirmDeactivate()"
      (cancelled)="cancelDeactivate()">
    </app-confirm-dialog>

    <app-confirm-dialog
      [open]="reactivateConfirmOpen()"
      title="Reactivate User"
      [message]="'Reactivate this user?'"
      confirmLabel="Reactivate"
      (confirmed)="confirmReactivate()"
      (cancelled)="cancelReactivate()">
    </app-confirm-dialog>
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
      position: relative;
    }

    /* Row hover styles */
    ::ng-deep {
      .bx--data-table tbody tr,
      .cds--data-table tbody tr {
        cursor: pointer;
        transition: background 150ms ease;
      }

      .bx--data-table tbody tr:hover,
      .cds--data-table tbody tr:hover {
        background: rgba(255, 255, 255, 0.05) !important;
      }

      /* Actions column should not trigger row click */
      .bx--data-table tbody tr td:last-child,
      .cds--data-table tbody tr td:last-child {
        cursor: default;
      }

      .bx--data-table tbody tr td:last-child:hover,
      .cds--data-table tbody tr td:last-child:hover {
        background: transparent !important;
      }
    }

    .empty-state {
      padding: 3rem;
      text-align: center;
      background: var(--linear-surface);
      border: 1px solid var(--linear-border);
      border-radius: 8px;
      margin-top: 1rem;
    }

    .empty-state-title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--linear-text-primary);
      margin: 0 0 0.5rem 0;
    }

    .empty-state-description {
      font-size: 0.875rem;
      color: var(--linear-text-secondary);
      margin: 0;
    }

    .required {
      color: #da1e28;
    }

    .user-details {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .detail-item label {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--linear-text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .detail-item p {
      font-size: 0.875rem;
      color: var(--linear-text-primary);
      margin: 0;
    }

    .roles-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .helper-text {
      font-size: 0.75rem;
      color: var(--linear-text-secondary);
      margin-top: 0.25rem;
    }

    .actions-menu {
      position: fixed;
      background: var(--linear-surface);
      border: 1px solid var(--linear-border);
      border-radius: 4px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 1000;
      min-width: 180px;
      padding: 0.25rem 0;
    }

    .menu-item {
      display: block;
      width: 100%;
      padding: 0.75rem 1rem;
      border: none;
      background: transparent;
      color: var(--linear-text-primary);
      font-size: 0.875rem;
      text-align: left;
      cursor: pointer;
      transition: background 150ms ease;
    }

    .menu-item:hover {
      background: rgba(0, 0, 0, 0.05);
    }

    .menu-item:first-child {
      border-top-left-radius: 4px;
      border-top-right-radius: 4px;
    }

    .menu-item:last-child {
      border-bottom-left-radius: 4px;
      border-bottom-right-radius: 4px;
    }

    .menu-item:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .menu-helper {
      padding: 0.5rem 1rem;
      font-size: 0.75rem;
      color: var(--linear-text-secondary);
      border-top: 1px solid var(--linear-border);
      margin-top: 0.25rem;
    }
  `]
})
export class UsersComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private usersService = inject(UsersService);
  private logger = inject(LoggerService);

  loading = signal(false);
  users = signal<User[]>([]);
  companies = signal<Array<{ id: string; name: string }>>([]);
  searchQuery = signal('');
  selectedStatus = signal('');
  selectedCompany = signal('');
  selectedRole = signal('');
  sortBy = signal('name');
  inviteDrawerOpen = signal(false);
  detailsDrawerOpen = signal(false);
  actionsMenuOpen = signal(false);
  actionsMenuPosition = signal({ top: 0, left: 0 });
  selectedUser = signal<User | null>(null);
  deactivateConfirmOpen = signal(false);
  reactivateConfirmOpen = signal(false);
  inviting = signal(false);
  private isUpdatingTable = false;
  private updateTableTimeout: any = null;

  readonly statusSelectOptions: SelectOption[] = [
    { value: '', label: 'All' },
    { value: 'Active', label: 'Active' },
    { value: 'Invited', label: 'Invited' },
    { value: 'Suspended', label: 'Suspended' },
    { value: 'Deactivated', label: 'Deactivated' }
  ];

  readonly roleSelectOptions: SelectOption[] = [
    { value: '', label: 'All' },
    { value: 'System Admin', label: 'System Admin' },
    { value: 'Company Manager', label: 'Company Manager' },
    { value: 'Developer', label: 'Developer' },
    { value: 'Read-only', label: 'Read-only' }
  ];

  readonly sortSelectOptions: SelectOption[] = [
    { value: 'name', label: 'Name (A-Z)' },
    { value: 'name-desc', label: 'Name (Z-A)' },
    { value: 'lastLogin', label: 'Last login (recent)' },
    { value: 'company', label: 'Company (A-Z)' }
  ];

  readonly roleOptions: UserRole[] = ['System Admin', 'Company Manager', 'Developer', 'Read-only'];

  companySelectOptions = computed(() => {
    const options: SelectOption[] = [{ value: '', label: 'All' }];
    this.companies().forEach(company => {
      options.push({ value: company.id, label: company.name });
    });
    return options;
  });

  tableModel = new TableModel();

  filteredUsers = computed(() => {
    let filtered = [...this.users()];
    const searchQuery = this.searchQuery();
    const selectedStatus = this.selectedStatus();
    const selectedCompany = this.selectedCompany();
    const selectedRole = this.selectedRole();
    const sortBy = this.sortBy();

    // Search by name or email
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(u =>
        u.email.toLowerCase().includes(query) ||
        (u.firstName && u.firstName.toLowerCase().includes(query)) ||
        (u.lastName && u.lastName.toLowerCase().includes(query)) ||
        `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (selectedStatus) {
      filtered = filtered.filter(u => u.status === selectedStatus);
    }

    // Filter by company
    if (selectedCompany) {
      filtered = filtered.filter(u => u.companyId === selectedCompany);
    }

    // Filter by role
    if (selectedRole) {
      filtered = filtered.filter(u => u.roles.includes(selectedRole as UserRole));
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          const aName = `${a.firstName || ''} ${a.lastName || ''}`.trim() || a.email;
          const bName = `${b.firstName || ''} ${b.lastName || ''}`.trim() || b.email;
          return aName.localeCompare(bName);
        case 'name-desc':
          const aNameDesc = `${a.firstName || ''} ${a.lastName || ''}`.trim() || a.email;
          const bNameDesc = `${b.firstName || ''} ${b.lastName || ''}`.trim() || b.email;
          return bNameDesc.localeCompare(aNameDesc);
        case 'lastLogin':
          const aLogin = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0;
          const bLogin = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0;
          return bLogin - aLogin;
        case 'company':
          return a.companyName.localeCompare(b.companyName);
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
      this.selectedCompany() ||
      this.selectedRole()
    );
  });

  inviteForm!: FormGroup;
  private fb = inject(FormBuilder);

  constructor() {
    // Automatically update table whenever filteredUsers changes
    effect(() => {
      const filtered = this.filteredUsers();
      this.updateTableData();
    });
  }

  ngOnInit() {
    this.buildTable();
    this.loadUsers();
    this.loadCompanies();
    this.initializeInviteForm();
    
    // Close actions menu on outside click
    document.addEventListener('click', this.handleDocumentClick.bind(this));
  }

  ngOnDestroy() {
    if (this.updateTableTimeout) {
      clearTimeout(this.updateTableTimeout);
    }
    document.removeEventListener('click', this.handleDocumentClick.bind(this));
  }

  handleDocumentClick(event: MouseEvent) {
    if (this.actionsMenuOpen()) {
      const target = event.target as HTMLElement;
      // Close menu if clicking outside of it
      if (!target.closest('.actions-menu') && 
          !target.closest('td:last-child') &&
          !target.closest('.bx--data-table tbody tr td:last-child') &&
          !target.closest('.cds--data-table tbody tr td:last-child')) {
        this.actionsMenuOpen.set(false);
      }
    }
  }

  loadUsers() {
    this.loading.set(true);
    this.logger.debug('Loading users from service');
    this.usersService.listUsers().subscribe({
      next: (users) => {
        this.logger.debug(`Loaded ${users.length} users`);
        this.users.set(users);
        this.loading.set(false);
      },
      error: (err) => {
        this.logger.error('Error loading users', err);
        this.loading.set(false);
      }
    });
  }

  loadCompanies() {
    this.usersService.getCompanies().subscribe({
      next: (companies) => {
        this.companies.set(companies);
      },
      error: (err) => {
        this.logger.error('Error loading companies', err);
      }
    });
  }

  buildTable() {
    this.tableModel.header = [
      new TableHeaderItem({ data: 'Name' }),
      new TableHeaderItem({ data: 'Email' }),
      new TableHeaderItem({ data: 'Role(s)' }),
      new TableHeaderItem({ data: 'Company' }),
      new TableHeaderItem({ data: 'Status' }),
      new TableHeaderItem({ data: 'Last Login' }),
      new TableHeaderItem({ data: 'Last Updated' }),
      new TableHeaderItem({ data: '' }) // Empty header for actions column
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
        const filtered = this.filteredUsers();
        this.tableModel.data = filtered.map((user, index) => {
          const firstCell = new TableItem({
            data: this.getUserDisplayName(user),
            expandedData: user.id,
            rawData: { userId: user.id, index: index }
          });
          return [
            firstCell,
            new TableItem({ data: user.email }),
            new TableItem({ data: user.roles.join(', '), rawData: { roles: user.roles } }),
            new TableItem({ data: user.companyName }),
            new TableItem({ data: user.status, rawData: { status: user.status } }),
            new TableItem({ data: user.lastLoginAt ? this.formatDate(user.lastLoginAt) : '—' }),
            new TableItem({ data: this.formatDate(user.updatedAt) }),
            new TableItem({
              data: '⋮',
              rawData: { isAction: true, userId: user.id }
            })
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

  getUserDisplayName(user: User): string {
    if (user.firstName || user.lastName) {
      return `${user.firstName || ''} ${user.lastName || ''}`.trim();
    }
    return user.email;
  }

  getCompanyName(companyId: string): string {
    const company = this.companies().find(c => c.id === companyId);
    return company?.name || companyId;
  }

  getStatusTagType(status: UserStatus): 'red' | 'blue' | 'green' | 'gray' {
    switch (status) {
      case 'Active':
        return 'green';
      case 'Invited':
        return 'blue';
      case 'Suspended':
        return 'red';
      case 'Deactivated':
        return 'gray';
      default:
        return 'gray';
    }
  }

  getRoleTagType(role: UserRole): 'red' | 'blue' | 'green' | 'gray' | 'magenta' | 'purple' | 'teal' {
    switch (role) {
      case 'System Admin':
        return 'red';
      case 'Company Manager':
        return 'blue';
      case 'Developer':
        return 'green';
      case 'Read-only':
        return 'gray';
      default:
        return 'blue';
    }
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

  clearCompany() {
    this.selectedCompany.set('');
    this.updateTableData();
  }

  clearRole() {
    this.selectedRole.set('');
    this.updateTableData();
  }

  clearAllFilters() {
    this.searchQuery.set('');
    this.selectedStatus.set('');
    this.selectedCompany.set('');
    this.selectedRole.set('');
    this.updateTableData();
  }

  onTableClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    
    // Check if click was on actions column (last column) - kebab menu
    const cell = target.closest('td');
    if (cell) {
      const row = cell.closest('tr');
      if (row) {
        const cells = Array.from(row.querySelectorAll('td'));
        const isLastColumn = cells.length > 0 && cell === cells[cells.length - 1];
        
        if (isLastColumn) {
          // Find the row index
          const tbody = row.closest('tbody');
          if (tbody) {
            const rows = Array.from(tbody.querySelectorAll('tr'));
            const rowIndex = rows.indexOf(row);
            
            if (rowIndex >= 0) {
              const filtered = this.filteredUsers();
              if (rowIndex < filtered.length) {
                const user = filtered[rowIndex];
                if (user) {
                  // Click was on actions column - open menu positioned at click location
                  this.selectedUser.set(user);
                  const rect = cell.getBoundingClientRect();
                  
                  // Calculate position with bounds checking
                  const menuWidth = 180;
                  const menuHeight = 200;
                  let left = rect.left;
                  let top = rect.bottom + 4;
                  
                  // Adjust if menu would go off right edge
                  if (left + menuWidth > window.innerWidth) {
                    left = window.innerWidth - menuWidth - 8;
                  }
                  
                  // Adjust if menu would go off bottom edge
                  if (top + menuHeight > window.innerHeight) {
                    top = rect.top - menuHeight - 4;
                  }
                  
                  // Ensure menu doesn't go off left edge
                  if (left < 8) {
                    left = 8;
                  }
                  
                  // Ensure menu doesn't go off top edge
                  if (top < 8) {
                    top = 8;
                  }
                  
                  this.actionsMenuPosition.set({ top, left });
                  this.actionsMenuOpen.set(true);
                  event.stopPropagation();
                  event.preventDefault();
                  return;
                }
              }
            }
          }
        }
      }
    }
  }

  onRowClick(event: any) {
    // Don't process row clicks if clicking on actions menu or actions column
    const target = (event?.event || event)?.target as HTMLElement;
    if (target?.closest('.actions-menu') || target?.closest('td:last-child')) {
      return;
    }

    const rowIndex = event?.selectedRowIndex ?? event?.rowIndex ?? event?.index;

    if (rowIndex === undefined || rowIndex === null || rowIndex < 0) {
      return;
    }

    const filtered = this.filteredUsers();
    if (rowIndex >= filtered.length) {
      return;
    }

    const user = filtered[rowIndex];
    if (!user || !user.id) {
      return;
    }

    // Regular row click - open details drawer
    this.selectedUser.set(user);
    this.detailsDrawerOpen.set(true);
  }

  openInviteDrawer() {
    this.inviteDrawerOpen.set(true);
  }

  closeInviteDrawer() {
    this.inviteDrawerOpen.set(false);
    if (this.inviteForm) {
      this.inviteForm.reset();
    }
  }

  initializeInviteForm() {
    this.inviteForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      firstName: [''],
      lastName: [''],
      companyId: ['', Validators.required],
      roles: ['', Validators.required],
      message: ['']
    });
  }

  onInviteUser() {
    if (!this.inviteForm || this.inviteForm.invalid) {
      return;
    }

    this.inviting.set(true);
    const formValue = this.inviteForm.value;
    const payload: InviteUserPayload = {
      email: formValue.email,
      firstName: formValue.firstName || undefined,
      lastName: formValue.lastName || undefined,
      companyId: formValue.companyId,
      roles: [formValue.roles],
      message: formValue.message || undefined
    };

    this.usersService.inviteUser(payload).subscribe({
      next: (user) => {
        this.logger.info(`User ${user.email} invited successfully`);
        this.inviting.set(false);
        this.closeInviteDrawer();
        this.loadUsers();
        // Show toast notification (would use a toast service in production)
        alert('Invite sent');
      },
      error: (err) => {
        this.logger.error('Error inviting user', err);
        this.inviting.set(false);
        alert('Error sending invite: ' + (err.message || 'Unknown error'));
      }
    });
  }

  closeDetailsDrawer() {
    this.detailsDrawerOpen.set(false);
    this.selectedUser.set(null);
  }

  onUserUpdated(updatedUser: User) {
    // Update the user in the local list
    this.users.update(users => 
      users.map(u => u.id === updatedUser.id ? updatedUser : u)
    );
    this.logger.info('User updated in table');
  }

  resendInvite() {
    const user = this.selectedUser();
    if (!user) return;

    this.actionsMenuOpen.set(false);
    this.usersService.resendInvite(user.id).subscribe({
      next: () => {
        this.logger.info(`Invite resent for ${user.email}`);
        this.loadUsers();
      },
      error: (err) => {
        this.logger.error('Error resending invite', err);
      }
    });
  }

  deactivateUser() {
    this.actionsMenuOpen.set(false);
    const user = this.selectedUser();
    if (!user) return;

    // Check if this is the last System Admin
    if (this.isLastSystemAdmin(user)) {
      alert('Cannot deactivate the last System Admin');
      return;
    }

    this.deactivateConfirmOpen.set(true);
  }

  confirmDeactivate() {
    const user = this.selectedUser();
    if (!user) return;

    this.usersService.setUserStatus(user.id, 'Deactivated').subscribe({
      next: (updatedUser) => {
        this.logger.info(`User ${user.email} deactivated`);
        this.deactivateConfirmOpen.set(false);
        // Update user in list
        this.users.update(users => 
          users.map(u => u.id === updatedUser.id ? updatedUser : u)
        );
        // Update selected user if drawer is open
        if (this.selectedUser()?.id === updatedUser.id) {
          this.selectedUser.set(updatedUser);
        }
      },
      error: (err) => {
        this.logger.error('Error deactivating user', err);
        this.deactivateConfirmOpen.set(false);
        if (err.message && err.message.includes('last System Admin')) {
          alert('Cannot deactivate the last System Admin');
        } else {
          alert('Error deactivating user: ' + (err.message || 'Unknown error'));
        }
      }
    });
  }

  cancelDeactivate() {
    this.deactivateConfirmOpen.set(false);
  }

  reactivateUser() {
    this.actionsMenuOpen.set(false);
    this.reactivateConfirmOpen.set(true);
  }

  confirmReactivate() {
    const user = this.selectedUser();
    if (!user) return;

    this.usersService.setUserStatus(user.id, 'Active').subscribe({
      next: (updatedUser) => {
        this.logger.info(`User ${user.email} reactivated`);
        this.reactivateConfirmOpen.set(false);
        // Update user in list
        this.users.update(users => 
          users.map(u => u.id === updatedUser.id ? updatedUser : u)
        );
        // Update selected user if drawer is open
        if (this.selectedUser()?.id === updatedUser.id) {
          this.selectedUser.set(updatedUser);
        }
      },
      error: (err) => {
        this.logger.error('Error reactivating user', err);
        this.reactivateConfirmOpen.set(false);
        alert('Error reactivating user: ' + (err.message || 'Unknown error'));
      }
    });
  }

  cancelReactivate() {
    this.reactivateConfirmOpen.set(false);
  }

  copyEmail() {
    const user = this.selectedUser();
    if (!user) return;

    this.actionsMenuOpen.set(false);
    navigator.clipboard.writeText(user.email).then(() => {
      this.logger.info(`Email ${user.email} copied to clipboard`);
      // Could show a toast notification here
    }).catch((err) => {
      this.logger.error('Error copying email', err);
    });
  }

  isLastSystemAdmin(user: User): boolean {
    if (!user.roles.includes('System Admin') || user.status !== 'Active') {
      return false;
    }
    // Check if this is the last active System Admin
    const activeSystemAdmins = this.users().filter(u =>
      u.roles.includes('System Admin') && 
      u.status === 'Active' &&
      u.id !== user.id
    );
    return activeSystemAdmins.length === 0;
  }
}
