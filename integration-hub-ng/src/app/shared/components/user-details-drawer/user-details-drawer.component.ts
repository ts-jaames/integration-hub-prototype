import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges, signal, computed, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ButtonModule, InputModule, SelectModule, TagModule } from 'carbon-components-angular';
import { User, UserStatus, UserRole } from '../../models/user.model';
import { UsersService } from '../../services/users.service';
import { LoggerService } from '../../../core/services/logger.service';

@Component({
  selector: 'app-user-details-drawer',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    InputModule,
    SelectModule,
    TagModule
  ],
  template: `
    <!-- Backdrop -->
    <div 
      class="drawer-backdrop"
      [class.visible]="isOpen"
      (click)="onClose()"
      *ngIf="isOpen">
    </div>

    <!-- Drawer -->
    <div 
      class="user-details-drawer"
      [class.open]="isOpen">
      
      <!-- Header -->
      <div class="drawer-header">
        <div class="header-content">
          <div class="header-title-group">
            <div class="header-text">
              <h3 class="drawer-title">{{ getUserDisplayName() || 'User Details' }}</h3>
              <p class="drawer-subtitle">{{ user?.email || '' }}</p>
            </div>
            <div class="header-status" *ngIf="user">
              <ibm-tag [type]="getStatusTagType(user.status)" size="sm">
                {{ user.status }}
              </ibm-tag>
            </div>
          </div>
          <div class="header-actions">
            <button 
              *ngIf="!editMode()"
              ibmButton="secondary" 
              size="sm"
              (click)="enterEditMode()"
              type="button">
              Edit
            </button>
            <button 
              ibmButton="ghost" 
              size="sm"
              class="close-button"
              (click)="onClose()"
              [attr.aria-label]="'Close drawer'"
              type="button">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Body -->
      <div class="drawer-body">
        <div class="drawer-content" *ngIf="user; else noUser">
          <!-- View Mode -->
          <div *ngIf="!editMode()" class="view-mode">
            <div class="detail-section">
              <div class="detail-item">
                <label>First Name</label>
                <p>{{ user?.firstName || '—' }}</p>
              </div>
              <div class="detail-item">
                <label>Last Name</label>
                <p>{{ user?.lastName || '—' }}</p>
              </div>
              <div class="detail-item">
                <label>Email</label>
                <p>{{ user?.email || '—' }}</p>
              </div>
              <div class="detail-item">
                <label>Company</label>
                <p>{{ user?.companyName || '—' }}</p>
              </div>
              <div class="detail-item">
                <label>Roles</label>
                <div class="roles-list">
                  <ibm-tag *ngFor="let role of user?.roles || []" [type]="getRoleTagType(role)" size="sm">
                    {{ role }}
                  </ibm-tag>
                </div>
              </div>
              <div class="detail-item" *ngIf="user?.lastLoginAt">
                <label>Last Login</label>
                <p>{{ formatDate(user.lastLoginAt) }}</p>
              </div>
              <div class="detail-item">
                <label>Last Updated</label>
                <p>{{ user?.updatedAt ? formatDate(user.updatedAt) : '—' }}</p>
              </div>
              <div class="detail-item" *ngIf="user?.createdAt">
                <label>Created</label>
                <p>{{ formatDate(user.createdAt) }}</p>
              </div>
              <div class="detail-item" *ngIf="user?.invitedAt">
                <label>Invitation Sent</label>
                <p>{{ formatDate(user.invitedAt) }}</p>
              </div>
            </div>
          </div>

          <!-- Edit Mode -->
          <div *ngIf="editMode()" class="edit-mode">
            <form [formGroup]="editForm" class="edit-form">
              <div class="form-field">
                <ibm-label>
                  First Name
                  <input
                    ibmText
                    formControlName="firstName"
                    placeholder="John">
                </ibm-label>
              </div>

              <div class="form-field">
                <ibm-label>
                  Last Name
                  <input
                    ibmText
                    formControlName="lastName"
                    placeholder="Doe">
                </ibm-label>
              </div>

              <div class="form-field">
                <ibm-label>
                  Email
                  <input
                    ibmText
                    formControlName="email"
                    [disabled]="true"
                    placeholder="user@example.com">
                </ibm-label>
                <div class="helper-text">Email cannot be changed</div>
              </div>

              <div class="form-field">
                <label class="form-label">Company <span class="required">*</span></label>
                <select
                  ibmSelect
                  formControlName="companyId"
                  [class.error]="editForm.get('companyId')?.hasError('required') && editForm.get('companyId')?.touched">
                  <option value="">Select company</option>
                  <option *ngFor="let company of companies" [value]="company.id">
                    {{ company.name }}
                  </option>
                </select>
                <div class="error-message" *ngIf="editForm.get('companyId')?.hasError('required') && editForm.get('companyId')?.touched">
                  Company is required
                </div>
              </div>

              <div class="form-field">
                <label class="form-label">Roles <span class="required">*</span></label>
                <div class="roles-select">
                  <label *ngFor="let role of roleOptions" class="role-checkbox">
                    <input
                      type="checkbox"
                      [value]="role"
                      [checked]="selectedRoles().includes(role)"
                      (change)="toggleRole(role, $event)">
                    <span>{{ role }}</span>
                  </label>
                </div>
                <div class="error-message" *ngIf="editForm.get('roles')?.hasError('required') && editForm.get('roles')?.touched">
                  At least one role is required
                </div>
              </div>
            </form>
          </div>
        </div>
        <ng-template #noUser>
          <div class="no-user-message">
            <p>No user selected</p>
          </div>
        </ng-template>
      </div>

      <!-- Footer -->
      <div class="drawer-footer">
        <div class="footer-actions" *ngIf="!editMode()">
          <button 
            *ngIf="user && user.status === 'Active'"
            ibmButton="secondary"
            (click)="onDeactivate()"
            [disabled]="isLastSystemAdmin()"
            type="button">
            Deactivate
          </button>
          <button 
            *ngIf="user && (user.status === 'Deactivated' || user.status === 'Suspended')"
            ibmButton="secondary"
            (click)="onReactivate()"
            type="button">
            Reactivate
          </button>
          <div class="footer-helper" *ngIf="isLastSystemAdmin()">
            Cannot deactivate the last System Admin
          </div>
        </div>
        <div class="footer-actions" *ngIf="editMode()">
          <button 
            ibmButton="secondary"
            (click)="cancelEdit()"
            type="button">
            Cancel
          </button>
          <button 
            ibmButton="primary"
            (click)="saveChanges()"
            [disabled]="editForm.invalid || saving()"
            type="button">
            Save changes
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Backdrop */
    .drawer-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      z-index: 999;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease;
    }

    .drawer-backdrop.visible {
      opacity: 1;
      pointer-events: auto;
    }

    /* Drawer */
    .user-details-drawer {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      width: 480px;
      max-width: 90vw;
      background: var(--linear-surface, #ffffff);
      box-shadow: 
        -4px 0 24px rgba(0, 0, 0, 0.15),
        -2px 0 8px rgba(0, 0, 0, 0.1);
      z-index: 1000;
      display: flex;
      flex-direction: column;
      transform: translateX(100%);
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      overflow: hidden;
    }

    .user-details-drawer.open {
      transform: translateX(0);
    }

    /* Header */
    .drawer-header {
      flex-shrink: 0;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--linear-border, rgba(0, 0, 0, 0.08));
      background: var(--linear-surface, rgba(255, 255, 255, 0.95));
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
    }

    .header-title-group {
      flex: 1;
      min-width: 0;
    }

    .header-text {
      margin-bottom: 0.5rem;
    }

    .drawer-title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--linear-text-primary, #161616);
      margin: 0 0 0.25rem 0;
      line-height: 1.4;
    }

    .drawer-subtitle {
      font-size: 0.875rem;
      color: var(--linear-text-secondary, #6b6b6b);
      margin: 0;
      line-height: 1.4;
    }

    .header-status {
      margin-top: 0.5rem;
    }

    .header-actions {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      flex-shrink: 0;
    }

    .close-button {
      color: var(--linear-text-secondary, #6b6b6b) !important;
      min-width: 32px;
      padding: 0.5rem;
      border-radius: 8px;
      transition: all 0.2s ease;
    }

    .close-button:hover {
      background: var(--linear-surface-hover, rgba(0, 0, 0, 0.05));
      color: var(--linear-text-primary, #161616) !important;
    }

    /* Body */
    .drawer-body {
      flex: 1;
      overflow-y: auto;
      min-height: 0;
    }

    .drawer-content {
      padding: 1.5rem;
    }

    .no-user-message {
      padding: 2rem 1.5rem;
      text-align: center;
      color: var(--linear-text-secondary, #6b6b6b);
    }

    .no-user-message p {
      margin: 0;
      font-size: 0.875rem;
    }

    .detail-section {
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
      color: var(--linear-text-secondary, #6b6b6b);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .detail-item p {
      font-size: 0.875rem;
      color: var(--linear-text-primary, #161616);
      margin: 0;
    }

    .roles-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    /* Edit Mode */
    .edit-form {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .form-field {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .form-label {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--form-control-text, #161616);
    }

    .required {
      color: #da1e28;
    }

    .helper-text {
      font-size: 0.75rem;
      color: var(--linear-text-secondary, #6b6b6b);
      margin-top: 0.25rem;
    }

    .roles-select {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding: 1rem;
      background: var(--linear-surface, #ffffff);
      border: 1px solid var(--linear-border, rgba(0, 0, 0, 0.08));
      border-radius: 4px;
    }

    .role-checkbox {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      color: var(--linear-text-primary, #161616);
      cursor: pointer;
    }

    .role-checkbox input[type="checkbox"] {
      cursor: pointer;
    }

    .error-message {
      font-size: 0.75rem;
      color: #da1e28;
      margin-top: 0.25rem;
    }

    /* Footer */
    .drawer-footer {
      flex-shrink: 0;
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--linear-border, rgba(0, 0, 0, 0.08));
      background: var(--linear-surface, rgba(255, 255, 255, 0.95));
    }

    .footer-actions {
      display: flex;
      gap: 0.75rem;
      align-items: center;
      flex-wrap: wrap;
    }

    .footer-helper {
      font-size: 0.75rem;
      color: var(--linear-text-secondary, #6b6b6b);
      margin-left: auto;
    }

    /* Scrollbar */
    .drawer-body::-webkit-scrollbar {
      width: 6px;
    }

    .drawer-body::-webkit-scrollbar-track {
      background: transparent;
    }

    .drawer-body::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 3px;
    }

    .drawer-body::-webkit-scrollbar-thumb:hover {
      background: rgba(0, 0, 0, 0.3);
    }
  `]
})
export class UserDetailsDrawerComponent implements OnInit, OnDestroy, OnChanges {
  @Input() user: User | null = null;
  @Input() isOpen: boolean = false;
  
