import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { ButtonModule, InputModule, SelectModule, CheckboxModule } from 'carbon-components-angular';
import { Subject, takeUntil } from 'rxjs';
import { VendorCompanyService } from '../../services/vendor-company.service';
import { LoggerService } from '../../../core/services/logger.service';

interface VendorCompanyFormData {
  companyName: string;
  dba?: string;
  legalName?: string;
  vendorType: string;
  category?: string;
  purpose?: string;
  externalVendorId?: string;
  isActive: boolean;
  integrationModes: string[];
  targetSystems: string[];
  environments: string[];
  primaryContactName: string;
  primaryContactEmail: string;
  primaryContactPhone?: string;
  primaryContactRole?: string;
  technicalContactName?: string;
  technicalContactEmail?: string;
  technicalContactRole?: string;
  billingContactName?: string;
  billingContactEmail?: string;
  timeZone: string;
  supportTier?: string;
  notes?: string;
}

@Component({
  selector: 'app-add-vendor-company-drawer',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputModule,
    SelectModule,
    CheckboxModule
  ],
  template: `
    <div class="drawer-overlay" *ngIf="open" (click)="onOverlayClick()">
      <div class="drawer-container" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="drawer-header">
          <div class="drawer-header-content">
            <h2 class="drawer-title">Add new vendor company</h2>
            <p class="drawer-subtitle">Capture key details so we can onboard and manage this vendor across APIs and file-based integrations.</p>
          </div>
          <button class="drawer-close" (click)="onClose()" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>

        <!-- Form Content -->
        <div class="drawer-content" [formGroup]="form">
          <!-- Section A: Company Details -->
          <div class="form-section">
            <h3 class="section-title">Company Details</h3>
            <div class="form-grid">
              <div class="form-field full-width">
                <label class="form-label">
                  Vendor Name <span class="required">*</span>
                </label>
                <input
                  ibmText
                  formControlName="companyName"
                  placeholder="Acme Integrations, Inc."
                  [class.error]="isFieldInvalid('companyName') || duplicateWarning()">
                <div class="error-message" *ngIf="isFieldInvalid('companyName')">
                  Vendor name is required.
                </div>
                <div class="warning-message" *ngIf="duplicateWarning() && !isFieldInvalid('companyName')">
                  ⚠️ Potential duplicate vendor detected. Please verify this is a new vendor.
                </div>
              </div>

              <div class="form-field">
                <label class="form-label">DBA (Doing Business As)</label>
                <input
                  ibmText
                  formControlName="dba"
                  placeholder="Acme">
              </div>

              <div class="form-field">
                <label class="form-label">Category</label>
                <select ibmSelect formControlName="category">
                  <option value="">Select category</option>
                  <option value="Payment">Payment</option>
                  <option value="Operations">Operations</option>
                  <option value="Data Provider">Data Provider</option>
                  <option value="Software Vendor">Software Vendor</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div class="form-field full-width">
                <label class="form-label">Purpose / Description</label>
                <textarea
                  ibmText
                  formControlName="purpose"
                  rows="3"
                  placeholder="High-level description of vendor purpose and integration needs"></textarea>
              </div>

              <div class="form-field">
                <label class="form-label">
                  Vendor type <span class="required">*</span>
                </label>
                <select ibmSelect formControlName="vendorType" [class.error]="isFieldInvalid('vendorType')">
                  <option value="">Select vendor type</option>
                  <option value="Software vendor">Software vendor</option>
                  <option value="Data provider">Data provider</option>
                  <option value="Payment processor">Payment processor</option>
                  <option value="Operations partner">Operations partner</option>
                  <option value="Other">Other</option>
                </select>
                <div class="error-message" *ngIf="isFieldInvalid('vendorType')">
                  Vendor type is required.
                </div>
              </div>

              <div class="form-field">
                <label class="form-label">External vendor ID</label>
                <input
                  ibmText
                  formControlName="externalVendorId"
                  placeholder="VND-12345">
                <div class="helper-text">Optional – ID from your vendor management system.</div>
              </div>

              <div class="form-field full-width">
                <ibm-checkbox formControlName="isActive">
                  Active vendor
                </ibm-checkbox>
              </div>
            </div>
          </div>

          <!-- Section B: Integration Profile -->
          <div class="form-section">
            <h3 class="section-title">Integration Profile</h3>
            <div class="form-grid">
              <div class="form-field full-width">
                <label class="form-label">Integration modes</label>
                <div class="checkbox-group">
                  <ibm-checkbox
                    *ngFor="let mode of integrationModes"
                    [formControlName]="'integrationMode_' + mode"
                    (checkedChange)="onIntegrationModeChange(mode, $event)">
                    {{ mode }}
                  </ibm-checkbox>
                </div>
              </div>

              <div class="form-field full-width">
                <label class="form-label">Integrates with</label>
                <div class="checkbox-group">
                  <ibm-checkbox
                    *ngFor="let system of targetSystems"
                    [formControlName]="'targetSystem_' + system"
                    (checkedChange)="onTargetSystemChange(system, $event)">
                    {{ system }}
                  </ibm-checkbox>
                </div>
              </div>

              <div class="form-field full-width">
                <label class="form-label">
                  Enabled environments <span class="required">*</span>
                </label>
                <div class="checkbox-group">
                  <ibm-checkbox
                    *ngFor="let env of environments"
                    [formControlName]="'environment_' + env"
                    (checkedChange)="onEnvironmentChange(env, $event)">
                    {{ env }}
                  </ibm-checkbox>
                </div>
                <div class="error-message" *ngIf="form.hasError('environmentsRequired') && form.touched">
                  At least one environment must be selected.
                </div>
              </div>
            </div>
          </div>

          <!-- Section C: Contacts -->
          <div class="form-section">
            <h3 class="section-title">Contacts</h3>
            <div class="form-grid">
              <!-- Primary Contact -->
              <div class="form-field full-width">
                <h4 class="contact-section-title">Primary contact <span class="required">*</span></h4>
              </div>
              <div class="form-field">
                <label class="form-label">
                  Primary contact name <span class="required">*</span>
                </label>
                <input
                  ibmText
                  formControlName="primaryContactName"
                  placeholder="John Smith"
                  [class.error]="isFieldInvalid('primaryContactName')">
                <div class="error-message" *ngIf="isFieldInvalid('primaryContactName')">
                  Primary contact name is required.
                </div>
              </div>
              <div class="form-field">
                <label class="form-label">
                  Primary contact email <span class="required">*</span>
                </label>
                <input
                  ibmText
                  type="email"
                  formControlName="primaryContactEmail"
                  placeholder="john.smith@example.com"
                  [class.error]="isFieldInvalid('primaryContactEmail') || duplicateWarning()">
                <div class="error-message" *ngIf="isFieldInvalid('primaryContactEmail')">
                  <span *ngIf="form.get('primaryContactEmail')?.hasError('required')">Primary contact email is required.</span>
                  <span *ngIf="form.get('primaryContactEmail')?.hasError('email')">Enter a valid email address.</span>
                </div>
                <div class="warning-message" *ngIf="duplicateWarning() && !isFieldInvalid('primaryContactEmail')">
                  ⚠️ This email is already associated with another vendor.
                </div>
              </div>
              <div class="form-field">
                <label class="form-label">Primary contact phone</label>
                <input
                  ibmText
                  formControlName="primaryContactPhone"
                  placeholder="+1-555-0100">
              </div>
              <div class="form-field">
                <label class="form-label">Primary contact role</label>
                <input
                  ibmText
                  formControlName="primaryContactRole"
                  placeholder="Account Manager">
              </div>

              <!-- Technical Contact -->
              <div class="form-field full-width">
                <h4 class="contact-section-title">Technical contact</h4>
              </div>
              <div class="form-field">
                <label class="form-label">Technical contact name</label>
                <input
                  ibmText
                  formControlName="technicalContactName"
                  placeholder="Jane Doe">
              </div>
              <div class="form-field">
                <label class="form-label">Technical contact email</label>
                <input
                  ibmText
                  type="email"
                  formControlName="technicalContactEmail"
                  placeholder="jane.doe@example.com"
                  [class.error]="form.get('technicalContactEmail')?.invalid && form.get('technicalContactEmail')?.touched">
                <div class="error-message" *ngIf="form.get('technicalContactEmail')?.invalid && form.get('technicalContactEmail')?.touched">
                  Enter a valid email address.
                </div>
              </div>
              <div class="form-field">
                <label class="form-label">Technical contact role</label>
                <input
                  ibmText
                  formControlName="technicalContactRole"
                  placeholder="Technical Lead">
              </div>

              <!-- Billing Contact -->
              <div class="form-field full-width">
                <h4 class="contact-section-title">Billing contact</h4>
              </div>
              <div class="form-field">
                <label class="form-label">Billing contact name</label>
                <input
                  ibmText
                  formControlName="billingContactName"
                  placeholder="Bob Johnson">
              </div>
              <div class="form-field">
                <label class="form-label">Billing contact email</label>
                <input
                  ibmText
                  type="email"
                  formControlName="billingContactEmail"
                  placeholder="bob.johnson@example.com"
                  [class.error]="form.get('billingContactEmail')?.invalid && form.get('billingContactEmail')?.touched">
                <div class="error-message" *ngIf="form.get('billingContactEmail')?.invalid && form.get('billingContactEmail')?.touched">
                  Enter a valid email address.
                </div>
              </div>
            </div>
          </div>

          <!-- Section D: Operational Details -->
          <div class="form-section">
            <h3 class="section-title">Operational Details</h3>
            <div class="form-grid">
              <div class="form-field">
                <label class="form-label">
                  Primary time zone <span class="required">*</span>
                </label>
                <select ibmSelect formControlName="timeZone" [class.error]="isFieldInvalid('timeZone')">
                  <option value="">Select time zone</option>
                  <option value="US Eastern">US Eastern</option>
                  <option value="US Central">US Central</option>
                  <option value="US Mountain">US Mountain</option>
                  <option value="US Pacific">US Pacific</option>
                  <option value="Other">Other</option>
                </select>
                <div class="error-message" *ngIf="isFieldInvalid('timeZone')">
                  Primary time zone is required.
                </div>
              </div>

              <div class="form-field">
                <label class="form-label">Support tier</label>
                <select ibmSelect formControlName="supportTier">
                  <option value="">Select support tier</option>
                  <option value="Standard">Standard</option>
                  <option value="Enhanced">Enhanced</option>
                  <option value="Premium">Premium</option>
                </select>
              </div>

              <div class="form-field full-width">
                <label class="form-label">Internal notes</label>
                <textarea
                  ibmText
                  formControlName="notes"
                  rows="4"
                  placeholder="Any special handling, risk flags, or context for this vendor."></textarea>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="drawer-footer">
          <button ibmButton="secondary" (click)="onClose()">Cancel</button>
          <div class="footer-actions">
            <button
              ibmButton="secondary"
              (click)="onSaveAndAddAnother()"
              [disabled]="form.invalid || saving()">
              Save & add another
            </button>
            <button
              ibmButton="primary"
              (click)="onSaveAndClose()"
              [disabled]="form.invalid || saving()">
              Save & close
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .drawer-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      z-index: 2000;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      animation: fadeIn 150ms ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(100%);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .drawer-container {
      width: 100%;
      max-width: 70%;
      max-height: 90vh;
      height: auto;
      background: var(--linear-surface);
      border-top-left-radius: 12px;
      border-top-right-radius: 12px;
      display: flex;
      flex-direction: column;
      box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.3);
      animation: slideUp 250ms cubic-bezier(0.4, 0, 0.2, 1);
      overflow: hidden;
      margin-bottom: 2rem;

      @media (max-width: 1024px) {
        max-width: 85%;
        max-height: 85vh;
      }

      @media (max-width: 768px) {
        max-width: 100%;
        max-height: 95vh;
        border-radius: 0;
        margin-bottom: 0;
      }
    }

    .drawer-header {
      padding: 2rem 2rem 1.5rem;
      border-bottom: 1px solid var(--linear-border);
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      flex-shrink: 0;
    }

    .drawer-header-content {
      flex: 1;
    }

    .drawer-title {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--linear-text-primary);
      margin: 0 0 0.5rem 0;
    }

    .drawer-subtitle {
      font-size: 0.875rem;
      color: var(--linear-text-secondary);
      margin: 0;
      line-height: 1.5;
    }

    .drawer-close {
      background: transparent;
      border: none;
      color: var(--linear-text-secondary);
      cursor: pointer;
      padding: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: all 150ms ease;
      flex-shrink: 0;

      &:hover {
        background: var(--linear-surface-hover);
        color: var(--linear-text-primary);
      }

      svg {
        width: 20px;
        height: 20px;
      }
    }

    .drawer-content {
      flex: 1;
      overflow-y: auto;
      padding: 2rem;
      padding-bottom: 120px; // Space for sticky footer
    }

    .form-section {
      margin-bottom: 2.5rem;

      &:not(:last-child) {
        padding-bottom: 2rem;
        border-bottom: 1px solid var(--linear-border);
      }
    }

    .section-title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--linear-text-primary);
      margin: 0 0 1.5rem 0;
    }

    .contact-section-title {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--linear-text-primary);
      margin: 0 0 1rem 0;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1.5rem;

      @media (max-width: 768px) {
        grid-template-columns: 1fr;
      }
    }

    .form-field {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;

      &.full-width {
        grid-column: 1 / -1;
      }
    }

    .form-label {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--linear-text-primary);
      display: block;
    }

    .required {
      color: var(--linear-accent);
      margin-left: 0.25rem;
    }

    .helper-text {
      font-size: 0.75rem;
      color: var(--linear-text-secondary);
      margin-top: 0.25rem;
    }

    .error-message {
      font-size: 0.75rem;
      color: #ef4444;
      margin-top: 0.25rem;
    }

    .checkbox-group {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-top: 0.5rem;
    }

    .drawer-footer {
      position: sticky;
      bottom: 0;
      padding: 1.5rem 2rem;
      border-top: 1px solid var(--linear-border);
      background: var(--linear-surface);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      flex-shrink: 0;
      z-index: 10;
    }

    .footer-actions {
      display: flex;
      gap: 0.75rem;
    }

    .warning-message {
      font-size: 0.75rem;
      color: #f59e0b;
      margin-top: 0.25rem;
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    // Error state styling
    ::ng-deep {
      .error {
        border-color: #ef4444 !important;
      }
    }
  `]
})
export class AddVendorCompanyDrawerComponent implements OnInit, OnDestroy {
  @Input() open = false;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<VendorCompanyFormData>();

