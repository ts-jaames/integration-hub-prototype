import { Component, OnInit, signal, inject, computed, HostListener } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  ButtonModule,
  TagModule,
  InputModule,
  ModalModule,
  SelectModule,
  CheckboxModule,
  IconModule
} from 'carbon-components-angular';
import { VendorCompany, VendorStatus, VendorServiceAccount } from '../shared/models/vendor-company.model';
import { VendorLifecycle, LifecycleStage, LifecycleStatus, ActivityLogEntry, ComplianceChecklistItem, IntegrationStatus, GovernanceState } from '../shared/models/vendor-lifecycle.model';
import { RoleService } from '../core/role.service';
import { VendorCompanyService } from '../shared/services/vendor-company.service';
import { VendorSummaryCardComponent } from '../shared/components/vendor-summary-card/vendor-summary-card.component';
import { VendorComplianceSectionComponent } from '../shared/components/vendor-compliance-section/vendor-compliance-section.component';
import { VendorUsersSectionComponent } from '../shared/components/vendor-users-section/vendor-users-section.component';
import { VendorApiKeysSectionComponent } from '../shared/components/vendor-api-keys-section/vendor-api-keys-section.component';
import { VendorActivityLogSectionComponent } from '../shared/components/vendor-activity-log-section/vendor-activity-log-section.component';
import { ConfirmDialogComponent } from '../shared/components/confirm-dialog/confirm-dialog.component';
import { LoggerService } from '../core/services/logger.service';

type EditableSection = 'company' | 'contacts' | 'integrations' | 'compliance' | 'lifecycle' | null;

// Compliance requirement types (matching onboarding model)
type ComplianceStatus = 'not_started' | 'in_progress' | 'complete';

interface ComplianceEvidence {
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
  url?: string;
}

interface ComplianceRequirement {
  id: string;
  name: string;
  status: ComplianceStatus;
  owner: string;
  evidence: ComplianceEvidence[];
  dateCompleted: string;
  notes: string;
  required: boolean;
}

