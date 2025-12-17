import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule, InputModule, CheckboxModule } from 'carbon-components-angular';
import { InMemoryDevService } from '../../services/in-memory-dev.service';
import { LoggerService } from '../../../core/services/logger.service';
import { ApiEntity, EnvKey } from '../../models';
import { RightRailAnchorsComponent, Anchor } from '../../shared/components/right-rail-anchors/right-rail-anchors.component';

@Component({
  selector: 'app-api-wizard',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ButtonModule, InputModule, CheckboxModule, RightRailAnchorsComponent],
  template: `
    <div class="container">
      <div class="page-content">
        <div class="main-content">
          <h1>New API</h1>
          
          <div class="wizard-steps">
            <div class="step" [class.active]="currentStep() === 1" [class.completed]="currentStep() > 1">
              <div class="step-number">1</div>
              <div class="step-label">Overview</div>
            </div>
            <div class="step" [class.active]="currentStep() === 2" [class.completed]="currentStep() > 2">
              <div class="step-number">2</div>
              <div class="step-label">Backend</div>
            </div>
            <div class="step" [class.active]="currentStep() === 3" [class.completed]="currentStep() > 3">
              <div class="step-number">3</div>
              <div class="step-label">Routes</div>
            </div>
            <div class="step" [class.active]="currentStep() === 4" [class.completed]="currentStep() > 4">
              <div class="step-number">4</div>
              <div class="step-label">Policies</div>
            </div>
            <div class="step" [class.active]="currentStep() === 5">
              <div class="step-number">5</div>
              <div class="step-label">Review</div>
            </div>
          </div>

          <section id="overview" *ngIf="currentStep() === 1" class="wizard-section">
            <h2>Overview</h2>
            <form [formGroup]="overviewForm">
              <ibm-label>
                API Name
                <input ibmText formControlName="name" placeholder="Orders API" required>
              </ibm-label>
              <ibm-label>
                Slug
                <input ibmText formControlName="slug" placeholder="orders" required>
              </ibm-label>
              <ibm-label>
                Owner Team
                <input ibmText formControlName="ownerTeam" placeholder="Platform">
              </ibm-label>
              <div class="form-group">
                <label>Environments</label>
                <ibm-checkbox formControlName="sandbox">Sandbox</ibm-checkbox>
                <ibm-checkbox formControlName="prod">Production</ibm-checkbox>
              </div>
            </form>
          </section>

          <section id="backend" *ngIf="currentStep() === 2" class="wizard-section">
            <h2>Backend</h2>
            <form [formGroup]="backendForm">
              <ibm-label>
                Backend Name
                <input ibmText formControlName="name" placeholder="Orders Backend" required>
              </ibm-label>
              <ibm-label>
                Base URL
                <input ibmText formControlName="baseUrl" placeholder="https://api.example.com/orders" required>
              </ibm-label>
              <ibm-label>
                Timeout (ms)
                <input ibmText type="number" formControlName="timeoutMs" placeholder="5000">
              </ibm-label>
            </form>
          </section>

          <section id="routes" *ngIf="currentStep() === 3" class="wizard-section">
            <h2>Routes</h2>
            <div class="routes-list">
              <div *ngFor="let route of routes(); let i = index" class="route-item">
                <input ibmText [(ngModel)]="route.path" placeholder="/orders">
                <select [(ngModel)]="route.methods">
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                </select>
                <button ibmButton="danger" (click)="removeRoute(i)">Remove</button>
              </div>
              <button ibmButton="secondary" (click)="addRoute()">Add Route</button>
            </div>
          </section>

          <section id="policies" *ngIf="currentStep() === 4" class="wizard-section">
            <h2>Policies</h2>
            <div class="policies-list">
              <ibm-checkbox *ngFor="let template of defaultTemplates()" 
                [checked]="selectedPolicies().includes(template.id)"
                (checkedChange)="togglePolicy(template.id, $event)">
                {{ template.name }}
              </ibm-checkbox>
            </div>
          </section>

          <section id="review" *ngIf="currentStep() === 5" class="wizard-section">
            <h2>Review</h2>
            <div class="review-summary">
              <p><strong>Name:</strong> {{ overviewForm.value.name }}</p>
              <p><strong>Slug:</strong> {{ overviewForm.value.slug }}</p>
              <p><strong>Backend:</strong> {{ backendForm.value.name }}</p>
              <p><strong>Routes:</strong> {{ routes().length }}</p>
              <p><strong>Policies:</strong> {{ selectedPolicies().length }}</p>
            </div>
          </section>

          <div class="wizard-actions">
            <button ibmButton="secondary" *ngIf="currentStep() > 1" (click)="previousStep()">Previous</button>
            <button ibmButton="primary" *ngIf="currentStep() < 5" (click)="nextStep()">Next</button>
            <button ibmButton="primary" *ngIf="currentStep() === 5" (click)="createApi()">Create</button>
          </div>
        </div>

        <app-right-rail-anchors [anchors]="anchors"></app-right-rail-anchors>
      </div>
    </div>
  `,
  styles: [`
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 16px;
    }

    .page-content {
      display: grid;
      grid-template-columns: 1fr 280px;
      gap: 2rem;
    }

    @media (max-width: 991px) {
      .page-content {
        grid-template-columns: 1fr;
      }
    }

    h1 {
      font-size: 2rem;
      font-weight: 600;
      color: var(--linear-text-primary);
      margin: 0 0 2rem 0;
    }

    h2 {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--linear-text-primary);
      margin: 0 0 1.5rem 0;
    }

    .wizard-steps {
      display: flex;
      gap: 1rem;
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    }

    .step {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      flex: 1;
      opacity: 0.5;
    }

    .step.active {
      opacity: 1;
    }

    .step.completed .step-number {
      background: var(--linear-accent);
      color: white;
    }

    .step-number {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--linear-surface);
      border: 1px solid rgba(0, 0, 0, 0.08);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
    }

    .step-label {
      font-size: 0.875rem;
      color: var(--linear-text-secondary);
    }

    .wizard-section {
      margin-bottom: 2rem;
    }

    .form-group {
      margin: 1rem 0;
    }

    .routes-list, .policies-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .route-item {
      display: flex;
      gap: 1rem;
      align-items: center;
    }

    .wizard-actions {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
      margin-top: 2rem;
    }

    .review-summary p {
      margin: 0.5rem 0;
      color: var(--linear-text-primary);
    }
  `]
})
export class ApiWizardPage implements OnInit {
  private devService = inject(InMemoryDevService);
  private logger = inject(LoggerService);
  private fb = inject(FormBuilder);
  router = inject(Router);