  private fb = inject(FormBuilder);
  private vendorCompanyService = inject(VendorCompanyService);
  private logger = inject(LoggerService);

  form!: FormGroup;
  saving = signal(false);
  duplicateWarning = signal(false);
  private destroy$ = new Subject<void>();

  integrationModes = ['APIs', 'File-based', 'Events'];
  targetSystems = [
    'Client accounting / F&O',
    'Property operations / Cyan',
    'CRM',
    'Contracts / Legal',
    'Other'
  ];
  environments = ['Sandbox', 'QA', 'Production'];

  ngOnInit() {
    this.buildForm();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  buildForm() {
    // Build dynamic checkbox controls for arrays
    const integrationModeControls: Record<string, AbstractControl> = {};
    this.integrationModes.forEach(mode => {
      integrationModeControls[`integrationMode_${mode}`] = this.fb.control(false);
    });

    const targetSystemControls: Record<string, AbstractControl> = {};
    this.targetSystems.forEach(system => {
      targetSystemControls[`targetSystem_${system}`] = this.fb.control(false);
    });

    const environmentControls: Record<string, AbstractControl> = {};
    this.environments.forEach(env => {
      environmentControls[`environment_${env}`] = this.fb.control(false);
    });

    this.form = this.fb.group({
      companyName: ['', Validators.required],
      dba: [''],
      legalName: [''],
      vendorType: ['', Validators.required],
      category: [''],
      purpose: [''],
      externalVendorId: [''],
      isActive: [true],
      ...integrationModeControls,
      ...targetSystemControls,
      ...environmentControls,
      primaryContactName: ['', Validators.required],
      primaryContactEmail: ['', [Validators.required, Validators.email]],
      primaryContactPhone: [''],
      primaryContactRole: [''],
      technicalContactName: [''],
      technicalContactEmail: ['', Validators.email],
      technicalContactRole: [''],
      billingContactName: [''],
      billingContactEmail: ['', Validators.email],
      timeZone: ['', Validators.required],
      supportTier: [''],
      notes: ['']
    }, {
      validators: [this.environmentsValidator.bind(this)]
    });

    // Set up duplicate detection
    this.form.get('companyName')?.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => this.checkDuplicate());

    this.form.get('primaryContactEmail')?.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => this.checkDuplicate());
  }

  checkDuplicate() {
    const name = this.form.get('companyName')?.value;
    const email = this.form.get('primaryContactEmail')?.value;

    if (!name && !email) {
      this.duplicateWarning.set(false);
      return;
    }

    this.vendorCompanyService.checkDuplicate(name || '', email || '').pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (result) => {
        this.duplicateWarning.set(result.isDuplicate);
      },
      error: () => {
        this.duplicateWarning.set(false);
      }
    });
  }

  // Custom validator for environments
  environmentsValidator(control: AbstractControl): ValidationErrors | null {
    const hasEnvironment = this.environments.some(env => 
      control.get(`environment_${env}`)?.value === true
    );
    return hasEnvironment ? null : { environmentsRequired: true };
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return !!(field && field.invalid && (field.touched || field.dirty));
  }

  onIntegrationModeChange(mode: string, checked: boolean) {
    // Handle integration mode changes
  }

  onTargetSystemChange(system: string, checked: boolean) {
    // Handle target system changes
  }

  onEnvironmentChange(env: string, checked: boolean) {
    // Trigger validation
    this.form.updateValueAndValidity();
  }

  onOverlayClick() {
    this.onClose();
  }

  onClose() {
    this.form.reset();
    this.duplicateWarning.set(false);
    this.closed.emit();
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  private getFormValue(): VendorCompanyFormData {
    const value = this.form.value;
    
    return {
      companyName: value.companyName,
      dba: value.dba || undefined,
      legalName: value.legalName || undefined,
      vendorType: value.vendorType,
      category: value.category || undefined,
      purpose: value.purpose || undefined,
      externalVendorId: value.externalVendorId || undefined,
      isActive: value.isActive,
      integrationModes: this.integrationModes.filter(mode => value[`integrationMode_${mode}`]),
      targetSystems: this.targetSystems.filter(system => value[`targetSystem_${system}`]),
      environments: this.environments.filter(env => value[`environment_${env}`]),
      primaryContactName: value.primaryContactName,
      primaryContactEmail: value.primaryContactEmail,
      primaryContactPhone: value.primaryContactPhone || undefined,
      primaryContactRole: value.primaryContactRole || undefined,
      technicalContactName: value.technicalContactName || undefined,
      technicalContactEmail: value.technicalContactEmail || undefined,
      technicalContactRole: value.technicalContactRole || undefined,
      billingContactName: value.billingContactName || undefined,
      billingContactEmail: value.billingContactEmail || undefined,
      timeZone: value.timeZone,
      supportTier: value.supportTier || undefined,
      notes: value.notes || undefined
    };
  }

  onSaveAndClose() {
    if (this.form.invalid) {
      this.markFormGroupTouched(this.form);
      return;
    }

    const formData = this.getFormValue();
    this.logger.debug('New vendor company payload', { formData });

    this.saving.set(true);
    this.vendorCompanyService.saveVendorCompany(formData).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (result) => {
        this.logger.info('Vendor company saved successfully', { result });
        this.saving.set(false);
        this.saved.emit(formData);
        this.onClose();
      },
      error: (error) => {
        this.logger.error('Error saving vendor company', error);
        this.saving.set(false);
      }
    });
  }

  onSaveAndAddAnother() {
    if (this.form.invalid) {
      this.markFormGroupTouched(this.form);
      return;
    }

    const formData = this.getFormValue();
    this.logger.debug('New vendor company payload', { formData });

    this.saving.set(true);
    this.vendorCompanyService.saveVendorCompany(formData).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (result) => {
        this.logger.info('Vendor company saved successfully', { result });
        this.saving.set(false);
        this.saved.emit(formData);
        // Reset form but keep drawer open
        this.form.reset({
          isActive: true
        });
        // Rebuild checkbox controls
        this.integrationModes.forEach(mode => {
          this.form.get(`integrationMode_${mode}`)?.setValue(false);
        });
        this.targetSystems.forEach(system => {
          this.form.get(`targetSystem_${system}`)?.setValue(false);
        });
        this.environments.forEach(env => {
          this.form.get(`environment_${env}`)?.setValue(false);
        });
      },
      error: (error) => {
        this.logger.error('Error saving vendor company', error);
        this.saving.set(false);
      }
    });
  }
}

