import { Component, OnInit, signal, computed, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
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
  TabsModule
} from 'carbon-components-angular';
import { InMemoryDevService } from '../../services/in-memory-dev.service';
import { ServiceAccount, ApiKey, EnvKey, ApiCall } from '../../models';
import { StatusTagPipe } from '../../shared/pipes/status-tag.pipe';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { CopyToClipboardDirective } from '../../shared/directives/copy-to-clipboard.directive';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { RightRailAnchorsComponent, Anchor } from '../../shared/components/right-rail-anchors/right-rail-anchors.component';
import { LoggerService } from '../../../core/services/logger.service';

@Component({
  selector: 'app-service-accounts',
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
    TabsModule,
    StatusTagPipe,
    ConfirmDialogComponent,
    CopyToClipboardDirective,
    DataTableComponent,
  ],
  template: `
    <div class="page-wrapper" [class.drawer-open]="detailsDrawerOpen()">
      <div class="page-container">
        <!-- Breadcrumb -->

        <!-- Utility Header -->
        <div class="page-header">
          <div class="header-content">
            <div class="header-text">
              <h1>Service Accounts</h1>
            </div>
            <div class="header-actions">
              <button ibmButton="primary" (click)="openCreateModal()" aria-label="Create new service account">
                Create Service Account
              </button>
              <button ibmButton="ghost" (click)="openDeveloperDocs()" aria-label="View developer documentation">
                Developer Docs
              </button>
            </div>
          </div>
        </div>

        <!-- Page Toolbar -->
        <div class="page-toolbar">
          <div class="toolbar-left">
            <div class="search-wrapper">
              <input 
                ibmText 
                placeholder="Search by name or ID..." 
                [(ngModel)]="searchQuery" 
                (ngModelChange)="updateFilters()"
                class="search-input"
                aria-label="Search service accounts">
              <button *ngIf="searchQuery" class="clear-search" (click)="clearSearch()" aria-label="Clear search">×</button>
            </div>
            
            <div class="filter-pills">
              <button 
                class="filter-pill" 
                [class.active]="envFilter === 'prod'"
                (click)="toggleEnvFilter('prod')">
                Prod
              </button>
              <button 
                class="filter-pill" 
                [class.active]="envFilter === 'sandbox'"
                (click)="toggleEnvFilter('sandbox')">
                Staging
              </button>
              <button 
                class="filter-pill" 
                [class.active]="statusFilter === 'active'"
                (click)="toggleStatusFilter('active')">
                Active
              </button>
              <button 
                class="filter-pill" 
                [class.active]="statusFilter === 'suspended'"
                (click)="toggleStatusFilter('suspended')">
                Disabled
              </button>
            </div>
          </div>
          
          <button 
            *ngIf="hasActiveFilters()"
            class="reset-filters" 
            (click)="resetFilters()"
            aria-label="Reset all filters">
            Reset Filters
          </button>
        </div>

        <!-- Main Content -->
        <div class="main-content">

          <!-- Table Card -->
          <div class="table-card">
            <h2 class="card-title">All Service Accounts</h2>
            
            <!-- Empty State -->
            <div *ngIf="filteredAccounts().length === 0 && !loading()" class="empty-state">
              <div class="empty-icon">🔑</div>
              <h3>No service accounts yet.</h3>
              <button ibmButton="primary" (click)="openCreateModal()">Create Service Account</button>
            </div>

            <!-- Table -->
            <div *ngIf="filteredAccounts().length > 0 || loading()" class="app-table is-compact has-sticky">
              <app-data-table 
                [model]="tableModel" 
                [loading]="loading()" 
                size="sm"
                (rowClick)="onRowClick($event)">
              </app-data-table>
            </div>

            <!-- Pagination -->
            <div *ngIf="filteredAccounts().length > 0 && !loading()" class="table-pagination">
              <div class="pagination-info">
                Showing {{ paginationStart() }} - {{ paginationEnd() }} of {{ filteredAccounts().length }}
              </div>
              <div class="pagination-controls">
                <select [(ngModel)]="pageSize" (ngModelChange)="updatePagination()" class="page-size-select">
                  <option [value]="10">10 per page</option>
                  <option [value]="25">25 per page</option>
                  <option [value]="50">50 per page</option>
                </select>
                <button 
                  ibmButton="ghost" 
                  [disabled]="currentPage() === 1"
                  (click)="previousPage()"
                  aria-label="Previous page">
                  Previous
                </button>
                <button 
                  ibmButton="ghost" 
                  [disabled]="currentPage() >= totalPages()"
                  (click)="nextPage()"
                  aria-label="Next page">
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Details Drawer -->
      <div class="details-drawer" [class.open]="detailsDrawerOpen()">
        <div class="drawer-header">
          <div class="drawer-header-content">
            <div>
              <h2>{{ selectedAccount()?.name || 'Details' }}</h2>
              <div class="drawer-subheader">
                <code class="client-id">{{ selectedAccount()?.id || '' }}</code>
                <button 
                  class="copy-icon-btn"
                  [appCopyToClipboard]="selectedAccount()?.id || ''"
                  copyLabel="Client ID copied"
                  aria-label="Copy Client ID">
                  📋
                </button>
              </div>
            </div>
            <ibm-tag [type]="getStatusTagType(selectedAccount()?.status || '')">
              {{ (selectedAccount()?.status || '') | statusTag }}
            </ibm-tag>
          </div>
          <button 
            class="close-button" 
            (click)="closeDetailsDrawer()"
            aria-label="Close details drawer">
            ×
          </button>
        </div>
        
        <div class="drawer-content" *ngIf="selectedAccount()">
          <ibm-tabs>
            <ibm-tab heading="Overview">
              <div class="tab-content">
                <div class="detail-item">
                  <label>Description</label>
                  <div>{{ selectedAccount()!.description || 'No description' }}</div>
                </div>
                <div class="detail-item">
                  <label>Environment</label>
                  <div class="env-tags">
                    <ibm-tag *ngFor="let env of selectedAccount()!.envs" type="blue">
                      {{ env }}
                    </ibm-tag>
                  </div>
                </div>
                <div class="detail-item">
                  <label>Owner</label>
                  <div>{{ selectedAccount()!.ownerTeam || 'Unassigned' }}</div>
                </div>
                <div class="detail-item">
                  <label>Created</label>
                  <div>{{ formatDate(selectedAccount()!.createdAt) }}</div>
                </div>
                <div class="detail-item">
                  <label>Last Used</label>
                  <div>{{ formatLastUsed(selectedAccount()!) }}</div>
                </div>
                <div class="detail-item" *ngIf="selectedAccount()!.scopes.length > 0">
                  <label>Tags</label>
                  <div class="tags-list">
                    <ibm-tag *ngFor="let scope of selectedAccount()!.scopes.slice(0, 5)" type="gray">
                      {{ scope }}
                    </ibm-tag>
                  </div>
                </div>
              </div>
            </ibm-tab>
            
            <ibm-tab heading="API Access">
              <div class="tab-content">
                <div class="api-access-list">
                  <div *ngFor="let scope of selectedAccount()!.scopes" class="api-scope-item">
                    <ibm-tag type="blue">{{ scope }}</ibm-tag>
                  </div>
                </div>
                <button ibmButton="secondary" (click)="openEditScopesModal()">Edit Access</button>
              </div>
            </ibm-tab>
            
            <ibm-tab heading="Credentials">
              <div class="tab-content">
                <div class="credentials-section">
                  <label>Client Secret</label>
                  <div class="secret-display">
                    <code class="masked-secret">{{ maskedSecret() }}</code>
                    <div class="secret-actions">
                      <button ibmButton="ghost" (click)="copySecret()">Copy</button>
                      <button ibmButton="ghost" (click)="toggleRevealSecret()">
                        {{ secretRevealed() ? 'Hide' : 'Reveal' }}
                      </button>
                      <button ibmButton="secondary" (click)="openRotateSecretModal()">Rotate Secret</button>
                    </div>
                  </div>
                  <div class="last-rotated" *ngIf="selectedAccount()!.lastRotatedAt">
                    Last Rotated: {{ formatDate(selectedAccount()!.lastRotatedAt!) }}
                  </div>
                </div>
              </div>
            </ibm-tab>
            
            <ibm-tab heading="Activity">
              <div class="tab-content">
                <div class="activity-list">
                  <div *ngFor="let event of activityEvents()" class="activity-item">
                    <div class="activity-time">{{ formatTime(event.timestamp) }}</div>
                    <div class="activity-action">{{ event.action }}</div>
                    <div class="activity-details">{{ event.details }}</div>
                  </div>
                </div>
                <a href="#" class="view-full-audit">View full audit log →</a>
              </div>
            </ibm-tab>
          </ibm-tabs>
        </div>
      </div>

      <!-- Drawer Overlay -->
      <div 
        class="drawer-overlay" 
        [class.open]="detailsDrawerOpen()"
        (click)="closeDetailsDrawer()"
        aria-hidden="true">
      </div>

      <!-- Create Account Modal (Two-Step Wizard) -->
      <ibm-modal [open]="createModalOpen()" [size]="'md'" (overlaySelected)="closeCreateModal()">
        <ibm-modal-header (closeSelect)="closeCreateModal()">
          <p class="bx--modal-header__heading">Create Service Account</p>
        </ibm-modal-header>
        <div ibmModalContent>
          <div class="wizard-steps">
            <div class="step-indicator">
              <div class="step" [class.active]="createWizardStep() === 1" [class.completed]="createWizardStep() > 1">
                <span class="step-number">1</span>
                <span class="step-label">Details</span>
              </div>
              <div class="step" [class.active]="createWizardStep() === 2">
                <span class="step-number">2</span>
                <span class="step-label">Access</span>
              </div>
            </div>

            <!-- Step 1: Details -->
            <div *ngIf="createWizardStep() === 1" class="wizard-step-content">
              <form [formGroup]="createForm">
                <ibm-label>
                  Name <span class="required">*</span>
                  <input ibmText formControlName="name" placeholder="api-client-prod" required>
                </ibm-label>
                <ibm-label>
                  Description
                  <textarea ibmText formControlName="description" rows="3" placeholder="Optional description"></textarea>
                </ibm-label>
                <div class="form-group">
                  <label>Environment</label>
                  <div class="radio-group">
                    <label class="radio-label">
                      <input type="radio" formControlName="env" value="prod" [checked]="createForm.get('env')?.value === 'prod'">
                      <span>Prod</span>
                    </label>
                    <label class="radio-label">
                      <input type="radio" formControlName="env" value="sandbox" [checked]="createForm.get('env')?.value === 'sandbox'">
                      <span>Staging</span>
                    </label>
                  </div>
                </div>
                <ibm-label>
                  Tags (optional)
                  <input ibmText placeholder="comma-separated tags">
                </ibm-label>
              </form>
            </div>

            <!-- Step 2: Access -->
            <div *ngIf="createWizardStep() === 2" class="wizard-step-content">
              <div class="form-group">
                <label>Select APIs</label>
              </div>
              <div class="form-group">
                <label>Scopes</label>
                <div class="scope-chips">
                  <ibm-tag *ngFor="let scope of createFormScopes()" type="blue">{{ scope }}</ibm-tag>
                </div>
              </div>
            </div>
          </div>
        </div>
        <ibm-modal-footer>
          <button 
            *ngIf="createWizardStep() === 2"
            ibmButton="ghost" 
            (click)="createWizardStep.set(1)">
            Back
          </button>
          <button ibmButton="secondary" (click)="closeCreateModal()">Cancel</button>
          <button 
            *ngIf="createWizardStep() === 1"
            ibmButton="primary" 
            [disabled]="!createForm.get('name')?.value"
            (click)="createWizardStep.set(2)">
            Next
          </button>
          <button 
            *ngIf="createWizardStep() === 2"
            ibmButton="primary" 
            [disabled]="createFormScopes().length === 0"
            (click)="createAccount()">
            Create
          </button>
        </ibm-modal-footer>
      </ibm-modal>

      <!-- Generate Token Modal -->
      <ibm-modal [open]="generateTokenModalOpen()" [size]="'md'" (overlaySelected)="closeGenerateTokenModal()">
        <ibm-modal-header (closeSelect)="closeGenerateTokenModal()">
          <p class="bx--modal-header__heading">Generate Token</p>
        </ibm-modal-header>
        <div ibmModalContent>
          <div class="callout-info">
            <strong>Tokens are shown once.</strong> Store it securely.
          </div>
          <div class="token-display">
            <code class="generated-token">{{ generatedToken() || '••••••••••••••••' }}</code>
            <div class="token-actions">
              <button ibmButton="ghost" (click)="copyGeneratedToken()">Copy</button>
              <button ibmButton="ghost" (click)="downloadToken()">Download .txt</button>
            </div>
          </div>
          <ibm-label>
            Expiry
            <select ibmSelect [(ngModel)]="tokenExpiry">
              <option value="1h">1 hour</option>
              <option value="8h">8 hours</option>
              <option value="24h">24 hours</option>
              <option value="custom">Custom</option>
            </select>
          </ibm-label>
          <ibm-label>
            Purpose (optional)
            <input ibmText [(ngModel)]="tokenPurpose" placeholder="e.g., Testing, Production">
          </ibm-label>
        </div>
        <ibm-modal-footer>
          <button ibmButton="secondary" (click)="closeGenerateTokenModal()">Close</button>
          <button ibmButton="primary" (click)="generateToken()">Generate</button>
        </ibm-modal-footer>
      </ibm-modal>

      <!-- Rotate Secret Modal -->
      <ibm-modal [open]="rotateSecretModalOpen()" [size]="'md'" (overlaySelected)="closeRotateSecretModal()">
        <ibm-modal-header (closeSelect)="closeRotateSecretModal()">
          <p class="bx--modal-header__heading">Rotate Secret</p>
        </ibm-modal-header>
        <div ibmModalContent>
          <p>Rotating the secret will invalidate the current secret and generate a new one. This action cannot be undone.</p>
          <div class="last-rotated-info" *ngIf="selectedAccount()?.lastRotatedAt">
            <strong>Last Rotated:</strong> {{ formatDate(selectedAccount()!.lastRotatedAt!) }}
          </div>
          <ibm-checkbox [(ngModel)]="confirmRotate">
            I understand that rotating the secret will invalidate the current secret
          </ibm-checkbox>
        </div>
        <ibm-modal-footer>
          <button ibmButton="secondary" (click)="closeRotateSecretModal()">Cancel</button>
          <button ibmButton="primary" [disabled]="!confirmRotate" (click)="confirmRotateSecret()">Rotate</button>
        </ibm-modal-footer>
      </ibm-modal>

      <!-- Edit Account Modal -->
      <ibm-modal [open]="editModalOpen()" [size]="'md'" (overlaySelected)="closeEditModal()">
        <ibm-modal-header (closeSelect)="closeEditModal()">
          <p class="bx--modal-header__heading">Edit Service Account</p>
        </ibm-modal-header>
        <div ibmModalContent>
          <form [formGroup]="editForm" (ngSubmit)="saveEdit()">
            <ibm-label>
              Name
              <input ibmText formControlName="name" required>
            </ibm-label>
            <ibm-label>
              Description
              <textarea ibmText formControlName="description" rows="3"></textarea>
            </ibm-label>
            <div class="form-group">
              <label>Environments</label>
              <ibm-checkbox formControlName="sandbox">Sandbox</ibm-checkbox>
              <ibm-checkbox formControlName="prod">Production</ibm-checkbox>
            </div>
            <ibm-label>
              Owner Team
              <input ibmText formControlName="ownerTeam" placeholder="Platform">
            </ibm-label>
          </form>
        </div>
        <ibm-modal-footer>
          <button ibmButton="secondary" (click)="closeEditModal()">Cancel</button>
          <button ibmButton="primary" [disabled]="editForm.invalid" (click)="saveEdit()">Save</button>
        </ibm-modal-footer>
      </ibm-modal>

      <!-- Create Key Modal -->
      <ibm-modal [open]="createKeyModalOpen()" [size]="'md'" (overlaySelected)="closeCreateKeyModal()">
        <ibm-modal-header (closeSelect)="closeCreateKeyModal()">
          <p class="bx--modal-header__heading">Create Key</p>
        </ibm-modal-header>
        <div ibmModalContent>
          <form [formGroup]="createKeyForm" (ngSubmit)="createKey()">
            <ibm-label>
              Label <span class="required">*</span>
              <input ibmText formControlName="label" placeholder="Primary Key" required>
            </ibm-label>
            <ibm-label>
              Environment
              <select ibmSelect formControlName="env">
                <option value="">Select environment</option>
                <option value="sandbox">Sandbox</option>
                <option value="prod">Production</option>
              </select>
            </ibm-label>
            <ibm-label>
              Expiry (optional)
              <input ibmText type="date" formControlName="expiry">
            </ibm-label>
            <div class="form-group">
              <label>Scopes</label>
              <div class="scopes-checkboxes">
                <ibm-checkbox 
                  *ngFor="let scope of availableScopes()" 
                  [checked]="selectedKeyScopes().includes(scope)"
                  (checkedChange)="toggleScope(scope, $event)">
                  {{ scope }}
                </ibm-checkbox>
              </div>
            </div>
          </form>
        </div>
        <ibm-modal-footer>
          <button ibmButton="secondary" (click)="closeCreateKeyModal()">Cancel</button>
          <button ibmButton="primary" [disabled]="createKeyForm.invalid" (click)="createKey()">Create</button>
        </ibm-modal-footer>
      </ibm-modal>

      <!-- Token Preview Modal -->
      <ibm-modal [open]="tokenPreviewModalOpen()" [size]="'sm'" (overlaySelected)="closeTokenPreviewModal()">
        <ibm-modal-header (closeSelect)="closeTokenPreviewModal()">
          <p class="bx--modal-header__heading">Key Created</p>
        </ibm-modal-header>
        <div ibmModalContent>
          <p>Your new key has been created. Copy this token now - you won't be able to see it again:</p>
          <div class="token-preview-box" [appCopyToClipboard]="newTokenPreview()" copyLabel="Token copied">
            <code>{{ newTokenPreview() }}</code>
          </div>
        </div>
        <ibm-modal-footer>
          <button ibmButton="primary" (click)="closeTokenPreviewModal()">Done</button>
        </ibm-modal-footer>
      </ibm-modal>

      <!-- Revoke Key Modal -->
      <ibm-modal [open]="revokeKeyModalOpen()" [size]="'sm'" (overlaySelected)="closeRevokeKeyModal()">
        <ibm-modal-header (closeSelect)="closeRevokeKeyModal()">
          <p class="bx--modal-header__heading">Revoke Key</p>
        </ibm-modal-header>
        <div ibmModalContent>
          <p>Are you sure you want to revoke this key? This action cannot be undone.</p>
          <ibm-label>
            Reason (optional)
            <textarea ibmText [(ngModel)]="revokeReason" rows="3" placeholder="Optional reason for revocation"></textarea>
          </ibm-label>
        </div>
        <ibm-modal-footer>
          <button ibmButton="secondary" (click)="closeRevokeKeyModal()">Cancel</button>
          <button ibmButton="danger" (click)="confirmRevokeKey()">Revoke</button>
        </ibm-modal-footer>
      </ibm-modal>

      <!-- Edit Scopes Modal -->
      <ibm-modal [open]="editScopesModalOpen()" [size]="'md'" (overlaySelected)="closeEditScopesModal()">
        <ibm-modal-header (closeSelect)="closeEditScopesModal()">
          <p class="bx--modal-header__heading">Edit Scopes</p>
        </ibm-modal-header>
        <div ibmModalContent>
          <p>Select the scopes for this service account:</p>
          <div class="scopes-checkboxes">
            <ibm-checkbox 
              *ngFor="let scope of availableScopes()" 
              [checked]="editingScopes().includes(scope)"
              (checkedChange)="toggleEditingScope(scope, $event)">
              {{ scope }}
            </ibm-checkbox>
          </div>
        </div>
        <ibm-modal-footer>
          <button ibmButton="secondary" (click)="closeEditScopesModal()">Cancel</button>
          <button ibmButton="primary" (click)="saveScopes()">Save</button>
        </ibm-modal-footer>
      </ibm-modal>

      <app-confirm-dialog
        [open]="suspendConfirmOpen()"
        title="Suspend Service Account"
        [message]="suspendConfirmMessage()"
        confirmLabel="Suspend"
        [danger]="true"
        (confirmed)="confirmSuspend()"
        (cancelled)="cancelSuspend()">
      </app-confirm-dialog>
    </div>
  `,
  styles: [`
    .page-wrapper {
      min-height: 100vh;
      background: var(--linear-bg);
    }

    .page-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px 16px;
      position: relative;
    }

    /* Breadcrumb */
    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
      font-size: 0.875rem;
    }

    .breadcrumb-link {
      color: var(--linear-text-secondary);
      text-decoration: none;
      transition: color 150ms ease;
    }

    .breadcrumb-link:hover {
      color: var(--linear-text-primary);
    }

    .breadcrumb-separator {
      color: var(--linear-text-secondary);
    }

    .breadcrumb-current {
      color: var(--linear-text-primary);
    }

    /* Utility Header */
    .page-header {
      margin-bottom: 2rem;
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
    }

    .header-text {
      flex: 1;
    }

    h1 {
      font-size: 2rem;
      font-weight: 600;
      color: var(--linear-text-primary);
      margin: 0 0 8px 0;
    }

    .header-actions {
      display: flex;
      gap: 12px;
    }

    /* Page Toolbar */
    .page-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 2em;
      margin-bottom: 16px;
      padding: 12px 16px;
      background: var(--linear-surface);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 10px;
    }

    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
      flex-wrap: wrap;
    }

    .search-wrapper {
      position: relative;
      flex: 1;
      min-width: 250px;
    }

    .search-input {
      width: 100%;
    }

    .clear-search {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: var(--linear-text-secondary);
      cursor: pointer;
      font-size: 1.25rem;
      padding: 4px;
      line-height: 1;
    }

    .filter-pills {
      display: flex;
      gap: .25rem;
      flex-wrap: wrap;
    }

    .filter-pill {
      padding: 6px 12px;
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 50px;
      color: var(--linear-text-secondary);
      font-size: 0.8125rem;
      cursor: pointer;
      transition: all 150ms ease;
    }

    .filter-pill:hover {
      background: rgba(255, 255, 255, 0.02);
      border-color: rgba(255, 255, 255, 0.1);
    }

    .filter-pill.active {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.15);
      color: var(--linear-text-primary);
    }

    .reset-filters {
      font-size: 0.8125rem;
      color: var(--linear-text-secondary);
      background: none;
      border: none;
      cursor: pointer;
      padding: 6px 12px;
      text-decoration: underline;
    }

    .reset-filters:hover {
      color: var(--linear-text-primary);
    }

    /* Main Content */
    .main-content {
      /* Single column flow */
    }

    /* Table Card */

    .card-title {
      font-size: .85rem;
      font-weight: 400;
      color: var(--linear-text-secondary);
      margin: 4rem 0 1rem 0;
    }

    .app-table {
      margin-top: 16px;
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 48px 24px;
    }

    .empty-icon {
      font-size: 3rem;
      margin-bottom: 16px;
      opacity: 0.5;
    }

    .empty-state h3 {
      font-size: 1.125rem;
      color: var(--linear-text-primary);
      margin: 0 0 8px 0;
    }

    /* Pagination */
    .table-pagination {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }

    .pagination-info {
      font-size: 0.875rem;
      color: var(--linear-text-secondary);
    }

    .pagination-controls {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .page-size-select {
      padding: 6px 12px;
      background: var(--linear-surface);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 6px;
      color: var(--linear-text-primary);
      font-size: 0.875rem;
    }

    /* Details Drawer */
    .drawer-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 1000;
      opacity: 0;
      pointer-events: none;
      transition: opacity 200ms ease;
    }

    .drawer-overlay.open {
      opacity: 1;
      pointer-events: all;
    }

    .details-drawer {
      position: fixed;
      top: 0;
      right: -480px;
      width: 480px;
      max-width: 90vw;
      height: 100vh;
      background: var(--linear-surface);
      border-left: 1px solid rgba(255, 255, 255, 0.06);
      z-index: 1001;
      transition: right 300ms ease;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: -4px 0 24px rgba(0, 0, 0, 0.2);
    }

    .details-drawer.open {
      right: 0;
    }

    .drawer-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .drawer-header-content {
      flex: 1;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .drawer-header h2 {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--linear-text-primary);
      margin: 0 0 8px 0;
    }

    .drawer-subheader {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 4px;
    }

    .client-id {
      font-family: monospace;
      font-size: 0.8125rem;
      color: var(--linear-text-secondary);
      background: rgba(255, 255, 255, 0.05);
      padding: 4px 8px;
      border-radius: 4px;
    }

    .copy-icon-btn {
      background: none;
      border: none;
      color: var(--linear-text-secondary);
      cursor: pointer;
      padding: 4px;
      font-size: 0.875rem;
    }

    .drawer-content {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
    }

    .tab-content {
      padding: 16px 0;
    }

    .detail-item {
      margin-bottom: 16px;
    }

    .detail-item label {
      display: block;
      font-size: 0.75rem;
      color: var(--linear-text-secondary);
      text-transform: uppercase;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .detail-item > div {
      color: var(--linear-text-primary);
      font-size: 0.875rem;
    }

    .api-access-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 16px;
    }

    .credentials-section {
      margin-bottom: 24px;
    }

    .secret-display {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 12px 0;
    }

    .masked-secret {
      font-family: monospace;
      font-size: 0.875rem;
      color: var(--linear-text-primary);
      background: rgba(255, 255, 255, 0.05);
      padding: 8px 12px;
      border-radius: 6px;
      flex: 1;
    }

    .secret-actions {
      display: flex;
      gap: 8px;
    }

    .last-rotated {
      font-size: 0.8125rem;
      color: var(--linear-text-secondary);
      margin-top: 8px;
    }

    .activity-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .activity-item {
      padding: 12px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 6px;
    }

    .activity-time {
      font-size: 0.75rem;
      color: var(--linear-text-secondary);
      margin-bottom: 4px;
    }

    .activity-action {
      font-size: 0.875rem;
      color: var(--linear-text-primary);
      font-weight: 500;
      margin-bottom: 2px;
    }

    .activity-details {
      font-size: 0.8125rem;
      color: var(--linear-text-secondary);
    }

    .view-full-audit {
      display: inline-block;
      margin-top: 16px;
      color: var(--linear-accent);
      text-decoration: none;
      font-size: 0.875rem;
    }

    .close-button {
      background: none;
      border: none;
      font-size: 1.5rem;
      color: var(--linear-text-secondary);
      cursor: pointer;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      transition: background 150ms ease;
    }

    .close-button:hover {
      background: rgba(255, 255, 255, 0.05);
    }

    .env-tags {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .tags-list {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    /* Wizard Modal Styles */
    .wizard-steps {
      margin-bottom: 24px;
    }

    .step-indicator {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
    }

    .step {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--linear-text-secondary);
    }

    .step.active {
      color: var(--linear-text-primary);
    }

    .step.completed {
      color: var(--linear-accent);
    }

    .step-number {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8125rem;
      font-weight: 600;
    }

    .step.active .step-number {
      background: var(--linear-accent);
      border-color: var(--linear-accent);
      color: white;
    }

    .step.completed .step-number {
      background: rgba(59, 130, 246, 0.2);
      border-color: var(--linear-accent);
      color: var(--linear-accent);
    }

    .step-label {
      font-size: 0.875rem;
    }

    .wizard-step-content {
      min-height: 300px;
    }

    .radio-group {
      display: flex;
      gap: 16px;
      margin-top: 8px;
    }

    .radio-label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-size: 0.875rem;
      color: var(--linear-text-primary);
    }

    .scope-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 8px;
    }

    /* Generate Token Modal */
    .callout-info {
      padding: 12px 16px;
      background: rgba(59, 130, 246, 0.1);
      border: 1px solid rgba(59, 130, 246, 0.2);
      border-radius: 6px;
      margin-bottom: 16px;
      font-size: 0.875rem;
      color: var(--linear-text-primary);
    }

    .token-display {
      margin: 16px 0;
    }

    .generated-token {
      display: block;
      font-family: monospace;
      font-size: 0.875rem;
      color: var(--linear-text-primary);
      background: rgba(255, 255, 255, 0.05);
      padding: 12px;
      border-radius: 6px;
      margin-bottom: 12px;
      word-break: break-all;
    }

    .token-actions {
      display: flex;
      gap: 8px;
    }

    .last-rotated-info {
      padding: 12px;
      background: rgba(255, 255, 255, 0.02);
      border-radius: 6px;
      margin: 16px 0;
      font-size: 0.875rem;
      color: var(--linear-text-secondary);
    }

    /* Form Styles */
    .form-group {
      margin: 16px 0;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-size: 0.875rem;
      color: var(--linear-text-primary);
      font-weight: 500;
    }

    .required {
      color: #ef4444;
    }

    .scopes-checkboxes {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-top: 8px;
    }

    @media (max-width: 991px) {
      .details-drawer {
        width: 100vw;
        right: -100vw;
      }
      
      .page-container {
        padding: 16px 12px;
      }
      
      .header-content {
        flex-direction: column;
        align-items: stretch;
      }
      
      .header-actions {
        width: 100%;
        justify-content: flex-start;
      }
    }

    .token-preview-box {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      padding: 16px;
      margin-top: 16px;
      text-align: center;
      cursor: pointer;
    }

    .token-preview-box code {
      font-family: monospace;
      font-size: 1rem;
      color: var(--linear-text-primary);
    }
  `]
})
export class ServiceAccountsPage implements OnInit {
  private devService = inject(InMemoryDevService);
  private fb = inject(FormBuilder);
  private logger = inject(LoggerService);
  router = inject(Router);