@Component({
  selector: 'app-company-details',
  standalone: false,
  template: `
    <div class="page-container" [class.has-unsaved]="editingSection() !== null">
      <!-- Unsaved Changes Confirmation Modal -->
      <div class="unsaved-overlay" *ngIf="showUnsavedDialog()" (click)="cancelNavigation()">
        <div class="unsaved-dialog" (click)="$event.stopPropagation()">
          <h3>Unsaved Changes</h3>
          <p>You have unsaved changes. Are you sure you want to leave?</p>
          <div class="dialog-actions">
            <button class="btn-secondary" (click)="cancelNavigation()">Stay</button>
            <button class="btn-danger" (click)="confirmNavigation()">Discard Changes</button>
          </div>
        </div>
      </div>

      <!-- ============================================ -->
      <!-- MINIMAL HEADER                              -->
      <!-- ============================================ -->
      <header class="vendor-header">
        <!-- Row 1: Identity + Actions -->
        <div class="header-row-1">
          <div class="header-identity">
            <div class="header-title-row">
              <h1>{{ company()?.name || 'Vendor Details' }}</h1>
              <ibm-tag 
                *ngIf="company()"
                [type]="getStatusTagType(company()!.status)" 
                size="md" 
                class="status-pill">
                {{ company()!.status }}
              </ibm-tag>
            </div>
            <div class="header-meta">
              <span class="meta-item" *ngIf="company()?.dba">DBA: {{ company()?.dba }}</span>
              <span class="meta-separator" *ngIf="company()?.dba">·</span>
              <span class="meta-item">ID: {{ company()?.id }}</span>
            </div>
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

            <div class="overflow-menu" [class.open]="overflowMenuOpen()">
              <button class="overflow-trigger" (click)="toggleOverflowMenu()" [disabled]="isReadOnly()">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="3" r="1.5" fill="currentColor"/>
                  <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
                  <circle cx="8" cy="13" r="1.5" fill="currentColor"/>
                </svg>
              </button>
              <div class="overflow-dropdown" *ngIf="overflowMenuOpen()">
              <button class="overflow-item" (click)="handleOverflowAction('archive')" *ngIf="company()?.status !== 'Archived'">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M2 4h12M4 4v9a1 1 0 001 1h6a1 1 0 001-1V4M6 7v4M10 7v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
                Archive
              </button>
              <button class="overflow-item" (click)="handleOverflowAction('suspend')" *ngIf="company()?.status === 'Active'">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/>
                  <path d="M6 6v4M10 6v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
                Suspend
              </button>
              <button class="overflow-item" (click)="handleOverflowAction('unsuspend')" *ngIf="company()?.status === 'Suspended'">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/>
                  <path d="M6 6l4 4M6 10l4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
                Unsuspend
              </button>
              <button class="overflow-item" (click)="handleOverflowAction('audit')">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M4 2h8a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V4a2 2 0 012-2zM5 5h6M5 8h6M5 11h3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
                View audit log
              </button>
            </div>
          </div>
        </div>
        </div>
        
        <!-- Row 2: Signal Chips (only when action needed) -->
        <div class="header-row-2" *ngIf="hasHeaderSignals()">
          <!-- Compliance Signal -->
          <a 
            *ngIf="isComplianceBlocking()" 
            class="signal-chip warning" 
            href="#section-compliance"
            (click)="scrollToSection($event, 'section-compliance')">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M8 1L15 14H1L8 1z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
              <path d="M8 6v3M8 11v1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            Compliance: {{ getRequiredComplianceCount() }} of {{ getTotalRequiredCount() }} required
          </a>
          
          <!-- Integration Signal -->
          <a 
            *ngIf="!isIntegrationConfigured()" 
            class="signal-chip warning" 
            href="#section-integrations"
            (click)="scrollToSection($event, 'section-integrations')">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/>
              <path d="M8 5v4M8 11h.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            Vendor integration not configured
          </a>
          
          <!-- Vendor Status Gating -->
          <span 
            *ngIf="isVendorActionsBlocked()" 
            class="signal-chip blocked">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/>
              <path d="M6 6l4 4M10 6l-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            {{ blockedStatusMessage() }}
          </span>
        </div>

        <!-- ======== VENDOR CHANGE INTELLIGENCE ALERT (APIGateway Pro only) ======== -->
        <div class="change-intel-alert" 
             *ngIf="company()?.vendor && isApiGatewayPro() && !changeIntelDismissed()"
             [class.expanded]="changeIntelExpanded()">
          
          <!-- Collapsed Banner -->
          <div class="alert-banner" (click)="toggleChangeIntelExpand()">
            <div class="alert-left">
              <div class="alert-icon">
                <svg class="intel-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <!-- Center dot -->
                  <circle cx="10" cy="10" r="2.5" fill="currentColor"/>
                  <!-- Inner ring -->
                  <circle class="ring ring-1" cx="10" cy="10" r="5" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.7"/>
                  <!-- Outer ring -->
                  <circle class="ring ring-2" cx="10" cy="10" r="8" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.4"/>
                </svg>
              </div>
              <div class="alert-content">
                <span class="alert-title">Vendor Change Intelligence</span>
                <span class="alert-meta">Potential API change detected · Last checked 2 hours ago</span>
              </div>
            </div>
            <div class="alert-right">
              <button class="alert-dismiss" (click)="dismissChangeIntel(); $event.stopPropagation()" title="Dismiss alert">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
              </button>
              <div class="alert-chevron">
                <svg [class.rotated]="changeIntelExpanded()" width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M5 8l5 5 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
            </div>
          </div>

          <!-- Expanded Details -->
          <div class="alert-details" *ngIf="changeIntelExpanded()">
            <div class="alert-details-inner">
              <!-- Change Synopsis -->
              <div class="intel-block">
                <h4>Change Synopsis</h4>
                <div class="synopsis-box">
                  <p class="synopsis-text">
                    We detected a change in APIGateway Pro's authentication schema related to token validation. 
                    The vendor's documentation indicates updates to the OAuth 2.0 token refresh flow that may 
                    affect existing integrations.
                  </p>
                  <p class="ai-note">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/>
                      <path d="M8 5v3l2 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>
                    AI-generated summary based on vendor signals and documentation changes
                  </p>
                </div>
              </div>

              <!-- Impact Analysis -->
              <div class="intel-block">
                <h4>Impact Analysis</h4>
                <div class="impact-row">
                  <div class="impact-col">
                    <label>Impacted FSR APIs</label>
                    <ul class="impact-items">
                      <li *ngFor="let api of impactedApis()">
                        <span>{{ api.name }}</span>
                        <ibm-tag [type]="api.severity === 'high' ? 'red' : 'purple'" size="sm">
                          {{ api.severity === 'high' ? 'High' : 'Medium' }}
                        </ibm-tag>
                      </li>
                    </ul>
                  </div>
                  <div class="impact-col">
                    <label>Impacted Downstream Consumers</label>
                    <ul class="impact-items">
                      <li *ngFor="let consumer of impactedConsumers()">
                        <span>{{ consumer }}</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <!-- Suggested Paths -->
              <div class="intel-block">
                <h4>Suggested Paths</h4>
                <p class="advisory-note">Advisory only. No changes will be made without explicit action.</p>
                <div class="paths-list">
                  <div class="path-card" *ngFor="let path of suggestedPaths()">
                    <div class="path-top">
                      <span class="path-name">{{ path.label }}</span>
                      <ibm-tag [type]="getRiskTagType(path.risk)" size="sm">{{ path.risk }} risk</ibm-tag>
                    </div>
                    <p class="path-desc">{{ path.description }}</p>
                    <p class="path-scope">Scope: {{ path.scope }}</p>
                  </div>
                </div>
              </div>

              <!-- Actions -->
              <div class="intel-footer">
                <button class="btn-secondary" (click)="trackChange(); $event.stopPropagation()">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M8 4v8M4 8h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  </svg>
                  Track this change
                </button>
                <button class="btn-ghost" (click)="dismissChangeIntel(); $event.stopPropagation()">
                  Dismiss
                </button>
                <button class="btn-future" disabled title="Coming soon">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="5" stroke="currentColor" stroke-width="1.5"/>
                    <path d="M8 5v3l2 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  </svg>
                  Prepare changes with AI agent
                  <span class="future-tag">Future</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <!-- ============================================ -->
      <!-- TWO COLUMN LAYOUT                           -->
      <!-- ============================================ -->
      <div class="two-column-layout">
        <!-- MAIN CONTENT COLUMN -->
        <main class="main-column">
          
          <!-- ======== COMPANY SECTION ======== -->
          <section class="detail-section" id="section-company">
            <div class="section-header">
              <h2>Company</h2>
              <button 
                class="edit-link" 
                *ngIf="editingSection() !== 'company'"
                (click)="startEditingSection('company')">
                Edit
              </button>
            </div>
            
            <!-- View Mode -->
            <div class="section-content" *ngIf="editingSection() !== 'company'">
              <div class="info-grid">
                <div class="info-item">
                  <label>Legal Name</label>
                  <p>{{ company()?.name || '—' }}</p>
                </div>
                <div class="info-item" *ngIf="company()?.dba">
                  <label>DBA</label>
                  <p>{{ company()?.dba }}</p>
                </div>
                <div class="info-item">
                  <label>Industry</label>
                  <p>{{ getCompanyIndustry() }}</p>
                </div>
                <div class="info-item">
                  <label>Region</label>
                  <p>{{ getCompanyRegion() }}</p>
                </div>
                <div class="info-item">
                  <label>Website</label>
                  <p><a [href]="company()?.website" target="_blank" class="link">{{ company()?.website || '—' }}</a></p>
                </div>
                <div class="info-item" *ngIf="company()?.tier">
                  <label>Tier</label>
                  <p>{{ company()?.tier }}</p>
                </div>
              </div>
              <div class="info-item full-width" *ngIf="company()?.notes">
                <label>Internal Notes</label>
                <p class="notes-text">{{ company()?.notes }}</p>
              </div>
            </div>
            
            <!-- Edit Mode -->
            <div class="section-content edit-mode" *ngIf="editingSection() === 'company'" [formGroup]="companyForm">
              <div class="form-grid">
                <div class="form-field">
                  <label>Legal Name <span class="required">*</span></label>
                  <input type="text" formControlName="name" placeholder="Legal company name">
                </div>
                <div class="form-field">
                  <label>DBA</label>
                  <input type="text" formControlName="dba" placeholder="Doing business as">
                </div>
                <div class="form-field">
                  <label>Industry</label>
                  <select formControlName="industry">
                    <option value="">Select industry</option>
                    <option value="Technology Services">Technology Services</option>
                    <option value="Financial Services">Financial Services</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Real Estate">Real Estate</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div class="form-field">
                  <label>Region</label>
                  <select formControlName="region">
                    <option value="">Select region</option>
                    <option value="North America">North America</option>
                    <option value="Europe">Europe</option>
                    <option value="Asia Pacific">Asia Pacific</option>
                    <option value="Latin America">Latin America</option>
                  </select>
                </div>
                <div class="form-field">
                  <label>Website</label>
                  <input type="url" formControlName="website" placeholder="https://example.com">
                </div>
                <div class="form-field">
                  <label>Tier</label>
                  <select formControlName="tier">
                    <option value="">Select tier</option>
                    <option value="Tier 1">Tier 1</option>
                    <option value="Tier 2">Tier 2</option>
                    <option value="Tier 3">Tier 3</option>
                  </select>
                </div>
              </div>
              <div class="form-field full-width">
                <label>Internal Notes</label>
                <textarea formControlName="notes" rows="3" placeholder="Add internal notes..."></textarea>
              </div>
            </div>
          </section>

          <!-- ======== CONTACTS SECTION ======== -->
          <section class="detail-section" id="section-contacts">
            <div class="section-header">
              <h2>Contacts</h2>
              <button 
                class="edit-link" 
                *ngIf="editingSection() !== 'contacts'"
                (click)="startEditingSection('contacts')">
                Edit
              </button>
            </div>
            
            <!-- View Mode -->
            <div class="section-content" *ngIf="editingSection() !== 'contacts'">
              <div class="info-grid contacts-info-grid">
                <div class="info-item">
                  <label>Primary Business Contact</label>
                  <p>{{ company()?.primaryContact || '—' }}</p>
                  <a [href]="'mailto:' + company()?.primaryEmail" class="link">
                    {{ company()?.primaryEmail || '—' }}
                  </a>
                </div>
                <div class="info-item">
                  <label>Technical Contact</label>
                  <p>{{ mockTechnicalContact().name }}</p>
                  <a [href]="'mailto:' + mockTechnicalContact().email" class="link">
                    {{ mockTechnicalContact().email }}
                  </a>
                </div>
                <div class="info-item">
                  <label>Support Email</label>
                  <p>Support</p>
                  <a [href]="'mailto:' + mockSupportEmail()" class="link">
                    {{ mockSupportEmail() }}
                  </a>
                </div>
              </div>
            </div>
            
            <!-- Edit Mode -->
            <div class="section-content edit-mode" *ngIf="editingSection() === 'contacts'" [formGroup]="contactsForm">
              <div class="form-grid">
                <div class="form-field">
                  <label>Primary Contact Name <span class="required">*</span></label>
                  <input type="text" formControlName="primaryContact" placeholder="Contact name">
                </div>
                <div class="form-field">
                  <label>Primary Contact Email <span class="required">*</span></label>
                  <input type="email" formControlName="primaryEmail" placeholder="contact@company.com">
                </div>
                <div class="form-field">
                  <label>Technical Contact Name</label>
                  <input type="text" formControlName="technicalContact" placeholder="Technical contact name">
                </div>
                <div class="form-field">
                  <label>Technical Contact Email</label>
                  <input type="email" formControlName="technicalEmail" placeholder="tech@company.com">
                </div>
                <div class="form-field">
                  <label>Support Email</label>
                  <input type="email" formControlName="supportEmail" placeholder="support@company.com">
                </div>
              </div>
            </div>
          </section>

          <!-- ======== INTEGRATIONS SECTION ======== -->
          <section class="detail-section" id="section-integrations" *ngIf="company()?.vendor">
            <div class="section-header">
              <h2>Vendor Integration</h2>
              <button 
                class="edit-link" 
                *ngIf="editingSection() !== 'integrations' && !isReadOnly()"
                (click)="startIntegrationEdit()">
                Edit
              </button>
            </div>
            
            <!-- View Mode -->
            <div class="section-content" *ngIf="editingSection() !== 'integrations'">
              <!-- Not Configured State -->
              <div class="integration-not-configured" *ngIf="!isIntegrationConfigured()">
                <div class="not-configured-icon">
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <circle cx="16" cy="16" r="12" stroke="currentColor" stroke-width="1.5" opacity="0.4"/>
                    <path d="M16 10v8M16 20v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  </svg>
                </div>
                <p class="not-configured-text">Vendor integration not configured</p>
                <p class="not-configured-hint">Configure how FSR connects to this vendor's API.</p>
                <button 
                  class="btn-secondary-sm" 
                  *ngIf="!isReadOnly()"
                  (click)="startIntegrationEdit()">
                  Configure integration
                </button>
              </div>
              
              <!-- Configured State -->
              <div class="integrations-list" *ngIf="isIntegrationConfigured()">
                <!-- Production Environment -->
                <div class="integration-card" *ngIf="integrationConfig().production.configured">
                  <div class="integration-header">
                    <span class="integration-name">Production</span>
                    <ibm-tag [type]="integrationConfig().production.status === 'active' ? 'green' : 'gray'" size="sm">
                      {{ integrationConfig().production.status === 'active' ? 'Active' : 'Inactive' }}
                    </ibm-tag>
                  </div>
                  <div class="integration-details">
                    <div class="detail-row">
                      <span class="detail-label">Endpoint</span>
                      <span class="detail-value mono">{{ integrationConfig().production.endpoint }}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Auth Method</span>
                      <span class="detail-value">{{ integrationConfig().production.authMethod }}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Credentials</span>
                      <span class="detail-value mono">••••••••</span>
                    </div>
                  </div>
                </div>
                
                <!-- Sandbox Environment -->
                <div class="integration-card" *ngIf="integrationConfig().sandbox.configured">
                  <div class="integration-header">
                    <span class="integration-name">Sandbox</span>
                    <ibm-tag [type]="integrationConfig().sandbox.status === 'active' ? 'blue' : 'gray'" size="sm">
                      {{ integrationConfig().sandbox.status === 'active' ? 'Active' : 'Inactive' }}
                    </ibm-tag>
                  </div>
                  <div class="integration-details">
                    <div class="detail-row">
                      <span class="detail-label">Endpoint</span>
                      <span class="detail-value mono">{{ integrationConfig().sandbox.endpoint }}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Auth Method</span>
                      <span class="detail-value">{{ integrationConfig().sandbox.authMethod }}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Credentials</span>
                      <span class="detail-value mono">••••••••</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Edit Mode -->
            <div class="section-content edit-mode" *ngIf="editingSection() === 'integrations'">
              <div class="integration-edit-form">
                <!-- Production Environment -->
                <div class="environment-config">
                  <div class="env-header">
                    <h4>Production Environment</h4>
                    <label class="env-toggle">
                      <input 
                        type="checkbox" 
                        [checked]="integrationFormData.production.status === 'active'"
                        (change)="integrationFormData.production.status = $any($event.target).checked ? 'active' : 'inactive'">
                      <span>Active</span>
                    </label>
                  </div>
                  <div class="env-fields">
                    <div class="form-field">
                      <label>Endpoint URL</label>
                      <input 
                        type="url" 
                        [(ngModel)]="integrationFormData.production.endpoint"
                        [ngModelOptions]="{standalone: true}"
                        placeholder="https://api.vendor.com/v1">
                    </div>
                    <div class="form-field">
                      <label>Authentication Method</label>
                      <select 
                        [(ngModel)]="integrationFormData.production.authMethod"
                        [ngModelOptions]="{standalone: true}">
                        <option value="">Select method...</option>
                        <option value="API Key">API Key</option>
                        <option value="OAuth2">OAuth2</option>
                        <option value="Basic Auth">Basic Auth</option>
                        <option value="Bearer Token">Bearer Token</option>
                      </select>
                    </div>
                    <div class="form-field">
                      <label>Credentials</label>
                      <input 
                        type="password" 
                        [(ngModel)]="integrationFormData.production.credentials"
                        [ngModelOptions]="{standalone: true}"
                        placeholder="Enter API key or secret">
                    </div>
                  </div>
                </div>
                
                <!-- Sandbox Environment -->
                <div class="environment-config">
                  <div class="env-header">
                    <h4>Sandbox Environment</h4>
                    <label class="env-toggle">
                      <input 
                        type="checkbox" 
                        [checked]="integrationFormData.sandbox.status === 'active'"
                        (change)="integrationFormData.sandbox.status = $any($event.target).checked ? 'active' : 'inactive'">
                      <span>Active</span>
                    </label>
                  </div>
                  <div class="env-fields">
                    <div class="form-field">
                      <label>Endpoint URL</label>
                      <input 
                        type="url" 
                        [(ngModel)]="integrationFormData.sandbox.endpoint"
                        [ngModelOptions]="{standalone: true}"
                        placeholder="https://sandbox.vendor.com/v1">
                    </div>
                    <div class="form-field">
                      <label>Authentication Method</label>
                      <select 
                        [(ngModel)]="integrationFormData.sandbox.authMethod"
                        [ngModelOptions]="{standalone: true}">
                        <option value="">Select method...</option>
                        <option value="API Key">API Key</option>
                        <option value="OAuth2">OAuth2</option>
                        <option value="Basic Auth">Basic Auth</option>
                        <option value="Bearer Token">Bearer Token</option>
                      </select>
                    </div>
                    <div class="form-field">
                      <label>Credentials</label>
                      <input 
                        type="password" 
                        [(ngModel)]="integrationFormData.sandbox.credentials"
                        [ngModelOptions]="{standalone: true}"
                        placeholder="Enter API key or secret">
                    </div>
                  </div>
                </div>
                
                <p class="form-hint">At least one environment must be configured to remove the integration alert.</p>
              </div>
            </div>
          </section>

          <!-- ======== FSR APIs SECTION ======== -->
          <section class="detail-section" id="section-fsr-apis" *ngIf="company()?.vendor">
            <div class="section-header">
              <h2>FSR APIs backed by this vendor</h2>
            </div>
            
            <div class="section-content">
              <p class="section-description">
                Internal FSR APIs that depend on this vendor integration. These APIs are consumed by downstream applications.
              </p>
              
              <!-- FSR APIs Table -->
              <div class="fsr-apis-table">
                <div class="fsr-table-header">
                  <span class="fsr-col-name">API Name</span>
                  <span class="fsr-col-env">Environment</span>
                  <span class="fsr-col-status">Status</span>
                  <span class="fsr-col-consumers">Consumers</span>
                  <span class="fsr-col-actions"></span>
                </div>
                
                <div *ngFor="let api of fsrApis()" class="fsr-table-row">
                  <span class="fsr-col-name">
                    <a [routerLink]="['/apis']" class="api-link">{{ api.name }}</a>
                  </span>
                  <span class="fsr-col-env">
                    <span class="env-badge sandbox" *ngIf="api.sandboxAvailable">Sandbox</span>
                    <span class="env-badge production" *ngIf="api.productionAvailable">Production</span>
                  </span>
                  <span class="fsr-col-status">
                    <ibm-tag [type]="api.status === 'Active' ? 'green' : 'gray'" size="sm">
                      {{ api.status }}
                    </ibm-tag>
                  </span>
                  <span class="fsr-col-consumers">
                    <span class="consumer-count" *ngIf="api.consumerCount > 0">
                      Used by {{ api.consumerCount }} consumer{{ api.consumerCount > 1 ? 's' : '' }}
                    </span>
                    <span class="consumer-count empty" *ngIf="api.consumerCount === 0">
                      No consumers
                    </span>
                  </span>
                  <span class="fsr-col-actions">
                    <a [routerLink]="['/apis']" class="view-link">
                      View in API Catalog
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M4 2h6v6M10 2L4 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </a>
                  </span>
                </div>
                
                <!-- Empty state -->
                <div class="fsr-apis-empty" *ngIf="fsrApis().length === 0">
                  <p>No FSR APIs have been configured for this vendor yet.</p>
                </div>
              </div>
            </div>
          </section>

          <!-- ======== DOWNSTREAM CONSUMERS SECTION ======== -->
          <section class="detail-section" id="section-service-accounts" *ngIf="company()?.vendor">
            <div class="section-header">
              <h2>Downstream Consumers</h2>
              <button 
                class="btn-secondary-sm"
                *ngIf="canManageServiceAccounts() && !isReadOnly()"
                [disabled]="isVendorActionsBlocked()"
                [title]="isVendorActionsBlocked() ? blockedStatusMessage() : 'Add a downstream consumer'"
                (click)="openCreateServiceAccountModal()">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M6 2v8M2 6h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
                Add Consumer
              </button>
            </div>
            
            <div class="section-content">
              <!-- Status gating inline message -->
              <div class="inline-status-message" *ngIf="isVendorActionsBlocked()">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/>
                  <path d="M8 5v4M8 11h.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
                <span>{{ blockedStatusMessage() }}</span>
              </div>
              
              <!-- Downstream Consumers Table -->
              <div class="service-accounts-table" *ngIf="serviceAccounts().length > 0">
                <div class="sa-table-header">
                  <span class="sa-col-name">Name</span>
                  <span class="sa-col-apis">Assigned APIs</span>
                  <span class="sa-col-status">Status</span>
                  <span class="sa-col-lastused">Last Used</span>
                  <span class="sa-col-actions"></span>
                </div>
                
                <div 
                  *ngFor="let account of serviceAccounts()" 
                  class="sa-table-row"
                  [class.expanded]="expandedServiceAccount() === account.id"
                  [class.stale]="isServiceAccountStale(account)"
                  [class.expiring]="account.status === 'Expiring Soon'">
                  
                  <div class="sa-row-main" (click)="toggleServiceAccountExpand(account.id)">
                    <span class="sa-col-name">
                      <svg class="expand-icon" width="12" height="12" viewBox="0 0 12 12">
                        <path d="M4 2L8 6L4 10" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/>
                      </svg>
                      {{ account.name }}
                      <span class="stale-badge" *ngIf="isServiceAccountStale(account)" title="This consumer has not been used recently. Rotation or revocation is recommended.">
                        <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                          <path d="M8 1v6l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                          <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/>
                        </svg>
                        Stale
                      </span>
                    </span>
                    <span class="sa-col-apis">
                      <span class="api-tag" *ngFor="let api of account.apis.slice(0, 2)">{{ api }}</span>
                      <span class="api-more" *ngIf="account.apis.length > 2">+{{ account.apis.length - 2 }}</span>
                    </span>
                    <span class="sa-col-status">
                      <ibm-tag 
                        [type]="account.status === 'Active' ? 'green' : account.status === 'Expiring Soon' ? 'purple' : 'red'" 
                        size="sm">
                        {{ account.status }}
                      </ibm-tag>
                    </span>
                    <span class="sa-col-lastused">
                      <span *ngIf="account.lastUsedAt">{{ formatRelativeTime(account.lastUsedAt) }}</span>
                      <span *ngIf="!account.lastUsedAt" class="never-used">Never used</span>
                    </span>
                    <span class="sa-col-actions" (click)="$event.stopPropagation()">
                      <button 
                        class="action-btn" 
                        title="Rotate credentials"
                        [disabled]="isVendorActionsBlocked() || isReadOnly() || account.status === 'Revoked'"
                        (click)="rotateServiceAccountCredentials(account)">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                          <path d="M2 8a6 6 0 0110.89-3.477M14 8a6 6 0 01-10.89 3.477" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                          <path d="M14 3v3h-3M2 13v-3h3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                      </button>
                      <button 
                        class="action-btn danger" 
                        title="Revoke credentials"
                        [disabled]="isVendorActionsBlocked() || isReadOnly() || account.status === 'Revoked'"
                        (click)="openRevokeServiceAccountModal(account)">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                          <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/>
                          <path d="M5 8h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                        </svg>
                      </button>
                    </span>
                  </div>
                  
                  <div class="sa-row-expanded" *ngIf="expandedServiceAccount() === account.id">
                    <div class="expanded-content">
                      <div class="expanded-row">
                        <div class="expanded-field">
                          <label>Description</label>
                          <p>{{ account.description || 'No description' }}</p>
                        </div>
                        <div class="expanded-field">
                          <label>Created</label>
                          <p>{{ formatDate(account.createdAt) }} {{ account.createdBy ? 'by ' + account.createdBy : '' }}</p>
                        </div>
                      </div>
                      <div class="expanded-row">
                        <div class="expanded-field">
                          <label>All APIs</label>
                          <div class="apis-list">
                            <span class="api-tag" *ngFor="let api of account.apis">{{ api }}</span>
                          </div>
                        </div>
                        <div class="expanded-field" *ngIf="account.expiresAt">
                          <label>Expires</label>
                          <p class="expiry-warning">{{ formatDate(account.expiresAt) }}</p>
                        </div>
                      </div>
                      
                      <!-- Stale warning -->
                      <div class="stale-warning" *ngIf="isServiceAccountStale(account)">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                          <path d="M8 1v6l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                          <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/>
                        </svg>
                        <span>This consumer has not been used {{ getDaysSinceLastUsed(account) > 0 ? 'in ' + getDaysSinceLastUsed(account) + ' days' : 'yet' }}. Rotation or revocation is recommended.</span>
                      </div>
                      
                      <div class="expanded-actions">
                        <button 
                          class="btn-link" 
                          (click)="viewServiceAccountAudit(account)"
                          title="View audit activity">
                          View audit activity
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Empty state -->
              <div class="empty-service-accounts" *ngIf="serviceAccounts().length === 0">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                  <rect x="6" y="14" width="28" height="18" rx="2" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
                  <path d="M12 14V10a8 8 0 0116 0v4" stroke="currentColor" stroke-width="1.5" opacity="0.5"/>
                </svg>
                <p>No downstream consumers configured</p>
                <button 
                  *ngIf="canManageServiceAccounts() && !isReadOnly() && !isVendorActionsBlocked()"
                  class="btn-secondary-sm" 
                  (click)="openCreateServiceAccountModal()">
                  Add Consumer
                </button>
              </div>
            </div>
          </section>

          <!-- ======== RISK & COMPLIANCE SECTION ======== -->
          <section class="detail-section" id="section-compliance">
            <div class="section-header">
              <h2>Risk & Compliance</h2>
              <span class="risk-context">{{ company()?.riskLevel || 'Medium' }} risk · AI-estimated based on integration profile</span>
            </div>
            
            <div class="section-content">
              <!-- Single Activation Status Panel -->
              <div class="activation-status-panel" *ngIf="isComplianceBlocking()" [class.blocked]="isComplianceBlocking()">
                <div class="status-panel-icon">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="1.5"/>
                    <path d="M10 6v5M10 13v1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  </svg>
                </div>
                <div class="status-panel-content">
                  <div class="status-panel-title">Activation blocked</div>
                  <p class="status-panel-body">
                    {{ getRequiredComplianceCount() }} of {{ getTotalRequiredCount() }} required compliance items are complete. 
                    Complete the items below to activate this vendor.
                  </p>
                </div>
              </div>
              
              <!-- Ready for activation (success state) -->
              <div class="activation-status-panel ready" *ngIf="!isComplianceBlocking()">
                <div class="status-panel-icon">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="1.5"/>
                    <path d="M6 10l3 3 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
                <div class="status-panel-content">
                  <div class="status-panel-title">Ready for activation</div>
                  <p class="status-panel-body">All required compliance items are complete.</p>
                </div>
              </div>
              
              <!-- Compliance Requirements List -->
              <div class="compliance-list-header">
                <span class="list-title">Required items</span>
              </div>
              
              <div class="compliance-requirements-list">
                <div 
                  *ngFor="let req of getSortedComplianceRequirements()" 
                  class="compliance-req-item"
                  [class.expanded]="isComplianceReqExpanded(req.id)"
                  [class.is-complete]="req.status === 'complete'">
                  
                  <!-- Collapsed Header -->
                  <div class="compliance-req-header" (click)="toggleComplianceReq(req.id)">
                    <div class="req-header-left">
                      <span class="req-name">{{ req.name }}</span>
                      <span class="req-required-tag" *ngIf="req.required">Required</span>
                    </div>
                    <div class="req-header-right">
                      <span class="req-status-pill" [class]="getComplianceStatusClass(req.status)">
                        {{ getComplianceStatusLabel(req.status) }}
                      </span>
                      <span class="req-owner" *ngIf="req.owner">{{ req.owner }}</span>
                      <svg class="expand-chevron" width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M4 6L8 10L12 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </div>
                  </div>
                  
                  <!-- Expanded Content -->
                  <div class="compliance-req-content" *ngIf="isComplianceReqExpanded(req.id)">
                    <div class="req-form-grid">
                      <!-- Status -->
                      <div class="req-form-field">
                        <label>Status</label>
                        <select 
                          [value]="req.status" 
                          (change)="updateComplianceReqField(req.id, 'status', $any($event.target).value)"
                          [disabled]="isReadOnly()">
                          <option value="not_started">Not started</option>
                          <option value="in_progress">In progress</option>
                          <option value="complete">Complete</option>
                        </select>
                      </div>
                      
                      <!-- Owner -->
                      <div class="req-form-field">
                        <label>Owner</label>
                        <input 
                          type="text" 
                          [value]="req.owner"
                          (input)="updateComplianceReqField(req.id, 'owner', $any($event.target).value)"
                          [disabled]="isReadOnly()"
                          placeholder="Enter owner name or email">
                      </div>
                      
                      <!-- Date Completed -->
                      <div class="req-form-field" *ngIf="req.status === 'complete'">
                        <label>Date Completed</label>
                        <input 
                          type="date" 
                          [value]="req.dateCompleted"
                          (input)="updateComplianceReqField(req.id, 'dateCompleted', $any($event.target).value)"
                          [disabled]="isReadOnly()">
                      </div>
                    </div>
                    
                    <!-- Evidence -->
                    <div class="req-form-field evidence-section">
                      <label>Evidence</label>
                      
                      <!-- Existing Files -->
                      <div class="evidence-files" *ngIf="req.evidence.length > 0">
                        <div class="evidence-file" *ngFor="let file of req.evidence; let i = index">
                          <div class="file-info">
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                              <path d="M9 1H4a1 1 0 00-1 1v12a1 1 0 001 1h8a1 1 0 001-1V5L9 1z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                              <path d="M9 1v4h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            <span class="file-name">{{ file.name }}</span>
                            <span class="file-size">{{ formatFileSize(file.size) }}</span>
                          </div>
                          <div class="file-actions">
                            <a *ngIf="file.url" [href]="file.url" target="_blank" class="file-action-btn" title="Download">
                              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                                <path d="M8 2v9M4 8l4 4 4-4M2 14h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                              </svg>
                            </a>
                            <button 
                              type="button" 
                              class="file-action-btn remove" 
                              (click)="removeComplianceReqFile(req.id, i); $event.stopPropagation()" 
                              [disabled]="isReadOnly()"
                              title="Remove file">
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      <!-- Upload Area -->
                      <div class="evidence-upload-area" *ngIf="!isReadOnly()">
                        <input 
                          type="file" 
                          [id]="'compliance-evidence-' + req.id"
                          multiple
                          (change)="onComplianceReqFileUpload(req.id, $event)"
                          class="file-input">
                        <label [for]="'compliance-evidence-' + req.id" class="upload-label">
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M8 12V4M4 8l4-4 4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                          </svg>
                          Upload files
                        </label>
                        <span class="upload-hint">or drag and drop</span>
                      </div>
                      
                      <div class="no-evidence" *ngIf="req.evidence.length === 0 && isReadOnly()">
                        <span>No evidence uploaded</span>
                      </div>
                    </div>
                    
                    <!-- Notes -->
                    <div class="req-form-field">
                      <label>Notes</label>
                      <textarea 
                        [value]="req.notes"
                        (input)="updateComplianceReqField(req.id, 'notes', $any($event.target).value)"
                        [disabled]="isReadOnly()"
                        rows="2" 
                        placeholder="Add notes about this compliance requirement..."></textarea>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

        </main>

        <!-- ============================================ -->
        <!-- ACTIVITY RAIL (RIGHT COLUMN)                -->
        <!-- ============================================ -->
        <aside class="activity-rail">
          <!-- Activation CTA (only for non-active vendors) -->
          <div class="activation-cta" *ngIf="company()?.status !== 'Active' && company()?.status !== 'Archived'">
            <button 
              class="btn-activate"
              [disabled]="!canActivateVendor() || activatingVendor() || isReadOnly()"
              [class.loading]="activatingVendor()"
              (click)="activateVendor()">
              <svg *ngIf="!activatingVendor()" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M13.5 8.5l-5 5-5-5M8.5 2v11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" transform="rotate(180 8 8)"/>
              </svg>
              <svg *ngIf="activatingVendor()" class="spinner" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5" opacity="0.25"/>
                <path d="M8 2a6 6 0 014.5 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
              {{ activatingVendor() ? 'Activating...' : 'Activate vendor' }}
            </button>
            <p class="activation-helper" *ngIf="!canActivateVendor()">
              Complete all required compliance items to activate this vendor.
            </p>
            <p class="activation-ready" *ngIf="canActivateVendor() && !isReadOnly()">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.5"/>
                <path d="M4 7l2 2 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              Ready to activate
            </p>
          </div>
          
          <div class="rail-header">
            <h3>Activity</h3>
          </div>
          
          <div class="activity-feed" *ngIf="activityLog().length > 0 || dismissedIntelActivity()">
            <!-- Dismissed Intelligence Alert Activity -->
            <div class="activity-entry intel-activity" *ngIf="dismissedIntelActivity()" (click)="openDismissedIntelModal()">
              <div class="entry-marker intel"></div>
              <div class="entry-content">
                <div class="entry-header">
                  <span class="entry-actor">You</span>
                  <span class="entry-time">{{ formatRelativeTime(dismissedIntelActivity()!.timestamp) }}</span>
                </div>
                <p class="entry-action clickable">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/>
                    <path d="M8 5v3l2 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  </svg>
                  Dismissed intelligence alert
                </p>
                <p class="entry-details view-link">Click to view details</p>
              </div>
            </div>
            
            <!-- Regular Activity Entries -->
            <div *ngFor="let entry of activityLog()" class="activity-entry">
              <div class="entry-marker"></div>
              <div class="entry-content">
                <div class="entry-header">
                  <span class="entry-actor">{{ entry.actor?.name || 'System' }}</span>
                  <span class="entry-time">{{ formatRelativeTime(entry.timestamp) }}</span>
                </div>
                <p class="entry-action">{{ entry.action }}</p>
                <p class="entry-details" *ngIf="entry.details">{{ entry.details }}</p>
              </div>
            </div>
          </div>
          
          <div class="empty-activity" *ngIf="activityLog().length === 0">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="18" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
              <path d="M20 12v8l5 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/>
            </svg>
            <p>No activity yet</p>
          </div>
        </aside>
      </div>

      <!-- ============================================ -->
      <!-- STICKY EDIT FOOTER                          -->
      <!-- ============================================ -->
      <div class="edit-footer" *ngIf="editingSection() !== null">
        <div class="footer-content">
          <span class="editing-label">Editing {{ editingSection() | titlecase }}</span>
          <div class="footer-actions">
            <button class="btn-secondary" (click)="cancelEditing()">Cancel</button>
            <button class="btn-primary" (click)="saveChanges()" [disabled]="!canSave()">Save changes</button>
          </div>
        </div>
      </div>

      <!-- ============================================ -->
      <!-- MODALS                                       -->
      <!-- ============================================ -->
      
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

      <!-- Suspend Modal -->
      <ibm-modal
        [open]="suspendModalOpen()"
        [size]="'md'"
        (overlaySelected)="closeSuspendModal()">
        <ibm-modal-header (closeSelect)="closeSuspendModal()">
          <p class="bx--modal-header__heading">Suspend Vendor</p>
        </ibm-modal-header>
        <div ibmModalContent>
          <p>Suspending this vendor will disable all user and credential actions. API access will be blocked.</p>
          <ibm-label>
            Suspension Reason (optional)
            <textarea
              ibmText
              [(ngModel)]="suspendReason"
              rows="3"
              placeholder="Reason for suspension...">
            </textarea>
          </ibm-label>
        </div>
        <ibm-modal-footer>
          <button ibmButton="secondary" (click)="closeSuspendModal()">Cancel</button>
          <button ibmButton="danger" (click)="confirmSuspend()">Suspend Vendor</button>
        </ibm-modal-footer>
      </ibm-modal>

      <!-- Add Downstream Consumer Modal -->
      <ibm-modal
        [open]="createServiceAccountModalOpen()"
        [size]="'md'"
        (overlaySelected)="closeCreateServiceAccountModal()">
        <ibm-modal-header (closeSelect)="closeCreateServiceAccountModal()">
          <p class="bx--modal-header__heading">Add Downstream Consumer</p>
        </ibm-modal-header>
        <div ibmModalContent>
          <ibm-label>
            Consumer Name <span class="required">*</span>
            <input
              ibmText
              [(ngModel)]="newServiceAccountName"
              placeholder="e.g., RentalAid, PropertyLLC">
          </ibm-label>
          <ibm-label>
            Assigned APIs
            <div class="api-checkboxes">
              <label class="api-checkbox">
                <input type="checkbox" (change)="toggleNewServiceAccountApi('Orders API', $event)">
                Orders API
              </label>
              <label class="api-checkbox">
                <input type="checkbox" (change)="toggleNewServiceAccountApi('Inventory API', $event)">
                Inventory API
              </label>
              <label class="api-checkbox">
                <input type="checkbox" (change)="toggleNewServiceAccountApi('Sandbox API', $event)">
                Sandbox API
              </label>
            </div>
          </ibm-label>
        </div>
        <ibm-modal-footer>
          <button ibmButton="secondary" (click)="closeCreateServiceAccountModal()">Cancel</button>
          <button 
            ibmButton="primary" 
            [disabled]="!newServiceAccountName.trim()"
            (click)="confirmCreateServiceAccount()">
            Create
          </button>
        </ibm-modal-footer>
      </ibm-modal>

      <!-- Revoke Consumer Access Modal -->
      <app-confirm-dialog
        [open]="revokeServiceAccountModalOpen()"
        title="Revoke Consumer Access"
        [message]="'Are you sure you want to revoke access for \\'' + (serviceAccountToRevoke()?.name || '') + '\\'? This action cannot be undone and will immediately block API access.'"
        confirmLabel="Revoke"
        [danger]="true"
        (confirmed)="confirmRevokeServiceAccount()"
        (cancelled)="closeRevokeServiceAccountModal()">
      </app-confirm-dialog>

      <!-- Dismissed Intelligence Alert Modal -->
      <ibm-modal
        [open]="dismissedIntelModalOpen()"
        [size]="'lg'"
        (overlaySelected)="closeDismissedIntelModal()">
        <ibm-modal-header (closeSelect)="closeDismissedIntelModal()">
          <p class="bx--modal-header__heading">Dismissed Intelligence Alert</p>
          <p class="bx--modal-header__label">APIGateway Pro · {{ dismissedIntelActivity()?.timestamp ? formatDate(dismissedIntelActivity()!.timestamp) : '' }}</p>
        </ibm-modal-header>
        <div ibmModalContent class="intel-modal-content">
          <!-- Change Synopsis -->
          <div class="modal-intel-section">
            <h4>Change Synopsis</h4>
            <div class="modal-synopsis-box">
              <p>
                We detected a change in APIGateway Pro's authentication schema related to token validation. 
                The vendor's documentation indicates updates to the OAuth 2.0 token refresh flow that may 
                affect existing integrations.
              </p>
              <p class="modal-ai-note">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/>
                  <path d="M8 5v3l2 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
                AI-generated summary based on vendor signals and documentation changes
              </p>
            </div>
          </div>

          <!-- Impact Analysis -->
          <div class="modal-intel-section">
            <h4>Impact Analysis</h4>
            <div class="modal-impact-row">
              <div class="modal-impact-col">
                <label>Impacted FSR APIs</label>
                <ul>
                  <li *ngFor="let api of impactedApis()">
                    <span>{{ api.name }}</span>
                    <ibm-tag [type]="api.severity === 'high' ? 'red' : 'purple'" size="sm">
                      {{ api.severity === 'high' ? 'High' : 'Medium' }}
                    </ibm-tag>
                  </li>
                </ul>
              </div>
              <div class="modal-impact-col">
                <label>Impacted Downstream Consumers</label>
                <ul>
                  <li *ngFor="let consumer of impactedConsumers()">
                    <span>{{ consumer }}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <!-- Suggested Paths -->
          <div class="modal-intel-section">
            <h4>Suggested Paths</h4>
            <p class="modal-advisory">Advisory only. No changes will be made without explicit action.</p>
            <div class="modal-paths">
              <div class="modal-path" *ngFor="let path of suggestedPaths()">
                <div class="modal-path-header">
                  <span>{{ path.label }}</span>
                  <ibm-tag [type]="getRiskTagType(path.risk)" size="sm">{{ path.risk }} risk</ibm-tag>
                </div>
                <p>{{ path.description }}</p>
                <p class="modal-path-scope">Scope: {{ path.scope }}</p>
              </div>
            </div>
          </div>
        </div>
        <ibm-modal-footer>
          <button ibmButton="secondary" (click)="closeDismissedIntelModal()">Close</button>
          <button ibmButton="primary" (click)="restoreChangeIntel(); closeDismissedIntelModal()">
            Restore Alert
          </button>
        </ibm-modal-footer>
      </ibm-modal>
    </div>
  `,
  styles: [`
    /* ============================================ */
    /* PAGE CONTAINER                              */
    /* ============================================ */
    .page-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem;
      padding-bottom: 4rem;
    }

    .page-container.has-unsaved {
      padding-bottom: 6rem;
    }

    /* ============================================ */
    /* UNSAVED CHANGES DIALOG                      */
    /* ============================================ */
    .unsaved-overlay {
      position: fixed;
      inset: 0;
      z-index: 10000;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .unsaved-dialog {
      background: var(--linear-surface);
      border: 1px solid var(--linear-border);
      border-radius: 8px;
      padding: 1.5rem;
      max-width: 400px;
      width: 100%;
    }

    .unsaved-dialog h3 {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--linear-text-primary);
      margin: 0 0 0.75rem 0;
    }

    .unsaved-dialog p {
      font-size: 0.875rem;
      color: var(--linear-text-secondary);
      margin: 0 0 1.5rem 0;
    }

    .dialog-actions {
      display: flex;
      gap: 0.75rem;
      justify-content: flex-end;
    }

    /* ============================================ */
    /* VENDOR HEADER (Minimal)                     */
    /* ============================================ */
    .vendor-header {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding-bottom: 1.5rem;
      margin-bottom: 2rem;
    }

    .header-row-1 {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 2rem;
    }

    .header-identity {
      flex: 1;
    }

    .header-title-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.375rem;
    }

    .header-title-row h1 {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--linear-text-primary);
      margin: 0;
    }

    .header-meta {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8125rem;
      color: var(--linear-text-tertiary);
    }

    .meta-item {
      display: flex;
      align-items: center;
    }

    .meta-separator {
      color: var(--linear-text-tertiary);
      opacity: 0.5;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-shrink: 0;
    }

    /* Row 2: Signal Chips */
    .header-row-2 {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .signal-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.375rem 0.75rem;
      font-size: 0.8125rem;
      font-weight: 500;
      border-radius: 4px;
      text-decoration: none;
      transition: all 0.15s;
    }

    .signal-chip.warning {
      background: rgba(245, 158, 11, 0.12);
      color: #f59e0b;
      border: 1px solid rgba(245, 158, 11, 0.25);
    }

    .signal-chip.warning:hover {
      background: rgba(245, 158, 11, 0.2);
      border-color: rgba(245, 158, 11, 0.4);
    }

    .signal-chip.blocked {
      background: rgba(239, 68, 68, 0.12);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.25);
    }

    .signal-chip svg {
      flex-shrink: 0;
    }

    /* Overflow Menu */
    .overflow-menu {
      position: relative;
    }

    .overflow-trigger {
      padding: 0.5rem;
      background: transparent;
      border: 1px solid var(--linear-border);
      border-radius: 6px;
      color: var(--linear-text-secondary);
      cursor: pointer;
      transition: all 0.15s;
    }

    .overflow-trigger:hover {
      background: var(--linear-surface);
      color: var(--linear-text-primary);
    }

    .overflow-dropdown {
      position: absolute;
      top: 100%;
      right: 0;
      margin-top: 0.25rem;
      min-width: 180px;
      background: var(--linear-surface);
      border: 1px solid var(--linear-border);
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 100;
      overflow: hidden;
    }

    .overflow-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      width: 100%;
      padding: 0.75rem 1rem;
      background: transparent;
      border: none;
      color: var(--linear-text-primary);
      font-size: 0.875rem;
      text-align: left;
      cursor: pointer;
      transition: background 0.15s;
    }

    .overflow-item:hover {
      background: rgba(255, 255, 255, 0.05);
    }

    .overflow-item svg {
      flex-shrink: 0;
      opacity: 0.7;
    }

    /* ============================================ */
    /* TWO COLUMN LAYOUT                           */
    /* ============================================ */
    .two-column-layout {
      display: grid;
      grid-template-columns: 1fr 320px;
      gap: 2rem;
    }

    @media (max-width: 1024px) {
      .two-column-layout {
        grid-template-columns: 1fr;
      }

      .activity-rail {
        order: 1;
      }

      .main-column {
        order: 2;
      }
    }

    /* ============================================ */
    /* MAIN COLUMN                                 */
    /* ============================================ */
    .main-column {
      min-width: 0;
    }

    /* ============================================ */
    /* DETAIL SECTIONS                             */
    /* ============================================ */
    .detail-section {
      margin-bottom: 4.5rem;
    }

    .detail-section:last-child {
      margin-bottom: 0;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 0.25rem;
      margin-bottom: 1.5rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .section-header h2 {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--linear-text-primary);
      margin: 0;
    }

    .edit-link {
      padding: 0.375rem 0.75rem;
      background: transparent;
      border: none;
      color: var(--linear-accent);
      font-size: 0.8125rem;
      cursor: pointer;
      transition: opacity 0.15s;
    }

    .edit-link:hover {
      opacity: 0.8;
    }

    .section-content {
      animation: fadeIn 0.2s ease;
    }

    .section-content.edit-mode {
      background: var(--linear-surface);
      border: 1px solid var(--linear-border);
      border-radius: 8px;
      padding: 1.5rem;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    /* Info Grid */
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1.25rem;
    }

    @media (max-width: 600px) {
      .info-grid {
        grid-template-columns: 1fr;
      }
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .info-item.full-width {
      grid-column: 1 / -1;
      margin-top: 1rem;
    }

    .info-item label {
      font-size: 0.6875rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--linear-text-tertiary, rgba(255,255,255,0.5));
      font-weight: 500;
    }

    .info-item p {
      font-size: 0.875rem;
      color: var(--linear-text-primary);
      margin: 0;
    }

    .notes-text {
      color: var(--linear-text-secondary) !important;
      font-style: italic;
    }

    .link {
      color: var(--linear-accent);
      text-decoration: none;
    }

    .link:hover {
      text-decoration: underline;
    }

    /* Form Grid */
    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
    }

    @media (max-width: 600px) {
      .form-grid {
        grid-template-columns: 1fr;
      }
    }

    .form-field {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .form-field.full-width {
      grid-column: 1 / -1;
      margin-top: 0.5rem;
    }

    .form-field label {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--linear-text-primary);
    }

    .form-field .required {
      color: #ef4444;
    }

    .form-field input,
    .form-field select,
    .form-field textarea {
      padding: 0.5rem 0.75rem;
      font-size: 0.875rem;
      color: var(--linear-text-primary);
      background: var(--linear-bg);
      border: 1px solid var(--linear-border);
      border-radius: 6px;
      outline: none;
      transition: border-color 0.15s;
    }

    .form-field input:focus,
    .form-field select:focus,
    .form-field textarea:focus {
      border-color: var(--linear-accent);
    }

    .form-field select {
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M3 4.5L6 7.5L9 4.5' stroke='%23ffffff' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 0.75rem center;
      padding-right: 2.25rem;
    }

    /* ============================================ */
    /* CONTACTS SECTION                            */
    /* ============================================ */
    .contacts-info-grid {
      grid-template-columns: repeat(3, 1fr);
    }

    @media (max-width: 900px) {
      .contacts-info-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 600px) {
      .contacts-info-grid {
        grid-template-columns: 1fr;
      }
    }

    /* Legacy contact card styles - keep for edit mode if needed */
    .contact-name {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--linear-text-primary);
    }

    .contact-email {
      font-size: 0.8125rem;
      color: var(--linear-accent);
      text-decoration: none;
    }

    .contact-email:hover {
      text-decoration: underline;
    }

    /* ============================================ */
    /* INTEGRATIONS SECTION                        */
    /* ============================================ */
    .integration-status-row {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.25rem;
    }

    .status-indicator {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.375rem 0.75rem;
      background: var(--linear-surface);
      border-radius: 4px;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--linear-text-secondary);
    }

    .status-indicator.healthy .status-dot {
      background: #10b981;
    }

    .status-indicator.degraded .status-dot {
      background: #f59e0b;
    }

    .status-indicator.error .status-dot {
      background: #ef4444;
    }

    .status-text {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--linear-text-primary);
    }

    .last-checked {
      font-size: 0.75rem;
      color: var(--linear-text-secondary);
    }

    .integrations-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .integration-card {
      padding: 1rem;
      background: var(--linear-surface);
      border: 1px solid var(--linear-border);
      border-radius: 8px;
    }

    .integration-card.pending {
      opacity: 0.7;
      border-style: dashed;
    }

    .integration-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }

    .integration-name {
      font-size: 0.9375rem;
      font-weight: 500;
      color: var(--linear-text-primary);
    }

    .integration-details {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .detail-row {
      display: flex;
      gap: 1rem;
      font-size: 0.8125rem;
    }

    .detail-label {
      color: var(--linear-text-secondary);
      min-width: 100px;
    }

    .detail-value {
      color: var(--linear-text-primary);
    }

    .detail-value.mono {
      font-family: 'SF Mono', 'Monaco', monospace;
      font-size: 0.75rem;
    }

    /* Integration Not Configured State */
    .integration-not-configured {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2.5rem 1.5rem;
      text-align: center;
      background: rgba(255, 255, 255, 0.02);
      border: 1px dashed var(--linear-border);
      border-radius: 8px;
    }

    .not-configured-icon {
      color: var(--linear-text-tertiary);
      margin-bottom: 1rem;
    }

    .not-configured-text {
      font-size: 0.9375rem;
      font-weight: 500;
      color: var(--linear-text-primary);
      margin: 0 0 0.25rem 0;
    }

    .not-configured-hint {
      font-size: 0.8125rem;
      color: var(--linear-text-secondary);
      margin: 0 0 1rem 0;
    }

    /* Integration Edit Form */
    .integration-edit-form {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .environment-config {
      padding: 1.25rem;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--linear-border);
      border-radius: 8px;
    }

    .env-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid var(--linear-border);
    }

    .env-header h4 {
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--linear-text-primary);
      margin: 0;
    }

    .env-toggle {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8125rem;
      color: var(--linear-text-secondary);
      cursor: pointer;
    }

    .env-toggle input[type="checkbox"] {
      accent-color: var(--linear-accent);
    }

    .env-fields {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }

    .form-hint {
      font-size: 0.75rem;
      color: var(--linear-text-tertiary);
      text-align: center;
      margin: 0;
      padding: 0.75rem;
      background: rgba(255, 255, 255, 0.02);
      border-radius: 6px;
    }

    /* ============================================ */
    /* COMPLIANCE SECTION (Simplified)             */
    /* ============================================ */
    
    /* Risk context in header */
    .risk-context {
      font-size: 0.75rem;
      color: var(--linear-text-tertiary);
      font-weight: 400;
    }

    /* Single Activation Status Panel */
    .activation-status-panel {
      display: flex;
      align-items: flex-start;
      gap: 0.875rem;
      padding: 1rem 1.25rem;
      margin-bottom: 1.5rem;
      background: rgba(245, 158, 11, 0.06);
      border: 1px solid rgba(245, 158, 11, 0.15);
      border-radius: 8px;
    }

    .activation-status-panel.ready {
      background: rgba(16, 185, 129, 0.06);
      border-color: rgba(16, 185, 129, 0.15);
    }

    .activation-status-panel.ready .status-panel-icon {
      color: #10b981;
    }

    .activation-status-panel.ready .status-panel-title {
      color: #10b981;
    }

    .status-panel-icon {
      flex-shrink: 0;
      color: #f59e0b;
      margin-top: 0.125rem;
    }

    .status-panel-content {
      flex: 1;
    }

    .status-panel-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: #f59e0b;
      margin-bottom: 0.25rem;
    }

    .status-panel-body {
      font-size: 0.8125rem;
      color: var(--linear-text-secondary);
      margin: 0;
      line-height: 1.5;
    }

    /* Compliance List Header */
    .compliance-list-header {
      margin-bottom: 0.75rem;
    }

    .list-title {
      font-size: 0.6875rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--linear-text-tertiary);
      font-weight: 500;
    }

    /* Compliance Requirements List */
    .compliance-requirements-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .compliance-req-item {
      border: 1px solid var(--linear-border);
      border-radius: 6px;
      background: var(--linear-surface);
      overflow: hidden;
      transition: border-color 0.15s, box-shadow 0.15s;
    }

    .compliance-req-item.expanded {
      border-color: rgba(255, 255, 255, 0.12);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
    }

    /* Only green border for complete items */
    .compliance-req-item.is-complete {
      border-left: 3px solid #10b981;
    }

    .compliance-req-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      cursor: pointer;
      transition: background 0.15s;
    }

    .compliance-req-header:hover {
      background: rgba(255, 255, 255, 0.02);
    }

    .req-header-left {
      display: flex;
      align-items: center;
      gap: 0.625rem;
    }

    .req-name {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--linear-text-primary);
    }

    .req-required-tag {
      padding: 0.125rem 0.375rem;
      border-radius: 3px;
      font-size: 0.625rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      background: rgba(255, 255, 255, 0.06);
      color: var(--linear-text-tertiary);
    }

    .req-header-right {
      display: flex;
      align-items: center;
      gap: 0.875rem;
    }

    /* Status pills - calm colors */
    .req-status-pill {
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.6875rem;
      font-weight: 500;
    }

    .req-status-pill.not-started {
      background: rgba(255, 255, 255, 0.06);
      color: var(--linear-text-tertiary);
    }

    .req-status-pill.in-progress {
      background: rgba(255, 255, 255, 0.08);
      color: var(--linear-text-secondary);
    }

    .req-status-pill.complete {
      background: rgba(16, 185, 129, 0.12);
      color: #10b981;
    }

    .req-owner {
      font-size: 0.8125rem;
      color: var(--linear-text-secondary);
    }

    .expand-chevron {
      color: var(--linear-text-tertiary);
      transition: transform 0.2s;
    }

    .compliance-req-item.expanded .expand-chevron {
      transform: rotate(180deg);
    }

    .compliance-req-content {
      padding: 0 1rem 1rem 1rem;
      border-top: 1px solid var(--linear-border);
      animation: slideDown 0.2s ease-out;
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .req-form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1rem;
      margin-top: 1rem;
    }

    .req-form-field {
      margin-bottom: 1rem;
    }

    .req-form-field:last-child {
      margin-bottom: 0;
    }

    .req-form-field label {
      display: block;
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--linear-text-tertiary);
      margin-bottom: 0.375rem;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .req-form-field select,
    .req-form-field input,
    .req-form-field textarea {
      width: 100%;
      padding: 0.5rem 0.75rem;
      font-size: 0.875rem;
      color: var(--linear-text-primary);
      background: var(--linear-bg);
      border: 1px solid var(--linear-border);
      border-radius: 6px;
      transition: border-color 0.15s;
    }

    .req-form-field select:focus,
    .req-form-field input:focus,
    .req-form-field textarea:focus {
      outline: none;
      border-color: var(--linear-accent);
    }

    .req-form-field select:disabled,
    .req-form-field input:disabled,
    .req-form-field textarea:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .req-form-field select {
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M3 4.5L6 7.5L9 4.5' stroke='%23ffffff' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 0.75rem center;
      padding-right: 2rem;
    }

    .req-form-field textarea {
      resize: vertical;
      min-height: 60px;
    }

    /* Evidence Section */
    .evidence-section {
      margin-top: 1rem;
    }

    .evidence-files {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }

    .evidence-file {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.625rem 0.875rem;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--linear-border);
      border-radius: 6px;
    }

    .file-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--linear-text-secondary);
    }

    .file-info svg {
      flex-shrink: 0;
      color: var(--linear-text-tertiary);
    }

    .file-name {
      font-size: 0.8125rem;
      color: var(--linear-text-primary);
    }

    .file-size {
      font-size: 0.75rem;
      color: var(--linear-text-tertiary);
    }

    .file-actions {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .file-action-btn {
      padding: 0.375rem;
      background: transparent;
      border: none;
      color: var(--linear-text-secondary);
      cursor: pointer;
      border-radius: 4px;
      transition: color 0.15s, background 0.15s;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .file-action-btn:hover {
      color: var(--linear-accent);
      background: rgba(8, 145, 178, 0.1);
    }

    .file-action-btn.remove:hover {
      color: #ef4444;
      background: rgba(239, 68, 68, 0.1);
    }

    .file-action-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .evidence-upload-area {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      border: 1px dashed var(--linear-border);
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.02);
    }

    .file-input {
      display: none;
    }

    .upload-label {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.375rem 0.75rem;
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--linear-accent);
      background: rgba(8, 145, 178, 0.1);
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.15s;
    }

    .upload-label:hover {
      background: rgba(8, 145, 178, 0.2);
    }

    .upload-hint {
      font-size: 0.75rem;
      color: var(--linear-text-tertiary);
    }

    .no-evidence {
      font-size: 0.8125rem;
      color: var(--linear-text-tertiary);
      font-style: italic;
    }

    @media (max-width: 900px) {
      .compliance-req-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.75rem;
      }

      .req-header-right {
        width: 100%;
        justify-content: space-between;
      }

      .req-form-grid {
        grid-template-columns: 1fr;
      }
    }

    /* ============================================ */
    /* LIFECYCLE SECTION                           */
    /* ============================================ */
    .lifecycle-info {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .warning-text {
      color: #ef4444 !important;
    }

    .lifecycle-progress {
      margin-top: 0.5rem;
    }

    .lifecycle-progress > label {
      display: block;
      font-size: 0.6875rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--linear-text-tertiary, rgba(255,255,255,0.5));
      margin-bottom: 0.75rem;
    }

    .progress-steps {
      display: flex;
      gap: 0;
    }

    .progress-step {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      flex: 1;
      position: relative;
    }

    .progress-step:not(:last-child)::after {
      content: '';
      position: absolute;
      top: 10px;
      left: calc(50% + 12px);
      right: calc(-50% + 12px);
      height: 2px;
      background: var(--linear-border);
    }

    .progress-step.complete:not(:last-child)::after {
      background: #10b981;
    }

    .step-indicator {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--linear-surface);
      border: 2px solid var(--linear-border);
      color: var(--linear-text-secondary);
      font-size: 0.6875rem;
      z-index: 1;
    }

    .progress-step.complete .step-indicator {
      background: #10b981;
      border-color: #10b981;
      color: white;
    }

    .progress-step.current .step-indicator {
      border-color: var(--linear-accent);
      background: rgba(69, 137, 255, 0.1);
    }

    .step-label {
      font-size: 0.6875rem;
      color: var(--linear-text-secondary);
      text-align: center;
    }

    .progress-step.current .step-label {
      color: var(--linear-text-primary);
      font-weight: 500;
    }

    /* ============================================ */
    /* ACTIVITY RAIL                               */
    /* ============================================ */
    .activity-rail {
      position: sticky;
      top: 2rem;
      height: fit-content;
      max-height: calc(100vh - 4rem);
      display: flex;
      flex-direction: column;
      background: var(--linear-surface);
      border: 1px solid var(--linear-border);
      border-radius: 8px;
      overflow: hidden;
    }

    @media (max-width: 1024px) {
      .activity-rail {
        position: static;
        max-height: 400px;
      }
    }

    /* Activation CTA */
    .activation-cta {
      padding: 1rem;
      border-bottom: 1px solid var(--linear-border);
    }

    .activation-cta.active {
      background: rgba(16, 185, 129, 0.06);
    }

    .btn-activate {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      font-size: 0.875rem;
      font-weight: 600;
      color: white;
      background: var(--linear-accent);
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s;
    }

    .btn-activate:hover:not(:disabled) {
      background: color-mix(in srgb, var(--linear-accent) 85%, black);
    }

    .btn-activate:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-activate.loading {
      cursor: wait;
    }

    .btn-activate .spinner {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .activation-helper {
      font-size: 0.75rem;
      color: var(--linear-text-tertiary);
      text-align: center;
      margin: 0.75rem 0 0 0;
      line-height: 1.4;
    }

    .activation-ready {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.375rem;
      font-size: 0.75rem;
      color: #10b981;
      text-align: center;
      margin: 0.75rem 0 0 0;
    }

    .active-status {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      color: #10b981;
      font-size: 0.875rem;
      font-weight: 500;
    }

    .rail-header {
      padding: 1rem;
      border-bottom: 1px solid var(--linear-border);
    }

    .rail-header h3 {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--linear-text-primary);
      margin: 0;
    }

    .activity-feed {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
    }

    .activity-entry {
      display: flex;
      gap: 0.75rem;
      padding-bottom: 1rem;
      margin-bottom: 1rem;
      border-bottom: 1px solid var(--linear-border);
    }

    .activity-entry:last-child {
      border-bottom: none;
      margin-bottom: 0;
      padding-bottom: 0;
    }

    .entry-marker {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--linear-accent);
      flex-shrink: 0;
      margin-top: 0.375rem;
    }

    .entry-content {
      flex: 1;
      min-width: 0;
    }

    .entry-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 0.5rem;
      margin-bottom: 0.25rem;
    }

    .entry-actor {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--linear-text-primary);
    }

    .entry-time {
      font-size: 0.6875rem;
      color: var(--linear-text-tertiary, rgba(255,255,255,0.5));
      flex-shrink: 0;
    }

    .entry-action {
      font-size: 0.8125rem;
      color: var(--linear-text-primary);
      margin: 0 0 0.25rem 0;
    }

    .entry-details {
      font-size: 0.75rem;
      color: var(--linear-text-secondary);
      margin: 0;
    }

    .empty-activity {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      color: var(--linear-text-secondary);
      text-align: center;
    }

    .empty-activity svg {
      margin-bottom: 0.75rem;
    }

    /* Intel Activity Entry (Dismissed Alert) */
    .activity-entry.intel-activity {
      cursor: pointer;
      padding: 0.75rem;
      margin: -0.5rem -0.5rem 1rem -0.5rem;
      border-radius: 6px;
      background: rgba(139, 92, 246, 0.06);
      border: 1px solid rgba(139, 92, 246, 0.15);
      transition: all 0.15s ease;
    }

    .activity-entry.intel-activity:hover {
      background: rgba(139, 92, 246, 0.1);
      border-color: rgba(139, 92, 246, 0.25);
    }

    .entry-marker.intel {
      background: #a78bfa;
    }

    .entry-action.clickable {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      color: #a78bfa;
    }

    .entry-action.clickable svg {
      flex-shrink: 0;
    }

    .entry-details.view-link {
      color: var(--linear-text-tertiary);
      font-style: italic;
    }

    /* Dismissed Intel Modal Styles */
    .intel-modal-content {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .modal-intel-section h4 {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--linear-text-primary);
      margin: 0 0 0.75rem 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .modal-synopsis-box {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--linear-border);
      border-radius: 6px;
      padding: 1rem;
    }

    .modal-synopsis-box p:first-child {
      font-size: 0.875rem;
      line-height: 1.6;
      color: var(--linear-text-secondary);
      margin: 0 0 0.75rem 0;
    }

    .modal-ai-note {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.75rem;
      color: var(--linear-text-tertiary);
      margin: 0;
      font-style: italic;
    }

    .modal-ai-note svg {
      opacity: 0.6;
      flex-shrink: 0;
    }

    .modal-impact-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }

    .modal-impact-col label {
      display: block;
      font-size: 0.6875rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--linear-text-tertiary);
      margin-bottom: 0.5rem;
      font-weight: 500;
    }

    .modal-impact-col ul {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .modal-impact-col li {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem 0.75rem;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--linear-border);
      border-radius: 4px;
      font-size: 0.8125rem;
      color: var(--linear-text-primary);
      font-weight: 500;
    }

    .modal-advisory {
      font-size: 0.75rem;
      color: var(--linear-text-tertiary);
      margin: 0 0 0.75rem 0;
      font-style: italic;
    }

    .modal-paths {
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
    }

    .modal-path {
      padding: 0.875rem 1rem;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--linear-border);
      border-radius: 6px;
    }

    .modal-path-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.375rem;
    }

    .modal-path-header span {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--linear-text-primary);
    }

    .modal-path p {
      font-size: 0.8125rem;
      color: var(--linear-text-secondary);
      margin: 0 0 0.25rem 0;
      line-height: 1.5;
    }

    .modal-path-scope {
      font-size: 0.75rem;
      color: var(--linear-text-tertiary);
    }

    @media (max-width: 768px) {
      .modal-impact-row {
        grid-template-columns: 1fr;
      }
    }

    .empty-activity p {
      font-size: 0.875rem;
      margin: 0;
    }

    /* ============================================ */
    /* EDIT FOOTER                                 */
    /* ============================================ */
    .edit-footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: var(--linear-surface);
      border-top: 1px solid var(--linear-border);
      padding: 1rem 2rem;
      z-index: 1000;
      box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.2);
    }

    .footer-content {
      max-width: 1400px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .editing-label {
      font-size: 0.875rem;
      color: var(--linear-text-secondary);
    }

    .footer-actions {
      display: flex;
      gap: 0.75rem;
    }

    /* ============================================ */
    /* BUTTONS                                     */
    /* ============================================ */
    .btn-primary {
      padding: 0.5rem 1.25rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: white;
      background: var(--linear-accent);
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: opacity 0.15s;
    }

    .btn-primary:hover {
      opacity: 0.9;
    }

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-secondary {
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

    .btn-danger {
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: white;
      background: #ef4444;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: opacity 0.15s;
    }

    .btn-danger:hover {
      opacity: 0.9;
    }

    /* ============================================ */
    /* STATUS GATING & READ-ONLY                   */
    /* ============================================ */
    .status-gating-message {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.3);
      border-radius: 6px;
      color: #f59e0b;
      font-size: 0.75rem;
      max-width: 300px;
    }

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

    .inline-status-message {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      background: rgba(245, 158, 11, 0.08);
      border: 1px solid rgba(245, 158, 11, 0.2);
      border-radius: 6px;
      color: #f59e0b;
      font-size: 0.8125rem;
      margin-bottom: 1rem;
    }

    /* ============================================ */
    /* FSR APIs SECTION                            */
    /* ============================================ */
    .section-description {
      font-size: 0.8125rem;
      color: var(--linear-text-secondary);
      margin: 0 0 1.25rem 0;
    }

    .fsr-apis-table {
      border: 1px solid var(--linear-border);
      border-radius: 8px;
      overflow: hidden;
    }

    .fsr-table-header {
      display: grid;
      grid-template-columns: 2fr 140px 100px 140px 150px;
      gap: 1rem;
      padding: 0.75rem 1rem;
      background: var(--linear-surface);
      font-size: 0.6875rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--linear-text-tertiary, rgba(255,255,255,0.5));
      font-weight: 500;
    }

    .fsr-table-row {
      display: grid;
      grid-template-columns: 2fr 140px 100px 140px 150px;
      gap: 1rem;
      padding: 0.875rem 1rem;
      border-top: 1px solid var(--linear-border);
      align-items: center;
      transition: background 0.15s;
    }

    .fsr-table-row:hover {
      background: rgba(255, 255, 255, 0.02);
    }

    .fsr-col-name {
      font-size: 0.875rem;
      font-weight: 500;
    }

    .api-link {
      color: var(--linear-accent);
      text-decoration: none;
      transition: opacity 0.15s;
    }

    .api-link:hover {
      opacity: 0.8;
      text-decoration: underline;
    }

    .fsr-col-env {
      display: flex;
      gap: 0.375rem;
      flex-wrap: wrap;
    }

    .env-badge {
      padding: 0.125rem 0.5rem;
      border-radius: 4px;
      font-size: 0.6875rem;
      font-weight: 500;
    }

    .env-badge.sandbox {
      background: rgba(59, 130, 246, 0.15);
      color: #3b82f6;
    }

    .env-badge.production {
      background: rgba(16, 185, 129, 0.15);
      color: #10b981;
    }

    .fsr-col-status,
    .fsr-col-consumers {
      font-size: 0.8125rem;
      color: var(--linear-text-secondary);
    }

    .consumer-count {
      font-size: 0.8125rem;
      color: var(--linear-text-secondary);
    }

    .consumer-count.empty {
      color: var(--linear-text-tertiary);
      font-style: italic;
    }

    .fsr-col-actions {
      text-align: right;
    }

    .view-link {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.8125rem;
      color: var(--linear-accent);
      text-decoration: none;
      transition: opacity 0.15s;
    }

    .view-link:hover {
      opacity: 0.8;
    }

    .view-link svg {
      opacity: 0.7;
    }

    .fsr-apis-empty {
      padding: 2rem;
      text-align: center;
      color: var(--linear-text-secondary);
    }

    .fsr-apis-empty p {
      font-size: 0.875rem;
      margin: 0;
    }

    @media (max-width: 900px) {
      .fsr-table-header {
        display: none;
      }

      .fsr-table-row {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        align-items: flex-start;
      }

      .fsr-col-actions {
        text-align: left;
        width: 100%;
        padding-top: 0.5rem;
        border-top: 1px solid var(--linear-border);
        margin-top: 0.5rem;
      }
    }

    /* ============================================ */
    /* VENDOR CHANGE INTELLIGENCE ALERT (Header)   */
    /* ============================================ */
    .change-intel-alert {
      margin-top: 1rem;
      border: 1px solid rgba(139, 92, 246, 0.3);
      border-radius: 8px;
      background: rgba(139, 92, 246, 0.06);
      overflow: hidden;
      transition: all 0.2s ease;
    }

    .change-intel-alert.expanded {
      border-color: rgba(139, 92, 246, 0.4);
      box-shadow: 0 4px 16px rgba(139, 92, 246, 0.12);
    }

    .alert-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.875rem 1rem;
      cursor: pointer;
      transition: background 0.15s;
    }

    .alert-banner:hover {
      background: rgba(139, 92, 246, 0.04);
    }

    .alert-left {
      display: flex;
      align-items: center;
      gap: 0.875rem;
      flex: 1;
    }

    .alert-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      background: rgba(139, 92, 246, 0.15);
      border-radius: 8px;
      color: #a78bfa;
      flex-shrink: 0;
    }

    /* Animated radar icon */
    .intel-icon .ring {
      transform-origin: center;
      animation: intel-pulse 2.5s ease-in-out infinite;
    }

    .intel-icon .ring-1 {
      animation-delay: 0s;
    }

    .intel-icon .ring-2 {
      animation-delay: 0.3s;
    }

    @keyframes intel-pulse {
      0%, 100% {
        opacity: 0.3;
        transform: scale(1);
      }
      50% {
        opacity: 0.8;
        transform: scale(1.08);
      }
    }

    /* Respect reduced motion preference */
    @media (prefers-reduced-motion: reduce) {
      .intel-icon .ring {
        animation: none;
      }
      .intel-icon .ring-1 {
        opacity: 0.7;
      }
      .intel-icon .ring-2 {
        opacity: 0.4;
      }
    }

    .alert-content {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    .alert-title {
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--linear-text-primary);
    }

    .alert-meta {
      font-size: 0.75rem;
      color: var(--linear-text-tertiary);
    }

    .alert-right {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .alert-dismiss {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      background: transparent;
      border: none;
      border-radius: 4px;
      color: var(--linear-text-tertiary);
      cursor: pointer;
      transition: all 0.15s;
    }

    .alert-dismiss:hover {
      background: rgba(255, 255, 255, 0.08);
      color: var(--linear-text-secondary);
    }

    .alert-chevron {
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--linear-text-secondary);
      transition: transform 0.2s ease;
    }

    .alert-chevron svg.rotated {
      transform: rotate(180deg);
    }

    .alert-details {
      border-top: 1px solid rgba(139, 92, 246, 0.2);
      background: var(--linear-surface);
    }

    .alert-details-inner {
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .intel-block h4 {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--linear-text-primary);
      margin: 0 0 0.75rem 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .synopsis-box {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--linear-border);
      border-radius: 6px;
      padding: 1rem;
    }

    .synopsis-text {
      font-size: 0.875rem;
      line-height: 1.6;
      color: var(--linear-text-secondary);
      margin: 0 0 0.75rem 0;
    }

    .ai-note {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.75rem;
      color: var(--linear-text-tertiary);
      margin: 0;
      font-style: italic;
    }

    .ai-note svg {
      opacity: 0.6;
      flex-shrink: 0;
    }

    .impact-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }

    .impact-col label {
      display: block;
      font-size: 0.6875rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--linear-text-tertiary);
      margin-bottom: 0.5rem;
      font-weight: 500;
    }

    .impact-items {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .impact-items li {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem 0.75rem;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--linear-border);
      border-radius: 4px;
      font-size: 0.8125rem;
      color: var(--linear-text-primary);
      font-weight: 500;
    }

    .advisory-note {
      font-size: 0.75rem;
      color: var(--linear-text-tertiary);
      margin: 0 0 0.75rem 0;
      font-style: italic;
    }

    .paths-list {
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
    }

    .path-card {
      padding: 0.875rem 1rem;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--linear-border);
      border-radius: 6px;
    }

    .path-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.375rem;
    }

    .path-name {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--linear-text-primary);
    }

    .path-desc {
      font-size: 0.8125rem;
      color: var(--linear-text-secondary);
      margin: 0 0 0.25rem 0;
      line-height: 1.5;
    }

    .path-scope {
      font-size: 0.75rem;
      color: var(--linear-text-tertiary);
      margin: 0;
    }

    .intel-footer {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding-top: 1rem;
      border-top: 1px solid var(--linear-border);
    }

    .intel-footer .btn-secondary {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
    }

    .btn-ghost {
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--linear-text-secondary);
      background: transparent;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: color 0.15s, background 0.15s;
    }

    .btn-ghost:hover {
      color: var(--linear-text-primary);
      background: rgba(255, 255, 255, 0.05);
    }

    .btn-future {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--linear-text-tertiary);
      background: rgba(255, 255, 255, 0.03);
      border: 1px dashed var(--linear-border);
      border-radius: 6px;
      cursor: not-allowed;
      margin-left: auto;
    }

    .future-tag {
      padding: 0.0625rem 0.375rem;
      background: rgba(139, 92, 246, 0.15);
      color: #a78bfa;
      font-size: 0.625rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      border-radius: 3px;
    }

    /* Dismissed restore bar */
    .change-intel-restore {
      margin-top: 1rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.625rem 1rem;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--linear-border);
      border-radius: 6px;
      font-size: 0.8125rem;
      color: var(--linear-text-tertiary);
    }

    .restore-btn {
      background: none;
      border: none;
      color: var(--linear-accent);
      font-size: 0.8125rem;
      font-weight: 500;
      cursor: pointer;
      padding: 0;
      text-decoration: underline;
    }

    .restore-btn:hover {
      opacity: 0.8;
    }

    @media (max-width: 768px) {
      .impact-row {
        grid-template-columns: 1fr;
      }

      .intel-footer {
        flex-wrap: wrap;
      }

      .btn-future {
        margin-left: 0;
        width: 100%;
        justify-content: center;
      }

      .alert-title {
        font-size: 0.875rem;
      }
    }

    /* ============================================ */
    /* DOWNSTREAM CONSUMERS SECTION                */
    /* ============================================ */
    .btn-secondary-sm {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.375rem 0.75rem;
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--linear-text-primary);
      background: var(--linear-surface);
      border: 1px solid var(--linear-border);
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s;
    }

    .btn-secondary-sm:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.08);
    }

    .btn-secondary-sm:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .service-accounts-table {
      border: 1px solid var(--linear-border);
      border-radius: 8px;
      overflow: hidden;
    }

    .sa-table-header {
      display: grid;
      grid-template-columns: 2fr 1.5fr 100px 120px 80px;
      gap: 1rem;
      padding: 0.75rem 1rem;
      background: var(--linear-surface);
      font-size: 0.6875rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--linear-text-tertiary, rgba(255,255,255,0.5));
      font-weight: 500;
    }

    .sa-table-row {
      border-top: 1px solid var(--linear-border);
    }

    .sa-table-row.stale {
      border-left: 3px solid #f59e0b;
    }

    .sa-table-row.expiring {
      border-left: 3px solid #a855f7;
    }

    .sa-row-main {
      display: grid;
      grid-template-columns: 2fr 1.5fr 100px 120px 80px;
      gap: 1rem;
      padding: 0.875rem 1rem;
      cursor: pointer;
      transition: background 0.15s;
      align-items: center;
    }

    .sa-row-main:hover {
      background: rgba(255, 255, 255, 0.02);
    }

    .sa-col-name {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      color: var(--linear-text-primary);
      font-weight: 500;
    }

    .sa-table-row.expanded .expand-icon {
      transform: rotate(90deg);
    }

    .stale-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.125rem 0.375rem;
      background: rgba(245, 158, 11, 0.15);
      color: #f59e0b;
      border-radius: 4px;
      font-size: 0.6875rem;
      font-weight: 500;
    }

    .sa-col-apis {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      flex-wrap: wrap;
    }

    .api-tag {
      padding: 0.125rem 0.5rem;
      background: var(--linear-surface);
      border: 1px solid var(--linear-border);
      border-radius: 4px;
      font-size: 0.6875rem;
      color: var(--linear-text-secondary);
    }

    .api-more {
      font-size: 0.6875rem;
      color: var(--linear-text-tertiary);
    }

    .sa-col-status,
    .sa-col-lastused {
      font-size: 0.8125rem;
      color: var(--linear-text-secondary);
    }

    .never-used {
      color: var(--linear-text-tertiary);
      font-style: italic;
    }

    .sa-col-actions {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      justify-content: flex-end;
    }

    .action-btn {
      padding: 0.375rem;
      background: transparent;
      border: 1px solid var(--linear-border);
      border-radius: 4px;
      color: var(--linear-text-secondary);
      cursor: pointer;
      transition: all 0.15s;
    }

    .action-btn:hover:not(:disabled) {
      background: var(--linear-surface);
      color: var(--linear-text-primary);
    }

    .action-btn.danger:hover:not(:disabled) {
      background: rgba(239, 68, 68, 0.1);
      border-color: rgba(239, 68, 68, 0.3);
      color: #ef4444;
    }

    .action-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .sa-row-expanded {
      padding: 0 1rem 1rem 2.5rem;
      background: rgba(255, 255, 255, 0.02);
    }

    .expanded-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .expanded-field label {
      display: block;
      font-size: 0.6875rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--linear-text-tertiary, rgba(255,255,255,0.5));
      margin-bottom: 0.25rem;
    }

    .expanded-field p {
      font-size: 0.875rem;
      color: var(--linear-text-primary);
      margin: 0;
    }

    .apis-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
    }

    .expiry-warning {
      color: #a855f7 !important;
    }

    .stale-warning {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      padding: 0.75rem;
      background: rgba(245, 158, 11, 0.08);
      border: 1px solid rgba(245, 158, 11, 0.2);
      border-radius: 6px;
      color: #f59e0b;
      font-size: 0.8125rem;
      margin-bottom: 1rem;
    }

    .stale-warning svg {
      flex-shrink: 0;
      margin-top: 0.125rem;
    }

    .expanded-actions {
      display: flex;
      gap: 1rem;
    }

    .btn-link {
      background: none;
      border: none;
      color: var(--linear-accent);
      font-size: 0.8125rem;
      cursor: pointer;
      padding: 0;
    }

    .btn-link:hover {
      text-decoration: underline;
    }

    .empty-service-accounts {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      text-align: center;
      color: var(--linear-text-secondary);
    }

    .empty-service-accounts svg {
      margin-bottom: 0.75rem;
    }

    .empty-service-accounts p {
      font-size: 0.875rem;
      margin: 0 0 1rem 0;
    }

    /* Modal form styles */
    .api-checkboxes {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding: 1rem;
      background: var(--linear-surface);
      border: 1px solid var(--linear-border);
      border-radius: 4px;
    }

    .api-checkbox {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      color: var(--linear-text-primary);
      cursor: pointer;
    }

    .api-checkbox input[type="checkbox"] {
      cursor: pointer;
    }

    @media (max-width: 900px) {
      .sa-table-header {
        display: none;
      }

      .sa-row-main {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        align-items: flex-start;
      }

      .sa-col-actions {
        width: 100%;
        justify-content: flex-start;
        padding-top: 0.5rem;
        border-top: 1px solid var(--linear-border);
        margin-top: 0.5rem;
      }

      .expanded-row {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class CompanyDetailsComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private roleService = inject(RoleService);
  private vendorService = inject(VendorCompanyService);
  private logger = inject(LoggerService);

  // Core state
  company = signal<VendorCompany | null>(null);
  editingSection = signal<EditableSection>(null);
  showUnsavedDialog = signal(false);
  overflowMenuOpen = signal(false);
  expandedComplianceItem = signal<string | null>(null);
  expandedServiceAccount = signal<string | null>(null);
  
  // Compliance requirements (ongoing management)
  complianceRequirements = signal<ComplianceRequirement[]>([
    {
      id: 'security-review',
      name: 'Security review',
      status: 'complete',
      owner: 'security@fsr.com',
      evidence: [
        { name: 'security-assessment-2024.pdf', size: 245000, type: 'application/pdf', uploadedAt: '2024-01-15T10:00:00Z', url: '#' }
      ],
      dateCompleted: '2024-01-15',
      notes: 'Annual security review passed. Next review due January 2025.',
      required: true
    },
    {
      id: 'documentation',
      name: 'Required documentation received',
      status: 'complete',
      owner: 'compliance@fsr.com',
      evidence: [
        { name: 'vendor-docs-package.zip', size: 1250000, type: 'application/zip', uploadedAt: '2024-01-10T14:30:00Z', url: '#' },
        { name: 'api-specifications.pdf', size: 89000, type: 'application/pdf', uploadedAt: '2024-01-10T14:30:00Z', url: '#' }
      ],
      dateCompleted: '2024-01-10',
      notes: 'All required documentation received and verified.',
      required: true
    },
    {
      id: 'data-agreement',
      name: 'Data processing agreement signed',
      status: 'in_progress',
      owner: 'legal@fsr.com',
      evidence: [],
      dateCompleted: '',
      notes: 'DPA under legal review. Expected completion by end of month.',
      required: true
    },
    {
      id: 'apim-policies',
      name: 'APIM policies applied',
      status: 'not_started',
      owner: '',
      evidence: [],
      dateCompleted: '',
      notes: '',
      required: true
    }
  ]);
  
  expandedComplianceReqId = signal<string | null>(null);
  
  // Vendor Integration Configuration
  integrationConfig = signal<{
    sandbox: {
      configured: boolean;
      endpoint: string;
      authMethod: string;
      credentials: string;
      status: 'active' | 'inactive';
    };
    production: {
      configured: boolean;
      endpoint: string;
      authMethod: string;
      credentials: string;
      status: 'active' | 'inactive';
    };
  }>({
    sandbox: {
      configured: false,
      endpoint: '',
      authMethod: '',
      credentials: '',
      status: 'inactive'
    },
    production: {
      configured: false,
      endpoint: '',
      authMethod: '',
      credentials: '',
      status: 'inactive'
    }
  });
  
  // Integration edit form state
  integrationFormData = {
    sandbox: {
      endpoint: '',
      authMethod: '',
      credentials: '',
      status: 'inactive' as 'active' | 'inactive'
    },
    production: {
      endpoint: '',
      authMethod: '',
      credentials: '',
      status: 'inactive' as 'active' | 'inactive'
    }
  };
  
  // Activation state
  activatingVendor = signal(false);
  
  // Modal states
  approveModalOpen = signal(false);
  rejectModalOpen = signal(false);
  archiveModalOpen = signal(false);
  suspendModalOpen = signal(false);
  createServiceAccountModalOpen = signal(false);
  revokeServiceAccountModalOpen = signal(false);
  serviceAccountToRevoke = signal<VendorServiceAccount | null>(null);
  rejectionReason = '';
  suspendReason = '';
  newServiceAccountName = '';
  newServiceAccountApis: string[] = [];

  // Permission and status gating
  isReadOnly = computed(() => this.roleService.isReadOnly());
  canEditVendor = computed(() => this.roleService.canEditVendor());
  canInviteUsers = computed(() => this.roleService.canInviteUsers());
  canManageServiceAccounts = computed(() => this.roleService.canManageServiceAccounts());

  // Vendor status gating - actions blocked when Pending, Suspended, or Archived
  isVendorActionsBlocked = computed(() => {
    const status = this.company()?.status;
    return status === 'Onboarded' || status === 'Suspended' || status === 'Archived' || status === 'Draft';
  });

  blockedStatusMessage = computed(() => {
    const status = this.company()?.status;
    if (!this.isVendorActionsBlocked()) return '';
    return `Vendor is ${status}. User and credential actions are disabled.`;
  });

  // Service accounts computed
  serviceAccounts = computed((): VendorServiceAccount[] => {
    const accounts = this.company()?.serviceAccounts;
    if (!accounts || accounts.length === 0) {
      // Return mock data for demo
      return [
        {
          id: 'sa-1',
          vendorId: this.company()?.id || '',
          name: 'Production API Client',
          description: 'Main production service account',
          apis: ['Orders API', 'Inventory API'],
          status: 'Active',
          createdAt: '2024-01-15T10:00:00Z',
          createdBy: 'admin@system.com',
          lastUsedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'sa-2',
          vendorId: this.company()?.id || '',
          name: 'Sandbox Test Client',
          description: 'For development and testing',
          apis: ['Sandbox API'],
          status: 'Active',
          createdAt: '2024-02-01T14:30:00Z',
          createdBy: 'dev@vendor.com',
          lastUsedAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString() // >90 days - stale
        },
        {
          id: 'sa-3',
          vendorId: this.company()?.id || '',
          name: 'Legacy Integration',
          description: 'Old integration - scheduled for removal',
          apis: ['Legacy Orders API'],
          status: 'Expiring Soon',
          createdAt: '2023-06-01T09:00:00Z',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          lastUsedAt: undefined
        }
      ];
    }
    return accounts;
  });

  // FSR APIs backed by this vendor
  fsrApis = computed(() => {
    // Derive FSR APIs from the APIs assigned to downstream consumers
    // In production, this would come from a dedicated API catalog service
    const consumers = this.serviceAccounts();
    const apiSet = new Set<string>();
    
    // Collect all unique APIs from downstream consumers
    consumers.forEach(consumer => {
      consumer.apis.forEach(api => apiSet.add(api));
    });

    // Build FSR API list with mock data for demo
    const apiList: Array<{
      id: string;
      name: string;
      sandboxAvailable: boolean;
      productionAvailable: boolean;
      status: 'Active' | 'Deprecated';
      consumerCount: number;
    }> = [];

    // Always include these core APIs for the vendor
    const coreApis = [
      { id: 'api-1', name: 'Orders API', sandbox: true, production: true },
      { id: 'api-2', name: 'Inventory API', sandbox: true, production: true },
      { id: 'api-3', name: 'Sandbox API', sandbox: true, production: false },
      { id: 'api-4', name: 'Legacy Orders API', sandbox: false, production: true }
    ];

    coreApis.forEach(api => {
      // Count how many consumers use this API
      const consumerCount = consumers.filter(c => c.apis.includes(api.name)).length;
      
      apiList.push({
        id: api.id,
        name: api.name,
        sandboxAvailable: api.sandbox,
        productionAvailable: api.production,
        status: api.name.includes('Legacy') ? 'Deprecated' : 'Active',
        consumerCount
      });
    });

    return apiList;
  });

  // ========================================
  // VENDOR CHANGE INTELLIGENCE (APIGateway Pro only)
  // ========================================
  
  // State for change intelligence section
  changeIntelExpanded = signal(false);
  changeIntelDismissed = signal(false);
  dismissedIntelActivity = signal<{ timestamp: string } | null>(null);
  dismissedIntelModalOpen = signal(false);
  
  // Check if vendor is APIGateway Pro
  isApiGatewayPro = computed(() => {
    const vendor = this.company();
    return vendor?.name === 'APIGateway Pro';
  });

  // Impacted APIs (mocked data)
  impactedApis = computed(() => {
    return [
      { name: 'Orders API', severity: 'high' as const },
      { name: 'Inventory API', severity: 'medium' as const }
    ];
  });

  // Impacted consumers (mocked data derived from service accounts)
  impactedConsumers = computed(() => {
    // In real implementation, derive from actual consumer data
    return ['RentalAid', 'PropertyLLC'];
  });

  // Suggested response paths (mocked advisory options)
  suggestedPaths = computed(() => {
    return [
      {
        label: 'Option A: Update field mapping in Orders API',
        description: 'Adjust the token field mapping to accommodate the new authentication schema.',
        scope: 'Orders API only',
        risk: 'Low' as const
      },
      {
        label: 'Option B: Update shared auth logic across APIs',
        description: 'Refactor the shared authentication service to handle both old and new token formats.',
        scope: 'All APIs using shared auth module',
        risk: 'Medium' as const
      },
      {
        label: 'Option C: Track change, no action yet',
        description: 'Monitor the vendor change and wait for additional clarification before taking action.',
        scope: 'No immediate changes',
        risk: 'Low' as const
      }
    ];
  });

  // Toggle expand/collapse
  toggleChangeIntelExpand(): void {
    this.changeIntelExpanded.update(v => !v);
  }

  // Dismiss the alert
  dismissChangeIntel(): void {
    this.changeIntelDismissed.set(true);
    this.changeIntelExpanded.set(false);
    // Add activity entry for the dismissed alert
    this.dismissedIntelActivity.set({
      timestamp: new Date().toISOString()
    });
  }

  // Restore dismissed alert
  restoreChangeIntel(): void {
    this.changeIntelDismissed.set(false);
    this.dismissedIntelActivity.set(null);
  }

  // Open dismissed intel details modal
  openDismissedIntelModal(): void {
    this.dismissedIntelModalOpen.set(true);
  }

  // Close dismissed intel details modal
  closeDismissedIntelModal(): void {
    this.dismissedIntelModalOpen.set(false);
  }

  // Track change action
  trackChange(): void {
    // In real implementation, this would create a tracking ticket or flag
    this.logger.info('Change tracked for APIGateway Pro vendor');
    alert('Change has been added to your tracked items.');
  }

  // Get tag type for risk level
  getRiskTagType(risk: 'Low' | 'Medium' | 'High'): 'green' | 'purple' | 'red' {
    const colors: Record<string, 'green' | 'purple' | 'red'> = {
      'Low': 'green',
      'Medium': 'purple',
      'High': 'red'
    };
    return colors[risk] || 'gray' as any;
  }

  // Check if a service account is stale (not used in >90 days)
  isServiceAccountStale(account: VendorServiceAccount): boolean {
    if (!account.lastUsedAt) return true;
    const lastUsed = new Date(account.lastUsedAt);
    const daysAgo = Math.floor((Date.now() - lastUsed.getTime()) / (1000 * 60 * 60 * 24));
    return daysAgo > 90;
  }

  getDaysSinceLastUsed(account: VendorServiceAccount): number {
    if (!account.lastUsedAt) return -1;
    const lastUsed = new Date(account.lastUsedAt);
    return Math.floor((Date.now() - lastUsed.getTime()) / (1000 * 60 * 60 * 24));
  }

  // Pending navigation
  private pendingNavigation: (() => void) | null = null;

  // Forms
  companyForm: FormGroup = this.fb.group({
    name: ['', Validators.required],
    dba: [''],
    industry: [''],
    region: [''],
    website: [''],
    tier: [''],
    notes: ['']
  });

  contactsForm: FormGroup = this.fb.group({
    primaryContact: ['', Validators.required],
    primaryEmail: ['', [Validators.required, Validators.email]],
    technicalContact: [''],
    technicalEmail: [''],
    supportEmail: ['']
  });

  // Lifecycle stages
  lifecycleStages: LifecycleStage[] = [
    'intake', 'registration', 'validation', 'configuration', 
    'compliance', 'activation', 'monitoring'
  ];

  // Computed values
  complianceChecklist = computed(() => {
    const comp = this.company();
    if (!comp?.compliance) return [];
    return comp.compliance.checklist.map(item => ({
      ...item,
      dueDate: (item as any).dueDate as string | undefined,
      notes: (item as any).notes as string | undefined,
      evidenceUrl: (item as any).evidenceUrl as string | undefined
    }));
  });

  activityLog = computed(() => {
    const comp = this.company();
    if (!comp) return [];
    
    // Build activity log from company data
    const entries: ActivityLogEntry[] = [
      {
        id: '1',
        timestamp: comp.createdAt,
        actor: { name: 'System', role: 'system', email: undefined },
        action: 'Vendor company created',
        details: `Company ${comp.name} was registered`,
        stage: 'registration' as LifecycleStage
      }
    ];

    if (comp.submittedAt) {
      entries.push({
        id: '2',
        timestamp: comp.submittedAt,
        actor: { name: comp.primaryContact || 'Vendor', role: 'vendor', email: comp.primaryEmail },
        action: 'Submitted registration',
        details: 'Completed company profile and contact details',
        stage: 'registration' as LifecycleStage
      });
    }

    if (comp.activatedAt) {
      entries.push({
        id: '3',
        timestamp: comp.activatedAt,
        actor: { name: comp.activatedBy || 'Admin', role: 'admin', email: undefined },
        action: 'Vendor activated',
        details: 'Vendor approved and activated for production use',
        stage: 'activation' as LifecycleStage
      });
    }

    // Add lifecycle stage completions
    comp.lifecycle?.stages.filter(s => s.status === 'COMPLETE' && s.completedAt).forEach((stage, idx) => {
      entries.push({
        id: `stage-${idx}`,
        timestamp: stage.completedAt!,
        actor: { name: stage.assignedReviewer || 'System', role: 'admin', email: undefined },
        action: `Completed ${this.getStageLabel(stage.stage)}`,
        details: stage.notes || undefined,
        stage: stage.stage
      });
    });

    // Sort by timestamp descending
    return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  });

  mockTechnicalContact = computed(() => ({
    name: 'Alex Johnson',
    email: 'alex.j@' + (this.company()?.website?.replace('https://', '').replace('http://', '') || 'example.com')
  }));

  mockSupportEmail = computed(() => 
    'support@' + (this.company()?.website?.replace('https://', '').replace('http://', '') || 'example.com')
  );

  // Helper methods for optional model properties
  getCompanyIndustry(): string {
    const company = this.company();
    return (company as any)?.industry || 'Technology Services';
  }

  getCompanyRegion(): string {
    const company = this.company();
    return (company as any)?.region || 'North America';
  }

  // Prevent navigation when editing
  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent) {
    if (this.editingSection() !== null) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  ngOnInit() {
    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id) {
        this.loadVendor(id);
      }
    });

    // Close overflow menu on outside click
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.overflow-menu')) {
        this.overflowMenuOpen.set(false);
      }
    });
  }

  private loadVendor(id: string) {
    this.vendorService.getVendorById(id).subscribe({
      next: (vendor) => {
        if (vendor) {
          this.company.set(vendor);
          this.populateForms(vendor);
          this.setComplianceForVendor(vendor);
          this.setIntegrationConfigForVendor(vendor);
        }
      },
      error: (err) => {
        this.logger.error('Error loading vendor', err);
      }
    });
  }

  private setComplianceForVendor(vendor: VendorCompany) {
    // Set compliance requirements based on vendor status
    if (vendor.status === 'Active') {
      // Active vendors have all compliance items complete
      this.complianceRequirements.set([
        {
          id: 'security-review',
          name: 'Security review',
          status: 'complete',
          owner: 'security@fsr.com',
          evidence: [
            { name: 'security-assessment-2024.pdf', size: 245000, type: 'application/pdf', uploadedAt: '2024-01-15T10:00:00Z', url: '#' }
          ],
          dateCompleted: '2024-01-15',
          notes: 'Annual security review passed. Next review due January 2025.',
          required: true
        },
        {
          id: 'documentation',
          name: 'Required documentation received',
          status: 'complete',
          owner: 'compliance@fsr.com',
          evidence: [
            { name: 'vendor-docs-package.zip', size: 1250000, type: 'application/zip', uploadedAt: '2024-01-10T14:30:00Z', url: '#' }
          ],
          dateCompleted: '2024-01-10',
          notes: 'All required documentation received and verified.',
          required: true
        },
        {
          id: 'data-agreement',
          name: 'Data processing agreement signed',
          status: 'complete',
          owner: 'legal@fsr.com',
          evidence: [
            { name: 'dpa-signed-2024.pdf', size: 156000, type: 'application/pdf', uploadedAt: '2024-01-12T09:00:00Z', url: '#' }
          ],
          dateCompleted: '2024-01-12',
          notes: 'DPA executed and on file.',
          required: true
        },
        {
          id: 'apim-policies',
          name: 'APIM policies applied',
          status: 'complete',
          owner: 'platform@fsr.com',
          evidence: [
            { name: 'apim-config-verified.pdf', size: 45000, type: 'application/pdf', uploadedAt: '2024-01-14T11:00:00Z', url: '#' }
          ],
          dateCompleted: '2024-01-14',
          notes: 'Rate limiting, authentication, and logging policies applied.',
          required: true
        }
      ]);
    } else {
      // Onboarded/other vendors have incomplete compliance
      this.complianceRequirements.set([
        {
          id: 'security-review',
          name: 'Security review',
          status: 'complete',
          owner: 'security@fsr.com',
          evidence: [
            { name: 'security-assessment-2024.pdf', size: 245000, type: 'application/pdf', uploadedAt: '2024-01-15T10:00:00Z', url: '#' }
          ],
          dateCompleted: '2024-01-15',
          notes: 'Annual security review passed. Next review due January 2025.',
          required: true
        },
        {
          id: 'documentation',
          name: 'Required documentation received',
          status: 'complete',
          owner: 'compliance@fsr.com',
          evidence: [
            { name: 'vendor-docs-package.zip', size: 1250000, type: 'application/zip', uploadedAt: '2024-01-10T14:30:00Z', url: '#' }
          ],
          dateCompleted: '2024-01-10',
          notes: 'All required documentation received and verified.',
          required: true
        },
        {
          id: 'data-agreement',
          name: 'Data processing agreement signed',
          status: 'in_progress',
          owner: 'legal@fsr.com',
          evidence: [],
          dateCompleted: '',
          notes: 'DPA under legal review. Expected completion by end of month.',
          required: true
        },
        {
          id: 'apim-policies',
          name: 'APIM policies applied',
          status: 'not_started',
          owner: '',
          evidence: [],
          dateCompleted: '',
          notes: '',
          required: true
        }
      ]);
    }
  }

  private setIntegrationConfigForVendor(vendor: VendorCompany) {
    // Set integration config based on vendor status
    if (vendor.status === 'Active') {
      // Active vendors have integration configured
      this.integrationConfig.set({
        sandbox: {
          configured: true,
          endpoint: 'https://sandbox.vendor-api.com/v1',
          authMethod: 'API Key',
          credentials: 'sk_test_****',
          status: 'active'
        },
        production: {
          configured: true,
          endpoint: 'https://api.vendor-api.com/v1',
          authMethod: 'OAuth2',
          credentials: 'oauth_****',
          status: 'active'
        }
      });
    } else {
      // Other vendors have no integration configured
      this.integrationConfig.set({
        sandbox: {
          configured: false,
          endpoint: '',
          authMethod: '',
          credentials: '',
          status: 'inactive'
        },
        production: {
          configured: false,
          endpoint: '',
          authMethod: '',
          credentials: '',
          status: 'inactive'
        }
      });
    }
  }

  private populateForms(vendor: VendorCompany) {
    this.companyForm.patchValue({
      name: vendor.name || '',
      dba: vendor.dba || '',
      industry: (vendor as any).industry || 'Technology Services',
      region: (vendor as any).region || 'North America',
      website: vendor.website || '',
      tier: vendor.tier || '',
      notes: vendor.notes || ''
    });

    this.contactsForm.patchValue({
      primaryContact: vendor.primaryContact || '',
      primaryEmail: vendor.primaryEmail || '',
      technicalContact: this.mockTechnicalContact().name,
      technicalEmail: this.mockTechnicalContact().email,
      supportEmail: this.mockSupportEmail()
    });
  }

  // Section editing
  startEditingSection(section: EditableSection) {
    if (this.editingSection() !== null && this.editingSection() !== section) {
      // Already editing another section
      this.showUnsavedDialog.set(true);
      this.pendingNavigation = () => {
        this.editingSection.set(section);
      };
      return;
    }
    this.editingSection.set(section);
    this.overflowMenuOpen.set(false);
  }

  cancelEditing() {
    const vendor = this.company();
    if (vendor) {
      this.populateForms(vendor);
    }
    this.editingSection.set(null);
  }

  canSave(): boolean {
    const section = this.editingSection();
    if (section === 'company') {
      return this.companyForm.valid;
    }
    if (section === 'contacts') {
      return this.contactsForm.valid;
    }
    return true;
  }

  saveChanges() {
    const section = this.editingSection();
    const vendor = this.company();
    if (!vendor) return;

    // TODO: Implement actual save via service
    if (section === 'company') {
      const values = this.companyForm.value;
      const updated = {
        ...vendor,
        name: values.name,
        dba: values.dba,
        website: values.website,
        tier: values.tier,
        notes: values.notes,
        updatedAt: new Date().toISOString()
      };
      // Store extra fields that aren't in model
      (updated as any).industry = values.industry;
      (updated as any).region = values.region;
      this.company.set(updated);
    } else if (section === 'contacts') {
      const values = this.contactsForm.value;
      this.company.set({
        ...vendor,
        primaryContact: values.primaryContact,
        primaryEmail: values.primaryEmail,
        updatedAt: new Date().toISOString()
      });
    } else if (section === 'integrations') {
      // Save integration configuration
      this.saveIntegrationConfig();
      return; // saveIntegrationConfig handles cancelEditing
    }

    this.editingSection.set(null);
    this.logger.info('Changes saved', { section });
  }

  // Navigation guards
  cancelNavigation() {
    this.showUnsavedDialog.set(false);
    this.pendingNavigation = null;
  }

  confirmNavigation() {
    this.showUnsavedDialog.set(false);
    this.editingSection.set(null);
    if (this.pendingNavigation) {
      this.pendingNavigation();
      this.pendingNavigation = null;
    }
  }

  // Overflow menu
  toggleOverflowMenu() {
    this.overflowMenuOpen.update(v => !v);
  }

  handleOverflowAction(action: string) {
    this.overflowMenuOpen.set(false);
    
    switch (action) {
      case 'archive':
        this.archiveModalOpen.set(true);
        break;
      case 'suspend':
        this.suspendModalOpen.set(true);
        break;
      case 'unsuspend':
        this.confirmUnsuspend();
        break;
      case 'audit':
        alert('View audit log (TODO: implement)');
        break;
    }
  }

  // Suspend modal handlers
  closeSuspendModal() {
    this.suspendModalOpen.set(false);
    this.suspendReason = '';
  }

  confirmSuspend() {
    const vendor = this.company();
    if (!vendor) return;

    const updated = {
      ...vendor,
      status: 'Suspended' as VendorStatus,
      suspendedAt: new Date().toISOString(),
      suspendedBy: 'Current User',
      suspendReason: this.suspendReason || undefined,
      updatedAt: new Date().toISOString()
    };
    this.company.set(updated);
    this.closeSuspendModal();
    this.logger.info('Vendor suspended', { vendorId: vendor.id });
  }

  confirmUnsuspend() {
    const vendor = this.company();
    if (!vendor) return;

    const updated = {
      ...vendor,
      status: 'Active' as VendorStatus,
      suspendedAt: undefined,
      suspendedBy: undefined,
      suspendReason: undefined,
      updatedAt: new Date().toISOString()
    };
    this.company.set(updated);
    this.logger.info('Vendor unsuspended', { vendorId: vendor.id });
  }

  // Service Account handlers
  toggleServiceAccountExpand(id: string) {
    if (this.expandedServiceAccount() === id) {
      this.expandedServiceAccount.set(null);
    } else {
      this.expandedServiceAccount.set(id);
    }
  }

  openCreateServiceAccountModal() {
    if (this.isVendorActionsBlocked() || this.isReadOnly()) return;
    this.newServiceAccountName = '';
    this.newServiceAccountApis = [];
    this.createServiceAccountModalOpen.set(true);
  }

  closeCreateServiceAccountModal() {
    this.createServiceAccountModalOpen.set(false);
    this.newServiceAccountName = '';
    this.newServiceAccountApis = [];
  }

  toggleNewServiceAccountApi(api: string, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.newServiceAccountApis = [...this.newServiceAccountApis, api];
    } else {
      this.newServiceAccountApis = this.newServiceAccountApis.filter(a => a !== api);
    }
  }

  confirmCreateServiceAccount() {
    if (!this.newServiceAccountName.trim()) return;

    // TODO: Implement actual service account creation
    this.logger.info('Service account created', { 
      name: this.newServiceAccountName,
      apis: this.newServiceAccountApis 
    });
    alert(`Service account "${this.newServiceAccountName}" created (demo)`);
    this.closeCreateServiceAccountModal();
  }

  openRevokeServiceAccountModal(account: VendorServiceAccount) {
    if (this.isVendorActionsBlocked() || this.isReadOnly()) return;
    this.serviceAccountToRevoke.set(account);
    this.revokeServiceAccountModalOpen.set(true);
  }

  closeRevokeServiceAccountModal() {
    this.revokeServiceAccountModalOpen.set(false);
    this.serviceAccountToRevoke.set(null);
  }

  confirmRevokeServiceAccount() {
    const account = this.serviceAccountToRevoke();
    if (!account) return;

    // TODO: Implement actual revocation
    this.logger.info('Service account revoked', { accountId: account.id });
    alert(`Service account "${account.name}" revoked (demo)`);
    this.closeRevokeServiceAccountModal();
  }

  rotateServiceAccountCredentials(account: VendorServiceAccount) {
    if (this.isVendorActionsBlocked() || this.isReadOnly()) return;
    
    // TODO: Implement actual credential rotation
    this.logger.info('Service account credentials rotated', { accountId: account.id });
    alert(`Credentials for "${account.name}" rotated (demo)`);
  }

  viewServiceAccountAudit(account: VendorServiceAccount) {
    // TODO: Implement audit view
    this.logger.info('Viewing service account audit', { accountId: account.id });
    alert(`View audit activity for "${account.name}" (TODO: implement)`);
  }

  // Compliance table
  toggleComplianceItem(id: string) {
    if (this.expandedComplianceItem() === id) {
      this.expandedComplianceItem.set(null);
    } else {
      this.expandedComplianceItem.set(id);
    }
  }

  // ============================================
  // Compliance Requirements Management
  // ============================================
  toggleComplianceReq(id: string) {
    if (this.expandedComplianceReqId() === id) {
      this.expandedComplianceReqId.set(null);
    } else {
      this.expandedComplianceReqId.set(id);
    }
  }

  isComplianceReqExpanded(id: string): boolean {
    return this.expandedComplianceReqId() === id;
  }

  updateComplianceReqField(id: string, field: keyof ComplianceRequirement, value: any) {
    const requirements = this.complianceRequirements();
    const updated = requirements.map(req => {
      if (req.id === id) {
        const updatedReq = { ...req, [field]: value };
        // Auto-set date completed when status changes to complete
        if (field === 'status' && value === 'complete' && !updatedReq.dateCompleted) {
          updatedReq.dateCompleted = new Date().toISOString().split('T')[0];
        }
        // Clear date completed if status is not complete
        if (field === 'status' && value !== 'complete') {
          updatedReq.dateCompleted = '';
        }
        return updatedReq;
      }
      return req;
    });
    this.complianceRequirements.set(updated);
  }

  onComplianceReqFileUpload(id: string, event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;
    
    const requirements = this.complianceRequirements();
    const updated = requirements.map(req => {
      if (req.id === id) {
        const newFiles = Array.from(input.files || []).map(file => ({
          name: file.name,
          size: file.size,
          type: file.type,
          uploadedAt: new Date().toISOString()
        }));
        return { ...req, evidence: [...req.evidence, ...newFiles] };
      }
      return req;
    });
    this.complianceRequirements.set(updated);
    input.value = ''; // Reset input for re-uploads
  }

  removeComplianceReqFile(id: string, fileIndex: number) {
    const requirements = this.complianceRequirements();
    const updated = requirements.map(req => {
      if (req.id === id) {
        const evidence = [...req.evidence];
        evidence.splice(fileIndex, 1);
        return { ...req, evidence };
      }
      return req;
    });
    this.complianceRequirements.set(updated);
  }

  getComplianceStatusLabel(status: ComplianceStatus): string {
    switch (status) {
      case 'not_started': return 'Not started';
      case 'in_progress': return 'In progress';
      case 'complete': return 'Complete';
      default: return 'Not started';
    }
  }

  getComplianceStatusClass(status: ComplianceStatus): string {
    return status.replace('_', '-');
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  getComplianceReqCount(): number {
    return this.complianceRequirements().filter(r => r.status === 'complete').length;
  }

  getRequiredComplianceCount(): number {
    return this.complianceRequirements().filter(r => r.required && r.status === 'complete').length;
  }

  getTotalRequiredCount(): number {
    return this.complianceRequirements().filter(r => r.required).length;
  }

  getIncompleteRequiredItems(): ComplianceRequirement[] {
    return this.complianceRequirements().filter(r => r.required && r.status !== 'complete');
  }

  isComplianceBlocking(): boolean {
    return this.getIncompleteRequiredItems().length > 0;
  }

  // Sort compliance requirements: in_progress → not_started → complete
  getSortedComplianceRequirements(): ComplianceRequirement[] {
    const reqs = [...this.complianceRequirements()];
    const statusOrder: Record<ComplianceStatus, number> = {
      'in_progress': 0,
      'not_started': 1,
      'complete': 2
    };
    return reqs.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
  }

  // Summary computations
  getComplianceSummary(): string {
    const reqs = this.complianceRequirements();
    if (reqs.length === 0) return 'No items';
    
    const complete = reqs.filter(r => r.status === 'complete').length;
    const required = reqs.filter(r => r.required);
    const requiredComplete = required.filter(r => r.status === 'complete').length;
    
    if (this.isComplianceBlocking()) {
      return `${requiredComplete} of ${required.length} required`;
    }
    return `${complete} of ${reqs.length} complete`;
  }

  hasComplianceIssues(): boolean {
    return this.isComplianceBlocking();
  }

  getIntegrationsSummary(): string {
    const status = this.company()?.integrationStatus?.status;
    if (status === 'HEALTHY') return '2 active';
    if (status === 'DEGRADED') return '1 active, 1 degraded';
    if (status === 'ERROR') return 'Issues detected';
    return 'Not configured';
  }

  // Header signal helpers
  isIntegrationConfigured(): boolean {
    const config = this.integrationConfig();
    // At least one environment must be fully configured
    const sandboxConfigured = config.sandbox.configured && 
      config.sandbox.endpoint && 
      config.sandbox.authMethod && 
      config.sandbox.credentials;
    const productionConfigured = config.production.configured && 
      config.production.endpoint && 
      config.production.authMethod && 
      config.production.credentials;
    return !!(sandboxConfigured || productionConfigured);
  }

  hasHeaderSignals(): boolean {
    return this.isComplianceBlocking() || !this.isIntegrationConfigured() || this.isVendorActionsBlocked();
  }

  scrollToSection(event: Event, sectionId: string) {
    event.preventDefault();
    const element = document.getElementById(sectionId);
    if (element) {
      const headerOffset = 20; // Small offset from top
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  }

  // Vendor Activation
  canActivateVendor(): boolean {
    // All required compliance items must be complete
    return !this.isComplianceBlocking() && this.company()?.status !== 'Active';
  }

  activateVendor() {
    if (!this.canActivateVendor()) return;
    
    this.activatingVendor.set(true);
    
    // Simulate activation
    setTimeout(() => {
      const company = this.company();
      if (company) {
        // Update company status
        const updated = { ...company, status: 'Active' as const, activatedAt: new Date().toISOString(), activatedBy: 'Current User' };
        this.company.set(updated);
        
        // Add activity log entry
        this.addActivityLogEntry('Vendor activated', 'Current User', 'Vendor is now active and can receive API traffic');
      }
      this.activatingVendor.set(false);
    }, 500);
  }

  addActivityLogEntry(action: string, actor: string, details?: string) {
    const newEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action,
      actor: { name: actor },
      details
    };
    // In a real app, this would call an API. For now, we'll just log it.
    console.log('Activity logged:', newEntry);
  }

  // Integration Configuration
  startIntegrationEdit() {
    const config = this.integrationConfig();
    this.integrationFormData = {
      sandbox: { ...config.sandbox },
      production: { ...config.production }
    };
    this.startEditingSection('integrations');
  }

  saveIntegrationConfig() {
    const formData = this.integrationFormData;
    
    // Validate and update
    const newConfig = {
      sandbox: {
        ...formData.sandbox,
        configured: !!(formData.sandbox.endpoint && formData.sandbox.authMethod && formData.sandbox.credentials)
      },
      production: {
        ...formData.production,
        configured: !!(formData.production.endpoint && formData.production.authMethod && formData.production.credentials)
      }
    };
    
    this.integrationConfig.set(newConfig);
    
    // Log the change
    this.addActivityLogEntry('Vendor integration updated', 'Current User', 'Integration configuration was modified');
    
    this.cancelEditing();
  }

  getIntegrationStatusText(): string {
    const config = this.integrationConfig();
    const sandboxConfigured = config.sandbox.configured;
    const productionConfigured = config.production.configured;
    
    if (sandboxConfigured && productionConfigured) {
      return 'Sandbox & Production configured';
    } else if (productionConfigured) {
      return 'Production configured';
    } else if (sandboxConfigured) {
      return 'Sandbox configured';
    }
    return 'Not configured';
  }

  // Lifecycle helpers
  isStageComplete(stage: LifecycleStage): boolean {
    const lifecycle = this.company()?.lifecycle;
    if (!lifecycle) return false;
    const stageData = lifecycle.stages.find(s => s.stage === stage);
    return stageData?.status === 'COMPLETE';
  }

  getStageLabel(stage: LifecycleStage): string {
    const labels: Record<LifecycleStage, string> = {
      'intake': 'Intake',
      'registration': 'Registration',
      'validation': 'Validation',
      'configuration': 'Configuration',
      'compliance': 'Compliance',
      'activation': 'Activation',
      'monitoring': 'Monitoring'
    };
    return labels[stage] || stage;
  }

  // Formatting helpers
  formatDate(dateString: string): string {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  }

  formatRelativeTime(dateString?: string): string {
    if (!dateString) return '—';
    
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

  // Status helpers
  getStatusTagType(status: string): 'red' | 'blue' | 'green' | 'gray' | 'magenta' | 'purple' | 'teal' {
    const colors: Record<string, 'red' | 'blue' | 'green' | 'gray' | 'magenta' | 'purple' | 'teal'> = {
      'Active': 'green',
      'Onboarded': 'blue',
      'Draft': 'gray',
      'Rejected': 'red',
      'Archived': 'gray',
      'Suspended': 'red'
    };
    return colors[status] || 'gray';
  }

  getChecklistStatusColor(status: string): 'red' | 'blue' | 'green' | 'gray' | 'purple' {
    const colors: Record<string, 'red' | 'blue' | 'green' | 'gray' | 'purple'> = {
      'pending': 'gray',
      'in-review': 'purple',
      'approved': 'green',
      'rejected': 'red',
      'expired': 'red'
    };
    return colors[status] || 'gray';
  }

  // Modal handlers
  openApproveModal() { this.approveModalOpen.set(true); }
  closeApproveModal() { this.approveModalOpen.set(false); }
  
  confirmApprove() {
    const vendor = this.company();
    if (!vendor) return;

    this.vendorService.activateVendor(vendor.id).subscribe({
      next: (updated) => {
        this.company.set(updated);
        this.closeApproveModal();
      },
      error: (err) => {
        this.logger.error('Error approving vendor', err);
        alert('Failed to approve vendor.');
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
        this.logger.error('Error rejecting vendor', err);
        alert('Failed to reject vendor.');
      }
    });
  }

  openArchiveModal() { this.archiveModalOpen.set(true); }
  closeArchiveModal() { this.archiveModalOpen.set(false); }

  confirmArchive() {
    const vendor = this.company();
    if (!vendor) return;

    this.vendorService.archiveVendor(vendor.id).subscribe({
      next: (updated) => {
        this.company.set(updated);
        this.closeArchiveModal();
      },
      error: (err) => {
        this.logger.error('Error archiving vendor', err);
        alert('Failed to archive vendor.');
      }
    });
  }
}
