import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  ButtonModule,
  TagModule,
  InputModule,
  ModalModule,
  SelectModule,
  CheckboxModule
} from 'carbon-components-angular';
import { VendorCompany, VendorStatus } from '../shared/models/vendor-company.model';
import { VendorLifecycleStepperComponent } from '../shared/components/vendor-lifecycle-stepper/vendor-lifecycle-stepper.component';
import { VendorLifecycle, LifecycleStage, LifecycleStatus, ActivityLogEntry, ComplianceChecklistItem, IntegrationStatus, GovernanceState } from '../shared/models/vendor-lifecycle.model';
import { RoleService } from '../core/role.service';
import { VendorCompanyService } from '../shared/services/vendor-company.service';
import { VendorSummaryCardComponent } from '../shared/components/vendor-summary-card/vendor-summary-card.component';
import { VendorComplianceSectionComponent } from '../shared/components/vendor-compliance-section/vendor-compliance-section.component';
import { VendorUsersSectionComponent } from '../shared/components/vendor-users-section/vendor-users-section.component';
import { VendorApiKeysSectionComponent } from '../shared/components/vendor-api-keys-section/vendor-api-keys-section.component';
import { VendorActivityLogSectionComponent } from '../shared/components/vendor-activity-log-section/vendor-activity-log-section.component';
import { ConfirmDialogComponent } from '../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-company-details',
  standalone: false,
  template: `
    <div class="page-container">
      <div class="page-header">
        <div class="header-left">
          <button ibmButton="ghost" size="sm" (click)="goBack()" class="back-button">← Back to Vendors</button>
          <h1>{{ company()?.name || 'Vendor Details' }}</h1>
        </div>
        <div class="header-actions">
          <button ibmButton="secondary" (click)="openEditModal()">Edit Metadata</button>
          <button 
            *ngIf="company()?.status === 'Pending'"
            ibmButton="primary" 
            (click)="openApproveModal()">
            Approve
          </button>
          <button 
            *ngIf="company()?.status === 'Pending'"
            ibmButton="danger" 
            (click)="openRejectModal()">
            Reject
          </button>
          <button 
            *ngIf="company()?.status === 'Approved' || company()?.status === 'Rejected'"
            ibmButton="secondary" 
            (click)="openArchiveModal()">
            Archive
          </button>
        </div>
      </div>

      <!-- Vendor Summary Card -->
      <app-vendor-summary-card *ngIf="company()" [vendor]="company()!"></app-vendor-summary-card>

      <!-- Lifecycle Status Panel (visible for vendors) -->
      <div *ngIf="company()?.vendor && lifecycleSignal()" class="lifecycle-panel">
        <app-vendor-lifecycle-stepper [lifecycle]="lifecycleSignal()!"></app-vendor-lifecycle-stepper>
      </div>

      <!-- Integration Status Panel (for vendors) -->
      <div *ngIf="company()?.vendor && company()?.integrationStatus" class="integration-status-panel">
        <div class="status-card">
          <div class="status-header">
            <h3>Integration Status</h3>
            <ibm-tag [type]="getIntegrationStatusColor(company()!.integrationStatus!.status)">
              {{ company()!.integrationStatus!.status }}
            </ibm-tag>
          </div>
          <div class="status-details" *ngIf="company()!.integrationStatus?.recentErrors">
            <p class="error-summary">
              Last 24h: {{ company()!.integrationStatus!.recentErrors!.count }} failed callbacks, 
              {{ company()!.integrationStatus!.recentErrors!.types.length }} error types
            </p>
            <button ibmButton="ghost" size="sm" (click)="viewMonitoring()">View Monitoring</button>
          </div>
        </div>
      </div>

      <div class="content-tabs">
        <button 
          class="tab-button"
          [class.active]="activeTab() === 'profile'"
          (click)="activeTab.set('profile')">
          Profile
        </button>
        <button 
          *ngIf="company()?.vendor"
          class="tab-button"
          [class.active]="activeTab() === 'onboarding'"
          (click)="activeTab.set('onboarding')">
          Onboarding
        </button>
        <button 
          class="tab-button"
          [class.active]="activeTab() === 'access'"
          (click)="activeTab.set('access')">
          Access & Tier
        </button>
        <button 
          *ngIf="company()?.vendor"
          class="tab-button"
          [class.active]="activeTab() === 'configuration'"
          (click)="activeTab.set('configuration')">
          Configuration
        </button>
        <button 
          class="tab-button"
          [class.active]="activeTab() === 'risk'"
          (click)="activeTab.set('risk')">
          Risk & Compliance
        </button>
        <button 
          *ngIf="company()?.vendor"
          class="tab-button"
          [class.active]="activeTab() === 'compliance'"
          (click)="activeTab.set('compliance')">
          Compliance
        </button>
        <button 
          *ngIf="company()?.vendor"
          class="tab-button"
          [class.active]="activeTab() === 'users'"
          (click)="activeTab.set('users')">
          Users
        </button>
        <button 
          *ngIf="company()?.vendor"
          class="tab-button"
          [class.active]="activeTab() === 'api-keys'"
          (click)="activeTab.set('api-keys')">
          API Keys
        </button>
        <button 
          *ngIf="company()?.vendor"
          class="tab-button"
          [class.active]="activeTab() === 'activity'"
          (click)="activeTab.set('activity')">
          Activity Log
        </button>
        <button 
          class="tab-button"
          [class.active]="activeTab() === 'lifecycle'"
          (click)="activeTab.set('lifecycle')">
          Lifecycle
        </button>
      </div>

      <div class="tab-content">
        <!-- Profile Tab -->
        <div *ngIf="activeTab() === 'profile'" class="tab-panel">
          <div class="section">
            <h2>Company Information</h2>
            <div class="info-grid">
              <div class="info-item">
                <label>Company Name</label>
                <p>{{ company()?.name || 'N/A' }}</p>
              </div>
              <div class="info-item">
                <label>Industry</label>
                <p>Technology Services</p>
              </div>
              <div class="info-item">
                <label>Region</label>
                <p>North America</p>
              </div>
              <div class="info-item">
                <label>Website</label>
                <p><a [href]="company()?.website" target="_blank">{{ company()?.website || 'N/A' }}</a></p>
              </div>
              <div class="info-item">
                <label>Address</label>
                <p>{{ company()?.address || 'N/A' }}</p>
              </div>
            </div>
          </div>

          <div class="section">
            <h2>Primary Contact</h2>
            <div class="info-grid">
              <div class="info-item">
                <label>Contact Name</label>
                <p>{{ company()?.primaryContact || 'N/A' }}</p>
              </div>
              <div class="info-item">
                <label>Email</label>
                <p><a [href]="'mailto:' + company()?.primaryEmail">{{ company()?.primaryEmail || 'N/A' }}</a></p>
              </div>
            </div>
          </div>

          <div class="section" *ngIf="company()?.notes">
            <h2>Notes</h2>
            <p>{{ company()?.notes }}</p>
          </div>
        </div>

        <!-- Access & Tier Tab -->
        <div *ngIf="activeTab() === 'access'" class="tab-panel">
          <div class="section">
            <h2>Current Tier</h2>
            <p class="tier-display">{{ company()?.tier || 'No Tier Assigned' }}</p>
            <div class="tier-selector">
              <label>Change Tier:</label>
              <select ibmSelect [(ngModel)]="selectedTier" class="tier-select">
                <option value="Tier 1">Tier 1</option>
                <option value="Tier 2">Tier 2</option>
                <option value="Tier 3">Tier 3</option>
              </select>
              <button ibmButton="secondary" (click)="changeTier()">Update Tier</button>
            </div>
          </div>

          <div class="section">
            <h2>Access Permissions</h2>
            <p>Access permissions are managed at the tier level. Changes to tier will update access automatically.</p>
          </div>
        </div>

        <!-- Risk & Compliance Tab -->
        <div *ngIf="activeTab() === 'risk'" class="tab-panel">
          <div class="section">
            <h2>Risk Assessment</h2>
            <div class="risk-display">
              <ibm-tag [type]="getRiskColor(company()?.riskLevel || '')">
                {{ company()?.riskLevel || 'Unknown' }} Risk
              </ibm-tag>
              <p class="ai-note">AI-estimated based on integration profile</p>
            </div>
          </div>

          <div class="section">
            <h2>Compliance Status</h2>
            <p>Compliance checks are performed automatically based on vendor tier and risk level.</p>
          </div>
        </div>

        <!-- Onboarding Tab (Vendor only) -->
        <div *ngIf="activeTab() === 'onboarding' && company()?.vendor" class="tab-panel">
          <div class="section">
            <h2>Vendor Onboarding Process</h2>
            <p class="section-description">Track progress through the vendor onboarding lifecycle</p>
            
            <div class="onboarding-steps">
              <div *ngFor="let step of onboardingSteps()" class="onboarding-step-card" [class.completed]="step.completed">
                <div class="step-header">
                  <div class="step-indicator-small" [class.completed]="step.completed">
                    <span *ngIf="step.completed">✓</span>
                    <span *ngIf="!step.completed">{{ getStepNumber(step.stage) }}</span>
                  </div>
                  <div class="step-title-section">
                    <h3>{{ step.title }}</h3>
                    <p class="step-description">{{ step.description }}</p>
                  </div>
                </div>
                
                <div class="step-content" *ngIf="step.fields && step.fields.length > 0">
                  <div class="fields-grid">
                    <div *ngFor="let field of step.fields || []" class="field-item">
                      <label>{{ field.label }}<span *ngIf="field.required"> *</span></label>
                      <input 
                        *ngIf="field.type === 'text' || field.type === 'email' || field.type === 'url' || field.type === 'date'"
                        [type]="getInputType(field.type)"
                        [value]="field.value || ''"
                        [placeholder]="(field.placeholder || '')"
                        [readonly]="step.completed"
                        class="field-input">
                      <textarea 
                        *ngIf="field.type === 'textarea'"
                        [value]="field.value || ''"
                        [placeholder]="(field.placeholder || '')"
                        [readonly]="step.completed"
                        rows="3"
                        class="field-input">
                      </textarea>
                    </div>
                  </div>
                </div>
                
                <div class="step-actions" *ngIf="step.actions && step.actions.length > 0 && canSeeActions(step.actions)">
                  <button 
                    *ngFor="let action of getVisibleActions(step.actions)"
                    [ibmButton]="action.type === 'link' ? 'ghost' : 'secondary'"
                    size="sm"
                    (click)="handleAction(action)">
                    {{ action.label }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Configuration Tab (Vendor only) -->
        <div *ngIf="activeTab() === 'configuration' && company()?.vendor" class="tab-panel">
          <div class="config-subtabs">
            <button 
              class="subtab-button"
              [class.active]="configSubTab() === 'credentials'"
              (click)="configSubTab.set('credentials')">
              Credentials
            </button>
            <button 
              class="subtab-button"
              [class.active]="configSubTab() === 'webhooks'"
              (click)="configSubTab.set('webhooks')">
              Webhooks
            </button>
            <button 
              class="subtab-button"
              [class.active]="configSubTab() === 'notifications'"
              (click)="configSubTab.set('notifications')">
              Notifications
            </button>
            <button 
              class="subtab-button"
              [class.active]="configSubTab() === 'environments'"
              (click)="configSubTab.set('environments')">
              Environments
            </button>
            <button 
              class="subtab-button"
              [class.active]="configSubTab() === 'validation'"
              (click)="configSubTab.set('validation')">
              Validation
            </button>
          </div>

          <!-- Credentials Sub-tab -->
          <div *ngIf="configSubTab() === 'credentials'" class="config-content">
            <div class="section">
              <h2>API Credentials</h2>
              <div class="credentials-list">
                <div class="credential-item">
                  <div class="credential-info">
                    <span class="credential-name">Production API Key</span>
                    <span class="credential-value">sk_live_***abc123</span>
                  </div>
                  <div class="credential-meta">
                    <span class="meta-item">Expires: 2025-12-31</span>
                    <ibm-tag type="green" size="sm">Active</ibm-tag>
                  </div>
                  <button ibmButton="ghost" size="sm">Rotate</button>
                </div>
                <div class="credential-item">
                  <div class="credential-info">
                    <span class="credential-name">Sandbox API Key</span>
                    <span class="credential-value">sk_test_***xyz789</span>
                  </div>
                  <div class="credential-meta">
                    <span class="meta-item">Expires: 2025-06-30</span>
                    <ibm-tag type="green" size="sm">Active</ibm-tag>
                  </div>
                  <button ibmButton="ghost" size="sm">Rotate</button>
                </div>
              </div>
              <button ibmButton="secondary" (click)="openCredentialsModal()">Add Credential</button>
            </div>
          </div>

          <!-- Webhooks Sub-tab -->
          <div *ngIf="configSubTab() === 'webhooks'" class="config-content">
            <div class="section">
              <h2>Webhook Settings</h2>
              <div class="webhook-config">
                <div class="field-item">
                  <label>Callback URL</label>
                  <input ibmText value="https://api.example.com/webhooks/callback" readonly class="field-input">
                  <p class="field-hint">Primary webhook endpoint for event notifications</p>
                </div>
                <div class="field-item">
                  <label>Webhook Secret</label>
                  <input ibmText value="whsec_***masked" readonly class="field-input">
                  <button ibmButton="ghost" size="sm">Reveal</button>
                </div>
                <div class="field-item">
                  <label>Events</label>
                  <div class="checkbox-group">
                    <label class="checkbox-label">
                      <input type="checkbox" checked disabled>
                      <span>Payment events</span>
                    </label>
                    <label class="checkbox-label">
                      <input type="checkbox" checked disabled>
                      <span>Subscription events</span>
                    </label>
                    <label class="checkbox-label">
                      <input type="checkbox" disabled>
                      <span>Account events</span>
                    </label>
                  </div>
                </div>
              </div>
              <button ibmButton="secondary" (click)="openWebhookModal()">Edit Webhooks</button>
            </div>
          </div>

          <!-- Notifications Sub-tab -->
          <div *ngIf="configSubTab() === 'notifications'" class="config-content">
            <div class="section">
              <h2>Notification Settings</h2>
              <div class="notification-config">
                <div class="field-item">
                  <label>Email Notifications</label>
                  <input ibmText [value]="company()?.primaryEmail || ''" readonly class="field-input">
                </div>
                <div class="field-item">
                  <label>Severity Threshold</label>
                  <select ibmSelect class="field-input">
                    <option>Critical only</option>
                    <option selected>High and above</option>
                    <option>All notifications</option>
                  </select>
                </div>
                <div class="field-item">
                  <label>Notification Channels</label>
                  <div class="checkbox-group">
                    <label class="checkbox-label">
                      <input type="checkbox" checked disabled>
                      <span>Email</span>
                    </label>
                    <label class="checkbox-label">
                      <input type="checkbox" disabled>
                      <span>SMS</span>
                    </label>
                    <label class="checkbox-label">
                      <input type="checkbox" checked disabled>
                      <span>Webhook</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Environments Sub-tab -->
          <div *ngIf="configSubTab() === 'environments'" class="config-content">
            <div class="section">
              <h2>Environment Settings</h2>
              <div class="environments-list">
                <div class="environment-item">
                  <div class="env-info">
                    <span class="env-name">Production</span>
                    <ibm-tag type="green" size="sm">Active</ibm-tag>
                  </div>
                  <div class="env-details">
                    <span>Base URL: https://api.production.example.com</span>
                  </div>
                </div>
                <div class="environment-item">
                  <div class="env-info">
                    <span class="env-name">Sandbox</span>
                    <ibm-tag type="blue" size="sm">Active</ibm-tag>
                  </div>
                  <div class="env-details">
                    <span>Base URL: https://api.sandbox.example.com</span>
                  </div>
                </div>
                <div class="environment-item">
                  <div class="env-info">
                    <span class="env-name">Development</span>
                    <ibm-tag type="gray" size="sm">Inactive</ibm-tag>
                  </div>
                  <div class="env-details">
                    <span>Base URL: https://api.dev.example.com</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Validation Sub-tab -->
          <div *ngIf="configSubTab() === 'validation'" class="config-content">
            <div class="section">
              <h2>Validation Results</h2>
              <div class="validation-results">
                <div class="validation-item success">
                  <div class="validation-header">
                    <span class="validation-label">Last Validation</span>
                    <ibm-tag type="green" size="sm">Passed</ibm-tag>
                  </div>
                  <div class="validation-details">
                    <p>Timestamp: 2024-03-15 14:30:00 UTC</p>
                    <p>All endpoints validated successfully. Connection health checks passed.</p>
                  </div>
                </div>
                <div class="validation-item error" *ngIf="false">
                  <div class="validation-header">
                    <span class="validation-label">Previous Validation</span>
                    <ibm-tag type="red" size="sm">Failed</ibm-tag>
                  </div>
                  <div class="validation-details">
                    <p>Timestamp: 2024-03-14 10:15:00 UTC</p>
                    <p class="error-message">Validation failed: Missing callback URL</p>
                  </div>
                </div>
              </div>
              <button ibmButton="secondary" (click)="runValidation()">Run Validation</button>
            </div>
          </div>
        </div>

        <!-- Compliance Tab (Vendor only) -->
        <!-- Compliance Tab -->
        <div *ngIf="activeTab() === 'compliance' && company()?.vendor" class="tab-panel">
          <app-vendor-compliance-section 
            [vendor]="company()!"
            (vendorUpdated)="onVendorUpdated($event)">
          </app-vendor-compliance-section>
        </div>

        <!-- Users Tab -->
        <div *ngIf="activeTab() === 'users' && company()?.vendor" class="tab-panel">
          <app-vendor-users-section 
            [vendor]="company()!"
            (vendorUpdated)="onVendorUpdated($event)">
          </app-vendor-users-section>
        </div>

        <!-- API Keys Tab -->
        <div *ngIf="activeTab() === 'api-keys' && company()?.vendor" class="tab-panel">
          <app-vendor-api-keys-section 
            [vendor]="company()!"
            (vendorUpdated)="onVendorUpdated($event)">
          </app-vendor-api-keys-section>
        </div>

        <!-- Activity Log Tab -->
        <div *ngIf="activeTab() === 'activity' && company()?.vendor" class="tab-panel">
          <app-vendor-activity-log-section [vendor]="company()!"></app-vendor-activity-log-section>
        </div>

        <!-- Legacy Compliance Tab (keeping for backward compatibility) -->
        <div *ngIf="activeTab() === 'compliance-legacy' && company()?.vendor" class="tab-panel">
          <div class="section">
            <h2>Certification Status</h2>
            <div class="certification-status">
              <ibm-tag [type]="getCertificationStatusColor(company()?.compliance?.certificationStatus || 'pending')">
                {{ (company()?.compliance?.certificationStatus || 'pending') | titlecase }}
              </ibm-tag>
              <p *ngIf="company()?.compliance?.lastReviewDate" class="review-date">
                Last reviewed: {{ formatDate(company()!.compliance!.lastReviewDate!) }}
              </p>
            </div>
          </div>

          <div class="section">
            <h2>Compliance Checklist</h2>
            <div class="compliance-checklist">
              <div *ngFor="let item of complianceChecklist()" class="checklist-item" [class.required]="item.required">
                <div class="checklist-header">
                  <label class="checkbox-label">
                    <input 
                      type="checkbox" 
                      [checked]="item.status === 'approved'"
                      [disabled]="true"
                      class="checkbox-input">
                    <span class="checklist-label">
                      {{ item.label }}
                      <span *ngIf="item.required" class="required-badge">Required</span>
                    </span>
                  </label>
                  <ibm-tag 
                    [type]="getChecklistStatusColor(item.status)" 
                    size="sm">
                    {{ item.status | titlecase }}
                  </ibm-tag>
                </div>
                <div class="checklist-meta" *ngIf="item.reviewedBy">
                  <span class="meta-text">Reviewed by {{ item.reviewedBy }} on {{ formatDate(item.reviewedAt || '') }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Lifecycle Tab -->
        <div *ngIf="activeTab() === 'lifecycle'" class="tab-panel">
          <div class="section">
            <h2>Key Dates</h2>
            <div class="info-grid">
              <div class="info-item">
                <label>Submitted</label>
                <p>{{ formatDate(company()?.submittedAt || company()?.createdAt || '') }}</p>
              </div>
              <div class="info-item">
                <label>Created</label>
                <p>{{ formatDate(company()?.createdAt || '') }}</p>
              </div>
              <div class="info-item" *ngIf="company()?.status === 'Deactivated'">
                <label>Deactivated</label>
                <p>{{ formatDate(company()?.createdAt || '') }}</p>
              </div>
            </div>
          </div>

          <div class="section">
            <h2>Activity Timeline</h2>
            <div class="activity-timeline">
              <div *ngFor="let entry of activityLog()" class="timeline-entry">
                <div class="timeline-marker"></div>
                <div class="timeline-content">
                  <div class="timeline-header">
                    <span class="actor-name">{{ entry.actor.name }}</span>
                    <span class="actor-role">({{ entry.actor.role }})</span>
                    <span class="timeline-time">{{ formatTime(entry.timestamp) }}</span>
                  </div>
                  <p class="timeline-action">{{ entry.action }}</p>
                  <p *ngIf="entry.details" class="timeline-details">{{ entry.details }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
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
        <p class="demo-note">This is a demo view. Changes are not saved.</p>
        <div *ngIf="company()">
          <p><strong>Company:</strong> {{ company()!.name }}</p>
          <p><strong>Status:</strong> {{ company()!.status }}</p>
          <p><strong>Tier:</strong> {{ company()!.tier || 'N/A' }}</p>
        </div>
      </div>
      <ibm-modal-footer>
        <button ibmButton="secondary" (click)="closeEditModal()">Close</button>
      </ibm-modal-footer>
    </ibm-modal>

    <!-- Tier Change Modal -->
    <ibm-modal
      [open]="tierModalOpen()"
      [size]="'sm'"
      (overlaySelected)="closeTierModal()">
      <ibm-modal-header (closeSelect)="closeTierModal()">
        <p class="bx--modal-header__heading">Change Tier</p>
      </ibm-modal-header>
      <div ibmModalContent>
        <p class="demo-note">Tier change functionality (demo only)</p>
      </div>
      <ibm-modal-footer>
        <button ibmButton="secondary" (click)="closeTierModal()">Cancel</button>
        <button ibmButton="primary" (click)="confirmTierChange()">Change Tier</button>
      </ibm-modal-footer>
    </ibm-modal>

    <!-- Approve Modal -->
    <app-confirm-dialog
      [open]="approveModalOpen()"
      title="Approve Vendor"
      message="Are you sure you want to approve this vendor? This will allow them to generate API keys and add users."
      confirmLabel="Approve"
      (confirmed)="confirmApprove()"
      (cancelled)="closeApproveModal()">
    </app-confirm-dialog>

    <!-- Reject Modal -->
    <ibm-modal
      [open]="rejectModalOpen()"
      [size]="'md'"
      (overlaySelected)="closeRejectModal()">
      <ibm-modal-header (closeSelect)="closeRejectModal()">
        <p class="bx--modal-header__heading">Reject Vendor</p>
      </ibm-modal-header>
      <div ibmModalContent>
        <p>Are you sure you want to reject this vendor?</p>
        <ibm-label>
          Rejection Reason (required)
          <textarea
            ibmText
            [(ngModel)]="rejectionReason"
            rows="4"
            placeholder="Please provide a reason for rejection..."
            required>
          </textarea>
        </ibm-label>
      </div>
      <ibm-modal-footer>
        <button ibmButton="secondary" (click)="closeRejectModal()">Cancel</button>
        <button 
          ibmButton="danger" 
          [disabled]="!rejectionReason.trim()"
          (click)="confirmReject()">
          Reject
        </button>
      </ibm-modal-footer>
    </ibm-modal>

    <!-- Archive Modal -->
    <app-confirm-dialog
      [open]="archiveModalOpen()"
      title="Archive Vendor"
      message="Are you sure you want to archive this vendor? Archived vendors cannot be edited or have compliance documents updated."
      confirmLabel="Archive"
      [danger]="true"
      (confirmed)="confirmArchive()"
      (cancelled)="closeArchiveModal()">
    </app-confirm-dialog>

    <!-- Deactivate Modal -->
    <ibm-modal
      [open]="deactivateModalOpen()"
      [size]="'sm'"
      (overlaySelected)="closeDeactivateModal()">
      <ibm-modal-header (closeSelect)="closeDeactivateModal()">
        <p class="bx--modal-header__heading">Deactivate Company</p>
      </ibm-modal-header>
      <div ibmModalContent>
        <p>Are you sure you want to deactivate {{ company()?.name }}?</p>
        <p class="demo-note">This action is for demo purposes only.</p>
      </div>
      <ibm-modal-footer>
        <button ibmButton="secondary" (click)="closeDeactivateModal()">Cancel</button>
        <button ibmButton="danger" (click)="confirmDeactivate()">Deactivate</button>
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
      padding-bottom: 1.5rem;
      border-bottom: 1px solid var(--linear-border);
    }

    .header-left h1 {
      font-size: 2rem;
      font-weight: 600;
      color: var(--linear-text-primary);
      margin: 0 0 1rem 0;
    }

    .badges {
      display: flex;
      gap: 0.5rem;
    }

    .header-actions {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .content-tabs {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 2rem;
      border-bottom: 1px solid var(--linear-border);
    }

    .tab-button {
      padding: 0.75rem 1.5rem;
      border: none;
      background: transparent;
      color: var(--linear-text-secondary);
      font-size: 0.875rem;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
      transition: all 150ms ease;
    }

    .tab-button:hover {
      color: var(--linear-text-primary);
    }

    .tab-button.active {
      color: var(--linear-accent);
      border-bottom-color: var(--linear-accent);
    }

    .tab-content {
      min-height: 400px;
    }

    .tab-panel {
      animation: fadeIn 0.2s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .section {
      margin-bottom: 2rem;
    }

    .section h2 {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--linear-text-primary);
      margin: 0 0 1rem 0;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
    }

    .info-item label {
      display: block;
      font-size: 0.75rem;
      color: var(--linear-text-secondary);
      font-weight: 500;
      margin-bottom: 0.25rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .info-item p {
      font-size: 0.875rem;
      color: var(--linear-text-primary);
      margin: 0;
    }

    .info-item a {
      color: var(--linear-accent);
      text-decoration: none;
    }

    .info-item a:hover {
      text-decoration: underline;
    }

    .tier-display {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--linear-text-primary);
      margin: 0 0 1rem 0;
    }

    .tier-selector {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-top: 1rem;
    }

    .tier-select {
      min-width: 150px;
    }

    .risk-display {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .ai-note {
      font-size: 0.75rem;
      color: var(--linear-text-secondary);
      font-style: italic;
      margin: 0;
    }

    .demo-note {
      padding: 0.75rem;
      background: var(--linear-surface);
      border: 1px solid var(--linear-border);
      border-radius: 4px;
      font-size: 0.875rem;
      color: var(--linear-text-secondary);
      margin-bottom: 1rem;
    }

    .lifecycle-panel {
      margin-bottom: 2rem;
    }

    .integration-status-panel {
      margin-bottom: 2rem;
    }

    .status-card {
      background: var(--linear-surface);
      border: 1px solid var(--linear-border);
      border-radius: 8px;
      padding: 1.5rem;
    }

    .status-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .status-header h3 {
      font-size: 1rem;
      font-weight: 600;
      color: var(--linear-text-primary);
      margin: 0;
    }

    .status-details {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .error-summary {
      font-size: 0.875rem;
      color: var(--linear-text-secondary);
      margin: 0;
    }

    .config-subtabs {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
      border-bottom: 1px solid var(--linear-border);
    }

    .subtab-button {
      padding: 0.5rem 1rem;
      border: none;
      background: transparent;
      color: var(--linear-text-secondary);
      font-size: 0.875rem;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
      transition: all 150ms ease;
    }

    .subtab-button:hover {
      color: var(--linear-text-primary);
    }

    .subtab-button.active {
      color: var(--linear-accent);
      border-bottom-color: var(--linear-accent);
    }

    .config-content {
      padding-top: 1rem;
    }

    .section-description {
      font-size: 0.875rem;
      color: var(--linear-text-secondary);
      margin-bottom: 1.5rem;
    }

    .onboarding-steps {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .onboarding-step-card {
      background: var(--linear-surface);
      border: 1px solid var(--linear-border);
      border-radius: 8px;
      padding: 1.5rem;
      transition: all 0.3s ease;
    }

    .onboarding-step-card.completed {
      opacity: 0.7;
      background: rgba(36, 161, 72, 0.05);
    }

    .step-header {
      display: flex;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .step-indicator-small {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--linear-surface);
      border: 2px solid var(--linear-border);
      color: var(--linear-text-secondary);
      font-size: 0.875rem;
      font-weight: 600;
      flex-shrink: 0;
    }

    .step-indicator-small.completed {
      background: #24a148;
      border-color: #24a148;
      color: white;
    }

    .step-title-section h3 {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--linear-text-primary);
      margin: 0 0 0.5rem 0;
    }

    .step-description {
      font-size: 0.875rem;
      color: var(--linear-text-secondary);
      margin: 0;
    }

    .step-content {
      margin-top: 1rem;
    }

    .fields-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1rem;
    }

    .field-item {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .field-item label {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--linear-text-primary);
    }

    .field-input {
      width: 100%;
    }

    .field-hint {
      font-size: 0.75rem;
      color: var(--linear-text-secondary);
      margin: 0;
    }

    .step-actions {
      display: flex;
      gap: 0.5rem;
      margin-top: 1rem;
    }

    .credentials-list,
    .environments-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .credential-item,
    .environment-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      background: var(--linear-surface);
      border: 1px solid var(--linear-border);
      border-radius: 6px;
      gap: 1rem;
    }

    .credential-info,
    .env-info {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      flex: 1;
    }

    .credential-name,
    .env-name {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--linear-text-primary);
    }

    .credential-value {
      font-size: 0.75rem;
      color: var(--linear-text-secondary);
      font-family: 'Monaco', 'Courier New', monospace;
    }

    .credential-meta,
    .env-details {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .meta-item {
      font-size: 0.75rem;
      color: var(--linear-text-secondary);
    }

    .webhook-config,
    .notification-config {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      margin-bottom: 1.5rem;
    }

    .checkbox-group {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      color: var(--linear-text-primary);
      cursor: pointer;
    }

    .checkbox-input {
      cursor: pointer;
    }

    .validation-results {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .validation-item {
      padding: 1rem;
      background: var(--linear-surface);
      border: 1px solid var(--linear-border);
      border-radius: 6px;
    }

    .validation-item.error {
      border-color: #da1e28;
      background: rgba(218, 30, 40, 0.05);
    }

    .validation-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .validation-label {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--linear-text-primary);
    }

    .validation-details {
      font-size: 0.875rem;
      color: var(--linear-text-secondary);
    }

    .validation-details p {
      margin: 0.25rem 0;
    }

    .error-message {
      color: #da1e28;
      font-weight: 500;
    }

    .certification-status {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .review-date {
      font-size: 0.875rem;
      color: var(--linear-text-secondary);
      margin: 0;
    }

    .compliance-checklist {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .checklist-item {
      padding: 1rem;
      background: var(--linear-surface);
      border: 1px solid var(--linear-border);
      border-radius: 6px;
    }

    .checklist-item.required {
      border-left: 3px solid var(--linear-accent);
    }

    .checklist-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .checklist-label {
      font-size: 0.875rem;
      color: var(--linear-text-primary);
    }

    .required-badge {
      font-size: 0.75rem;
      color: var(--linear-accent);
      margin-left: 0.5rem;
    }

    .checklist-meta {
      margin-top: 0.5rem;
    }

    .meta-text {
      font-size: 0.75rem;
      color: var(--linear-text-secondary);
    }

    .activity-timeline {
      position: relative;
      padding-left: 2rem;
    }

    .timeline-entry {
      position: relative;
      padding-bottom: 2rem;
    }

    .timeline-entry:not(:last-child)::before {
      content: '';
      position: absolute;
      left: -1.75rem;
      top: 1.5rem;
      bottom: -1rem;
      width: 2px;
      background: var(--linear-border);
    }

    .timeline-marker {
      position: absolute;
      left: -2rem;
      top: 0.25rem;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: var(--linear-accent);
      border: 2px solid var(--linear-surface);
    }

    .timeline-content {
      background: var(--linear-surface);
      border: 1px solid var(--linear-border);
      border-radius: 6px;
      padding: 1rem;
    }

    .timeline-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }

    .actor-name {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--linear-text-primary);
    }

    .actor-role {
      font-size: 0.75rem;
      color: var(--linear-text-secondary);
    }

    .timeline-time {
      font-size: 0.75rem;
      color: var(--linear-text-secondary);
      margin-left: auto;
    }

    .timeline-action {
      font-size: 0.875rem;
      color: var(--linear-text-primary);
      margin: 0 0 0.25rem 0;
    }

    .timeline-details {
      font-size: 0.75rem;
      color: var(--linear-text-secondary);
      margin: 0;
    }
  `]
})
export class CompanyDetailsComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private roleService = inject(RoleService);
  private vendorService = inject(VendorCompanyService);

  company = signal<VendorCompany | null>(null);
  activeTab = signal<'profile' | 'onboarding' | 'access' | 'configuration' | 'risk' | 'compliance' | 'users' | 'api-keys' | 'activity' | 'lifecycle'>('profile');
  configSubTab = signal<'credentials' | 'webhooks' | 'notifications' | 'environments' | 'validation'>('credentials');
  editModalOpen = signal(false);
  tierModalOpen = signal(false);
  deactivateModalOpen = signal(false);
  approveModalOpen = signal(false);
  rejectModalOpen = signal(false);
  archiveModalOpen = signal(false);
  rejectionReason = '';
  selectedTier = '';

  lifecycleSignal = computed(() => {
    const company = this.company();
    if (!company?.vendor) return null;
    
    // If lifecycle exists, return it; otherwise create default
    if (company.lifecycle) {
      return company.lifecycle;
    }
    
    // Create default lifecycle for vendors without lifecycle data
    const allStages: LifecycleStage[] = [
      'preparation',
      'registration',
      'validation',
      'configuration-review',
      'compliance-certification',
      'activation',
      'monitoring'
    ];
    return {
      currentStage: 'preparation' as LifecycleStage,
      overallStatus: 'onboarding' as const,
      governanceState: null as GovernanceState,
      stages: allStages.map(stage => ({
        stage,
        status: 'PENDING' as LifecycleStatus,
        startedAt: undefined,
        completedAt: undefined,
        blockedReason: undefined,
        assignedReviewer: undefined,
        notes: undefined
      }))
    } as VendorLifecycle;
  });
  
  onboardingSteps = computed(() => {
    const lc = this.company()?.lifecycle;
    if (!lc) return [] as any[];
    
    return [
      {
        id: 'prep',
        stage: 'preparation' as LifecycleStage,
        title: 'Preparation',
        description: 'Internal preparation: assign owner, set target go-live date, gather requirements',
        fields: [
          { id: 'owner', label: 'Internal Owner', type: 'text' as const, value: 'Jane Doe', required: true, placeholder: 'Enter internal owner name' },
          { id: 'goLive', label: 'Target Go-Live Date', type: 'date' as const, value: '2024-06-01', required: true },
          { id: 'notes', label: 'Preparation Notes', type: 'textarea' as const, value: 'Initial vendor assessment complete', required: false, placeholder: 'Add preparation notes' }
        ] as any[],
        completed: lc.stages.find(s => s.stage === 'preparation')?.status === 'COMPLETE',
        canProceed: true
      },
      {
        id: 'reg',
        stage: 'registration' as LifecycleStage,
        title: 'Registration',
        description: 'Vendor contact information and company details',
        fields: [
          { id: 'contact', label: 'Primary Contact', type: 'text' as const, value: this.company()?.primaryContact || '', required: true, placeholder: 'Contact name' },
          { id: 'email', label: 'Email', type: 'email' as const, value: this.company()?.primaryEmail || '', required: true, placeholder: 'contact@company.com' },
          { id: 'website', label: 'Website', type: 'url' as const, value: this.company()?.website || '', required: false, placeholder: 'https://company.com' }
        ] as any[],
        completed: lc.stages.find(s => s.stage === 'registration')?.status === 'COMPLETE',
        canProceed: true
      },
      {
        id: 'val',
        stage: 'validation' as LifecycleStage,
        title: 'Validation',
        description: 'Configuration validation, test calls, sandbox checks',
        fields: [] as any[],
        completed: lc.stages.find(s => s.stage === 'validation')?.status === 'COMPLETE',
        canProceed: true,
        actions: [
          { id: 'run-tests', label: 'Run Validation Tests', type: 'button' as const, action: 'run-validation', visibleForRoles: ['system-administrator', 'company-manager'] }
        ]
      },
      {
        id: 'config',
        stage: 'configuration-review' as LifecycleStage,
        title: 'Configuration Review',
        description: 'Internal review of settings, mappings, and integration configuration',
        fields: [] as any[],
        completed: lc.stages.find(s => s.stage === 'configuration-review')?.status === 'COMPLETE',
        canProceed: true,
        actions: [
          { id: 'review', label: 'Start Review', type: 'button' as const, action: 'start-review', visibleForRoles: ['system-administrator', 'company-manager'] }
        ]
      },
      {
        id: 'comp',
        stage: 'compliance-certification' as LifecycleStage,
        title: 'Compliance / Certification',
        description: 'Security review, documentation, agreements, APIM policies',
        fields: [] as any[],
        completed: lc.stages.find(s => s.stage === 'compliance-certification')?.status === 'COMPLETE',
        canProceed: this.company()?.compliance?.certificationStatus === 'approved',
        actions: [
          { id: 'certify', label: 'Review Certification', type: 'button' as const, action: 'review-certification', visibleForRoles: ['compliance-auditor', 'system-administrator'] }
        ]
      },
      {
        id: 'act',
        stage: 'activation' as LifecycleStage,
        title: 'Activation',
        description: 'Go-live switch, environment selection, final activation',
        fields: [
          { id: 'env', label: 'Environment', type: 'select' as const, value: 'production', required: true, options: ['production', 'sandbox'] }
        ],
        completed: lc.stages.find(s => s.stage === 'activation')?.status === 'COMPLETE',
        canProceed: true,
        actions: [
          { id: 'activate', label: 'Activate Vendor', type: 'button' as const, action: 'activate', visibleForRoles: ['system-administrator'] }
        ]
      },
      {
        id: 'mon',
        stage: 'monitoring' as LifecycleStage,
        title: 'Monitoring',
        description: 'Ongoing monitoring, logs, alerts, and metrics',
        fields: [],
        completed: lc.stages.find(s => s.stage === 'monitoring')?.status === 'COMPLETE',
        canProceed: true,
        actions: [
          { id: 'monitor', label: 'View Monitoring', type: 'link' as const, action: 'view-monitoring' }
        ]
      }
    ];
  });

  activityLog = computed(() => {
    const comp = this.company();
    if (!comp) return [];
    
    // Mock activity log entries
    return [
      {
        id: '1',
        timestamp: comp.createdAt,
        actor: { name: 'System', role: 'system', email: undefined },
        action: 'Vendor company created',
        details: `Company ${comp.name} was registered in the system`,
        stage: 'registration' as LifecycleStage
      },
      {
        id: '2',
        timestamp: comp.submittedAt || comp.createdAt,
        actor: { name: comp.primaryContact, role: 'vendor', email: comp.primaryEmail },
        action: 'Submitted registration information',
        details: 'Completed company profile and contact details',
        stage: 'registration' as LifecycleStage
      },
      ...(comp.lifecycle?.stages.filter(s => s.status === 'COMPLETE').map((stage, idx) => ({
        id: `stage-${idx}`,
        timestamp: stage.completedAt || comp.createdAt,
        actor: { name: stage.assignedReviewer || 'Admin User', role: 'system-administrator', email: undefined },
        action: `Completed ${this.getStageLabel(stage.stage)}`,
        details: stage.notes || `Stage ${this.getStageLabel(stage.stage)} marked as complete`,
        stage: stage.stage
      })) || [])
    ] as ActivityLogEntry[];
  });

  complianceChecklist = computed(() => {
    const comp = this.company();
    if (!comp?.compliance) return [];
    return comp.compliance.checklist;
  });

  getStepNumber(stage: LifecycleStage): number {
    const stages: LifecycleStage[] = ['preparation', 'registration', 'validation', 'configuration-review', 'compliance-certification', 'activation', 'monitoring'];
    return stages.indexOf(stage) + 1;
  }

  getStageLabel(stage: LifecycleStage): string {
    const labels: Record<LifecycleStage, string> = {
      'preparation': 'Preparation',
      'registration': 'Registration',
      'validation': 'Validation',
      'configuration-review': 'Configuration Review',
      'compliance-certification': 'Compliance / Certification',
      'activation': 'Activation',
      'monitoring': 'Monitoring'
    };
    return labels[stage] || stage;
  }

  canSeeActions(actions: any[]): boolean {
    const currentRole = this.roleService.getCurrentRole();
    return actions.some(a => !a.visibleForRoles || a.visibleForRoles.includes(currentRole));
  }

  getVisibleActions(actions: any[]): any[] {
    const currentRole = this.roleService.getCurrentRole();
    return actions.filter(a => !a.visibleForRoles || a.visibleForRoles.includes(currentRole));
  }

  handleAction(action: any) {
    if (action.action === 'view-monitoring') {
      this.router.navigate(['/monitoring']);
    } else {
      alert(`Action: ${action.label} (demo only)`);
    }
  }

  getIntegrationStatusColor(status: string): 'red' | 'blue' | 'green' | 'gray' {
    const colors: Record<string, 'red' | 'blue' | 'green' | 'gray'> = {
      'HEALTHY': 'green',
      'DEGRADED': 'blue',
      'ERROR': 'red'
    };
    return colors[status] || 'gray';
  }

  getCertificationStatusColor(status: string): 'red' | 'blue' | 'green' | 'gray' | 'purple' {
    const colors: Record<string, 'red' | 'blue' | 'green' | 'gray' | 'purple'> = {
      'pending': 'gray',
      'in-review': 'purple',
      'approved': 'green',
      'rejected': 'red'
    };
    return colors[status] || 'gray';
  }

  getChecklistStatusColor(status: string): 'red' | 'blue' | 'green' | 'gray' | 'purple' {
    const colors: Record<string, 'red' | 'blue' | 'green' | 'gray' | 'purple'> = {
      'pending': 'gray',
      'in-review': 'purple',
      'approved': 'green',
      'rejected': 'red'
    };
    return colors[status] || 'gray';
  }

  viewMonitoring() {
    this.router.navigate(['/monitoring']);
  }

  openCredentialsModal() {
    alert('Add credentials modal (demo only)');
  }

  openWebhookModal() {
    alert('Edit webhooks modal (demo only)');
  }

  runValidation() {
    alert('Running validation tests... (demo only)');
  }

  getInputType(fieldType: string): string {
    if (fieldType === 'email') return 'email';
    if (fieldType === 'url') return 'url';
    if (fieldType === 'date') return 'date';
    return 'text';
  }

  formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Mock data - in real app, this would come from a service
  private mockCompanies: VendorCompany[] = [
    {
      id: '1',
      name: 'Acme Corporation',
      primaryContact: 'John Smith',
      primaryEmail: 'john.smith@acme.com',
      status: 'Active',
      tier: 'Tier 1',
      riskLevel: 'Low',
      createdAt: '2024-01-15T10:00:00Z',
      website: 'https://acme.com',
      address: '123 Main St, San Francisco, CA',
      vendor: true,
      lifecycle: {
        currentStage: 'monitoring',
        overallStatus: 'active',
        governanceState: null,
        stages: [
          { stage: 'preparation', status: 'COMPLETE' as LifecycleStatus, completedAt: '2024-01-16T10:00:00Z' },
          { stage: 'registration', status: 'COMPLETE' as LifecycleStatus, completedAt: '2024-01-17T10:00:00Z' },
          { stage: 'validation', status: 'COMPLETE' as LifecycleStatus, completedAt: '2024-01-18T10:00:00Z', assignedReviewer: 'Admin User' },
          { stage: 'configuration-review', status: 'COMPLETE' as LifecycleStatus, completedAt: '2024-01-19T10:00:00Z', assignedReviewer: 'Admin User' },
          { stage: 'compliance-certification', status: 'COMPLETE' as LifecycleStatus, completedAt: '2024-01-20T10:00:00Z', assignedReviewer: 'Compliance Officer' },
          { stage: 'activation', status: 'COMPLETE' as LifecycleStatus, completedAt: '2024-01-21T10:00:00Z' },
          { stage: 'monitoring', status: 'IN_PROGRESS' as LifecycleStatus, startedAt: '2024-01-21T10:00:00Z' }
        ]
      },
      compliance: {
        certificationStatus: 'approved',
        checklist: [
          { id: '1', label: 'Security review complete', status: 'approved' as const, required: true, reviewedBy: 'Security Team', reviewedAt: '2024-01-20T10:00:00Z' },
          { id: '2', label: 'Required documentation received', status: 'approved' as const, required: true, reviewedBy: 'Admin User', reviewedAt: '2024-01-20T10:00:00Z' },
          { id: '3', label: 'Data processing agreement signed', status: 'approved' as const, required: true, reviewedBy: 'Legal Team', reviewedAt: '2024-01-20T10:00:00Z' },
          { id: '4', label: 'APIM policies applied', status: 'approved' as const, required: true, reviewedBy: 'System Admin', reviewedAt: '2024-01-20T10:00:00Z' }
        ],
        lastReviewDate: '2024-01-20T10:00:00Z'
      },
      integrationStatus: {
        status: 'HEALTHY',
        lastChecked: '2024-03-15T14:30:00Z',
        recentErrors: {
          count: 0,
          types: []
        }
      }
    },
    {
      id: '2',
      name: 'TechStart Inc',
      primaryContact: 'Sarah Johnson',
      primaryEmail: 'sarah.j@techstart.com',
      status: 'Pending',
      tier: 'Tier 2',
      riskLevel: 'Medium',
      createdAt: '2024-02-20T14:30:00Z',
      submittedAt: '2024-02-20T14:30:00Z',
      website: 'https://techstart.com',
      vendor: true,
      lifecycle: {
        currentStage: 'compliance-certification',
        overallStatus: 'onboarding',
        governanceState: 'approval-required' as const,
        stages: [
          { stage: 'preparation', status: 'COMPLETE' as LifecycleStatus, completedAt: '2024-02-21T10:00:00Z' },
          { stage: 'registration', status: 'COMPLETE' as LifecycleStatus, completedAt: '2024-02-22T10:00:00Z' },
          { stage: 'validation', status: 'COMPLETE' as LifecycleStatus, completedAt: '2024-02-23T10:00:00Z', assignedReviewer: 'Admin User' },
          { stage: 'configuration-review', status: 'COMPLETE' as LifecycleStatus, completedAt: '2024-02-24T10:00:00Z', assignedReviewer: 'Admin User' },
          { stage: 'compliance-certification', status: 'IN_PROGRESS' as LifecycleStatus, startedAt: '2024-02-25T10:00:00Z', assignedReviewer: 'Compliance Officer' },
          { stage: 'activation', status: 'PENDING' as LifecycleStatus },
          { stage: 'monitoring', status: 'PENDING' as LifecycleStatus }
        ]
      },
      compliance: {
        certificationStatus: 'in-review',
        checklist: [
          { id: '1', label: 'Security review complete', status: 'approved' as const, required: true, reviewedBy: 'Security Team', reviewedAt: '2024-02-25T10:00:00Z' },
          { id: '2', label: 'Required documentation received', status: 'approved' as const, required: true, reviewedBy: 'Admin User', reviewedAt: '2024-02-25T10:00:00Z' },
          { id: '3', label: 'Data processing agreement signed', status: 'in-review' as const, required: true, reviewedBy: 'Legal Team' },
          { id: '4', label: 'APIM policies applied', status: 'pending' as const, required: true }
        ],
        lastReviewDate: '2024-02-25T10:00:00Z'
      },
      integrationStatus: {
        status: 'DEGRADED',
        lastChecked: '2024-03-15T14:30:00Z',
        recentErrors: {
          count: 5,
          types: ['callback_failed', 'auth_error'],
          lastError: '2024-03-15T12:00:00Z'
        }
      }
    },
    {
      id: '3',
      name: 'Global Solutions Ltd',
      primaryContact: 'Michael Chen',
      primaryEmail: 'm.chen@globalsolutions.com',
      status: 'Active',
      tier: 'Tier 1',
      riskLevel: 'Low',
      createdAt: '2023-11-10T09:15:00Z',
      website: 'https://globalsolutions.com',
      address: '456 Business Ave, New York, NY',
      vendor: true,
      lifecycle: {
        currentStage: 'monitoring',
        overallStatus: 'active',
        governanceState: null,
        stages: [
          { stage: 'preparation', status: 'COMPLETE' as LifecycleStatus, completedAt: '2023-11-11T10:00:00Z' },
          { stage: 'registration', status: 'COMPLETE' as LifecycleStatus, completedAt: '2023-11-12T10:00:00Z' },
          { stage: 'validation', status: 'COMPLETE' as LifecycleStatus, completedAt: '2023-11-13T10:00:00Z', assignedReviewer: 'Admin User' },
          { stage: 'configuration-review', status: 'COMPLETE' as LifecycleStatus, completedAt: '2023-11-14T10:00:00Z', assignedReviewer: 'Admin User' },
          { stage: 'compliance-certification', status: 'COMPLETE' as LifecycleStatus, completedAt: '2023-11-15T10:00:00Z', assignedReviewer: 'Compliance Officer' },
          { stage: 'activation', status: 'COMPLETE' as LifecycleStatus, completedAt: '2023-11-16T10:00:00Z' },
          { stage: 'monitoring', status: 'IN_PROGRESS' as LifecycleStatus, startedAt: '2023-11-16T10:00:00Z' }
        ]
      },
      compliance: {
        certificationStatus: 'approved',
        checklist: [
          { id: '1', label: 'Security review complete', status: 'approved' as const, required: true, reviewedBy: 'Security Team', reviewedAt: '2023-11-15T10:00:00Z' },
          { id: '2', label: 'Required documentation received', status: 'approved' as const, required: true, reviewedBy: 'Admin User', reviewedAt: '2023-11-15T10:00:00Z' },
          { id: '3', label: 'Data processing agreement signed', status: 'approved' as const, required: true, reviewedBy: 'Legal Team', reviewedAt: '2023-11-15T10:00:00Z' },
          { id: '4', label: 'APIM policies applied', status: 'approved' as const, required: true, reviewedBy: 'System Admin', reviewedAt: '2023-11-15T10:00:00Z' }
        ],
        lastReviewDate: '2023-11-15T10:00:00Z'
      },
      integrationStatus: {
        status: 'HEALTHY',
        lastChecked: '2024-03-15T14:30:00Z',
        recentErrors: {
          count: 0,
          types: []
        }
      }
    },
    {
      id: '4',
      name: 'InnovateCo',
      primaryContact: 'Emily Davis',
      primaryEmail: 'emily.d@innovateco.com',
      status: 'Pending',
      tier: 'Tier 3',
      riskLevel: 'High',
      createdAt: '2024-03-05T11:20:00Z',
      submittedAt: '2024-03-05T11:20:00Z',
      website: 'https://innovateco.com',
      vendor: true,
      lifecycle: {
        currentStage: 'validation',
        overallStatus: 'onboarding',
        governanceState: 'pending-validation' as const,
        stages: [
          { stage: 'preparation', status: 'COMPLETE' as LifecycleStatus, completedAt: '2024-03-06T10:00:00Z' },
          { stage: 'registration', status: 'COMPLETE' as LifecycleStatus, completedAt: '2024-03-07T10:00:00Z' },
          { stage: 'validation', status: 'IN_PROGRESS' as LifecycleStatus, startedAt: '2024-03-08T10:00:00Z', assignedReviewer: 'Admin User' },
          { stage: 'configuration-review', status: 'PENDING' as LifecycleStatus },
          { stage: 'compliance-certification', status: 'PENDING' as LifecycleStatus },
          { stage: 'activation', status: 'PENDING' as LifecycleStatus },
          { stage: 'monitoring', status: 'PENDING' as LifecycleStatus }
        ]
      },
      compliance: {
        certificationStatus: 'pending',
        checklist: [
          { id: '1', label: 'Security review complete', status: 'pending' as const, required: true },
          { id: '2', label: 'Required documentation received', status: 'pending' as const, required: true },
          { id: '3', label: 'Data processing agreement signed', status: 'pending' as const, required: true },
          { id: '4', label: 'APIM policies applied', status: 'pending' as const, required: true }
        ]
      },
      integrationStatus: {
        status: 'ERROR',
        lastChecked: '2024-03-15T14:30:00Z',
        recentErrors: {
          count: 12,
          types: ['callback_failed', 'auth_error', 'timeout'],
          lastError: '2024-03-15T13:00:00Z'
        }
      }
    },
    {
      id: '5',
      name: 'DataFlow Systems',
      primaryContact: 'Robert Wilson',
      primaryEmail: 'r.wilson@dataflow.com',
      status: 'Active',
      tier: 'Tier 2',
      riskLevel: 'Medium',
      createdAt: '2024-01-28T16:45:00Z',
      website: 'https://dataflow.com',
      address: '789 Tech Blvd, Austin, TX',
      vendor: true,
      lifecycle: {
        currentStage: 'monitoring',
        overallStatus: 'active',
        governanceState: null,
        stages: [
          { stage: 'preparation', status: 'COMPLETE' as LifecycleStatus, completedAt: '2024-01-29T10:00:00Z' },
          { stage: 'registration', status: 'COMPLETE' as LifecycleStatus, completedAt: '2024-01-30T10:00:00Z' },
          { stage: 'validation', status: 'COMPLETE' as LifecycleStatus, completedAt: '2024-01-31T10:00:00Z', assignedReviewer: 'Admin User' },
          { stage: 'configuration-review', status: 'COMPLETE' as LifecycleStatus, completedAt: '2024-02-01T10:00:00Z', assignedReviewer: 'Admin User' },
          { stage: 'compliance-certification', status: 'COMPLETE' as LifecycleStatus, completedAt: '2024-02-02T10:00:00Z', assignedReviewer: 'Compliance Officer' },
          { stage: 'activation', status: 'COMPLETE' as LifecycleStatus, completedAt: '2024-02-03T10:00:00Z' },
          { stage: 'monitoring', status: 'IN_PROGRESS' as LifecycleStatus, startedAt: '2024-02-03T10:00:00Z' }
        ]
      },
      compliance: {
        certificationStatus: 'approved',
        checklist: [
          { id: '1', label: 'Security review complete', status: 'approved' as const, required: true, reviewedBy: 'Security Team', reviewedAt: '2024-02-02T10:00:00Z' },
          { id: '2', label: 'Required documentation received', status: 'approved' as const, required: true, reviewedBy: 'Admin User', reviewedAt: '2024-02-02T10:00:00Z' },
          { id: '3', label: 'Data processing agreement signed', status: 'approved' as const, required: true, reviewedBy: 'Legal Team', reviewedAt: '2024-02-02T10:00:00Z' },
          { id: '4', label: 'APIM policies applied', status: 'approved' as const, required: true, reviewedBy: 'System Admin', reviewedAt: '2024-02-02T10:00:00Z' }
        ],
        lastReviewDate: '2024-02-02T10:00:00Z'
      },
      integrationStatus: {
        status: 'HEALTHY',
        lastChecked: '2024-03-15T14:30:00Z',
        recentErrors: {
          count: 1,
          types: ['timeout'],
          lastError: '2024-03-14T10:00:00Z'
        }
      }
    },
    {
      id: '7',
      name: 'SecureNet Partners',
      primaryContact: 'David Martinez',
      primaryEmail: 'd.martinez@securenet.com',
      status: 'Deactivated',
      tier: 'Tier 1',
      riskLevel: 'Low',
      createdAt: '2023-09-15T08:30:00Z',
      website: 'https://securenet.com',
      vendor: true,
      lifecycle: {
        currentStage: 'monitoring',
        overallStatus: 'archived',
        governanceState: null,
        stages: [
          { stage: 'preparation', status: 'COMPLETE' as LifecycleStatus, completedAt: '2023-09-16T10:00:00Z' },
          { stage: 'registration', status: 'COMPLETE' as LifecycleStatus, completedAt: '2023-09-17T10:00:00Z' },
          { stage: 'validation', status: 'COMPLETE' as LifecycleStatus, completedAt: '2023-09-18T10:00:00Z', assignedReviewer: 'Admin User' },
          { stage: 'configuration-review', status: 'COMPLETE' as LifecycleStatus, completedAt: '2023-09-19T10:00:00Z', assignedReviewer: 'Admin User' },
          { stage: 'compliance-certification', status: 'COMPLETE' as LifecycleStatus, completedAt: '2023-09-20T10:00:00Z', assignedReviewer: 'Compliance Officer' },
          { stage: 'activation', status: 'COMPLETE' as LifecycleStatus, completedAt: '2023-09-21T10:00:00Z' },
          { stage: 'monitoring', status: 'COMPLETE' as LifecycleStatus, completedAt: '2023-12-01T10:00:00Z' }
        ]
      },
      compliance: {
        certificationStatus: 'approved',
        checklist: [
          { id: '1', label: 'Security review complete', status: 'approved' as const, required: true, reviewedBy: 'Security Team', reviewedAt: '2023-09-20T10:00:00Z' },
          { id: '2', label: 'Required documentation received', status: 'approved' as const, required: true, reviewedBy: 'Admin User', reviewedAt: '2023-09-20T10:00:00Z' },
          { id: '3', label: 'Data processing agreement signed', status: 'approved' as const, required: true, reviewedBy: 'Legal Team', reviewedAt: '2023-09-20T10:00:00Z' },
          { id: '4', label: 'APIM policies applied', status: 'approved' as const, required: true, reviewedBy: 'System Admin', reviewedAt: '2023-09-20T10:00:00Z' }
        ],
        lastReviewDate: '2023-09-20T10:00:00Z'
      },
      integrationStatus: {
        status: 'ERROR',
        lastChecked: '2023-12-01T10:00:00Z',
        recentErrors: {
          count: 0,
          types: []
        }
      }
    }
  ];

  ngOnInit() {
    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id) {
        this.vendorService.getVendorById(id).subscribe({
          next: (vendor) => {
            if (vendor) {
              this.company.set(vendor);
              this.selectedTier = vendor.tier || '';
            } else {
              // Fallback to mock data if not found in service
              const found = this.mockCompanies.find(c => c.id === id);
              if (found) {
                const company = this.ensureLifecycleData(found);
                this.company.set(company);
                this.selectedTier = company.tier || '';
              }
            }
          },
          error: (err) => {
            console.error('Error loading vendor:', err);
            // Fallback to mock data
            const found = this.mockCompanies.find(c => c.id === id);
            if (found) {
              const company = this.ensureLifecycleData(found);
              this.company.set(company);
              this.selectedTier = company.tier || '';
            }
          }
        });
      }
    });
  }

  goBack() {
    this.router.navigate(['/vendors/companies']);
  }

  onVendorUpdated(vendor: VendorCompany) {
    this.company.set(vendor);
  }

  openApproveModal() {
    this.approveModalOpen.set(true);
  }

  closeApproveModal() {
    this.approveModalOpen.set(false);
  }

  confirmApprove() {
    const vendor = this.company();
    if (!vendor) return;

    this.vendorService.approveVendor(vendor.id).subscribe({
      next: (updated) => {
        this.company.set(updated);
        this.closeApproveModal();
      },
      error: (err) => {
        console.error('Error approving vendor:', err);
        alert('Failed to approve vendor. Please try again.');
      }
    });
  }

  openRejectModal() {
    this.rejectModalOpen.set(true);
    this.rejectionReason = '';
  }

  closeRejectModal() {
    this.rejectModalOpen.set(false);
    this.rejectionReason = '';
  }

  confirmReject() {
    const vendor = this.company();
    if (!vendor || !this.rejectionReason.trim()) return;

    this.vendorService.rejectVendor(vendor.id, this.rejectionReason).subscribe({
      next: (updated) => {
        this.company.set(updated);
        this.closeRejectModal();
      },
      error: (err) => {
        console.error('Error rejecting vendor:', err);
        alert('Failed to reject vendor. Please try again.');
      }
    });
  }

  openArchiveModal() {
    this.archiveModalOpen.set(true);
  }

  closeArchiveModal() {
    this.archiveModalOpen.set(false);
  }

  confirmArchive() {
    const vendor = this.company();
    if (!vendor) return;

    this.vendorService.archiveVendor(vendor.id).subscribe({
      next: (updated) => {
        this.company.set(updated);
        this.closeArchiveModal();
      },
      error: (err) => {
        console.error('Error archiving vendor:', err);
        alert('Failed to archive vendor. Please try again.');
      }
    });
  }

  private ensureLifecycleData(company: VendorCompany): VendorCompany {
    if (company.vendor && !company.lifecycle) {
      // Create default lifecycle for vendors without lifecycle data
      const allStages: LifecycleStage[] = [
        'preparation',
        'registration',
        'validation',
        'configuration-review',
        'compliance-certification',
        'activation',
        'monitoring'
      ];
      return {
        ...company,
        lifecycle: {
          currentStage: 'preparation',
          overallStatus: 'onboarding',
          governanceState: null,
          stages: allStages.map(stage => ({
            stage,
            status: 'PENDING' as LifecycleStatus
          }))
        }
      };
    }
    return company;
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  getStatusColor(status: string): 'red' | 'blue' | 'green' | 'gray' | 'magenta' | 'purple' | 'teal' {
    const colors: Record<string, 'red' | 'blue' | 'green' | 'gray' | 'magenta' | 'purple' | 'teal'> = {
      'Active': 'green',
      'Pending': 'blue',
      'Rejected': 'red',
      'Deactivated': 'gray'
    };
    return colors[status] || 'gray';
  }

  getRiskColor(risk: string): 'red' | 'blue' | 'green' | 'gray' | 'magenta' | 'purple' | 'teal' {
    const colors: Record<string, 'red' | 'blue' | 'green' | 'gray' | 'magenta' | 'purple' | 'teal'> = {
      'Low': 'green',
      'Medium': 'magenta', // Changed from 'yellow' as it's not a valid TagType
      'High': 'red'
    };
    return colors[risk] || 'gray';
  }

  openEditModal() {
    this.editModalOpen.set(true);
  }

  closeEditModal() {
    this.editModalOpen.set(false);
  }

  openTierModal() {
    this.tierModalOpen.set(true);
  }

  closeTierModal() {
    this.tierModalOpen.set(false);
  }

  confirmTierChange() {
    alert('Tier change (demo only)');
    this.closeTierModal();
  }

  changeTier() {
    alert('Tier updated (demo only)');
  }

  openDeactivateModal() {
    this.deactivateModalOpen.set(true);
  }

  closeDeactivateModal() {
    this.deactivateModalOpen.set(false);
  }

  confirmDeactivate() {
    const comp = this.company();
    if (comp) {
      comp.status = 'Deactivated';
      this.company.set({ ...comp });
      this.closeDeactivateModal();
      alert('Company deactivated (demo only)');
    }
  }

  reactivateCompany() {
    const comp = this.company();
    if (comp) {
      comp.status = 'Active';
      this.company.set({ ...comp });
      alert('Company reactivated (demo only)');
    }
  }
}