  loading = signal(false);
  serviceAccounts = signal<ServiceAccount[]>([]);
  createModalOpen = signal(false);
  editModalOpen = signal(false);
  createKeyModalOpen = signal(false);
  tokenPreviewModalOpen = signal(false);
  revokeKeyModalOpen = signal(false);
  editScopesModalOpen = signal(false);
  suspendConfirmOpen = signal(false);
  detailsDrawerOpen = signal(false);
  selectedAccount = signal<ServiceAccount | null>(null);
  accountToSuspend = signal<ServiceAccount | null>(null);
  keyToRevoke = signal<string | null>(null);
  revokeReason = '';

  availableScopes = signal<string[]>([]);
  selectedKeyScopes = signal<string[]>([]);
  editingScopes = signal<string[]>([]);
  createFormScopes = signal<string[]>([]);
  newTokenPreview = signal<string>('');
  recentCalls = signal<ApiCall[]>([]);
  selectedRows = signal<string[]>([]);

  searchQuery = '';
  statusFilter = '';
  envFilter = '';
  hasKeysFilter = '';
  
  // Pagination
  currentPage = signal(1);
  pageSize = 25;
  secretRevealed = signal(false);
  rotateSecretModalOpen = signal(false);
  generateTokenModalOpen = signal(false);
  createWizardStep = signal(1);
  generatedToken = signal<string>('');
  tokenExpiry = '24h';
  tokenPurpose = '';
  confirmRotate = false;