  @Input() companies: Array<{ id: string; name: string }> = [];
  @Input() allUsers: User[] = []; // For checking last System Admin
  @Output() closed = new EventEmitter<void>();
  @Output() userUpdated = new EventEmitter<User>();
  @Output() deactivateRequested = new EventEmitter<User>();
  @Output() reactivateRequested = new EventEmitter<User>();

  private usersService = inject(UsersService);
  private logger = inject(LoggerService);
  private fb = inject(FormBuilder);

  editMode = signal(false);
  saving = signal(false);
  editForm!: FormGroup;
  selectedRoles = signal<UserRole[]>([]);

  readonly roleOptions: UserRole[] = ['System Admin', 'Company Manager', 'Developer', 'Read-only'];

  companyOptions = computed(() => {
    return this.companies.map(c => ({ value: c.id, label: c.name }));
  });

  constructor() {
    // Listen for ESC key
    document.addEventListener('keydown', this.handleKeydown.bind(this));
  }

  ngOnInit() {
    this.initializeForm();
  }

  ngOnChanges(changes: SimpleChanges) {
    // Reset edit mode when user changes
    if (changes['user'] && !changes['user'].firstChange) {
      if (this.editMode()) {
        this.cancelEdit();
      }
    }
    
    // Debug: log when user changes
    if (changes['user']) {
      this.logger.debug('UserDetailsDrawer: user changed', { 
        hasUser: !!this.user, 
        userId: this.user?.id,
        email: this.user?.email 
      });
    }
  }

