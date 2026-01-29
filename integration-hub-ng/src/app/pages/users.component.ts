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
import { RoleService } from '../core/role.service';
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
          <p class="page-subtitle">
            {{ isSysAdmin() ? 'Manage user accounts across all companies' : 'Manage user accounts for ' + currentCompanyName() }}
          </p>
        </div>
        <div class="header-actions">
          <!-- Read-only indicator -->
          <div class="readonly-badge" *ngIf="isReadOnly()" title="You don't have permission to perform this action.">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M12 6H4a2 2 0 00-2 2v4a2 2 0 002 2h8a2 2 0 002-2V8a2 2 0 00-2-2z" stroke="currentColor" stroke-width="1.5"/>
              <path d="M5 6V4a3 3 0 016 0v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            Read-only
          </div>
          
          <button 
            class="btn-secondary" 
            (click)="openBulkUploadModal()" 
            type="button"
            *ngIf="canInviteUsers()"
            [disabled]="isReadOnly()"
            [title]="isReadOnly() ? 'You don\\'t have permission to perform this action.' : 'Upload users via CSV'">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style="margin-right: 0.5rem">
              <path d="M8 1v10M4 5l4-4 4 4M2 14h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Bulk Upload
          </button>
          <button 
            ibmButton="primary" 
            (click)="openInviteDrawer()" 
            type="button"
            *ngIf="canInviteUsers()"
            [disabled]="isReadOnly()"
            [title]="isReadOnly() ? 'You don\\'t have permission to perform this action.' : 'Invite a new user'">
            Invite User
          </button>
        </div>
      </div>

      <div class="toolbar-container">
        <div class="toolbar">
          <div class="toolbar-row toolbar-row-primary">
            <div class="toolbar-search">
              <app-text-input
                label="Search"
                [placeholder]="isSysAdmin() ? 'Search by name, email, or company…' : 'Search by name or email…'"
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
              
              <!-- Company filter: ONLY for Sys Admin -->
              <app-select
                *ngIf="isSysAdmin()"
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
                  [options]="sortSelectOptions()"
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
              *ngIf="selectedCompany() && isSysAdmin()"
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

          <!-- Company: selectable for Sys Admin, locked for Vendor Admin -->
          <ibm-label>
            Company <span class="required">*</span>
            <select
              *ngIf="isSysAdmin()"
              ibmSelect
              formControlName="companyId"
              required>
              <option value="">Select company</option>
              <option *ngFor="let company of companies()" [value]="company.id">
                {{ company.name }}
              </option>
            </select>
            <input
              *ngIf="!isSysAdmin()"
              ibmText
              [value]="currentCompanyName()"
              readonly
              disabled>
            <span class="bx--form__requirement" *ngIf="isSysAdmin() && inviteForm.get('companyId')?.hasError('required') && inviteForm.get('companyId')?.touched">
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
              <option *ngFor="let role of availableRoleOptions()" [value]="role">
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

    <!-- Bulk Upload Modal -->
    <ibm-modal
      [open]="bulkUploadModalOpen()"
      [size]="'md'"
      (overlaySelected)="closeBulkUploadModal()">
      <ibm-modal-header (closeSelect)="closeBulkUploadModal()">
        <p class="bx--modal-header__heading">Bulk Upload Users</p>
      </ibm-modal-header>
      <div ibmModalContent>
        <p class="bulk-description">
          Upload a CSV file to invite multiple users at once.
        </p>
        
        <div class="template-section">
          <p class="template-label">Download template:</p>
          <button class="btn-link" (click)="downloadCSVTemplate()">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style="margin-right: 0.5rem">
              <path d="M8 1v10M4 7l4 4 4-4M2 14h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            {{ isSysAdmin() ? 'users_template_sysadmin.csv' : 'users_template.csv' }}
          </button>
          <p class="template-hint">
            {{ isSysAdmin() ? 'Template includes: email, firstName, lastName, companyId, role' : 'Template includes: email, firstName, lastName, role' }}
          </p>
        </div>

        <div class="upload-section">
          <label class="file-upload-label">
            <input 
              type="file" 
              accept=".csv" 
              (change)="onFileSelected($event)"
              class="file-input">
            <span class="file-upload-btn">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style="margin-right: 0.5rem">
                <path d="M8 1v10M4 5l4-4 4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              Choose CSV file
            </span>
          </label>
          <span class="selected-file" *ngIf="selectedFile()">
            {{ selectedFile()!.name }}
          </span>
        </div>

        <div class="upload-preview" *ngIf="bulkUploadPreview().length > 0">
          <p class="preview-label">Preview ({{ bulkUploadPreview().length }} users):</p>
          <div class="preview-list">
            <div *ngFor="let user of bulkUploadPreview().slice(0, 5)" class="preview-item">
              <span class="preview-email">{{ user.email }}</span>
              <span class="preview-role">{{ user.role }}</span>
            </div>
            <div *ngIf="bulkUploadPreview().length > 5" class="preview-more">
              +{{ bulkUploadPreview().length - 5 }} more...
            </div>
          </div>
        </div>
      </div>
      <ibm-modal-footer>
        <button ibmButton="secondary" (click)="closeBulkUploadModal()">Cancel</button>
        <button
          ibmButton="primary"
          [disabled]="!selectedFile() || bulkUploading()"
          (click)="onBulkUpload()">
          {{ bulkUploading() ? 'Uploading...' : 'Upload & Send Invites' }}
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
      <button 
        class="menu-item" 
        (click)="editRoles()"
        [disabled]="isReadOnly()"
        [title]="isReadOnly() ? 'You don\\'t have permission to perform this action.' : ''">
        Edit roles
      </button>
      <button 
        class="menu-item" 
        *ngIf="selectedUser()!.status === 'Invited'" 
        (click)="resendInvite()"
        [disabled]="isReadOnly()"
        [title]="isReadOnly() ? 'You don\\'t have permission to perform this action.' : ''">
        Resend invite
      </button>
      <button 
        class="menu-item" 
        *ngIf="selectedUser()!.status === 'Active'" 
        (click)="suspendUser()"
        [disabled]="isReadOnly()"
        [title]="isReadOnly() ? 'You don\\'t have permission to perform this action.' : ''">
        Suspend
      </button>
      <button 
        class="menu-item" 
        *ngIf="selectedUser()!.status === 'Suspended'" 
        (click)="unsuspendUser()"
        [disabled]="isReadOnly()"
        [title]="isReadOnly() ? 'You don\\'t have permission to perform this action.' : ''">
        Unsuspend
      </button>
      <button 
        class="menu-item danger" 
        (click)="removeAccess()"
        [disabled]="isLastSystemAdmin(selectedUser()!) || isReadOnly()"
        [title]="isReadOnly() ? 'You don\\'t have permission to perform this action.' : ''">
        Remove access
      </button>
      <div class="menu-helper" *ngIf="isReadOnly()">
        You don't have permission to perform this action.
      </div>
      <div class="menu-helper" *ngIf="!isReadOnly() && isLastSystemAdmin(selectedUser()!)">
        Cannot remove the last System Admin
      </div>
    </div>

    <!-- Confirm Dialogs -->
    <app-confirm-dialog
      [open]="removeAccessConfirmOpen()"
      title="Remove Access"
      [message]="'Remove access for this user? They will lose all access immediately.'"
      confirmLabel="Remove Access"
      [danger]="true"
      (confirmed)="confirmRemoveAccess()"
      (cancelled)="cancelRemoveAccess()">
    </app-confirm-dialog>

    <app-confirm-dialog
      [open]="suspendConfirmOpen()"
      title="Suspend User"
      [message]="'Suspend this user? They will temporarily lose access.'"
      confirmLabel="Suspend"
      [danger]="true"
      (confirmed)="confirmSuspend()"
      (cancelled)="cancelSuspend()">
    </app-confirm-dialog>

    <app-confirm-dialog
      [open]="unsuspendConfirmOpen()"
      title="Unsuspend User"
      [message]="'Unsuspend this user? They will regain access.'"
      confirmLabel="Unsuspend"
      (confirmed)="confirmUnsuspend()"
      (cancelled)="cancelUnsuspend()">
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

    .btn-secondary {
      display: inline-flex;
      align-items: center;
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--linear-text-primary);
      background: var(--linear-surface);
      border: 1px solid var(--linear-border);
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.15s;
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.08);
    }

    .btn-link {
      display: inline-flex;
      align-items: center;
      padding: 0.5rem 0;
      background: none;
      border: none;
      color: var(--linear-accent);
      font-size: 0.875rem;
      cursor: pointer;
      text-decoration: none;
    }

    .btn-link:hover {
      text-decoration: underline;
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

    /* Bulk Upload Modal */
    .bulk-description {
      font-size: 0.875rem;
      color: var(--linear-text-secondary);
      margin: 0 0 1.5rem 0;
    }

    .template-section {
      margin-bottom: 1.5rem;
      padding: 1rem;
      background: var(--linear-surface);
      border: 1px solid var(--linear-border);
      border-radius: 6px;
    }

    .template-label {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--linear-text-primary);
      margin: 0 0 0.5rem 0;
    }

    .template-hint {
      font-size: 0.75rem;
      color: var(--linear-text-secondary);
      margin: 0.5rem 0 0 0;
    }

    .upload-section {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .file-input {
      display: none;
    }

    .file-upload-label {
      cursor: pointer;
    }

    .file-upload-btn {
      display: inline-flex;
      align-items: center;
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      color: var(--linear-text-primary);
      background: var(--linear-surface);
      border: 1px dashed var(--linear-border);
      border-radius: 6px;
      transition: border-color 0.15s;
    }

    .file-upload-label:hover .file-upload-btn {
      border-color: var(--linear-accent);
    }

    .selected-file {
      font-size: 0.875rem;
      color: var(--linear-text-secondary);
    }

    .upload-preview {
      padding: 1rem;
      background: var(--linear-surface);
      border: 1px solid var(--linear-border);
      border-radius: 6px;
    }

    .preview-label {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--linear-text-primary);
      margin: 0 0 0.75rem 0;
    }

    .preview-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .preview-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.375rem 0;
      border-bottom: 1px solid var(--linear-border);
    }

    .preview-item:last-child {
      border-bottom: none;
    }

    .preview-email {
      font-size: 0.8125rem;
      color: var(--linear-text-primary);
    }

    .preview-role {
      font-size: 0.75rem;
      color: var(--linear-text-secondary);
    }

    .preview-more {
      font-size: 0.75rem;
      color: var(--linear-text-secondary);
      font-style: italic;
      padding: 0.375rem 0;
    }

    /* Actions Menu */
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

    .menu-item.danger {
      color: #ef4444;
    }

    .menu-item.danger:hover {
      background: rgba(239, 68, 68, 0.1);
    }

    .menu-item:first-child {
      border-top-left-radius: 4px;
      border-top-right-radius: 4px;
    }

    .menu-item:last-of-type {
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

    /* Read-only badge */
    .readonly-badge {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.375rem 0.625rem;
      background: var(--linear-surface);
      border: 1px solid var(--linear-border);
      border-radius: 4px;
      font-size: 0.6875rem;
      color: var(--linear-text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Disabled button state */
    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `]
})
export class UsersComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private usersService = inject(UsersService);
  private roleService = inject(RoleService);
  private logger = inject(LoggerService);

  // Scope signals
  isSysAdmin = computed(() => this.roleService.hasGlobalScope());
  currentCompanyId = computed(() => this.roleService.getCurrentCompanyId());
  currentCompanyName = computed(() => this.roleService.getCurrentCompanyName() || 'Your Company');

  // Permission signals
  isReadOnly = computed(() => this.roleService.isReadOnly());
  canInviteUsers = computed(() => this.roleService.canInviteUsers());
  canManageUserLifecycle = computed(() => this.roleService.canManageUserLifecycle());

  loading = signal(false);
  users = signal<User[]>([]);
  companies = signal<Array<{ id: string; name: string }>>([]);
  searchQuery = signal('');
  selectedStatus = signal('');
  selectedCompany = signal('');
  selectedRole = signal('');
  sortBy = signal('name');
  inviteDrawerOpen = signal(false);
  bulkUploadModalOpen = signal(false);
  detailsDrawerOpen = signal(false);
  actionsMenuOpen = signal(false);
  actionsMenuPosition = signal({ top: 0, left: 0 });
  selectedUser = signal<User | null>(null);
  removeAccessConfirmOpen = signal(false);
  suspendConfirmOpen = signal(false);
  unsuspendConfirmOpen = signal(false);
  inviting = signal(false);
  bulkUploading = signal(false);
  selectedFile = signal<File | null>(null);
  bulkUploadPreview = signal<Array<{ email: string; role: string }>>([]);
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

  // Sort options differ based on scope (no Company sort for Vendor Admin)
  sortSelectOptions = computed(() => {
    const options: SelectOption[] = [
      { value: 'name', label: 'Name (A-Z)' },
      { value: 'name-desc', label: 'Name (Z-A)' },
      { value: 'lastLogin', label: 'Last login (recent)' }
    ];
    if (this.isSysAdmin()) {
      options.push({ value: 'company', label: 'Company (A-Z)' });
    }
    return options;
  });

  // Role options for invite form differ based on scope
  availableRoleOptions = computed(() => {
    if (this.isSysAdmin()) {
      return ['System Admin', 'Company Manager', 'Developer', 'Read-only'] as UserRole[];
    }
    // Vendor Admin can't create System Admins
    return ['Company Manager', 'Developer', 'Read-only'] as UserRole[];
  });

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
    const companyId = this.currentCompanyId();

    // For Vendor Admin, always filter by their company
    if (!this.isSysAdmin() && companyId) {
      filtered = filtered.filter(u => u.companyId === companyId);
    }

    // Search by name, email (+ company for sys admin)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(u => {
        const nameMatch = u.email.toLowerCase().includes(query) ||
          (u.firstName && u.firstName.toLowerCase().includes(query)) ||
          (u.lastName && u.lastName.toLowerCase().includes(query)) ||
          `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase().includes(query);
        
        // Sys Admin can also search by company
        if (this.isSysAdmin()) {
          return nameMatch || u.companyName.toLowerCase().includes(query);
        }
        return nameMatch;
      });
    }

    // Filter by status
    if (selectedStatus) {
      filtered = filtered.filter(u => u.status === selectedStatus);
    }

    // Filter by company (Sys Admin only)
    if (selectedCompany && this.isSysAdmin()) {
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
      (this.selectedCompany() && this.isSysAdmin()) ||
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
    // Build header based on scope
    const headers = [
      new TableHeaderItem({ data: 'Name' }),
      new TableHeaderItem({ data: 'Email' }),
      new TableHeaderItem({ data: 'Role(s)' })
    ];
    
    // Only show Company column for Sys Admin
    if (this.isSysAdmin()) {
      headers.push(new TableHeaderItem({ data: 'Company' }));
    }
    
    headers.push(
      new TableHeaderItem({ data: 'Status' }),
      new TableHeaderItem({ data: 'Last Active' }),
      new TableHeaderItem({ data: 'Updated' }),
      new TableHeaderItem({ data: '' }) // Actions column
    );
    
    this.tableModel.header = headers;
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
        const showCompany = this.isSysAdmin();
        
        // Rebuild headers to ensure they match the data columns
        this.buildTable();
        
        this.tableModel.data = filtered.map((user, index) => {
          const row = [
            new TableItem({
              data: this.getUserDisplayName(user),
              expandedData: user.id,
              rawData: { userId: user.id, index: index }
            }),
            new TableItem({ data: user.email }),
            new TableItem({ data: user.roles.join(', '), rawData: { roles: user.roles } })
          ];
          
          // Only add Company column for Sys Admin
          if (showCompany) {
            row.push(new TableItem({ data: user.companyName }));
          }
          
          row.push(
            new TableItem({ data: user.status, rawData: { status: user.status } }),
            new TableItem({ data: user.lastLoginAt ? this.formatRelativeTime(user.lastLoginAt) : '—' }),
            new TableItem({ data: this.formatDate(user.updatedAt) }),
            new TableItem({
              data: '⋮',
              rawData: { isAction: true, userId: user.id }
            })
          );
          
          return row;
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
    
    const cell = target.closest('td');
    if (cell) {
      const row = cell.closest('tr');
      if (row) {
        const cells = Array.from(row.querySelectorAll('td'));
        const isLastColumn = cells.length > 0 && cell === cells[cells.length - 1];
        
        if (isLastColumn) {
          const tbody = row.closest('tbody');
          if (tbody) {
            const rows = Array.from(tbody.querySelectorAll('tr'));
            const rowIndex = rows.indexOf(row);
            
            if (rowIndex >= 0) {
              const filtered = this.filteredUsers();
              if (rowIndex < filtered.length) {
                const user = filtered[rowIndex];
                if (user) {
                  this.selectedUser.set(user);
                  const rect = cell.getBoundingClientRect();
                  
                  const menuWidth = 180;
                  const menuHeight = 250;
                  let left = rect.left;
                  let top = rect.bottom + 4;
                  
                  if (left + menuWidth > window.innerWidth) {
                    left = window.innerWidth - menuWidth - 8;
                  }
                  if (top + menuHeight > window.innerHeight) {
                    top = rect.top - menuHeight - 4;
                  }
                  if (left < 8) left = 8;
                  if (top < 8) top = 8;
                  
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

    this.selectedUser.set(user);
    this.detailsDrawerOpen.set(true);
  }

  // Invite User
  openInviteDrawer() {
    this.initializeInviteForm();
    this.inviteDrawerOpen.set(true);
  }

  closeInviteDrawer() {
    this.inviteDrawerOpen.set(false);
    if (this.inviteForm) {
      this.inviteForm.reset();
    }
  }

  initializeInviteForm() {
    const companyId = this.currentCompanyId();
    
    this.inviteForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      firstName: [''],
      lastName: [''],
      companyId: [companyId || '', this.isSysAdmin() ? Validators.required : []],
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
    
    // For Vendor Admin, use their company ID
    const companyId = this.isSysAdmin() ? formValue.companyId : this.currentCompanyId();
    
    const payload: InviteUserPayload = {
      email: formValue.email,
      firstName: formValue.firstName || undefined,
      lastName: formValue.lastName || undefined,
      companyId: companyId!,
      roles: [formValue.roles],
      message: formValue.message || undefined
    };

    this.usersService.inviteUser(payload).subscribe({
      next: (user) => {
        this.logger.info(`User ${user.email} invited successfully`);
        this.inviting.set(false);
        this.closeInviteDrawer();
        this.loadUsers();
        alert('Invite sent');
      },
      error: (err) => {
        this.logger.error('Error inviting user', err);
        this.inviting.set(false);
        alert('Error sending invite: ' + (err.message || 'Unknown error'));
      }
    });
  }

  // Bulk Upload
  openBulkUploadModal() {
    this.selectedFile.set(null);
    this.bulkUploadPreview.set([]);
    this.bulkUploadModalOpen.set(true);
  }

  closeBulkUploadModal() {
    this.bulkUploadModalOpen.set(false);
    this.selectedFile.set(null);
    this.bulkUploadPreview.set([]);
  }

  downloadCSVTemplate() {
    const headers = this.isSysAdmin() 
      ? 'email,firstName,lastName,companyId,role'
      : 'email,firstName,lastName,role';
    
    const example = this.isSysAdmin()
      ? 'john@example.com,John,Doe,1,Developer'
      : 'john@example.com,John,Doe,Developer';
    
    const csv = `${headers}\n${example}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = this.isSysAdmin() ? 'users_template_sysadmin.csv' : 'users_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.selectedFile.set(file);
      this.parseCSVPreview(file);
    }
  }

  private parseCSVPreview(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length <= 1) {
        this.bulkUploadPreview.set([]);
        return;
      }
      
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const emailIndex = headers.indexOf('email');
      const roleIndex = headers.indexOf('role');
      
      const preview: Array<{ email: string; role: string }> = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values[emailIndex]) {
          preview.push({
            email: values[emailIndex],
            role: values[roleIndex] || 'Developer'
          });
        }
      }
      
      this.bulkUploadPreview.set(preview);
    };
    reader.readAsText(file);
  }

  onBulkUpload() {
    // TODO: Implement actual bulk upload
    this.bulkUploading.set(true);
    
    setTimeout(() => {
      this.bulkUploading.set(false);
      this.closeBulkUploadModal();
      alert(`Bulk upload complete! ${this.bulkUploadPreview().length} invites sent (demo only)`);
      this.loadUsers();
    }, 1500);
  }

  // User Details
  closeDetailsDrawer() {
    this.detailsDrawerOpen.set(false);
    this.selectedUser.set(null);
  }

  onUserUpdated(updatedUser: User) {
    this.users.update(users => 
      users.map(u => u.id === updatedUser.id ? updatedUser : u)
    );
    this.logger.info('User updated in table');
  }

  // Actions
  copyEmail() {
    const user = this.selectedUser();
    if (!user) return;

    this.actionsMenuOpen.set(false);
    navigator.clipboard.writeText(user.email).then(() => {
      this.logger.info(`Email ${user.email} copied to clipboard`);
    }).catch((err) => {
      this.logger.error('Error copying email', err);
    });
  }

  editRoles() {
    this.actionsMenuOpen.set(false);
    this.detailsDrawerOpen.set(true);
    // The drawer component handles role editing
  }

  resendInvite() {
    const user = this.selectedUser();
    if (!user) return;

    this.actionsMenuOpen.set(false);
    this.usersService.resendInvite(user.id).subscribe({
      next: () => {
        this.logger.info(`Invite resent for ${user.email}`);
        alert('Invite resent successfully');
        this.loadUsers();
      },
      error: (err) => {
        this.logger.error('Error resending invite', err);
        alert('Error resending invite');
      }
    });
  }

  suspendUser() {
    this.actionsMenuOpen.set(false);
    this.suspendConfirmOpen.set(true);
  }

  confirmSuspend() {
    const user = this.selectedUser();
    if (!user) return;

    this.usersService.setUserStatus(user.id, 'Suspended').subscribe({
      next: (updatedUser) => {
        this.logger.info(`User ${user.email} suspended`);
        this.suspendConfirmOpen.set(false);
        this.users.update(users => 
          users.map(u => u.id === updatedUser.id ? updatedUser : u)
        );
        if (this.selectedUser()?.id === updatedUser.id) {
          this.selectedUser.set(updatedUser);
        }
      },
      error: (err) => {
        this.logger.error('Error suspending user', err);
        this.suspendConfirmOpen.set(false);
        alert('Error suspending user');
      }
    });
  }

  cancelSuspend() {
    this.suspendConfirmOpen.set(false);
  }

  unsuspendUser() {
    this.actionsMenuOpen.set(false);
    this.unsuspendConfirmOpen.set(true);
  }

  confirmUnsuspend() {
    const user = this.selectedUser();
    if (!user) return;

    this.usersService.setUserStatus(user.id, 'Active').subscribe({
      next: (updatedUser) => {
        this.logger.info(`User ${user.email} unsuspended`);
        this.unsuspendConfirmOpen.set(false);
        this.users.update(users => 
          users.map(u => u.id === updatedUser.id ? updatedUser : u)
        );
        if (this.selectedUser()?.id === updatedUser.id) {
          this.selectedUser.set(updatedUser);
        }
      },
      error: (err) => {
        this.logger.error('Error unsuspending user', err);
        this.unsuspendConfirmOpen.set(false);
        alert('Error unsuspending user');
      }
    });
  }

  cancelUnsuspend() {
    this.unsuspendConfirmOpen.set(false);
  }

  removeAccess() {
    this.actionsMenuOpen.set(false);
    const user = this.selectedUser();
    if (!user) return;

    if (this.isLastSystemAdmin(user)) {
      alert('Cannot remove the last System Admin');
      return;
    }

    this.removeAccessConfirmOpen.set(true);
  }

  confirmRemoveAccess() {
    const user = this.selectedUser();
    if (!user) return;

    this.usersService.setUserStatus(user.id, 'Deactivated').subscribe({
      next: (updatedUser) => {
        this.logger.info(`Access removed for ${user.email}`);
        this.removeAccessConfirmOpen.set(false);
        this.users.update(users => 
          users.map(u => u.id === updatedUser.id ? updatedUser : u)
        );
        if (this.selectedUser()?.id === updatedUser.id) {
          this.selectedUser.set(updatedUser);
        }
      },
      error: (err) => {
        this.logger.error('Error removing access', err);
        this.removeAccessConfirmOpen.set(false);
        if (err.message && err.message.includes('last System Admin')) {
          alert('Cannot remove the last System Admin');
        } else {
          alert('Error removing access');
        }
      }
    });
  }

  cancelRemoveAccess() {
    this.removeAccessConfirmOpen.set(false);
  }

  // Legacy methods for drawer compatibility
  deactivateUser() {
    this.removeAccess();
  }

  reactivateUser() {
    this.unsuspendUser();
  }

  isLastSystemAdmin(user: User): boolean {
    if (!user.roles.includes('System Admin') || user.status !== 'Active') {
      return false;
    }
    const activeSystemAdmins = this.users().filter(u =>
      u.roles.includes('System Admin') && 
      u.status === 'Active' &&
      u.id !== user.id
    );
    return activeSystemAdmins.length === 0;
  }
}