  tableModel = new TableModel();
  keysTableModel = new TableModel();
  activityTableModel = new TableModel();

  drawerAnchors: Anchor[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'keys', label: 'Keys' },
    { id: 'scopes', label: 'Scopes' },
    { id: 'activity', label: 'Activity' }
  ];

  createForm: FormGroup = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    env: ['sandbox'],
    tags: ['']
  });

  editForm: FormGroup = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    sandbox: [true],
    prod: [false],
    ownerTeam: ['']
  });

  createKeyForm: FormGroup = this.fb.group({
    label: ['', Validators.required],
    env: [''],
    expiry: ['']
  });

  filteredAccounts = computed(() => {
    let accounts = [...this.serviceAccounts()];

    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      accounts = accounts.filter(a => 
        a.name.toLowerCase().includes(query) ||
        a.id.toLowerCase().includes(query)
      );
    }

    if (this.statusFilter) {
      accounts = accounts.filter(a => a.status === this.statusFilter);
    }

    if (this.envFilter) {
      accounts = accounts.filter(a => a.envs.includes(this.envFilter as EnvKey));
    }

    if (this.hasKeysFilter === 'yes') {
      accounts = accounts.filter(a => a.keys && a.keys.length > 0);
    } else if (this.hasKeysFilter === 'no') {
      accounts = accounts.filter(a => !a.keys || a.keys.length === 0);
    }

    return accounts;
  });

  totalPages = computed(() => Math.ceil(this.filteredAccounts().length / this.pageSize));
  paginationStart = computed(() => (this.currentPage() - 1) * this.pageSize + 1);
  paginationEnd = computed(() => Math.min(this.currentPage() * this.pageSize, this.filteredAccounts().length));
  
  paginatedAccounts = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredAccounts().slice(start, end);
  });

  maskedSecret = computed(() => {
    if (this.secretRevealed()) {
      return this.selectedAccount()?.keys[0]?.tokenPreview || '••••••••••••';
    }
    return '••••••••••••';
  });

  activityEvents = computed(() => {
    const account = this.selectedAccount();
    if (!account) return [];
    
    const events = [];
    if (account.createdAt) {
      events.push({ timestamp: account.createdAt, action: 'Created', details: 'Service account created' });
    }
    if (account.lastRotatedAt) {
      events.push({ timestamp: account.lastRotatedAt, action: 'Rotated', details: 'Secret rotated' });
    }
    if (account.status === 'suspended') {
      events.push({ timestamp: account.createdAt, action: 'Disabled', details: 'Account disabled' });
    }
    return events.slice(0, 10);
  });

  @HostListener('keydown', ['$event'])
  handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && this.detailsDrawerOpen()) {
      this.closeDetailsDrawer();
    }
  }

  ngOnInit() {
    this.loadAccounts();
    this.loadAvailableScopes();
  }

  loadAccounts() {
    this.loading.set(true);
    this.devService.listServiceAccounts().subscribe({
      next: (accounts) => {
        this.serviceAccounts.set(accounts);
        this.loading.set(false);
        this.updateTable();
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  loadAvailableScopes() {
    this.devService.getAvailableScopes().subscribe(scopes => {
      this.availableScopes.set(scopes);
    });
  }

  updateFilters() {
    this.updateTable();
  }

  updateTable() {
    const accounts = this.paginatedAccounts();

    this.tableModel.header = [
      new TableHeaderItem({ data: 'Name' }),
      new TableHeaderItem({ data: 'Client ID' }),
      new TableHeaderItem({ data: 'APIs' }),
      new TableHeaderItem({ data: 'Scopes' }),
      new TableHeaderItem({ data: 'Environment' }),
      new TableHeaderItem({ data: 'Last Used' }),
      new TableHeaderItem({ data: 'Status' }),
      new TableHeaderItem({ data: 'Owner' }),
      new TableHeaderItem({ data: 'Actions' })
    ];

    this.tableModel.data = accounts.map(account => {
      const scopesDisplay = account.scopes.slice(0, 3);
      const remainingScopes = account.scopes.length - 3;
      const apis = this.getAccountApis(account);

      return [
        new TableItem({ data: account.name, expandedData: account }),
        new TableItem({ data: account.id }),
        new TableItem({ data: apis.length > 0 ? apis.join(', ') : 'None' }),
        new TableItem({ 
          data: scopesDisplay.length > 0 
            ? scopesDisplay.join(', ') + (remainingScopes > 0 ? ` +${remainingScopes}` : '')
            : 'None'
        }),
        new TableItem({ data: account.envs.map(e => e === 'prod' ? 'Prod' : 'Staging').join(', ') }),
        new TableItem({ data: this.formatLastUsed(account) }),
        new TableItem({ data: account.status }),
        new TableItem({ data: account.ownerTeam || 'Unassigned' }),
        new TableItem({ data: '⋮', expandedData: account })
      ];
    });
  }

  updateKeysTable() {
    const account = this.selectedAccount();
    if (!account) return;

    this.keysTableModel.header = [
      new TableHeaderItem({ data: 'Label' }),
      new TableHeaderItem({ data: 'Env' }),
      new TableHeaderItem({ data: 'Created' }),
      new TableHeaderItem({ data: 'Expires' }),
      new TableHeaderItem({ data: 'Status' }),
      new TableHeaderItem({ data: 'Actions' })
    ];

    this.keysTableModel.data = (account.keys || []).map(key => [
      new TableItem({ data: key.label }),
      new TableItem({ data: key.env || 'N/A' }),
      new TableItem({ data: this.formatDate(key.createdAt) }),
      new TableItem({ data: key.expiresAt ? this.formatDate(key.expiresAt) : 'Never' }),
      new TableItem({ data: key.status }),
      new TableItem({ data: 'Rotate | Revoke | Copy', expandedData: key })
    ]);
  }

  updateActivityTable() {
    const calls = this.recentCalls();

    this.activityTableModel.header = [
      new TableHeaderItem({ data: 'Time' }),
      new TableHeaderItem({ data: 'API' }),
      new TableHeaderItem({ data: 'Method' }),
      new TableHeaderItem({ data: 'Status' }),
      new TableHeaderItem({ data: 'Latency' })
    ];

    this.activityTableModel.data = calls.map(call => [
      new TableItem({ data: this.formatTime(call.timestamp) }),
      new TableItem({ data: call.api }),
      new TableItem({ data: call.method }),
      new TableItem({ data: call.status.toString() }),
      new TableItem({ data: `${call.latency}ms` })
    ]);
  }

  onRowClick(event: any) {
    const rowIndex = event.selectedRowIndex;
    const account = this.paginatedAccounts()[rowIndex];
    if (account) {
      this.openDetailsDrawer(account);
    }
  }

  onSelectAll(event: any) {
    // Handle select all
  }

  onSelectRow(event: any) {
    // Handle row selection
    const rowIndex = event.selectedRowIndex;
    const account = this.filteredAccounts()[rowIndex];
    if (account) {
      const selected = this.selectedRows();
      if (selected.includes(account.id)) {
        this.selectedRows.set(selected.filter(id => id !== account.id));
      } else {
        this.selectedRows.set([...selected, account.id]);
      }
    }
  }

  openDetailsDrawer(account: ServiceAccount) {
    this.selectedAccount.set(account);
    this.detailsDrawerOpen.set(true);
    this.updateKeysTable();
    this.loadActivity(account.id);
  }

  closeDetailsDrawer() {
    this.detailsDrawerOpen.set(false);
    setTimeout(() => {
      this.selectedAccount.set(null);
    }, 300);
  }

  loadActivity(accountId: string) {
    this.devService.listRecentCallsByAccount(accountId).subscribe(calls => {
      this.recentCalls.set(calls);
      this.updateActivityTable();
    });
  }

  openCreateModal() {
    this.createFormScopes.set([]);
    this.createWizardStep.set(1);
    this.createForm.reset({ env: 'sandbox', tags: '' });
    this.createModalOpen.set(true);
  }

  closeCreateModal() {
    this.createModalOpen.set(false);
    this.createWizardStep.set(1);
    this.createForm.reset({ env: 'sandbox', tags: '' });
  }

  toggleCreateScope(scope: string, checked: boolean) {
    const current = this.createFormScopes();
    if (checked) {
      this.createFormScopes.set([...current, scope]);
    } else {
      this.createFormScopes.set(current.filter(s => s !== scope));
    }
  }

  createAccount() {
    if (this.createForm.invalid || this.createFormScopes().length === 0) return;

    const formValue = this.createForm.value;
    const envs: EnvKey[] = formValue.env ? [formValue.env as EnvKey] : ['sandbox'];

    const scopes = this.createFormScopes().length > 0 ? this.createFormScopes() : [];

    this.devService.createServiceAccount({
      name: formValue.name,
      description: formValue.description || undefined,
      envs,
      scopes
    }).subscribe({
      next: (account) => {
        this.closeCreateModal();
        this.currentPage.set(1);
        this.loadAccounts();
        this.logger.info('Service account created successfully');
      },
      error: () => {
        this.logger.error('Failed to create service account');
      }
    });
  }

  openEditModal() {
    const account = this.selectedAccount();
    if (!account) return;

    this.editForm.patchValue({
      name: account.name,
      description: account.description || '',
      sandbox: account.envs.includes('sandbox'),
      prod: account.envs.includes('prod'),
      ownerTeam: account.ownerTeam || ''
    });
    this.editModalOpen.set(true);
  }

  closeEditModal() {
    this.editModalOpen.set(false);
  }

  saveEdit() {
    const account = this.selectedAccount();
    if (!account || this.editForm.invalid) return;

    const formValue = this.editForm.value;
    const envs: EnvKey[] = [];
    if (formValue.sandbox) envs.push('sandbox');
    if (formValue.prod) envs.push('prod');

    // Warn if removing env that has keys
    const removedEnvs = account.envs.filter(e => !envs.includes(e));
    if (removedEnvs.length > 0 && account.keys && account.keys.length > 0) {
      const hasKeysInRemovedEnv = account.keys.some(k => removedEnvs.includes((k as any).env));
      if (hasKeysInRemovedEnv) {
        if (!confirm('Removing this environment will affect existing keys. Continue?')) {
          return;
        }
      }
    }

    this.devService.updateServiceAccount(account.id, {
      name: formValue.name,
      description: formValue.description,
      envs,
      ownerTeam: formValue.ownerTeam
    }).subscribe({
      next: (updated) => {
        this.closeEditModal();
        this.loadAccounts();
        this.selectedAccount.set(updated);
        this.logger.info('Service account updated successfully');
      },
      error: () => {
        this.logger.error('Failed to update service account');
      }
    });
  }

  openCreateKeyModal() {
    this.selectedKeyScopes.set([]);
    this.createKeyForm.reset();
    this.createKeyModalOpen.set(true);
  }

  closeCreateKeyModal() {
    this.createKeyModalOpen.set(false);
    this.selectedKeyScopes.set([]);
  }

  toggleScope(scope: string, checked: boolean) {
    const current = this.selectedKeyScopes();
    if (checked) {
      this.selectedKeyScopes.set([...current, scope]);
    } else {
      this.selectedKeyScopes.set(current.filter(s => s !== scope));
    }
  }

  createKey() {
    const account = this.selectedAccount();
    if (!account || this.createKeyForm.invalid) return;

    const formValue = this.createKeyForm.value;
    const env = formValue.env || account.envs[0] || undefined;
    const expiry = formValue.expiry ? new Date(formValue.expiry).toISOString() : undefined;
    const scopes = this.selectedKeyScopes().length > 0 ? this.selectedKeyScopes() : account.scopes;

    this.devService.createKey(account.id, formValue.label, env as EnvKey, expiry, scopes).subscribe({
      next: (key) => {
        // Generate mock token preview
        const tokenPreview = `pk_${env || 'live'}_${Math.random().toString(36).substr(2, 8)}`;
        (key as any).tokenPreview = tokenPreview;
        this.newTokenPreview.set(tokenPreview);
        
        this.closeCreateKeyModal();
        this.loadAccounts();
        const updatedAccount = this.serviceAccounts().find(a => a.id === account.id);
        if (updatedAccount) {
          this.selectedAccount.set(updatedAccount);
          this.updateKeysTable();
        }
        this.tokenPreviewModalOpen.set(true);
        this.logger.info('Key created successfully');
      },
      error: () => {
        this.logger.error('Failed to create key');
      }
    });
  }

  closeTokenPreviewModal() {
    this.tokenPreviewModalOpen.set(false);
    this.newTokenPreview.set('');
  }

  rotateKey(keyId: string) {
    const account = this.selectedAccount();
    if (!account) return;

    this.devService.rotateKey(account.id, keyId).subscribe({
      next: () => {
        this.loadAccounts();
        const updatedAccount = this.serviceAccounts().find(a => a.id === account.id);
        if (updatedAccount) {
          this.selectedAccount.set(updatedAccount);
          this.updateKeysTable();
        }
        this.logger.info('Key rotated successfully');
      },
      error: () => {
        this.logger.error('Failed to rotate key');
      }
    });
  }

  openRevokeKeyModal(keyId: string) {
    this.keyToRevoke.set(keyId);
    this.revokeReason = '';
    this.revokeKeyModalOpen.set(true);
  }

  closeRevokeKeyModal() {
    this.revokeKeyModalOpen.set(false);
    this.keyToRevoke.set(null);
    this.revokeReason = '';
  }

  confirmRevokeKey() {
    const account = this.selectedAccount();
    const keyId = this.keyToRevoke();
    if (!account || !keyId) return;

    this.devService.revokeKey(account.id, keyId, this.revokeReason).subscribe({
      next: () => {
        this.closeRevokeKeyModal();
        this.loadAccounts();
        const updatedAccount = this.serviceAccounts().find(a => a.id === account.id);
        if (updatedAccount) {
          this.selectedAccount.set(updatedAccount);
          this.updateKeysTable();
        }
        this.logger.info('Key revoked successfully');
      },
      error: () => {
        this.logger.error('Failed to revoke key');
      }
    });
  }

  onKeyRowClick(event: any) {
    // Handle key row click if needed
  }

  copyKeyToken(key: ApiKey) {
    // Copy token preview
    this.logger.debug('Token copied to clipboard');
  }

  rotateAllKeys() {
    const account = this.selectedAccount();
    if (!account || !account.keys || account.keys.length === 0) return;

    if (confirm(`Rotate all ${account.keys.length} key(s)? This will create new keys and revoke old ones.`)) {
      account.keys.forEach(key => {
        if (key.status === 'active') {
          this.rotateKey(key.id);
        }
      });
    }
  }

  openEditScopesModal() {
    const account = this.selectedAccount();
    if (account) {
      this.editingScopes.set([...account.scopes]);
    }
    this.editScopesModalOpen.set(true);
  }

  closeEditScopesModal() {
    this.editScopesModalOpen.set(false);
    this.editingScopes.set([]);
  }

  toggleEditingScope(scope: string, checked: boolean) {
    const current = this.editingScopes();
    if (checked) {
      this.editingScopes.set([...current, scope]);
    } else {
      this.editingScopes.set(current.filter(s => s !== scope));
    }
  }

  removeScope(scope: string) {
    const account = this.selectedAccount();
    if (!account) return;

    const newScopes = account.scopes.filter(s => s !== scope);
    if (newScopes.length === 0 && account.envs.length > 0) {
      if (!confirm('Removing all scopes may affect account functionality. Continue?')) {
        return;
      }
    }

    this.devService.updateAccountScopes(account.id, newScopes).subscribe({
      next: (updatedAccount) => {
        this.loadAccounts();
        this.selectedAccount.set(updatedAccount);
        this.logger.info('Scope removed successfully');
      },
      error: () => {
        this.logger.error('Failed to remove scope');
      }
    });
  }

  saveScopes() {
    const account = this.selectedAccount();
    if (!account) return;

    // Validate at least one scope if any env is enabled
    if (this.editingScopes().length === 0 && account.envs.length > 0) {
      this.logger.warn('At least one scope is required when environments are enabled');
      return;
    }

    this.devService.updateAccountScopes(account.id, this.editingScopes()).subscribe({
      next: (updatedAccount) => {
        this.closeEditScopesModal();
        this.loadAccounts();
        this.selectedAccount.set(updatedAccount);
        this.logger.info('Scopes updated successfully');
      },
      error: () => {
        this.logger.error('Failed to update scopes');
      }
    });
  }

  suspendAccount(account: ServiceAccount) {
    this.accountToSuspend.set(account);
    this.suspendConfirmOpen.set(true);
  }

  confirmSuspend() {
    const account = this.accountToSuspend();
    if (!account) return;

    this.devService.suspendServiceAccount(account.id).subscribe({
      next: () => {
        this.suspendConfirmOpen.set(false);
        this.accountToSuspend.set(null);
        this.loadAccounts();
        if (this.selectedAccount()?.id === account.id) {
          const updated = this.serviceAccounts().find(a => a.id === account.id);
          if (updated) this.selectedAccount.set(updated);
        }
        this.logger.info('Service account suspended successfully');
      },
      error: () => {
        this.logger.error('Failed to suspend service account');
      }
    });
  }

  cancelSuspend() {
    this.suspendConfirmOpen.set(false);
    this.accountToSuspend.set(null);
  }

  bulkSuspend() {
    const selected = this.selectedRows();
    if (selected.length === 0) return;

    if (confirm(`Suspend ${selected.length} service account(s)?`)) {
      selected.forEach(id => {
        this.devService.suspendServiceAccount(id).subscribe();
      });
      this.selectedRows.set([]);
      this.loadAccounts();
      this.logger.info(`${selected.length} account(s) suspended successfully`);
    }
  }

  bulkAddScope() {
    // Open modal to select scope and add to all selected accounts
    this.logger.debug('Bulk scope addition will be available soon');
  }

  bulkCreateKey() {
    // Open modal to create keys for all selected accounts
    this.logger.debug('Bulk key creation will be available soon');
  }

  suspendConfirmMessage = computed(() => {
    const account = this.accountToSuspend();
    return account ? `Suspend "${account.name}"?` : '';
  });

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatTime(dateString: string): string {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatLastUsed(account: ServiceAccount): string {
    if (account.keys && account.keys.length > 0) {
      const mostRecentKey = account.keys
        .filter(k => k.status === 'active')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      
      if (mostRecentKey) {
        const diffMs = Date.now() - new Date(mostRecentKey.createdAt).getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffHours < 1) return 'Just now';
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        return this.formatDate(mostRecentKey.createdAt);
      }
    }
    return 'Never';
  }

  // Filter methods
  toggleEnvFilter(env: string) {
    this.envFilter = this.envFilter === env ? '' : env;
    this.currentPage.set(1);
    this.updateFilters();
  }

  toggleStatusFilter(status: string) {
    this.statusFilter = this.statusFilter === status ? '' : status;
    this.currentPage.set(1);
    this.updateFilters();
  }

  hasActiveFilters(): boolean {
    return !!(this.searchQuery || this.statusFilter || this.envFilter);
  }

  resetFilters() {
    this.searchQuery = '';
    this.statusFilter = '';
    this.envFilter = '';
    this.currentPage.set(1);
    this.updateFilters();
  }

  clearSearch() {
    this.searchQuery = '';
    this.updateFilters();
  }

  // Pagination methods
  updatePagination() {
    this.currentPage.set(1);
    this.updateTable();
  }

  previousPage() {
    if (this.currentPage() > 1) {
      this.currentPage.set(this.currentPage() - 1);
      this.updateTable();
    }
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.set(this.currentPage() + 1);
      this.updateTable();
    }
  }

  // Helper methods
  getAccountApis(account: ServiceAccount): string[] {
    // Mock: derive APIs from scopes
    const apiMap: Record<string, string> = {
      'orders:read': 'Orders API',
      'orders:write': 'Orders API',
      'invoices:read': 'Invoices API',
      'invoices:write': 'Invoices API',
      'customers:read': 'Customers API',
      'customers:write': 'Customers API'
    };
    const apis = new Set<string>();
    account.scopes.forEach(scope => {
      const api = apiMap[scope] || scope.split(':')[0] + ' API';
      apis.add(api);
    });
    return Array.from(apis);
  }

  getStatusTagType(status: string): 'green' | 'gray' | 'blue' {
    if (status === 'active') return 'green';
    if (status === 'suspended') return 'gray';
    return 'blue';
  }

  openDeveloperDocs() {
    // Placeholder: open docs
    this.logger.debug('Opening developer docs...');
  }

  openRotateSecretModal() {
    this.rotateSecretModalOpen.set(true);
  }

  closeRotateSecretModal() {
    this.rotateSecretModalOpen.set(false);
  }

  toggleRevealSecret() {
    this.secretRevealed.set(!this.secretRevealed());
  }

  copySecret() {
    const secret = this.selectedAccount()?.keys[0]?.tokenPreview || '';
    navigator.clipboard.writeText(secret).then(() => {
      this.logger.debug('Secret copied to clipboard');
    });
  }

  // Generate Token Modal methods
  closeGenerateTokenModal() {
    this.generateTokenModalOpen.set(false);
    this.generatedToken.set('');
    this.tokenExpiry = '24h';
    this.tokenPurpose = '';
  }

  generateToken() {
    // Mock token generation
    const token = 'sk_live_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    this.generatedToken.set(token);
    this.logger.debug('Token generated', { token: '***' });
  }

  copyGeneratedToken() {
    const token = this.generatedToken();
    if (token) {
      navigator.clipboard.writeText(token).then(() => {
        this.logger.debug('Token copied to clipboard');
      });
    }
  }

  downloadToken() {
    const token = this.generatedToken();
    if (token) {
      const blob = new Blob([token], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'service-account-token.txt';
      a.click();
      window.URL.revokeObjectURL(url);
      this.logger.debug('Token downloaded');
    }
  }

  confirmRotateSecret() {
    const account = this.selectedAccount();
    if (!account) return;

    // Mock rotation
    const updatedAccount = {
      ...account,
      lastRotatedAt: new Date().toISOString()
    };
    this.selectedAccount.set(updatedAccount);
    this.closeRotateSecretModal();
    this.confirmRotate = false;
    this.logger.info('Secret rotated successfully');
  }
}