  ngOnDestroy() {
    document.removeEventListener('keydown', this.handleKeydown.bind(this));
  }

  handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && this.isOpen) {
      this.onClose();
    }
  }

  initializeForm() {
    this.editForm = this.fb.group({
      firstName: [''],
      lastName: [''],
      email: [{ value: '', disabled: true }],
      companyId: ['', Validators.required],
      roles: [[], Validators.required]
    });
  }

  getUserDisplayName(): string {
    const u = this.user;
    if (!u) return '';
    if (u.firstName || u.lastName) {
      return `${u.firstName || ''} ${u.lastName || ''}`.trim();
    }
    return u.email;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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

  enterEditMode() {
    const u = this.user;
    if (!u) return;

    this.selectedRoles.set([...u.roles]);
    this.editForm.patchValue({
      firstName: u.firstName || '',
      lastName: u.lastName || '',
      email: u.email,
      companyId: u.companyId
    });
    this.editMode.set(true);
  }

  toggleRole(role: UserRole, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    const current = this.selectedRoles();
    if (checked) {
      this.selectedRoles.set([...current, role]);
    } else {
      this.selectedRoles.set(current.filter(r => r !== role));
    }
    this.editForm.patchValue({ roles: this.selectedRoles() });
    this.editForm.get('roles')?.markAsTouched();
  }

  cancelEdit() {
    this.editMode.set(false);
    this.selectedRoles.set([]);
    this.editForm.reset();
  }

  saveChanges() {
    if (this.editForm.invalid) {
      return;
    }

    const u = this.user;
    if (!u) return;

    this.saving.set(true);
    const formValue = this.editForm.value;
    const roles = this.selectedRoles();

    // Determine what needs to be updated
    const updateData: Partial<User> = {};
    let needsRoleUpdate = false;
    let needsOtherUpdate = false;

    // Check if roles changed
    if (JSON.stringify(roles.sort()) !== JSON.stringify(u.roles.sort())) {
      needsRoleUpdate = true;
    }

    // Check if company changed
    if (formValue.companyId !== u.companyId) {
      const company = this.companies.find(c => c.id === formValue.companyId);
      if (company) {
        updateData.companyId = formValue.companyId;
        updateData.companyName = company.name;
        needsOtherUpdate = true;
      }
    }

    // Check if name changed
    if (formValue.firstName !== (u.firstName || '')) {
      updateData.firstName = formValue.firstName || undefined;
      needsOtherUpdate = true;
    }
    if (formValue.lastName !== (u.lastName || '')) {
      updateData.lastName = formValue.lastName || undefined;
      needsOtherUpdate = true;
    }

    // Update roles if changed
    if (needsRoleUpdate) {
      this.usersService.updateUserRoles(u.id, roles).subscribe({
        next: (updatedUser) => {
          // Then update other fields if needed
          if (needsOtherUpdate) {
            this.usersService.updateUser(u.id, updateData).subscribe({
              next: (finalUser) => {
                const merged = { ...finalUser, roles: updatedUser.roles };
                this.user = merged;
                this.userUpdated.emit(merged);
                this.saving.set(false);
                this.editMode.set(false);
                this.logger.info('User updated successfully');
              },
              error: (err) => {
                this.logger.error('Error updating user details', err);
                this.saving.set(false);
                alert('Error updating user: ' + (err.message || 'Unknown error'));
              }
            });
          } else {
            this.user = updatedUser;
            this.userUpdated.emit(updatedUser);
            this.saving.set(false);
            this.editMode.set(false);
            this.logger.info('User roles updated successfully');
          }
        },
        error: (err) => {
          this.logger.error('Error updating user roles', err);
          this.saving.set(false);
          alert('Error updating user roles: ' + (err.message || 'Unknown error'));
        }
      });
    } else if (needsOtherUpdate) {
      // Only other fields changed
      this.usersService.updateUser(u.id, updateData).subscribe({
        next: (updatedUser) => {
          this.user = updatedUser;
          this.userUpdated.emit(updatedUser);
          this.saving.set(false);
          this.editMode.set(false);
          this.logger.info('User updated successfully');
        },
        error: (err) => {
          this.logger.error('Error updating user', err);
          this.saving.set(false);
          alert('Error updating user: ' + (err.message || 'Unknown error'));
        }
      });
    } else {
      // Nothing changed
      this.saving.set(false);
      this.editMode.set(false);
    }
  }

  onDeactivate() {
    const u = this.user;
    if (u) {
      this.deactivateRequested.emit(u);
    }
  }

  onReactivate() {
    const u = this.user;
    if (u) {
      this.reactivateRequested.emit(u);
    }
  }

  onClose() {
    if (this.editMode()) {
      this.cancelEdit();
    }
    this.closed.emit();
  }

  isLastSystemAdmin(): boolean {
    const u = this.user;
    if (!u || !u.roles.includes('System Admin') || u.status !== 'Active') {
      return false;
    }
    // Check if this is the last active System Admin
    const otherActiveSystemAdmins = this.allUsers.filter(usr =>
      usr.id !== u.id &&
      usr.roles.includes('System Admin') &&
      usr.status === 'Active'
    );
    return otherActiveSystemAdmins.length === 0;
  }
}

