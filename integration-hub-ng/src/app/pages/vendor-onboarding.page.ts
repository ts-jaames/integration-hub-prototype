import { Component, OnInit, OnDestroy, signal, computed, inject, ViewEncapsulation, effect, HostListener, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import {
  ButtonModule,
  InputModule,
  SelectModule,
  CheckboxModule
} from 'carbon-components-angular';
import { LoggerService } from '../core/services/logger.service';
import { VendorCompanyService } from '../shared/services/vendor-company.service';

interface OnboardingStep {
  id: string;
  label: string;
  description: string;
  completed: boolean;
}

type ComplianceStatus = 'not_started' | 'in_progress' | 'complete';

interface ComplianceEvidence {
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
}

interface ComplianceRequirement {
  id: string;
  name: string;
  status: ComplianceStatus;
  owner: string;
  evidence: ComplianceEvidence[];
  dateCompleted: string;
  notes: string;
}

interface ParsedVendorInfo {
  // Intake fields
  vendorType?: string;
  businessDomain?: string;
  
  // Company fields
  legalCompanyName?: string;
  dba?: string;
  primaryContactName?: string;
  primaryContactEmail?: string;
  technicalContactName?: string;
  technicalContactEmail?: string;
  supportEmail?: string;
  website?: string;
  country?: string;
  address?: string;
  
  // Integration fields
  webhookUrl?: string;
  sandboxApiUrl?: string;
  authMethod?: string;
}

@Component({
  selector: 'app-vendor-onboarding-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    InputModule,
    SelectModule,
    CheckboxModule
  ],
  template: `
    <!-- Full-screen modal takeover - Postman-style layout -->
    <div 
      class="onboarding-takeover"
      [class.exiting]="isExiting()"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      #takeoverContainer
      (keydown)="onKeyDown($event)">
      
      <!-- Exit Confirmation Dialog -->
      <div class="exit-dialog-overlay" *ngIf="showExitConfirmation()" (click)="cancelExit()">
        <div class="exit-dialog" (click)="$event.stopPropagation()" role="alertdialog" aria-labelledby="exit-dialog-title">
          <h3 id="exit-dialog-title">Unsaved Changes</h3>
          <p>You have unsaved changes. What would you like to do?</p>
          <div class="exit-dialog-actions">
            <button class="btn-secondary" (click)="cancelExit()">Continue Editing</button>
            <button class="btn-secondary" (click)="confirmDiscardAndExit()">Discard & Exit</button>
            <button class="btn-primary-sm" (click)="confirmSaveAndExit()">Save & Exit</button>
          </div>
        </div>
      </div>

      <!-- Minimal Top Bar -->
      <header class="takeover-header">
        <button 
          type="button" 
          class="back-link"
          (click)="onCancel()"
          aria-label="Back to vendors">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8L10 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          All vendors
        </button>
        <div class="header-actions">
          <button 
            type="button"
            class="btn-text" 
            (click)="onDiscardDraft()">
            Discard
          </button>
          <button 
            type="button"
            class="btn-text" 
            (click)="onSaveAndExit()">
            Save draft
          </button>
        </div>
      </header>

      <!-- Main Content Area -->
      <main class="takeover-body" #mainContent>
        <div class="body-layout">
          <!-- Left: Form Content -->
          <div class="content-wrapper">
            <!-- Page Title -->
            <h1 id="onboarding-title" class="page-title">New Vendor Onboarding</h1>

            <!-- Horizontal Step Indicator -->
            <nav class="step-indicator-bar" aria-label="Onboarding steps">
            <div
              *ngFor="let step of steps(); let i = index; let last = last"
              class="step-item"
              [class.completed]="step.completed"
              [class.active]="i === currentStepIndex()"
              (click)="navigateToStep(i)"
              role="button"
              tabindex="0"
              (keydown.enter)="navigateToStep(i)"
              (keydown.space)="navigateToStep(i)"
              [attr.aria-current]="i === currentStepIndex() ? 'step' : null">
              <span class="step-dot" [class.filled]="step.completed || i === currentStepIndex()">
                <svg *ngIf="step.completed" width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5L4 7L8 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </span>
              <span class="step-name">{{ step.label }}</span>
              <span class="step-connector" *ngIf="!last"></span>
            </div>
          </nav>

          <!-- Validation Error Banner -->
          <div class="validation-banner" *ngIf="validationErrorMessage()">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/>
              <path d="M8 5V8.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              <circle cx="8" cy="11" r="0.75" fill="currentColor"/>
            </svg>
            <span>{{ validationErrorMessage() }}</span>
            <button class="dismiss-btn" (click)="validationErrorMessage.set('')">×</button>
          </div>

          <!-- Step Content - Single Column -->
          <div class="step-content-area">
              <!-- Step 1: Intake -->
            <div *ngIf="currentStepIndex() === 0" class="step-form" [formGroup]="intakeForm">
              <div class="section-header">
                <h2>Intake</h2>
                <p>Capture internal context before collecting vendor details.</p>
              </div>

              <!-- Optional: Assisted intake (collapsed by default) -->
              <div class="optional-section" *ngIf="!showAssistedIntake()">
                <button type="button" class="link-btn" (click)="toggleAssistedIntake()">
                  + Paste or upload vendor info to prefill
                </button>
              </div>

              <div class="assisted-section" *ngIf="showAssistedIntake()">
                <div class="assisted-header">
                  <span>Paste vendor info</span>
                  <button type="button" class="link-btn" (click)="toggleAssistedIntake()">Hide</button>
                </div>
                <textarea
                  class="form-textarea"
                  [value]="assistedIntakeText()"
                  (input)="onAssistedIntakeTextChange($event)"
                  placeholder="Vendor name: Acme Corp&#10;Primary contact: John Smith&#10;Email: john@acme.com"
                  rows="4"
                  [disabled]="isParsingVendorInfo()"></textarea>
                <div class="assisted-actions">
                  <label class="file-label">
                    <input type="file" accept=".txt,.pdf,.docx,.csv,.xlsx" (change)="onFileSelected($event)" [disabled]="isParsingVendorInfo()">
                    Upload file
                  </label>
                  <span class="selected-file-name" *ngIf="assistedIntakeFile()">{{ assistedIntakeFile()?.name }}</span>
                  <div class="assisted-btns">
                    <button type="button" class="btn-text" (click)="clearAssistedIntake()" [disabled]="!assistedIntakeText() && !assistedIntakeFile()">Clear</button>
                    <button type="button" class="btn-primary-sm" (click)="parseAndPrefill()" [disabled]="!canParse() || isParsingVendorInfo()">
                      {{ isParsingVendorInfo() ? 'Parsing...' : 'Parse & Prefill' }}
                    </button>
                  </div>
                </div>
                <div class="parse-message success" *ngIf="parseSuccessMessage()">{{ parseSuccessMessage() }}</div>
                <div class="parse-message error" *ngIf="parseErrorMessage()">{{ parseErrorMessage() }}</div>
              </div>

              <div class="form-divider"></div>

              <div class="form-field">
                <label>Internal Owner <span class="required">*</span></label>
                <input
                  type="text"
                  formControlName="internalOwner"
                  placeholder="Enter internal owner name"
                  [class.has-error]="intakeForm.get('internalOwner')?.invalid && intakeForm.get('internalOwner')?.touched">
                <span class="field-error" *ngIf="intakeForm.get('internalOwner')?.invalid && intakeForm.get('internalOwner')?.touched">
                  Required
                </span>
              </div>

              <div class="form-field">
                <label>Requesting Business Domain <span class="required">*</span></label>
                <select
                  formControlName="businessDomain"
                  [class.has-error]="intakeForm.get('businessDomain')?.invalid && intakeForm.get('businessDomain')?.touched">
                  <option value="">Select domain</option>
                  <option value="Property Ops">Property Ops</option>
                  <option value="Client Accounting">Client Accounting</option>
                  <option value="CRM">CRM</option>
                  <option value="Other">Other</option>
                </select>
                <span class="field-error" *ngIf="intakeForm.get('businessDomain')?.invalid && intakeForm.get('businessDomain')?.touched">
                  Required
                </span>
              </div>

              <div class="form-field">
                <label>Vendor / Integration Type <span class="required">*</span></label>
                <select
                  formControlName="vendorType"
                  [class.has-error]="intakeForm.get('vendorType')?.invalid && intakeForm.get('vendorType')?.touched">
                  <option value="">Select type</option>
                  <option value="Data consumer">Data consumer</option>
                  <option value="Data provider">Data provider</option>
                  <option value="Bidirectional">Bidirectional</option>
                  <option value="File-based">File-based</option>
                </select>
                <span class="field-error" *ngIf="intakeForm.get('vendorType')?.invalid && intakeForm.get('vendorType')?.touched">
                  Required
                </span>
              </div>

              <div class="form-field">
                <label>Target Go-Live Date</label>
                <input type="date" formControlName="targetGoLiveDate">
              </div>

              <div class="form-field">
                <label>Notes</label>
                <textarea formControlName="intakeNotes" rows="3" placeholder="Add any internal notes..."></textarea>
              </div>

              <!-- Bottom Actions -->
              <div class="step-footer">
                <div></div>
                <button type="button" class="btn-primary" (click)="nextStep()">Next</button>
              </div>
            </div>

              <!-- Step 2: Company -->
            <div *ngIf="currentStepIndex() === 1" class="step-form" [formGroup]="companyForm">
              <div class="section-header">
                <h2>Company</h2>
                <p>Enter vendor company and contact details.</p>
              </div>

              <div class="autofill-notice" *ngIf="autofilledFields().size > 0">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/>
                  <path d="M8 5V9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  <circle cx="8" cy="11.5" r="0.75" fill="currentColor"/>
                </svg>
                <span>Some fields were autofilled. Review and edit as needed.</span>
              </div>

              <div class="form-field" [class.autofilled]="isFieldAutofilled('legalCompanyName')">
                <label>Legal Company Name <span class="required">*</span></label>
                <input
                  type="text"
                  formControlName="legalCompanyName"
                  placeholder="Enter legal company name"
                  (input)="onFieldEdited('legalCompanyName')"
                  [class.has-error]="companyForm.get('legalCompanyName')?.invalid && companyForm.get('legalCompanyName')?.touched">
                <span class="field-error" *ngIf="companyForm.get('legalCompanyName')?.invalid && companyForm.get('legalCompanyName')?.touched">
                  Required
                </span>
              </div>

              <div class="form-field" [class.autofilled]="isFieldAutofilled('dba')">
                <label>DBA / Doing Business As</label>
                <input
                  type="text"
                  formControlName="dba"
                  placeholder="Enter DBA if applicable"
                  (input)="onFieldEdited('dba')">
              </div>

              <div class="form-row">
                <div class="form-field" [class.autofilled]="isFieldAutofilled('primaryContactName')">
                  <label>Primary Contact Name <span class="required">*</span></label>
                  <input
                    type="text"
                    formControlName="primaryContactName"
                    placeholder="Contact name"
                    (input)="onFieldEdited('primaryContactName')"
                    [class.has-error]="companyForm.get('primaryContactName')?.invalid && companyForm.get('primaryContactName')?.touched">
                  <span class="field-error" *ngIf="companyForm.get('primaryContactName')?.invalid && companyForm.get('primaryContactName')?.touched">Required</span>
                </div>
                <div class="form-field" [class.autofilled]="isFieldAutofilled('primaryContactEmail')">
                  <label>Primary Contact Email <span class="required">*</span></label>
                  <input
                    type="email"
                    formControlName="primaryContactEmail"
                    placeholder="contact@company.com"
                    (input)="onFieldEdited('primaryContactEmail')"
                    [class.has-error]="companyForm.get('primaryContactEmail')?.invalid && companyForm.get('primaryContactEmail')?.touched">
                  <span class="field-error" *ngIf="companyForm.get('primaryContactEmail')?.invalid && companyForm.get('primaryContactEmail')?.touched">Valid email required</span>
                </div>
              </div>

              <div class="form-row">
                <div class="form-field" [class.autofilled]="isFieldAutofilled('technicalContactName')">
                  <label>Technical Contact Name <span class="required">*</span></label>
                  <input
                    type="text"
                    formControlName="technicalContactName"
                    placeholder="Technical contact name"
                    (input)="onFieldEdited('technicalContactName')"
                    [class.has-error]="companyForm.get('technicalContactName')?.invalid && companyForm.get('technicalContactName')?.touched">
                  <span class="field-error" *ngIf="companyForm.get('technicalContactName')?.invalid && companyForm.get('technicalContactName')?.touched">Required</span>
                </div>
                <div class="form-field" [class.autofilled]="isFieldAutofilled('technicalContactEmail')">
                  <label>Technical Contact Email <span class="required">*</span></label>
                  <input
                    type="email"
                    formControlName="technicalContactEmail"
                    placeholder="tech@company.com"
                    (input)="onFieldEdited('technicalContactEmail')"
                    [class.has-error]="companyForm.get('technicalContactEmail')?.invalid && companyForm.get('technicalContactEmail')?.touched">
                  <span class="field-error" *ngIf="companyForm.get('technicalContactEmail')?.invalid && companyForm.get('technicalContactEmail')?.touched">Valid email required</span>
                </div>
              </div>

              <div class="form-field" [class.autofilled]="isFieldAutofilled('supportEmail')">
                <label>Support Email</label>
                <input type="email" formControlName="supportEmail" placeholder="support@company.com" (input)="onFieldEdited('supportEmail')">
              </div>

              <div class="form-field" [class.autofilled]="isFieldAutofilled('website')">
                <label>Website</label>
                <input type="url" formControlName="website" placeholder="https://company.com" (input)="onFieldEdited('website')">
              </div>

              <div class="form-field" [class.autofilled]="isFieldAutofilled('country')">
                <label>Country/Region</label>
                <select formControlName="country" (change)="onFieldEdited('country')">
                  <option value="">Select country</option>
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                  <option value="UK">United Kingdom</option>
                  <option value="AU">Australia</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <!-- Optional address -->
              <div class="optional-section">
                <button type="button" class="expand-toggle" [class.expanded]="showAddress" (click)="showAddress = !showAddress">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3 1L7 5L3 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  Add address (optional)
                </button>
                <div class="expand-content" *ngIf="showAddress">
                  <div class="form-field">
                    <label>Address</label>
                    <textarea formControlName="address" rows="3" placeholder="Company address"></textarea>
                  </div>
                </div>
              </div>

              <!-- Step Footer -->
              <div class="step-footer">
                <button type="button" class="btn-back" (click)="previousStep()">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8L10 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  Back
                </button>
                <button type="button" class="btn-primary" (click)="nextStep()">Next</button>
              </div>
            </div>

              <!-- Step 3: Integration -->
            <div *ngIf="currentStepIndex() === 2" class="step-form" [formGroup]="integrationForm">
              <div class="section-header">
                <h2>Integration</h2>
                <p>Provide endpoints and auth details for validation.</p>
              </div>

              <div class="form-field">
                <label>Environment <span class="required">*</span></label>
                <select formControlName="environment" [class.has-error]="integrationForm.get('environment')?.invalid && integrationForm.get('environment')?.touched">
                  <option value="">Select environment</option>
                  <option value="Sandbox">Sandbox</option>
                  <option value="Production">Production</option>
                </select>
                <span class="field-error" *ngIf="integrationForm.get('environment')?.invalid && integrationForm.get('environment')?.touched">Required</span>
              </div>

              <div class="form-field" [class.autofilled]="isFieldAutofilled('webhookUrl')">
                <label>Callback/Webhook URL <span class="required">*</span></label>
                <input type="url" formControlName="webhookUrl" placeholder="https://api.company.com/webhooks/callback" (input)="onFieldEdited('webhookUrl')" [class.has-error]="integrationForm.get('webhookUrl')?.invalid && integrationForm.get('webhookUrl')?.touched">
                <span class="field-error" *ngIf="integrationForm.get('webhookUrl')?.invalid && integrationForm.get('webhookUrl')?.touched">Valid URL required</span>
              </div>

              <div class="form-field" [class.autofilled]="isFieldAutofilled('sandboxApiUrl')">
                <label>Sandbox API Base URL <span class="required">*</span></label>
                <input type="url" formControlName="sandboxApiUrl" placeholder="https://api.sandbox.company.com" (input)="onFieldEdited('sandboxApiUrl')" [class.has-error]="integrationForm.get('sandboxApiUrl')?.invalid && integrationForm.get('sandboxApiUrl')?.touched">
                <span class="field-error" *ngIf="integrationForm.get('sandboxApiUrl')?.invalid && integrationForm.get('sandboxApiUrl')?.touched">Valid URL required</span>
              </div>

              <div class="form-field" [class.autofilled]="isFieldAutofilled('authMethod')">
                <label>Auth Method <span class="required">*</span></label>
                <select formControlName="authMethod" (change)="onFieldEdited('authMethod')" [class.has-error]="integrationForm.get('authMethod')?.invalid && integrationForm.get('authMethod')?.touched">
                  <option value="">Select auth method</option>
                  <option value="API Key">API Key</option>
                  <option value="OAuth2">OAuth2</option>
                  <option value="Mutual TLS">Mutual TLS</option>
                  <option value="Managed Identity">Managed Identity</option>
                  <option value="Other">Other</option>
                </select>
                <span class="field-error" *ngIf="integrationForm.get('authMethod')?.invalid && integrationForm.get('authMethod')?.touched">Required</span>
              </div>

              <div class="form-field" *ngIf="integrationForm.get('webhookUrl')?.value">
                <label>Webhook Secret</label>
                <input type="text" formControlName="webhookSecret" placeholder="Enter webhook secret">
              </div>

              <div class="form-field">
                <label>Notes</label>
                <textarea formControlName="integrationNotes" rows="3" placeholder="Add any integration notes..."></textarea>
              </div>

              <div class="step-footer">
                <button type="button" class="btn-back" (click)="previousStep()">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8L10 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  Back
                </button>
                <button type="button" class="btn-primary" (click)="nextStep()">Next</button>
              </div>
            </div>

            <!-- Step 4: Compliance -->
            <div *ngIf="currentStepIndex() === 3" class="step-form">
              <div class="section-header">
                <h2>Compliance</h2>
                <p>Complete required reviews and documentation. Each item can be worked on independently.</p>
              </div>

              <div class="compliance-requirements">
                <div 
                  *ngFor="let req of complianceRequirements()" 
                  class="compliance-item"
                  [class.expanded]="isComplianceExpanded(req.id)"
                  [class.complete]="req.status === 'complete'"
                  [class.in-progress]="req.status === 'in_progress'">
                  
                  <!-- Collapsed Header -->
                  <div class="compliance-header" (click)="toggleComplianceExpand(req.id)">
                    <div class="compliance-header-left">
                      <span class="compliance-status-indicator" [class]="getStatusClass(req.status)">
                        <svg *ngIf="req.status === 'complete'" width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6L5 9L10 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                      </span>
                      <span class="compliance-name">{{ req.name }}</span>
                    </div>
                    <div class="compliance-header-right">
                      <span class="compliance-status-badge" [class]="getStatusClass(req.status)">
                        {{ getStatusLabel(req.status) }}
                      </span>
                      <svg class="expand-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M4 6L8 10L12 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </div>
                  </div>
                  
                  <!-- Expanded Content -->
                  <div class="compliance-content" *ngIf="isComplianceExpanded(req.id)">
                    <div class="compliance-form-grid">
                      <!-- Status -->
                      <div class="form-field">
                        <label>Status</label>
                        <select 
                          [value]="req.status" 
                          (change)="updateComplianceField(req.id, 'status', $any($event.target).value)">
                          <option value="not_started">Not started</option>
                          <option value="in_progress">In progress</option>
                          <option value="complete">Complete</option>
                        </select>
                      </div>
                      
                      <!-- Owner -->
                      <div class="form-field">
                        <label>Owner</label>
                        <input 
                          type="text" 
                          [ngModel]="req.owner"
                          (ngModelChange)="updateComplianceField(req.id, 'owner', $event)"
                          [ngModelOptions]="{standalone: true, updateOn: 'blur'}"
                          placeholder="Enter owner name or email">
                      </div>
                      
                      <!-- Date Completed (only when status is complete) -->
                      <div class="form-field" *ngIf="req.status === 'complete'">
                        <label>Date Completed <span class="required">*</span></label>
                        <input 
                          type="date" 
                          [ngModel]="req.dateCompleted"
                          (ngModelChange)="updateComplianceField(req.id, 'dateCompleted', $event)"
                          [ngModelOptions]="{standalone: true}">
                      </div>
                    </div>
                    
                    <!-- Evidence Upload -->
                    <div class="form-field evidence-field">
                      <label>Evidence</label>
                      <div class="evidence-upload-area">
                        <input 
                          type="file" 
                          [id]="'evidence-' + req.id"
                          multiple
                          (change)="onComplianceFileUpload(req.id, $event)"
                          class="file-input">
                        <label [for]="'evidence-' + req.id" class="upload-label">
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M8 12V4M4 8l4-4 4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                          </svg>
                          Upload files
                        </label>
                        <span class="upload-hint">or drag and drop</span>
                      </div>
                      
                      <!-- Uploaded Files List -->
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
                          <button type="button" class="remove-file" (click)="removeComplianceFile(req.id, i)" title="Remove file">
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <!-- Notes -->
                    <div class="form-field">
                      <label>Notes</label>
                      <textarea 
                        [ngModel]="req.notes"
                        (ngModelChange)="updateComplianceField(req.id, 'notes', $event)"
                        [ngModelOptions]="{standalone: true, updateOn: 'blur'}"
                        rows="2" 
                        placeholder="Add any notes for this requirement..."></textarea>
                    </div>
                  </div>
                </div>
              </div>

              <div class="step-footer">
                <button type="button" class="btn-back" (click)="previousStep()">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8L10 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  Back
                </button>
                <button type="button" class="btn-primary" (click)="nextStep()">Next</button>
              </div>
            </div>

            <!-- Step 5: Review -->
            <div *ngIf="currentStepIndex() === 4" class="step-form">
              <div class="section-header">
                <h2>Review</h2>
                <p>Review all information before completing onboarding.</p>
              </div>

              <!-- Intake Section -->
              <div class="review-section">
                <div class="review-section-title">Intake</div>
                <div class="review-grid">
                  <div class="review-item" *ngIf="intakeForm.get('internalOwner')?.value">
                    <span class="review-label">Internal Owner</span>
                    <span class="review-value">{{ intakeForm.get('internalOwner')?.value }}</span>
                  </div>
                  <div class="review-item" *ngIf="intakeForm.get('businessDomain')?.value">
                    <span class="review-label">Business Domain</span>
                    <span class="review-value">{{ intakeForm.get('businessDomain')?.value }}</span>
                  </div>
                  <div class="review-item" *ngIf="intakeForm.get('vendorType')?.value">
                    <span class="review-label">Vendor Type</span>
                    <span class="review-value">{{ intakeForm.get('vendorType')?.value }}</span>
                  </div>
                  <div class="review-item" *ngIf="intakeForm.get('targetGoLiveDate')?.value">
                    <span class="review-label">Target Go-Live Date</span>
                    <span class="review-value">{{ intakeForm.get('targetGoLiveDate')?.value }}</span>
                  </div>
                  <div class="review-item full-width" *ngIf="intakeForm.get('intakeNotes')?.value">
                    <span class="review-label">Notes</span>
                    <span class="review-value">{{ intakeForm.get('intakeNotes')?.value }}</span>
                  </div>
                </div>
              </div>

              <!-- Company Section -->
              <div class="review-section">
                <div class="review-section-title">Company</div>
                <div class="review-grid">
                  <div class="review-item" *ngIf="companyForm.get('legalCompanyName')?.value">
                    <span class="review-label">Legal Company Name</span>
                    <span class="review-value">{{ companyForm.get('legalCompanyName')?.value }}</span>
                  </div>
                  <div class="review-item" *ngIf="companyForm.get('dba')?.value">
                    <span class="review-label">DBA</span>
                    <span class="review-value">{{ companyForm.get('dba')?.value }}</span>
                  </div>
                  <div class="review-item" *ngIf="companyForm.get('primaryContactName')?.value">
                    <span class="review-label">Primary Contact Name</span>
                    <span class="review-value">{{ companyForm.get('primaryContactName')?.value }}</span>
                  </div>
                  <div class="review-item" *ngIf="companyForm.get('primaryContactEmail')?.value">
                    <span class="review-label">Primary Contact Email</span>
                    <span class="review-value">{{ companyForm.get('primaryContactEmail')?.value }}</span>
                  </div>
                  <div class="review-item" *ngIf="companyForm.get('technicalContactName')?.value">
                    <span class="review-label">Technical Contact Name</span>
                    <span class="review-value">{{ companyForm.get('technicalContactName')?.value }}</span>
                  </div>
                  <div class="review-item" *ngIf="companyForm.get('technicalContactEmail')?.value">
                    <span class="review-label">Technical Contact Email</span>
                    <span class="review-value">{{ companyForm.get('technicalContactEmail')?.value }}</span>
                  </div>
                  <div class="review-item" *ngIf="companyForm.get('supportEmail')?.value">
                    <span class="review-label">Support Email</span>
                    <span class="review-value">{{ companyForm.get('supportEmail')?.value }}</span>
                  </div>
                  <div class="review-item" *ngIf="companyForm.get('website')?.value">
                    <span class="review-label">Website</span>
                    <span class="review-value">{{ companyForm.get('website')?.value }}</span>
                  </div>
                  <div class="review-item" *ngIf="companyForm.get('country')?.value">
                    <span class="review-label">Country/Region</span>
                    <span class="review-value">{{ companyForm.get('country')?.value }}</span>
                  </div>
                  <div class="review-item full-width" *ngIf="companyForm.get('address')?.value">
                    <span class="review-label">Address</span>
                    <span class="review-value">{{ companyForm.get('address')?.value }}</span>
                  </div>
                </div>
              </div>

              <!-- Integration Section -->
              <div class="review-section">
                <div class="review-section-title">Integration</div>
                <div class="review-grid">
                  <div class="review-item" *ngIf="integrationForm.get('environment')?.value">
                    <span class="review-label">Environment</span>
                    <span class="review-value">{{ integrationForm.get('environment')?.value }}</span>
                  </div>
                  <div class="review-item" *ngIf="integrationForm.get('authMethod')?.value">
                    <span class="review-label">Auth Method</span>
                    <span class="review-value">{{ integrationForm.get('authMethod')?.value }}</span>
                  </div>
                  <div class="review-item full-width" *ngIf="integrationForm.get('webhookUrl')?.value">
                    <span class="review-label">Webhook URL</span>
                    <span class="review-value url-value">{{ integrationForm.get('webhookUrl')?.value }}</span>
                  </div>
                  <div class="review-item full-width" *ngIf="integrationForm.get('sandboxApiUrl')?.value">
                    <span class="review-label">Sandbox API URL</span>
                    <span class="review-value url-value">{{ integrationForm.get('sandboxApiUrl')?.value }}</span>
                  </div>
                  <div class="review-item" *ngIf="integrationForm.get('webhookSecret')?.value">
                    <span class="review-label">Webhook Secret</span>
                    <span class="review-value">••••••••</span>
                  </div>
                  <div class="review-item full-width" *ngIf="integrationForm.get('integrationNotes')?.value">
                    <span class="review-label">Notes</span>
                    <span class="review-value">{{ integrationForm.get('integrationNotes')?.value }}</span>
                  </div>
                </div>
              </div>

              <!-- Compliance Section -->
              <div class="review-section">
                <div class="review-section-title">Compliance</div>
                <div class="compliance-review-list">
                  <div *ngFor="let req of complianceRequirements()" class="compliance-review-item" [class.complete]="req.status === 'complete'">
                    <div class="compliance-review-header">
                      <span class="compliance-review-indicator" [class]="getStatusClass(req.status)">
                        <svg *ngIf="req.status === 'complete'" width="10" height="10" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6L5 9L10 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                      </span>
                      <span class="compliance-review-name">{{ req.name }}</span>
                      <span class="compliance-review-status" [class]="getStatusClass(req.status)">{{ getStatusLabel(req.status) }}</span>
                    </div>
                    <div class="compliance-review-details" *ngIf="req.owner || req.dateCompleted || req.evidence.length > 0 || req.notes">
                      <div class="review-detail" *ngIf="req.owner">
                        <span class="detail-label">Owner:</span>
                        <span class="detail-value">{{ req.owner }}</span>
                      </div>
                      <div class="review-detail" *ngIf="req.dateCompleted">
                        <span class="detail-label">Completed:</span>
                        <span class="detail-value">{{ req.dateCompleted }}</span>
                      </div>
                      <div class="review-detail" *ngIf="req.evidence.length > 0">
                        <span class="detail-label">Evidence:</span>
                        <span class="detail-value">{{ req.evidence.length }} file{{ req.evidence.length > 1 ? 's' : '' }} uploaded</span>
                      </div>
                      <div class="review-detail full-width" *ngIf="req.notes">
                        <span class="detail-label">Notes:</span>
                        <span class="detail-value">{{ req.notes }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="form-divider"></div>

              <p class="info-text">After onboard completion:</p>
              <ul class="info-list">
                <li>Vendor record will be created</li>
                <li>Sandbox validation will run</li>
                <li>Notifications sent to contacts</li>
              </ul>

              <div class="step-footer">
                <button type="button" class="btn-back" (click)="previousStep()">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8L10 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  Back
                </button>
                <button type="button" class="btn-primary" (click)="completeOnboarding()">Complete Onboarding</button>
              </div>
            </div>

          </div>
          </div>

          <!-- Right: Summary Sidebar (hidden on Review step) -->
          <aside class="summary-sidebar" [class.hidden-on-review]="currentStepIndex() === 4">
            <div class="sidebar-header">
              <h3>Onboarding Summary</h3>
            </div>

            <div class="sidebar-sections">
              <!-- Intake Section -->
              <div class="sidebar-section">
                <div class="section-header-row">
                  <span class="section-status" [class.complete]="getSectionStatus('intake') === 'Complete'" [class.in-progress]="getSectionStatus('intake') === 'In progress'">
                    <svg *ngIf="getSectionStatus('intake') === 'Complete'" width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6L5 9L10 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </span>
                  <span class="section-name">Intake</span>
                </div>
                <div class="section-content">
                  <div class="summary-row" *ngIf="intakeForm.get('internalOwner')?.value">
                    <span class="summary-label">Owner</span>
                    <span class="summary-value">{{ intakeForm.get('internalOwner')?.value }}</span>
                  </div>
                  <div class="summary-row" *ngIf="intakeForm.get('businessDomain')?.value">
                    <span class="summary-label">Domain</span>
                    <span class="summary-value">{{ intakeForm.get('businessDomain')?.value }}</span>
                  </div>
                  <div class="summary-row" *ngIf="intakeForm.get('vendorType')?.value">
                    <span class="summary-label">Type</span>
                    <span class="summary-value">{{ intakeForm.get('vendorType')?.value }}</span>
                  </div>
                  <div class="summary-row" *ngIf="intakeForm.get('targetGoLiveDate')?.value">
                    <span class="summary-label">Go-live</span>
                    <span class="summary-value">{{ intakeForm.get('targetGoLiveDate')?.value }}</span>
                  </div>
                  <div class="summary-empty" *ngIf="!intakeForm.get('internalOwner')?.value && !intakeForm.get('businessDomain')?.value">
                    —
                  </div>
                </div>
              </div>

              <!-- Company Section -->
              <div class="sidebar-section">
                <div class="section-header-row">
                  <span class="section-status" [class.complete]="getSectionStatus('company') === 'Complete'" [class.in-progress]="getSectionStatus('company') === 'In progress'">
                    <svg *ngIf="getSectionStatus('company') === 'Complete'" width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6L5 9L10 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </span>
                  <span class="section-name">Company</span>
                </div>
                <div class="section-content">
                  <div class="summary-row" *ngIf="companyForm.get('legalCompanyName')?.value">
                    <span class="summary-label">Company</span>
                    <span class="summary-value">{{ companyForm.get('legalCompanyName')?.value }}</span>
                  </div>
                  <div class="summary-row" *ngIf="companyForm.get('primaryContactName')?.value">
                    <span class="summary-label">Contact</span>
                    <span class="summary-value">{{ companyForm.get('primaryContactName')?.value }}</span>
                  </div>
                  <div class="summary-row" *ngIf="companyForm.get('primaryContactEmail')?.value">
                    <span class="summary-label">Email</span>
                    <span class="summary-value">{{ companyForm.get('primaryContactEmail')?.value }}</span>
                  </div>
                  <div class="summary-row" *ngIf="companyForm.get('country')?.value">
                    <span class="summary-label">Region</span>
                    <span class="summary-value">{{ companyForm.get('country')?.value }}</span>
                  </div>
                  <div class="summary-empty" *ngIf="!companyForm.get('legalCompanyName')?.value && !companyForm.get('primaryContactName')?.value">
                    —
                  </div>
                </div>
              </div>

              <!-- Integration Section -->
              <div class="sidebar-section">
                <div class="section-header-row">
                  <span class="section-status" [class.complete]="getSectionStatus('integration') === 'Complete'" [class.in-progress]="getSectionStatus('integration') === 'In progress'">
                    <svg *ngIf="getSectionStatus('integration') === 'Complete'" width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6L5 9L10 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </span>
                  <span class="section-name">Integration</span>
                </div>
                <div class="section-content">
                  <div class="summary-row" *ngIf="integrationForm.get('environment')?.value">
                    <span class="summary-label">Environment</span>
                    <span class="summary-value">{{ integrationForm.get('environment')?.value }}</span>
                  </div>
                  <div class="summary-row" *ngIf="integrationForm.get('authMethod')?.value">
                    <span class="summary-label">Auth</span>
                    <span class="summary-value">{{ integrationForm.get('authMethod')?.value }}</span>
                  </div>
                  <div class="summary-row" *ngIf="integrationForm.get('webhookUrl')?.value">
                    <span class="summary-label">Webhook</span>
                    <span class="summary-value truncate">{{ integrationForm.get('webhookUrl')?.value }}</span>
                  </div>
                  <div class="summary-empty" *ngIf="!integrationForm.get('environment')?.value && !integrationForm.get('authMethod')?.value">
                    —
                  </div>
                </div>
              </div>

              <!-- Compliance Section -->
              <div class="sidebar-section">
                <div class="section-header-row">
                  <span class="section-status" [class.complete]="getSectionStatus('compliance') === 'Complete'" [class.in-progress]="getSectionStatus('compliance') === 'In progress'">
                    <svg *ngIf="getSectionStatus('compliance') === 'Complete'" width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6L5 9L10 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </span>
                  <span class="section-name">Compliance</span>
                </div>
                <div class="section-content">
                  <div class="summary-row" *ngFor="let req of complianceRequirements()">
                    <span class="summary-label compliance-summary-label" [class]="getStatusClass(req.status)">
                      <svg *ngIf="req.status === 'complete'" width="10" height="10" viewBox="0 0 12 12" fill="none" class="check-icon">
                        <path d="M2 6L5 9L10 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                      {{ req.name.length > 20 ? req.name.substring(0, 18) + '...' : req.name }}
                    </span>
                    <span class="summary-value compliance-status-mini" [class]="getStatusClass(req.status)">
                      {{ req.status === 'complete' ? '✓' : req.status === 'in_progress' ? '...' : '—' }}
                    </span>
                  </div>
                  <div class="summary-row compliance-total">
                    <span class="summary-label">Progress</span>
                    <span class="summary-value">{{ getComplianceCount() }} of {{ complianceRequirements().length }}</span>
                  </div>
                </div>
              </div>

              <!-- Review Section -->
              <div class="sidebar-section">
                <div class="section-header-row">
                  <span class="section-status" [class.complete]="getSectionStatus('review') === 'Complete'" [class.in-progress]="getSectionStatus('review') === 'In progress'">
                    <svg *ngIf="getSectionStatus('review') === 'Complete'" width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6L5 9L10 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </span>
                  <span class="section-name">Review</span>
                </div>
                <div class="section-content">
                  <div class="summary-empty">—</div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  `,
  styleUrls: ['./vendor-onboarding.page.scss'],
  encapsulation: ViewEncapsulation.None
})
export class VendorOnboardingPage implements OnInit, OnDestroy, AfterViewInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private logger = inject(LoggerService);
  private vendorService = inject(VendorCompanyService);
  private elementRef = inject(ElementRef);
  private destroy$ = new Subject<void>();
  private previousBodyOverflow = '';

  currentStepIndex = signal(0);
  validationErrorMessage = signal<string>('');
  showExitConfirmation = signal(false);
  isExiting = signal(false);
  showAddress = false;

  getSectionStatus(section: string): 'Not started' | 'In progress' | 'Complete' {
    switch (section) {
      case 'intake':
        if (this.intakeForm.valid) return 'Complete';
        if (this.intakeForm.dirty || Object.values(this.intakeForm.value).some(v => v)) return 'In progress';
        return 'Not started';
      case 'company':
        if (this.companyForm.valid) return 'Complete';
        if (this.companyForm.dirty || Object.values(this.companyForm.value).some(v => v)) return 'In progress';
        return 'Not started';
      case 'integration':
        if (this.integrationForm.valid) return 'Complete';
        if (this.integrationForm.dirty || Object.values(this.integrationForm.value).some(v => v)) return 'In progress';
        return 'Not started';
      case 'compliance':
        const reqs = this.complianceRequirements();
        const allComplete = reqs.every(r => r.status === 'complete');
        const anyStarted = reqs.some(r => r.status !== 'not_started');
        if (allComplete) return 'Complete';
        if (anyStarted) return 'In progress';
        return 'Not started';
      case 'review':
        // Review is complete when everything else is complete and they're on the last step
        if (this.currentStepIndex() === 4 && this.canComplete()) return 'Complete';
        if (this.currentStepIndex() === 4) return 'In progress';
        return 'Not started';
      default:
        return 'Not started';
    }
  }

  getComplianceCount(): number {
    return this.complianceRequirements().filter(r => r.status === 'complete').length;
  }

  canComplete(): boolean {
    // Compliance items are optional for onboarding completion
    // Activation gating is handled separately on the Vendor Details page
    return this.intakeForm.valid && 
           this.companyForm.valid && 
           this.integrationForm.valid;
  }

  // Helper methods for Review step - check if section has any filled data
  hasIntakeData(): boolean {
    const values = this.intakeForm.value;
    return Object.values(values).some(v => v !== null && v !== undefined && v !== '');
  }

  hasCompanyData(): boolean {
    const values = this.companyForm.value;
    return Object.values(values).some(v => v !== null && v !== undefined && v !== '');
  }

  hasIntegrationData(): boolean {
    const values = this.integrationForm.value;
    return Object.values(values).some(v => v !== null && v !== undefined && v !== '');
  }

  hasComplianceData(): boolean {
    return this.complianceRequirements().some(r => 
      r.status !== 'not_started' || 
      r.owner !== '' || 
      r.evidence.length > 0 || 
      r.notes !== ''
    );
  }

  // Assisted Intake state
  showAssistedIntake = signal(false);
  assistedIntakeText = signal('');
  assistedIntakeFile = signal<File | null>(null);
  isParsingVendorInfo = signal(false);
  parseSuccessMessage = signal('');
  parseErrorMessage = signal('');
  autofilledFields = signal<Set<string>>(new Set());
  
  // Computed: can parse (has text or file)
  canParse = computed(() => {
    return this.assistedIntakeText().trim().length > 0 || this.assistedIntakeFile() !== null;
  });

  toggleAssistedIntake() {
    this.showAssistedIntake.update(v => !v);
  }

  // Forms
  intakeForm: FormGroup = this.fb.group({
    internalOwner: ['', Validators.required],
    businessDomain: ['', Validators.required],
    vendorType: ['', Validators.required],
    targetGoLiveDate: [''],
    intakeNotes: ['']
  });

  companyForm: FormGroup = this.fb.group({
    legalCompanyName: ['', Validators.required],
    dba: [''],
    primaryContactName: ['', Validators.required],
    primaryContactEmail: ['', [Validators.required, Validators.email]],
    technicalContactName: ['', Validators.required],
    technicalContactEmail: ['', [Validators.required, Validators.email]],
    supportEmail: [''],
    website: [''],
    country: [''],
    address: ['']
  });

  integrationForm: FormGroup = this.fb.group({
    environment: ['Sandbox', Validators.required],
    webhookUrl: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
    sandboxApiUrl: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
    authMethod: ['', Validators.required],
    webhookSecret: [''],
    integrationNotes: ['']
  });

  // Computed signal to track form validity in real-time
  intakeFormValid = computed(() => {
    this.intakeForm.updateValueAndValidity({ emitEvent: false });
    return this.intakeForm.valid;
  });

  constructor() {
    effect(() => {
      const valid = this.intakeFormValid();
      if (this.currentStepIndex() === 0) {
        console.log('[Vendor Onboarding] Step 0 form validity:', valid, 'Values:', this.intakeForm.value);
      }
    });
  }

  ngOnInit() {
    this.lockBodyScroll();
    this.loadDraft();
    this.setupFormChangeListeners();
    
    this.intakeForm.statusChanges.pipe(takeUntil(this.destroy$)).subscribe(status => {
      console.log('[Vendor Onboarding] Intake form status:', status, 'Valid:', this.intakeForm.valid);
    });
    
    this.intakeForm.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(values => {
      console.log('[Vendor Onboarding] Intake form values changed:', values);
      this.intakeForm.updateValueAndValidity({ emitEvent: false });
    });
  }

  ngAfterViewInit() {
    // Focus the modal heading for screen reader announcement, after entrance animation
    setTimeout(() => {
      const heading = this.elementRef.nativeElement.querySelector('#onboarding-title');
      if (heading) {
        heading.setAttribute('tabindex', '-1');
        heading.focus();
      } else {
        // Fallback to first focusable element
        const firstFocusable = this.elementRef.nativeElement.querySelector(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (firstFocusable) {
          firstFocusable.focus();
        }
      }
    }, 250); // Wait for entrance animation (220ms) + small buffer
  }

  ngOnDestroy() {
    this.unlockBodyScroll();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Lock body scroll when modal is open
  private lockBodyScroll() {
    this.previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }

  // Restore body scroll when modal closes
  private unlockBodyScroll() {
    document.body.style.overflow = this.previousBodyOverflow;
  }

  // Animate exit then navigate
  private animateExitAndNavigate(targetRoute: string | string[]) {
    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (prefersReducedMotion) {
      // Skip animation for reduced motion preference
      this.router.navigate(Array.isArray(targetRoute) ? targetRoute : [targetRoute]);
      return;
    }
    
    // Apply exit animation
    this.isExiting.set(true);
    
    // Wait for animation to complete (170ms), then navigate
    setTimeout(() => {
      this.router.navigate(Array.isArray(targetRoute) ? targetRoute : [targetRoute]);
    }, 180);
  }

  // Handle keyboard events for focus trap and ESC
  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.handleEscapeKey();
    }

    // Focus trap
    if (event.key === 'Tab') {
      this.trapFocus(event);
    }
  }

  private handleEscapeKey() {
    if (this.showExitConfirmation()) {
      this.cancelExit();
    } else if (this.hasAnyData()) {
      this.showExitConfirmation.set(true);
    } else {
      this.animateExitAndNavigate('/vendors/companies');
    }
  }

  private trapFocus(event: KeyboardEvent) {
    const container = this.elementRef.nativeElement.querySelector('.onboarding-takeover');
    if (!container) return;

    const focusableElements = container.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    
    const firstFocusable = focusableElements[0] as HTMLElement;
    const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;

    if (event.shiftKey) {
      if (document.activeElement === firstFocusable) {
        event.preventDefault();
        lastFocusable.focus();
      }
    } else {
      if (document.activeElement === lastFocusable) {
        event.preventDefault();
        firstFocusable.focus();
      }
    }
  }

  // Exit confirmation handlers
  cancelExit() {
    this.showExitConfirmation.set(false);
  }

  confirmSaveAndExit() {
    this.showExitConfirmation.set(false);
    this.onSaveAndExit();
  }

  confirmDiscardAndExit() {
    this.showExitConfirmation.set(false);
    this.clearDraft();
    this.animateExitAndNavigate('/vendors/companies');
  }

  // Compliance requirements - each is an independent workstream
  complianceRequirements = signal<ComplianceRequirement[]>([
    {
      id: 'security-review',
      name: 'Security review',
      status: 'not_started',
      owner: '',
      evidence: [],
      dateCompleted: '',
      notes: ''
    },
    {
      id: 'documentation',
      name: 'Required documentation received',
      status: 'not_started',
      owner: '',
      evidence: [],
      dateCompleted: '',
      notes: ''
    },
    {
      id: 'data-agreement',
      name: 'Data processing agreement signed',
      status: 'not_started',
      owner: '',
      evidence: [],
      dateCompleted: '',
      notes: ''
    },
    {
      id: 'apim-policies',
      name: 'APIM policies applied',
      status: 'not_started',
      owner: '',
      evidence: [],
      dateCompleted: '',
      notes: ''
    }
  ]);

  // Track which compliance items are expanded
  expandedComplianceIds = signal<Set<string>>(new Set());

  // Toggle compliance item expansion
  toggleComplianceExpand(id: string) {
    const current = this.expandedComplianceIds();
    const updated = new Set(current);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    this.expandedComplianceIds.set(updated);
  }

  isComplianceExpanded(id: string): boolean {
    return this.expandedComplianceIds().has(id);
  }

  // Update a compliance requirement field
  updateComplianceField(id: string, field: keyof ComplianceRequirement, value: any) {
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
    this.onComplianceChange();
  }

  // Handle file upload for a compliance requirement
  onComplianceFileUpload(id: string, event: Event) {
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

  // Remove a file from a compliance requirement
  removeComplianceFile(id: string, fileIndex: number) {
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

  // Get status label for display
  getStatusLabel(status: ComplianceStatus): string {
    switch (status) {
      case 'not_started': return 'Not started';
      case 'in_progress': return 'In progress';
      case 'complete': return 'Complete';
      default: return 'Not started';
    }
  }

  // Get status class for styling
  getStatusClass(status: ComplianceStatus): string {
    return status.replace('_', '-');
  }

  // Format file size
  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  // Legacy complianceData getter for backward compatibility
  get complianceData() {
    const reqs = this.complianceRequirements();
    return {
      securityReview: reqs.find(r => r.id === 'security-review')?.status === 'complete',
      documentationReceived: reqs.find(r => r.id === 'documentation')?.status === 'complete',
      dataAgreementSigned: reqs.find(r => r.id === 'data-agreement')?.status === 'complete',
      apimPoliciesApplied: reqs.find(r => r.id === 'apim-policies')?.status === 'complete',
      complianceOwner: reqs[0]?.owner || '',
      dateCompleted: reqs.find(r => r.status === 'complete')?.dateCompleted || '',
      notes: reqs.map(r => r.notes).filter(n => n).join('; ')
    };
  }

  steps = signal<OnboardingStep[]>([
    {
      id: 'intake',
      label: 'Intake',
      description: 'Capture internal context',
      completed: false
    },
    {
      id: 'company',
      label: 'Company',
      description: 'Enter vendor details',
      completed: false
    },
    {
      id: 'integration',
      label: 'Integration',
      description: 'Configure endpoints',
      completed: false
    },
    {
      id: 'compliance',
      label: 'Compliance',
      description: 'Confirm reviews',
      completed: false
    },
    {
      id: 'review',
      label: 'Review',
      description: 'Final review',
      completed: false
    }
  ]);

  isInProgress = computed(() => {
    return this.currentStepIndex() > 0 || this.hasAnyData();
  });

  isCompleted = computed(() => {
    return this.steps().every(s => s.completed);
  });

  getCurrentStepLabel(): string {
    return this.steps()[this.currentStepIndex()]?.label || '';
  }

  getPreviousStepLabel(): string {
    const prevIndex = this.currentStepIndex() - 1;
    return prevIndex >= 0 ? this.steps()[prevIndex].label : '';
  }

  private setupFormChangeListeners() {
    this.intakeForm.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.updateStepCompletion(0, this.intakeForm.valid);
      if (this.validationErrorMessage() && this.currentStepIndex() === 0) {
        this.validationErrorMessage.set('');
      }
    });
    
    this.companyForm.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.updateStepCompletion(1, this.companyForm.valid);
      if (this.validationErrorMessage() && this.currentStepIndex() === 1) {
        this.validationErrorMessage.set('');
      }
    });
    
    this.integrationForm.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.updateStepCompletion(2, this.integrationForm.valid);
      if (this.validationErrorMessage() && this.currentStepIndex() === 2) {
        this.validationErrorMessage.set('');
      }
    });
  }

  private updateStepCompletion(stepIndex: number, completed: boolean) {
    const currentSteps = this.steps();
    if (currentSteps[stepIndex].completed !== completed) {
      currentSteps[stepIndex].completed = completed;
      this.steps.set([...currentSteps]);
      setTimeout(() => this.saveDraft(), 0);
    }
  }

  onComplianceChange() {
    if (this.validationErrorMessage() && this.currentStepIndex() === 3) {
      this.validationErrorMessage.set('');
    }
    setTimeout(() => {
      this.updateStepCompletion(3, this.canProceed());
      this.saveDraft();
    }, 0);
  }

  canAccessStep(stepIndex: number): boolean {
    // Allow free navigation between all steps
    return stepIndex >= 0 && stepIndex < this.steps().length;
  }

  navigateToStep(stepIndex: number) {
    // Allow clicking on any step to navigate directly
    if (stepIndex >= 0 && stepIndex < this.steps().length) {
      this.currentStepIndex.set(stepIndex);
      this.validationErrorMessage.set(''); // Clear any validation errors when switching steps
      this.saveDraft();
    }
  }

  getValidationMessage(): string {
    const index = this.currentStepIndex();
    
    if (index === 0) {
      const invalidFields: string[] = [];
      if (this.intakeForm.get('internalOwner')?.invalid) invalidFields.push('Internal Owner');
      if (this.intakeForm.get('businessDomain')?.invalid) invalidFields.push('Business Domain');
      if (this.intakeForm.get('vendorType')?.invalid) invalidFields.push('Vendor Type');
      return invalidFields.length > 0 
        ? `Please fill in the following required fields: ${invalidFields.join(', ')}` 
        : '';
    }
    
    if (index === 1) {
      const invalidFields: string[] = [];
      if (this.companyForm.get('legalCompanyName')?.invalid) invalidFields.push('Legal Company Name');
      if (this.companyForm.get('primaryContactName')?.invalid) invalidFields.push('Primary Contact Name');
      if (this.companyForm.get('primaryContactEmail')?.invalid) {
        if (this.companyForm.get('primaryContactEmail')?.hasError('required')) {
          invalidFields.push('Primary Contact Email');
        } else if (this.companyForm.get('primaryContactEmail')?.hasError('email')) {
          invalidFields.push('Primary Contact Email (must be a valid email)');
        }
      }
      if (this.companyForm.get('technicalContactName')?.invalid) invalidFields.push('Technical Contact Name');
      if (this.companyForm.get('technicalContactEmail')?.invalid) {
        if (this.companyForm.get('technicalContactEmail')?.hasError('required')) {
          invalidFields.push('Technical Contact Email');
        } else if (this.companyForm.get('technicalContactEmail')?.hasError('email')) {
          invalidFields.push('Technical Contact Email (must be a valid email)');
        }
      }
      return invalidFields.length > 0 
        ? `Please fill in the following required fields: ${invalidFields.join(', ')}` 
        : '';
    }
    
    if (index === 2) {
      const invalidFields: string[] = [];
      if (this.integrationForm.get('environment')?.invalid) invalidFields.push('Environment');
      if (this.integrationForm.get('webhookUrl')?.invalid) {
        if (this.integrationForm.get('webhookUrl')?.hasError('required')) {
          invalidFields.push('Webhook URL');
        } else if (this.integrationForm.get('webhookUrl')?.hasError('pattern')) {
          invalidFields.push('Webhook URL (must be a valid https:// URL)');
        }
      }
      if (this.integrationForm.get('sandboxApiUrl')?.invalid) {
        if (this.integrationForm.get('sandboxApiUrl')?.hasError('required')) {
          invalidFields.push('Sandbox API URL');
        } else if (this.integrationForm.get('sandboxApiUrl')?.hasError('pattern')) {
          invalidFields.push('Sandbox API URL (must be a valid https:// URL)');
        }
      }
      if (this.integrationForm.get('authMethod')?.invalid) invalidFields.push('Authentication Method');
      return invalidFields.length > 0 
        ? `Please fill in the following required fields: ${invalidFields.join(', ')}` 
        : '';
    }
    
    if (index === 3) {
      // Compliance items are optional during onboarding - activation gating is separate
      return '';
    }
    
    return '';
  }

  canProceed(): boolean {
    const index = this.currentStepIndex();
    
    if (index === 0) {
      this.intakeForm.updateValueAndValidity();
      const isValid = this.intakeForm.valid;
      
      if (!isValid) {
        Object.keys(this.intakeForm.controls).forEach(key => {
          const control = this.intakeForm.get(key);
          if (control && control.invalid) {
            console.log(`[Vendor Onboarding] Field '${key}' is invalid:`, {
              errors: control.errors,
              value: control.value,
              touched: control.touched,
              dirty: control.dirty
            });
          }
        });
      }
      return isValid;
    }
    if (index === 1) {
      this.companyForm.updateValueAndValidity();
      return this.companyForm.valid;
    }
    if (index === 2) {
      this.integrationForm.updateValueAndValidity();
      return this.integrationForm.valid;
    }
    if (index === 3) {
      // Compliance items are optional during onboarding - always allow proceeding
      // Activation gating happens separately after onboarding
      return true;
    }
    if (index === 4) {
      return true;
    }
    
    return false;
  }

  nextStep() {
    const index = this.currentStepIndex();
    
    if (index === 0) {
      this.intakeForm.markAllAsTouched();
      if (!this.intakeForm.valid) {
        this.validationErrorMessage.set(this.getValidationMessage());
        this.logger.warn('Cannot proceed: intake form is invalid', this.intakeForm.errors);
        return;
      }
    } else if (index === 1) {
      this.companyForm.markAllAsTouched();
      if (!this.companyForm.valid) {
        this.validationErrorMessage.set(this.getValidationMessage());
        this.logger.warn('Cannot proceed: company form is invalid', this.companyForm.errors);
        return;
      }
    } else if (index === 2) {
      this.integrationForm.markAllAsTouched();
      if (!this.integrationForm.valid) {
        this.validationErrorMessage.set(this.getValidationMessage());
        this.logger.warn('Cannot proceed: integration form is invalid', this.integrationForm.errors);
        return;
      }
    } else if (index === 3) {
      // Compliance is optional - no blocking validation
      // Clear any previous error messages
      this.validationErrorMessage.set('');
    }
    
    this.validationErrorMessage.set('');
    
    if (this.currentStepIndex() < this.steps().length - 1 && this.canProceed()) {
      const nextIndex = this.currentStepIndex() + 1;
      this.currentStepIndex.set(nextIndex);
      
      const currentSteps = this.steps();
      currentSteps[this.currentStepIndex() - 1].completed = true;
      this.steps.set([...currentSteps]);
      
      this.saveDraft();
    }
  }

  previousStep() {
    if (this.currentStepIndex() > 0) {
      this.currentStepIndex.update(idx => idx - 1);
      this.saveDraft();
    }
  }

  onCancel() {
    if (this.hasAnyData()) {
      this.showExitConfirmation.set(true);
    } else {
      this.animateExitAndNavigate('/vendors/companies');
    }
  }

  onSaveAndExit() {
    this.saveDraft();
    this.logger.info('Onboarding draft saved', { step: this.currentStepIndex() });
    this.animateExitAndNavigate('/vendors/companies');
  }

  onDiscardDraft() {
    if (this.hasAnyData()) {
      this.showExitConfirmation.set(true);
    } else {
      this.clearDraft();
      this.animateExitAndNavigate('/vendors/companies');
    }
  }

  completeOnboarding() {
    if (!this.canProceed()) {
      this.validationErrorMessage.set(this.getValidationMessage());
      this.logger.warn('Cannot complete onboarding: validation failed');
      return;
    }

    this.validationErrorMessage.set('');

    const currentSteps = this.steps();
    currentSteps.forEach(s => s.completed = true);
    this.steps.set([...currentSteps]);

    const onboardingData = {
      intake: this.intakeForm.value,
      company: this.companyForm.value,
      integration: this.integrationForm.value,
      complianceRequirements: this.complianceRequirements()
    };

    this.logger.info('Onboarding completed', { data: onboardingData });

    const legalName = this.companyForm.get('legalCompanyName')?.value;
    const dba = this.companyForm.get('dba')?.value;
    
    const vendorData = {
      companyName: legalName,
      dba: dba,
      legalName: legalName,
      primaryContactName: this.companyForm.get('primaryContactName')?.value,
      primaryContactEmail: this.companyForm.get('primaryContactEmail')?.value,
      technicalContactName: this.companyForm.get('technicalContactName')?.value,
      technicalContactEmail: this.companyForm.get('technicalContactEmail')?.value,
      vendorType: this.intakeForm.get('vendorType')?.value,
      purpose: this.intakeForm.get('businessDomain')?.value,
      category: this.intakeForm.get('vendorType')?.value,
      isActive: true,
      integrationModes: ['API'],
      targetSystems: [],
      environments: [this.integrationForm.get('environment')?.value || 'Sandbox'],
      timeZone: 'America/New_York',
      notes: this.intakeForm.get('intakeNotes')?.value
    };

    this.vendorService.createVendor(vendorData).subscribe({
      next: (createdVendor) => {
        this.logger.info('Vendor created successfully', { vendorId: createdVendor.id });
        this.clearDraft();
        
        alert(`Vendor "${createdVendor.name}" onboarding completed successfully!`);
        
        this.animateExitAndNavigate(['/vendors/companies', createdVendor.id]);
      },
      error: (err) => {
        this.logger.error('Error creating vendor', err);
        alert('Failed to complete onboarding. Please try again.');
      }
    });
  }

  hasAnyData(): boolean {
    return this.intakeForm.dirty ||
           this.companyForm.dirty ||
           this.integrationForm.dirty ||
           this.hasComplianceData();
  }

  private saveDraft() {
    const draft = {
      currentStep: this.currentStepIndex(),
      intake: this.intakeForm.value,
      company: this.companyForm.value,
      integration: this.integrationForm.value,
      complianceRequirements: this.complianceRequirements(),
      steps: this.steps()
    };
    try {
      localStorage.setItem('vendorOnboardingDraft', JSON.stringify(draft));
    } catch (e) {
      this.logger.warn('Failed to save draft to localStorage', e);
    }
  }

  private loadDraft() {
    try {
      const draftStr = localStorage.getItem('vendorOnboardingDraft');
      if (draftStr) {
        const draft = JSON.parse(draftStr);
        this.currentStepIndex.set(draft.currentStep || 0);
        
        if (draft.intake) {
          this.intakeForm.patchValue(draft.intake);
        }
        if (draft.company) {
          this.companyForm.patchValue(draft.company);
        }
        if (draft.integration) {
          this.integrationForm.patchValue(draft.integration);
        }
        if (draft.complianceRequirements && Array.isArray(draft.complianceRequirements)) {
          // Restore compliance requirements, merging with current structure
          const currentReqs = this.complianceRequirements();
          const restoredReqs = currentReqs.map(req => {
            const savedReq = draft.complianceRequirements.find((s: any) => s.id === req.id);
            return savedReq ? { ...req, ...savedReq } : req;
          });
          this.complianceRequirements.set(restoredReqs);
        }
        if (draft.steps && Array.isArray(draft.steps)) {
          // Only restore the 'completed' status, keep current step definitions (id, label, description)
          const currentSteps = this.steps();
          draft.steps.forEach((savedStep: { id?: string; completed?: boolean }, index: number) => {
            if (index < currentSteps.length && typeof savedStep.completed === 'boolean') {
              currentSteps[index].completed = savedStep.completed;
            }
          });
          this.steps.set([...currentSteps]);
        }
      }
    } catch (e) {
      this.logger.warn('Failed to load draft from localStorage', e);
    }
  }

  private clearDraft() {
    try {
      localStorage.removeItem('vendorOnboardingDraft');
    } catch (e) {
      this.logger.warn('Failed to clear draft from localStorage', e);
    }
  }

  // ========================================
  // Assisted Intake Methods
  // ========================================

  onAssistedIntakeTextChange(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    this.assistedIntakeText.set(target.value);
    // Clear messages when user starts typing again
    this.parseSuccessMessage.set('');
    this.parseErrorMessage.set('');
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const allowedTypes = [
        'text/plain',
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/csv',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ];
      
      if (allowedTypes.includes(file.type) || file.name.match(/\.(txt|pdf|docx|csv|xlsx)$/i)) {
        this.assistedIntakeFile.set(file);
        this.parseSuccessMessage.set('');
        this.parseErrorMessage.set('');
      } else {
        this.parseErrorMessage.set('Please select a valid file type (.txt, .pdf, .docx, .csv, .xlsx)');
      }
    }
  }

  clearAssistedIntake() {
    this.assistedIntakeText.set('');
    this.assistedIntakeFile.set(null);
    this.parseSuccessMessage.set('');
    this.parseErrorMessage.set('');
    // Reset file input
    const fileInput = document.getElementById('vendor-file-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  async parseAndPrefill() {
    if (!this.canParse()) return;

    this.isParsingVendorInfo.set(true);
    this.parseSuccessMessage.set('');
    this.parseErrorMessage.set('');

    try {
      // Get content to parse
      let contentToParse = this.assistedIntakeText();
      
      // If a file is selected, read its content (for .txt files, stub for others)
      if (this.assistedIntakeFile()) {
        const file = this.assistedIntakeFile()!;
        if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
          contentToParse = await this.readFileAsText(file);
        } else {
          // For PDF, DOCX, etc., we'd call a backend service
          // For now, use the pasted text as fallback or show a message
          if (!contentToParse) {
            contentToParse = `[File: ${file.name}] - File content extraction would be handled by backend service`;
          }
        }
      }

      // Simulate parsing delay (would be API call in production)
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Parse the content
      const parsedInfo = this.parseVendorInfoFromText(contentToParse);
      
      if (Object.keys(parsedInfo).length === 0) {
        this.parseErrorMessage.set("We couldn't confidently parse this content. You can edit and retry, or continue manually.");
        return;
      }

      // Prefill fields that are currently empty
      const filledFields = this.prefillEmptyFields(parsedInfo);
      
      if (filledFields.length > 0) {
        this.parseSuccessMessage.set(`${filledFields.length} field${filledFields.length > 1 ? 's were' : ' was'} autofilled. Review as you continue.`);
        // Track autofilled fields
        const currentAutofilled = new Set(this.autofilledFields());
        filledFields.forEach(f => currentAutofilled.add(f));
        this.autofilledFields.set(currentAutofilled);
      } else {
        this.parseSuccessMessage.set('No empty fields to fill. Your existing data was preserved.');
      }

    } catch (error) {
      this.logger.error('Error parsing vendor info', error);
      this.parseErrorMessage.set("We couldn't confidently parse this. You can still continue manually.");
    } finally {
      this.isParsingVendorInfo.set(false);
    }
  }

  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  /**
   * Parse vendor information from text content.
   * This is a stub implementation - in production, this would call an AI/ML service.
   */
  private parseVendorInfoFromText(text: string): ParsedVendorInfo {
    const parsed: ParsedVendorInfo = {};
    const lowerText = text.toLowerCase();

    // Company name patterns
    const companyPatterns = [
      /(?:company|vendor|organization|business)\s*(?:name)?[:\s]+([^\n,]+)/i,
      /(?:legal\s+)?(?:company|entity)\s*name[:\s]+([^\n,]+)/i,
      /^([A-Z][a-zA-Z\s&]+(?:Inc\.?|LLC|Corp\.?|Ltd\.?|Company))/m
    ];
    for (const pattern of companyPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        parsed.legalCompanyName = match[1].trim();
        break;
      }
    }

    // DBA
    const dbaMatch = text.match(/(?:dba|doing\s+business\s+as)[:\s]+([^\n,]+)/i);
    if (dbaMatch) parsed.dba = dbaMatch[1].trim();

    // Primary contact name
    const contactNamePatterns = [
      /(?:primary\s+)?(?:contact|representative|account\s+manager)[:\s]+([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
      /(?:contact\s+)?name[:\s]+([A-Z][a-z]+\s+[A-Z][a-z]+)/i
    ];
    for (const pattern of contactNamePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        parsed.primaryContactName = match[1].trim();
        break;
      }
    }

    // Email patterns
    const emailPattern = /[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}/g;
    const emails = text.match(emailPattern) || [];
    
    if (emails.length > 0) {
      // Try to categorize emails
      const supportEmailPattern = /support|help|service/i;
      const techEmailPattern = /tech|dev|engineering|api/i;
      
      for (const email of emails) {
        if (supportEmailPattern.test(email) && !parsed.supportEmail) {
          parsed.supportEmail = email;
        } else if (techEmailPattern.test(email) && !parsed.technicalContactEmail) {
          parsed.technicalContactEmail = email;
        } else if (!parsed.primaryContactEmail) {
          parsed.primaryContactEmail = email;
        }
      }
    }

    // Technical contact name (look near tech email if found)
    if (parsed.technicalContactEmail) {
      const techNameMatch = text.match(/(?:technical|tech)\s+(?:contact|lead|manager)[:\s]+([A-Z][a-z]+\s+[A-Z][a-z]+)/i);
      if (techNameMatch) parsed.technicalContactName = techNameMatch[1].trim();
    }

    // Website
    const websitePatterns = [
      /(?:website|url|web)[:\s]+(https?:\/\/[\w.-]+\.[a-zA-Z]{2,}[^\s]*)/i,
      /(https?:\/\/(?:www\.)?[\w.-]+\.[a-zA-Z]{2,})/i
    ];
    for (const pattern of websitePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        parsed.website = match[1].trim();
        break;
      }
    }

    // API/Webhook URLs
    const apiUrlMatch = text.match(/(?:api|endpoint|sandbox)[:\s]*(https?:\/\/[\w.-]+\.[a-zA-Z]{2,}[^\s]*)/i);
    if (apiUrlMatch) parsed.sandboxApiUrl = apiUrlMatch[1].trim();

    const webhookMatch = text.match(/(?:webhook|callback)[:\s]*(https?:\/\/[\w.-]+\.[a-zA-Z]{2,}[^\s]*)/i);
    if (webhookMatch) parsed.webhookUrl = webhookMatch[1].trim();

    // Country
    const countryPatterns = {
      'US': /(?:united\s+states|usa|u\.s\.|america)/i,
      'CA': /(?:canada|canadian)/i,
      'UK': /(?:united\s+kingdom|uk|britain|british)/i,
      'AU': /(?:australia|australian)/i
    };
    for (const [code, pattern] of Object.entries(countryPatterns)) {
      if (pattern.test(text)) {
        parsed.country = code;
        break;
      }
    }

    // Vendor type
    if (lowerText.includes('data provider') || lowerText.includes('provides data')) {
      parsed.vendorType = 'Data provider';
    } else if (lowerText.includes('data consumer') || lowerText.includes('consumes data')) {
      parsed.vendorType = 'Data consumer';
    } else if (lowerText.includes('bidirectional') || lowerText.includes('two-way')) {
      parsed.vendorType = 'Bidirectional';
    } else if (lowerText.includes('file-based') || lowerText.includes('file transfer')) {
      parsed.vendorType = 'File-based';
    }

    // Auth method
    if (lowerText.includes('oauth') || lowerText.includes('oauth2')) {
      parsed.authMethod = 'OAuth2';
    } else if (lowerText.includes('api key') || lowerText.includes('apikey')) {
      parsed.authMethod = 'API Key';
    } else if (lowerText.includes('mtls') || lowerText.includes('mutual tls')) {
      parsed.authMethod = 'Mutual TLS';
    }

    // Address (multi-line capture)
    const addressMatch = text.match(/(?:address|location)[:\s]+([^\n]+(?:\n[^\n]+){0,2})/i);
    if (addressMatch) parsed.address = addressMatch[1].trim().replace(/\n/g, ', ');

    return parsed;
  }

  /**
   * Prefill form fields only if they are currently empty.
   * Returns list of field names that were filled.
   */
  private prefillEmptyFields(parsedInfo: ParsedVendorInfo): string[] {
    const filledFields: string[] = [];

    // Intake form fields
    if (parsedInfo.vendorType && !this.intakeForm.get('vendorType')?.value) {
      this.intakeForm.patchValue({ vendorType: parsedInfo.vendorType });
      filledFields.push('vendorType');
    }

    // Company form fields
    const companyFieldMappings: { key: keyof ParsedVendorInfo; formField: string }[] = [
      { key: 'legalCompanyName', formField: 'legalCompanyName' },
      { key: 'dba', formField: 'dba' },
      { key: 'primaryContactName', formField: 'primaryContactName' },
      { key: 'primaryContactEmail', formField: 'primaryContactEmail' },
      { key: 'technicalContactName', formField: 'technicalContactName' },
      { key: 'technicalContactEmail', formField: 'technicalContactEmail' },
      { key: 'supportEmail', formField: 'supportEmail' },
      { key: 'website', formField: 'website' },
      { key: 'country', formField: 'country' },
      { key: 'address', formField: 'address' }
    ];

    for (const mapping of companyFieldMappings) {
      const value = parsedInfo[mapping.key];
      if (value && !this.companyForm.get(mapping.formField)?.value) {
        this.companyForm.patchValue({ [mapping.formField]: value });
        filledFields.push(mapping.formField);
      }
    }

    // Integration form fields
    if (parsedInfo.webhookUrl && !this.integrationForm.get('webhookUrl')?.value) {
      this.integrationForm.patchValue({ webhookUrl: parsedInfo.webhookUrl });
      filledFields.push('webhookUrl');
    }
    if (parsedInfo.sandboxApiUrl && !this.integrationForm.get('sandboxApiUrl')?.value) {
      this.integrationForm.patchValue({ sandboxApiUrl: parsedInfo.sandboxApiUrl });
      filledFields.push('sandboxApiUrl');
    }
    if (parsedInfo.authMethod && !this.integrationForm.get('authMethod')?.value) {
      this.integrationForm.patchValue({ authMethod: parsedInfo.authMethod });
      filledFields.push('authMethod');
    }

    return filledFields;
  }

  /**
   * Check if a field was autofilled
   */
  isFieldAutofilled(fieldName: string): boolean {
    return this.autofilledFields().has(fieldName);
  }

  /**
   * Mark a field as user-edited (removes autofill indicator)
   */
  onFieldEdited(fieldName: string) {
    if (this.autofilledFields().has(fieldName)) {
      const updated = new Set(this.autofilledFields());
      updated.delete(fieldName);
      this.autofilledFields.set(updated);
    }
  }
}