  currentStep = signal(1);
  routes = signal<any[]>([]);
  selectedPolicies = signal<string[]>([]);
  defaultTemplates = signal<any[]>([]);

  overviewForm: FormGroup = this.fb.group({
    name: ['', Validators.required],
    slug: ['', Validators.required],
    ownerTeam: [''],
    sandbox: [true],
    prod: [false]
  });

  backendForm: FormGroup = this.fb.group({
    name: ['', Validators.required],
    baseUrl: ['', Validators.required],
    timeoutMs: [5000]
  });

  anchors: Anchor[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'backend', label: 'Backend' },
    { id: 'routes', label: 'Routes' },
    { id: 'policies', label: 'Policies' },
    { id: 'review', label: 'Review' }
  ];

  ngOnInit() {
    this.devService.listPolicyTemplates(['rate-limit', 'cors']).subscribe(templates => {
      this.defaultTemplates.set(templates);
      this.selectedPolicies.set(templates.map(t => t.id));
    });
    this.addRoute();
  }

  nextStep() {
    if (this.currentStep() < 5) {
      this.currentStep.set(this.currentStep() + 1);
    }
  }

  previousStep() {
    if (this.currentStep() > 1) {
      this.currentStep.set(this.currentStep() - 1);
    }
  }

  addRoute() {
    this.routes.set([...this.routes(), { path: '', methods: ['GET'] }]);
  }

  removeRoute(index: number) {
    const routes = [...this.routes()];
    routes.splice(index, 1);
    this.routes.set(routes);
  }

  togglePolicy(templateId: string, checked: boolean) {
    const policies = [...this.selectedPolicies()];
    if (checked) {
      policies.push(templateId);
    } else {
      const index = policies.indexOf(templateId);
      if (index > -1) policies.splice(index, 1);
    }
    this.selectedPolicies.set(policies);
  }

  createApi() {
    const overview = this.overviewForm.value;
    const backend = this.backendForm.value;
    const envs: string[] = [];
    if (overview.sandbox) envs.push('sandbox');
    if (overview.prod) envs.push('prod');

    const backendId = `backend-${Date.now()}`;
    const apiData: Partial<ApiEntity> = {
      name: overview.name,
      slug: overview.slug,
      ownerTeam: overview.ownerTeam || undefined,
      envs: envs as EnvKey[],
      backends: [{
        id: backendId,
        name: backend.name,
        baseUrl: backend.baseUrl,
        timeoutMs: backend.timeoutMs
      }],
      routes: this.routes().map((r, i) => ({
        id: `route-${Date.now()}-${i}`,
        path: r.path,
        methods: Array.isArray(r.methods) ? r.methods : [r.methods] as any,
        backendId: backendId
      })),
      policies: this.selectedPolicies().map(id => ({
        id: `policy-${Date.now()}-${id}`,
        templateId: id,
        scope: 'api' as const,
        enabled: true
      }))
    };

    this.devService.createApi(apiData).subscribe({
      next: (api) => {
        this.logger.info('API created successfully');
        this.router.navigate(['/dev/apis', api.id]);
      },
      error: () => {
        this.logger.error('Failed to create API');
      }
    });
  }
}

