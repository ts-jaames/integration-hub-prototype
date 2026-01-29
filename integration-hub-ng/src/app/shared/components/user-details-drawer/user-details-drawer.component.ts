import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges, signal, computed, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ButtonModule, InputModule, SelectModule, TagModule } from 'carbon-components-angular';
import { User, UserStatus, UserRole, UserActivityEntry, UserActivityType } from '../../models/user.model';
import { RoleService } from '../../../core/role.service';
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
      
      <!-- Sticky Header -->
      <div class="drawer-header sticky-header">
        <!-- Row 1: Name + Close -->
        <div class="header-row header-row-primary">
          <h3 class="drawer-title">{{ getUserDisplayName() || 'User Details' }}</h3>
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
        
        <!-- Row 2: Email -->
        <div class="header-row header-row-email">
          <p class="drawer-subtitle">{{ user?.email || '' }}</p>
        </div>
        
        <!-- Row 3: Status + Actions -->
        <div class="header-row header-row-actions">
          <div class="header-status" *ngIf="user">
            <ibm-tag [type]="getStatusTagType(user.status)" size="sm">
              {{ user.status }}
            </ibm-tag>
          </div>
          <div class="header-action-buttons">
            <!-- View Mode Actions -->
            <div *ngIf="!editMode()" class="action-buttons-group">
              <button 
                ibmButton="secondary" 
                size="sm"
                (click)="enterEditMode()"
                type="button">
                Edit
              </button>
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
              <button 
                *ngIf="user && user.status === 'Invited'"
                ibmButton="secondary"
                (click)="onResendInvite()"
                type="button">
                Resend invite
              </button>
              <div class="action-helper" *ngIf="user && user.status === 'Active' && isLastSystemAdmin()">
                Cannot deactivate the last System Admin
              </div>
            </div>
            
            <!-- Edit Mode Actions -->
            <div *ngIf="editMode()" class="action-buttons-group">
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
      </div>

      <!-- Body -->
      <div class="drawer-body">
        <div class="drawer-content" *ngIf="user; else noUser">
          <!-- View Mode -->
          <div *ngIf="!editMode()" class="view-mode">
            <!-- Identity Section -->
            <div class="section-group">
              <h4 class="section-title">Identity</h4>
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
              </div>
            </div>

            <!-- Company & Roles Section -->
            <div class="section-group">
              <h4 class="section-title">Company & Roles</h4>
              <div class="detail-section">
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
                <div class="detail-item">
                  <label>Status</label>
                  <p>
                    <ibm-tag [type]="getStatusTagType(user!.status)" size="sm">
                      {{ user?.status }}
                    </ibm-tag>
                  </p>
                </div>
              </div>
            </div>

            <!-- Invite History Section -->
            <div class="section-group" *ngIf="user?.invitedAt || user?.inviteResentAt">
              <h4 class="section-title">Invite History</h4>
              <div class="detail-section">
                <div class="detail-item" *ngIf="user?.invitedAt">
                  <label>Original Invitation</label>
                  <p>{{ formatDate(user!.invitedAt!) }} {{ user?.invitedBy ? 'by ' + user.invitedBy : '' }}</p>
                </div>
                <div class="detail-item" *ngIf="user?.inviteResentAt">
                  <label>Last Resent</label>
                  <p>{{ formatDate(user!.inviteResentAt!) }} {{ user?.inviteResentBy ? 'by ' + user.inviteResentBy : '' }}</p>
                </div>
                <div class="detail-item" *ngIf="user?.inviteCount && (user?.inviteCount ?? 0) > 1">
                  <label>Total Invites Sent</label>
                  <p>{{ user?.inviteCount }}</p>
                </div>
              </div>
            </div>

            <!-- Timestamps Section -->
            <div class="section-group">
              <h4 class="section-title">Account Details</h4>
              <div class="detail-section">
                <div class="detail-item" *ngIf="user?.lastLoginAt">
                  <label>Last Login</label>
                  <p>{{ formatDate(user!.lastLoginAt!) }}</p>
                </div>
                <div class="detail-item">
                  <label>Last Updated</label>
                  <p>{{ user?.updatedAt ? formatDate(user.updatedAt) : '—' }}</p>
                </div>
                <div class="detail-item" *ngIf="user?.createdAt">
                  <label>Created</label>
                  <p>{{ formatDate(user.createdAt) }}</p>
                </div>
              </div>
            </div>

            <!-- Activity Timeline Section -->
            <div class="section-group">
              <h4 class="section-title">Activity Timeline</h4>
              <div class="activity-timeline">
                <div *ngFor="let activity of userActivityTimeline()" class="timeline-entry">
                  <div class="timeline-marker" [class]="'marker-' + activity.type"></div>
                  <div class="timeline-content">
                    <div class="timeline-header">
                      <span class="timeline-action">{{ getActivityLabel(activity.type) }}</span>
                      <span class="timeline-time">{{ formatRelativeTime(activity.timestamp) }}</span>
                    </div>
                    <p class="timeline-details" *ngIf="activity.details">{{ activity.details }}</p>
                    <p class="timeline-actor" *ngIf="activity.actor">{{ activity.actor.name }}</p>
                  </div>
                </div>
                
                <!-- Empty state -->
                <div class="timeline-empty" *ngIf="userActivityTimeline().length === 0">
                  <p>No activity recorded yet</p>
                </div>
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
      background: #1a1a1a !important;
      opacity: 1 !important;
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

    /* Sticky Header */
    .drawer-header {
      flex-shrink: 0;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--linear-border, rgba(255, 255, 255, 0.1));
      background: #1a1a1a !important;
      opacity: 1 !important;
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .header-row {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .header-row-primary {
      justify-content: space-between;
      margin-bottom: 0.5rem;
    }

    .header-row-email {
      margin-bottom: 0.75rem;
    }

    .header-row-actions {
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .drawer-title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--linear-text-primary, #f4f4f4);
      margin: 0;
      line-height: 1.4;
      flex: 1;
      min-width: 0;
    }

    .drawer-subtitle {
      font-size: 0.875rem;
      color: var(--linear-text-secondary, #a8a8a8);
      margin: 0;
      line-height: 1.4;
    }

    .header-status {
      display: flex;
      align-items: center;
    }

    .header-action-buttons {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .action-buttons-group {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .action-helper {
      font-size: 0.75rem;
      color: var(--linear-text-secondary, #a8a8a8);
      margin-left: 0.5rem;
      white-space: nowrap;
    }

    .close-button {
      color: var(--linear-text-secondary, #a8a8a8) !important;
      min-width: 32px;
      padding: 0.5rem;
      border-radius: 8px;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }

    .close-button:hover {
      background: var(--linear-surface-hover, rgba(255, 255, 255, 0.1));
      color: var(--linear-text-primary, #f4f4f4) !important;
    }

    /* Body */
    .drawer-body {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      min-height: 0;
      -webkit-overflow-scrolling: touch;
    }

    .drawer-content {
      padding: 1.5rem;
      background: #1a1a1a !important;
      opacity: 1 !important;
    }

    .no-user-message {
      padding: 2rem 1.5rem;
      text-align: center;
      color: var(--linear-text-secondary, #a8a8a8);
      background: #1a1a1a !important;
      opacity: 1 !important;
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
      color: var(--linear-text-secondary, #a8a8a8);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .detail-item p {
      font-size: 0.875rem;
      color: var(--linear-text-primary, #f4f4f4);
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
      color: var(--form-control-text, #f4f4f4);
    }

    .required {
      color: #da1e28;
    }

    .helper-text {
      font-size: 0.75rem;
      color: var(--linear-text-secondary, #a8a8a8);
      margin-top: 0.25rem;
    }

    .roles-select {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding: 1rem;
      background: #1a1a1a !important;
      border: 1px solid var(--linear-border, rgba(255, 255, 255, 0.1));
      border-radius: 4px;
      opacity: 1 !important;
    }

    .role-checkbox {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      color: var(--linear-text-primary, #f4f4f4);
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


    /* Section Groups */
    .section-group {
      margin-bottom: 1.5rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid var(--linear-border, rgba(255, 255, 255, 0.1));
    }

    .section-group:last-child {
      border-bottom: none;
      margin-bottom: 0;
      padding-bottom: 0;
    }

    .section-title {
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--linear-text-tertiary, rgba(255, 255, 255, 0.5));
      margin: 0 0 1rem 0;
    }

    /* Activity Timeline */
    .activity-timeline {
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    .timeline-entry {
      display: flex;
      gap: 0.75rem;
      padding: 0.75rem 0;
      position: relative;
    }

    .timeline-entry:not(:last-child)::before {
      content: '';
      position: absolute;
      left: 5px;
      top: 28px;
      bottom: 0;
      width: 2px;
      background: var(--linear-border, rgba(255, 255, 255, 0.1));
    }

    .timeline-marker {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: var(--linear-accent, #4589ff);
      flex-shrink: 0;
      margin-top: 4px;
    }

    .timeline-marker.marker-invited {
      background: #3b82f6;
    }

    .timeline-marker.marker-invite_resent {
      background: #8b5cf6;
    }

    .timeline-marker.marker-activated {
      background: #10b981;
    }

    .timeline-marker.marker-role_changed {
      background: #f59e0b;
    }

    .timeline-marker.marker-suspended {
      background: #ef4444;
    }

    .timeline-marker.marker-unsuspended {
      background: #22c55e;
    }

    .timeline-marker.marker-deactivated {
      background: #6b7280;
    }

    .timeline-marker.marker-login {
      background: #06b6d4;
    }

    .timeline-content {
      flex: 1;
      min-width: 0;
    }

    .timeline-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 0.5rem;
      margin-bottom: 0.25rem;
    }

    .timeline-action {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--linear-text-primary, #f4f4f4);
    }

    .timeline-time {
      font-size: 0.6875rem;
      color: var(--linear-text-tertiary, rgba(255, 255, 255, 0.5));
      flex-shrink: 0;
    }

    .timeline-details {
      font-size: 0.8125rem;
      color: var(--linear-text-secondary, #a8a8a8);
      margin: 0 0 0.25rem 0;
    }

    .timeline-actor {
      font-size: 0.75rem;
      color: var(--linear-text-tertiary, rgba(255, 255, 255, 0.5));
      margin: 0;
    }

    .timeline-empty {
      padding: 1rem;
      text-align: center;
      color: var(--linear-text-secondary, #a8a8a8);
    }

    .timeline-empty p {
      font-size: 0.8125rem;
      margin: 0;
    }

    /* Scrollbar */
    .drawer-body::-webkit-scrollbar {
      width: 6px;
    }

    .drawer-body::-webkit-scrollbar-track {
      background: transparent;
    }

    .drawer-body::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 3px;
    }

    .drawer-body::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.3);
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
  private roleService = inject(RoleService);

  editMode = signal(false);
  saving = signal(false);
  editForm!: FormGroup;
  selectedRoles = signal<UserRole[]>([]);

  // Permission checks
  isReadOnly = computed(() => this.roleService.isReadOnly());
  canManageUserLifecycle = computed(() => this.roleService.canManageUserLifecycle());

  readonly roleOptions: UserRole[] = ['System Admin', 'Company Manager', 'Developer', 'Read-only'];

  companyOptions = computed(() => {
    return this.companies.map(c => ({ value: c.id, label: c.name }));
  });

  // Generate activity timeline from user data
  userActivityTimeline = computed((): UserActivityEntry[] => {
    const u = this.user;
    if (!u) return [];

    // If user has explicit activity history, use it
    if (u.activityHistory && u.activityHistory.length > 0) {
      return [...u.activityHistory].sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    }

    // Otherwise, build timeline from user data
    const entries: UserActivityEntry[] = [];

    // Invited
    if (u.invitedAt) {
      entries.push({
        id: 'invited',
        type: 'invited',
        timestamp: u.invitedAt,
        actor: u.invitedBy ? { name: u.invitedBy } : undefined,
        details: `Invitation sent to ${u.email}`
      });
    }

    // Invite resent
    if (u.inviteResentAt) {
      entries.push({
        id: 'invite_resent',
        type: 'invite_resent',
        timestamp: u.inviteResentAt,
        actor: u.inviteResentBy ? { name: u.inviteResentBy } : undefined,
        details: 'Invitation was resent'
      });
    }

    // Activated (first login or status change to Active)
    if (u.status === 'Active' && u.lastLoginAt) {
      entries.push({
        id: 'activated',
        type: 'activated',
        timestamp: u.lastLoginAt,
        details: 'Account activated'
      });
    }

    // Suspended
    if (u.status === 'Suspended' && u.suspendedAt) {
      entries.push({
        id: 'suspended',
        type: 'suspended',
        timestamp: u.suspendedAt,
        actor: u.suspendedBy ? { name: u.suspendedBy } : undefined,
        details: u.suspendReason || 'Account suspended'
      });
    }

    // Deactivated
    if (u.status === 'Deactivated') {
      entries.push({
        id: 'deactivated',
        type: 'deactivated',
        timestamp: u.updatedAt,
        details: 'Account deactivated'
      });
    }

    // Created
    if (u.createdAt) {
      entries.push({
        id: 'created',
        type: 'invited',
        timestamp: u.createdAt,
        details: 'User account created'
      });
    }

    // Sort by timestamp descending
    return entries.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  });

  getActivityLabel(type: UserActivityType): string {
    const labels: Record<UserActivityType, string> = {
      'invited': 'Invited',
      'invite_resent': 'Invite Resent',
      'activated': 'Activated',
      'role_changed': 'Role Changed',
      'suspended': 'Suspended',
      'unsuspended': 'Unsuspended',
      'deactivated': 'Deactivated',
      'login': 'Logged In',
      'password_changed': 'Password Changed'
    };
    return labels[type] || type;
  }

  formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return this.formatDate(dateString);
  }

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

  onResendInvite() {
    const u = this.user;
    if (u) {
      // Emit to parent to handle resend invite
      this.usersService.resendInvite(u.id).subscribe({
        next: () => {
          this.logger.info(`Invite resent for ${u.email}`);
          // Optionally refresh user data
        },
        error: (err) => {
          this.logger.error('Error resending invite', err);
          alert('Error resending invite: ' + (err.message || 'Unknown error'));
        }
      });
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

