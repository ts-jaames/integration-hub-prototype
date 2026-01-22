import { Component, Input, Output, EventEmitter, signal, computed, inject, OnChanges, SimpleChanges, OnInit, ViewEncapsulation } from '@angular/core';
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
import { LifecycleStage } from '../../models/vendor-lifecycle.model';

interface WizardStep {
  id: string;
  stage: LifecycleStage;
  title: string;
  description: string;
  formGroup?: FormGroup;
}

@Component({
  selector: 'app-vendor-onboarding-wizard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    TagModule,
    InputModule,
    ModalModule,
    SelectModule,
    CheckboxModule
  ],
  template: `
    <ibm-modal
      [open]="open"
      [size]="'lg'"
      (overlaySelected)="closeWizard()"
      [hasScrollingContent]="true"
      class="vendor-onboarding-modal">
      <ibm-modal-header (closeSelect)="closeWizard()" class="modal-header-custom">
        <div class="header-content">
          <div class="header-text">
            <p class="bx--modal-header__heading">New Vendor Onboarding</p>
            <p class="modal-subtitle">Complete the vendor onboarding process step by step</p>
          </div>
        </div>
      </ibm-modal-header>
      
      <div ibmModalContent class="modal-content-custom">
        <!-- Progress Stepper -->
        <div class="wizard-progress">
          <div 
            *ngFor="let step of steps(); let i = index" 
            class="progress-step"
            [class.completed]="i < currentStepIndex()"
            [class.active]="i === currentStepIndex()">
            <div class="step-indicator">
              <span *ngIf="i < currentStepIndex()" class="step-check">✓</span>
              <span *ngIf="i >= currentStepIndex()" class="step-number">{{ i + 1 }}</span>
            </div>
            <div class="step-label">{{ step.title }}</div>
          </div>
        </div>

        <!-- Step Content -->
        <div class="wizard-content">
          <div class="step-header" *ngIf="currentStep()">
            <h3>{{ currentStep()!.title }}</h3>
            <p class="step-description">{{ currentStep()!.description }}</p>
          </div>

          <div class="step-body">
            <!-- Step 1: Preparation -->
            <div *ngIf="currentStepIndex() === 0" [formGroup]="intakeForm" class="step-form">
              <div class="form-group">
                <label ibmLabel>
                  Internal Owner
                  <input 
                    ibmText 
                    formControlName="internalOwner"
                    placeholder="Enter internal owner name">
                </label>
              </div>
              <div class="form-group">
                <label ibmLabel>
                  Target Go-Live Date
                  <input 
                    type="date"
                    ibmText 
                    formControlName="targetGoLiveDate">
                </label>
              </div>
              <div class="form-group">
                <label ibmLabel>
                  Preparation Notes
                  <textarea 
                    ibmText 
                    formControlName="intakeNotes"
                    rows="4"
                    placeholder="Add any internal intake notes...">
                  </textarea>
                </label>
              </div>
            </div>

            <!-- Step 2: Registration -->
            <div *ngIf="currentStepIndex() === 1" [formGroup]="registrationForm" class="step-form">
              <div class="form-group">
                <label ibmLabel>
                  Company Name *
                  <input 
                    ibmText 
                    formControlName="companyName"
                    placeholder="Enter company name"
                    required>
                </label>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label ibmLabel>
                    Primary Contact *
                    <input 
                      ibmText 
                      formControlName="primaryContact"
                      placeholder="Contact name"
                      required>
                  </label>
                </div>
                <div class="form-group">
                  <label ibmLabel>
                    Email *
                    <input 
                      type="email"
                      ibmText 
                      formControlName="primaryEmail"
                      placeholder="contact@company.com"
                      required>
                  </label>
                </div>
              </div>
              <div class="form-group">
                <label ibmLabel>
                  Website
                  <input 
                    type="url"
                    ibmText 
                    formControlName="website"
                    placeholder="https://company.com">
                </label>
              </div>
              <div class="form-group">
                <label ibmLabel>
                  Address
                  <textarea 
                    ibmText 
                    formControlName="address"
                    rows="2"
                    placeholder="Company address">
                  </textarea>
                </label>
              </div>
            </div>

            <!-- Step 3: Validation -->
            <div *ngIf="currentStepIndex() === 2" class="step-info">
              <div class="info-card">
                <h4>Validation Requirements</h4>
                <p>Before proceeding, the following validations will be performed:</p>
                <ul class="validation-list">
                  <li>Configuration validation</li>
                  <li>Test API calls</li>
                  <li>Sandbox environment checks</li>
                  <li>Webhook endpoint verification</li>
                </ul>
                <p class="info-note">Validation will be performed automatically after you complete this step.</p>
              </div>
              <div class="form-group">
                <label ibmLabel>
                  Callback URL
                  <input 
                    type="url"
                    ibmText 
                    [(ngModel)]="validationData.callbackUrl"
                    placeholder="https://api.company.com/webhooks/callback"
                    [ngModelOptions]="{standalone: true}">
                </label>
                <p class="field-hint">Primary webhook endpoint for event notifications</p>
              </div>
              <div class="form-group">
                <label ibmLabel>
                  Sandbox API Endpoint
                  <input 
                    type="url"
                    ibmText 
                    [(ngModel)]="validationData.sandboxEndpoint"
                    placeholder="https://api.sandbox.company.com"
                    [ngModelOptions]="{standalone: true}">
                </label>
              </div>
            </div>

            <!-- Step 4: Compliance -->
            <div *ngIf="currentStepIndex() === 3" class="step-info">
              <div class="info-card">
                <h4>Compliance & Certification</h4>
                <p>Review and confirm compliance requirements:</p>
              </div>
              <div class="compliance-checklist">
                <label class="checkbox-label">
                  <input 
                    type="checkbox" 
                    [(ngModel)]="complianceData.securityReview"
                    [ngModelOptions]="{standalone: true}">
                  <span>Security review complete</span>
                </label>
                <label class="checkbox-label">
                  <input 
                    type="checkbox" 
                    [(ngModel)]="complianceData.documentationReceived"
                    [ngModelOptions]="{standalone: true}">
                  <span>Required documentation received</span>
                </label>
                <label class="checkbox-label">
                  <input 
                    type="checkbox" 
                    [(ngModel)]="complianceData.dataAgreementSigned"
                    [ngModelOptions]="{standalone: true}">
                  <span>Data processing agreement signed</span>
                </label>
                <label class="checkbox-label">
                  <input 
                    type="checkbox" 
                    [(ngModel)]="complianceData.apimPoliciesApplied"
                    [ngModelOptions]="{standalone: true}">
                  <span>APIM policies applied</span>
                </label>
              </div>
              <div class="form-group">
                <label ibmLabel>
                  Compliance Notes
                  <textarea 
                    ibmText 
                    [(ngModel)]="complianceData.notes"
                    rows="3"
                    placeholder="Add any compliance-related notes..."
                    [ngModelOptions]="{standalone: true}">
                  </textarea>
                </label>
              </div>
            </div>

            <!-- Step 5: Activation -->
            <div *ngIf="currentStepIndex() === 4" class="step-info">
              <div class="info-card">
                <h4>Ready for Activation</h4>
                <p>Review the summary and activate the vendor:</p>
              </div>
              <div class="summary-section">
                <h5>Onboarding Summary</h5>
                <div class="summary-grid">
                  <div class="summary-item">
                    <label>Company</label>
                    <p>{{ registrationForm.get('companyName')?.value || 'N/A' }}</p>
                  </div>
                  <div class="summary-item">
                    <label>Contact</label>
                    <p>{{ registrationForm.get('primaryContact')?.value || 'N/A' }}</p>
                  </div>
                  <div class="summary-item">
                    <label>Email</label>
                    <p>{{ registrationForm.get('primaryEmail')?.value || 'N/A' }}</p>
                  </div>
                  <div class="summary-item">
                    <label>Target Go-Live</label>
                    <p>{{ intakeForm.get('targetGoLiveDate')?.value || 'N/A' }}</p>
                  </div>
                </div>
              </div>
              <div class="form-group">
                <label ibmLabel>
                  Environment
                  <select ibmSelect [(ngModel)]="activationData.environment" [ngModelOptions]="{standalone: true}">
                    <option value="production">Production</option>
                    <option value="sandbox">Sandbox</option>
                  </select>
                </label>
              </div>
              <div class="warning-box">
                <strong>⚠️ Important:</strong> Once activated, the vendor will be able to access the platform. Ensure all validations and compliance checks are complete.
              </div>
            </div>
          </div>
        </div>
      </div>

      <ibm-modal-footer class="modal-footer-custom">
        <div class="footer-actions">
          <button ibmButton="secondary" (click)="closeWizard()" class="footer-cancel">Cancel</button>
          <div class="footer-nav">
            <button 
              ibmButton="secondary" 
              (click)="previousStep()"
              [disabled]="currentStepIndex() === 0"
              class="footer-previous">
              Previous
            </button>
            <button 
              ibmButton="primary" 
              (click)="nextStep()"
              [disabled]="!canProceed()"
              *ngIf="currentStepIndex() < steps().length - 1"
              class="footer-next">
              Next Step
            </button>
            <button 
              ibmButton="primary" 
              (click)="completeOnboarding()"
              [disabled]="!canProceed()"
              *ngIf="currentStepIndex() === steps().length - 1"
              class="footer-next">
              Complete Onboarding
            </button>
          </div>
        </div>
      </ibm-modal-footer>
    </ibm-modal>
  `,
  styleUrls: ['./vendor-onboarding-wizard.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class VendorOnboardingWizardComponent implements OnChanges, OnInit {
  private fb = inject(FormBuilder);

  @Input() open: boolean = false;
  @Output() closed = new EventEmitter<void>();
  @Output() completed = new EventEmitter<any>();
  
  ngOnChanges(changes: SimpleChanges) {
    // Handle input changes if needed
  }
  
  ngOnInit() {
    // Initialize component
  }
  
  closeWizard() {
    this.currentStepIndex.set(0);
    this.intakeForm.reset();
    this.registrationForm.reset();
    this.validationData = { callbackUrl: '', sandboxEndpoint: '' };
    this.complianceData = {
      securityReview: false,
      documentationReceived: false,
      dataAgreementSigned: false,
      apimPoliciesApplied: false,
      notes: ''
    };
    this.activationData = { environment: 'sandbox' };
    this.closed.emit();
  }

  currentStepIndex = signal(0);

  intakeForm: FormGroup = this.fb.group({
    internalOwner: ['', Validators.required],
    targetGoLiveDate: ['', Validators.required],
    intakeNotes: ['']
  });

  registrationForm: FormGroup = this.fb.group({
    companyName: ['', Validators.required],
    primaryContact: ['', Validators.required],
    primaryEmail: ['', [Validators.required, Validators.email]],
    website: [''],
    address: ['']
  });

  validationData = {
    callbackUrl: '',
    sandboxEndpoint: ''
  };

  complianceData = {
    securityReview: false,
    documentationReceived: false,
    dataAgreementSigned: false,
    apimPoliciesApplied: false,
    notes: ''
  };

  activationData = {
    environment: 'sandbox'
  };

  steps = signal<WizardStep[]>([
    {
      id: 'intake',
      stage: 'intake',
      title: 'Intake',
      description: 'Set up internal intake details'
    },
    {
      id: 'registration',
      stage: 'registration',
      title: 'Registration',
      description: 'Enter vendor company information'
    },
    {
      id: 'validation',
      stage: 'validation',
      title: 'Validation',
      description: 'Configure validation settings'
    },
    {
      id: 'compliance',
      stage: 'compliance',
      title: 'Compliance',
      description: 'Review compliance requirements'
    },
    {
      id: 'activation',
      stage: 'activation',
      title: 'Activation',
      description: 'Review and activate vendor'
    }
  ]);

  currentStep = computed(() => {
    return this.steps()[this.currentStepIndex()];
  });

  canProceed(): boolean {
    const index = this.currentStepIndex();
    
    if (index === 0) {
      return this.intakeForm.valid;
    }
    if (index === 1) {
      return this.registrationForm.valid;
    }
    if (index === 2) {
      return true; // Validation step - optional fields
    }
    if (index === 3) {
      return this.complianceData.securityReview && 
             this.complianceData.documentationReceived && 
             this.complianceData.dataAgreementSigned && 
             this.complianceData.apimPoliciesApplied;
    }
    if (index === 4) {
      return true; // Activation - just review
    }
    
    return false;
  }

  nextStep() {
    if (this.currentStepIndex() < this.steps().length - 1) {
      this.currentStepIndex.update(idx => idx + 1);
    }
  }

  previousStep() {
    if (this.currentStepIndex() > 0) {
      this.currentStepIndex.update(idx => idx - 1);
    }
  }

  completeOnboarding() {
    const onboardingData = {
      intake: this.intakeForm.value,
      registration: this.registrationForm.value,
      validation: this.validationData,
      compliance: this.complianceData,
      activation: this.activationData
    };

    this.completed.emit(onboardingData);
    this.closeWizard();
  }
}

