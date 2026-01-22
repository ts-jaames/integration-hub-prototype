import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
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
  CheckboxModule,
  SelectModule,
} from 'carbon-components-angular';
import { InMemoryAdminApiService } from '../../services/in-memory-admin-api.service';
import { User, RoleKey } from '../../models';
import { StatusTagComponent } from '../../shared/components/status-tag/status-tag.component';
import { RoleTagPipe } from '../../shared/pipes/role-tag.pipe';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { LoggerService } from '../../../core/services/logger.service';

@Component({
  selector: 'app-company-users',
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
    SelectModule,
    StatusTagComponent,
    RoleTagPipe,
    ConfirmDialogComponent
  ],
  template: `
    <div class="container">
      <div class="page-header">
        <button ibmButton="ghost" (click)="goBack()">← Back</button>
        <h1>Users at {{ companyName() }}</h1>
        <button ibmButton="primary" (click)="openInviteModal()">Invite user</button>
      </div>

      <div class="filters-row">
        <input ibmText placeholder="Search users..." [(ngModel)]="searchQuery" (ngModelChange)="updateTable()">
      </div>

      <div class="table-container">
        <ibm-table [model]="tableModel" [skeleton]="loading()" size="sm"></ibm-table>
      </div>
    </div>

    <!-- Invite Modal -->
    <ibm-modal [open]="inviteModalOpen()" [size]="'sm'" (overlaySelected)="closeInviteModal()">
      <ibm-modal-header (closeSelect)="closeInviteModal()">
        <p class="bx--modal-header__heading">Invite User</p>
      </ibm-modal-header>
      <div ibmModalContent>
        <form [formGroup]="inviteForm" (ngSubmit)="submitInvite()">
          <ibm-label>
            Email
            <input ibmText formControlName="email" type="email" placeholder="user@example.com" required>
          </ibm-label>
          <ibm-label>
            Role
            <select ibmSelect formControlName="role" required>
              <option value="">Select a role</option>
              <option *ngFor="let role of availableRoles" [value]="role">{{ role | roleTag }}</option>
            </select>
          </ibm-label>
        </form>
      </div>
      <ibm-modal-footer>
        <button ibmButton="secondary" (click)="closeInviteModal()">Cancel</button>
        <button ibmButton="primary" [disabled]="inviteForm.invalid" (click)="submitInvite()">Send Invitation</button>
      </ibm-modal-footer>
    </ibm-modal>

    <!-- Assign Roles Modal -->
    <ibm-modal [open]="assignRolesModalOpen()" [size]="'md'" (overlaySelected)="closeAssignRolesModal()">
      <ibm-modal-header (closeSelect)="closeAssignRolesModal()">
        <p class="bx--modal-header__heading">Assign Roles</p>
      </ibm-modal-header>
      <div ibmModalContent>
        <p>Select roles for {{ selectedUser()?.email }}</p>
        <div class="role-checkboxes">
          <ibm-checkbox
            *ngFor="let role of availableRoles"
            [checked]="selectedRoles().includes(role)"
            (checkedChange)="toggleRole(role, $event)">
            {{ role | roleTag }}
          </ibm-checkbox>
        </div>
      </div>
      <ibm-modal-footer>
        <button ibmButton="secondary" (click)="closeAssignRolesModal()">Cancel</button>
        <button ibmButton="primary" [disabled]="selectedRoles().length === 0" (click)="saveRoles()">Save</button>
      </ibm-modal-footer>
    </ibm-modal>

    <app-confirm-dialog
      [open]="suspendConfirmOpen()"
      title="Suspend User"
      [message]="'Are you sure you want to suspend this user?'"
      confirmLabel="Suspend"
      (confirmed)="confirmSuspend()"
      (cancelled)="cancelSuspend()">
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
      gap: 1rem;
    }

    .page-header h1 {
      font-size: 2rem;
      font-weight: 600;
      color: var(--linear-text-primary);
      margin: 0;
      flex: 1;
    }

    .filters-row {
      margin-bottom: 1.5rem;
    }

    .table-container {
      // No border - matching Recent Activity table aesthetic
    }

    .role-checkboxes {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-top: 1rem;
    }
  `]
})
export class CompanyUsersPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(InMemoryAdminApiService);
  private fb = inject(FormBuilder);
  private logger = inject(LoggerService);

  loading = signal(false);
  users = signal<User[]>([]);
  companyName = signal('Loading...');
  searchQuery = '';
  
  inviteModalOpen = signal(false);
  assignRolesModalOpen = signal(false);
  suspendConfirmOpen = signal(false);
  selectedUser = signal<User | null>(null);
  selectedRoles = signal<RoleKey[]>([]);

  availableRoles: RoleKey[] = [
    'COMPANY_OWNER',
    'COMPANY_MANAGER',
    'DEVELOPER',
    'ANALYST',
    'SUPPORT',
    'VIEWER'
  ];

  tableModel = new TableModel();

  inviteForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    role: ['', Validators.required]
  });

  ngOnInit() {
    const companyId = this.route.snapshot.paramMap.get('id');
    if (companyId) {
      this.setupTable();
      this.loadCompany(companyId);
      this.loadUsers(companyId);
    }
  }

  loadCompany(id: string) {
    this.api.getCompany(id).subscribe({
      next: (company) => {
        if (company) {
          this.companyName.set(company.name);
        }
      }
    });
  }

  loadUsers(companyId: string) {
    this.loading.set(true);
    this.api.listUsers(companyId).subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
        this.updateTable();
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  updateTable() {
    let filtered = [...this.users()];
    
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(u => 
        u.email.toLowerCase().includes(query) ||
        u.firstName.toLowerCase().includes(query) ||
        u.lastName.toLowerCase().includes(query)
      );
    }

    this.tableModel.data = filtered.map(user => [
      new TableItem({ data: `${user.firstName} ${user.lastName}` }),
      new TableItem({ data: user.email }),
      new TableItem({ data: user.roles.join(', ') }),
      new TableItem({ data: user.status }),
      new TableItem({ data: user.lastLoginAt ? this.formatDate(user.lastLoginAt) : 'Never' }),
      new TableItem({ data: user.id })
    ]);
  }

  setupTable() {
    this.tableModel.header = [
      new TableHeaderItem({ data: 'Name' }),
      new TableHeaderItem({ data: 'Email' }),
      new TableHeaderItem({ data: 'Roles' }),
      new TableHeaderItem({ data: 'Status' }),
      new TableHeaderItem({ data: 'Last login' }),
      new TableHeaderItem({ data: 'Actions' })
    ];
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  goBack() {
    const companyId = this.route.snapshot.paramMap.get('id');
    if (companyId) {
      this.router.navigate(['/admin/companies', companyId]);
    }
  }

  openInviteModal() {
    this.inviteModalOpen.set(true);
  }

  closeInviteModal() {
    this.inviteModalOpen.set(false);
    this.inviteForm.reset();
  }

  submitInvite() {
    if (this.inviteForm.invalid) return;
    
    const companyId = this.route.snapshot.paramMap.get('id');
    if (!companyId) return;

    const formValue = this.inviteForm.value;
    this.api.inviteUser(companyId, formValue.email, formValue.role).subscribe({
      next: () => {
        this.closeInviteModal();
        this.logger.info(`Invitation sent to ${formValue.email}`);
      },
      error: () => {
        this.logger.error('Failed to send invitation');
      }
    });
  }

  openAssignRolesModal(user: User) {
    this.selectedUser.set(user);
    this.selectedRoles.set([...user.roles]);
    this.assignRolesModalOpen.set(true);
  }

  closeAssignRolesModal() {
    this.assignRolesModalOpen.set(false);
    this.selectedUser.set(null);
    this.selectedRoles.set([]);
  }

  toggleRole(role: RoleKey, checked: boolean) {
    const current = this.selectedRoles();
    if (checked) {
      this.selectedRoles.set([...current, role]);
    } else {
      this.selectedRoles.set(current.filter(r => r !== role));
    }
  }

  saveRoles() {
    const user = this.selectedUser();
    if (!user) return;

    this.api.assignRoles(user.id, this.selectedRoles()).subscribe({
      next: () => {
        this.closeAssignRolesModal();
        const companyId = this.route.snapshot.paramMap.get('id');
        if (companyId) {
          this.loadUsers(companyId);
        }
        this.logger.info('Roles updated successfully');
      }
    });
  }

  confirmSuspend() {
    const user = this.selectedUser();
    if (!user) return;

    this.api.suspendUser(user.id).subscribe({
      next: () => {
        this.suspendConfirmOpen.set(false);
        const companyId = this.route.snapshot.paramMap.get('id');
        if (companyId) {
          this.loadUsers(companyId);
        }
        this.logger.info('User suspended successfully');
      }
    });
  }

  cancelSuspend() {
    this.suspendConfirmOpen.set(false);
    this.selectedUser.set(null);
  }
}

