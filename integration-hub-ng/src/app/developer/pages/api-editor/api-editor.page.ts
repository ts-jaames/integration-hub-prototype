import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  ButtonModule,
  TagModule,
  TabsModule,
  TableModule,
  TableModel,
  TableItem,
  TableHeaderItem,
  ModalModule,
  InputModule,
  CheckboxModule
} from 'carbon-components-angular';
import { InMemoryDevService } from '../../services/in-memory-dev.service';
import { ApiEntity, Backend, RouteDef, PolicyTemplate, AppliedPolicy, Deployment, EnvKey } from '../../models';
import { StatusTagPipe } from '../../shared/pipes/status-tag.pipe';
import { RightRailAnchorsComponent, Anchor } from '../../shared/components/right-rail-anchors/right-rail-anchors.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { LoggerService } from '../../../core/services/logger.service';

@Component({
  selector: 'app-api-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    TagModule,
    TabsModule,
    TableModule,
    ModalModule,
    InputModule,
    CheckboxModule,
    StatusTagPipe,
    RightRailAnchorsComponent,
    ConfirmDialogComponent
  ],
  template: `
    <div class="container">
      <div class="page-header">
        <h1>{{ api()?.name || 'Loading...' }}</h1>
        <ibm-tag *ngIf="api() && api()!.versions[0]" [type]="getStatusType(api()!.versions[0]!.status)">
          {{ api()!.versions[0]!.status | statusTag }}
        </ibm-tag>
      </div>

      <ibm-tabs>
        <ibm-tab heading="Overview">
          <div class="tab-content">
            <div class="page-content">
              <div class="main-content">
                <section id="overview">
                  <h2>API Details</h2>
                  <div class="details-grid">
                    <div><strong>Slug:</strong> {{ api()?.slug }}</div>
                    <div><strong>Owner:</strong> {{ api()?.ownerTeam || 'N/A' }}</div>
                    <div><strong>Version:</strong> {{ api()?.currentVersion }}</div>
                    <div><strong>Environments:</strong> {{ api()?.envs?.join(', ') || 'N/A' }}</div>
                  </div>
                  <div class="quick-actions">
                    <button ibmButton="secondary">Duplicate Version</button>
                    <button ibmButton="primary">Release Version</button>
                  </div>
                </section>
              </div>
              <app-right-rail-anchors [anchors]="overviewAnchors"></app-right-rail-anchors>
            </div>
          </div>
        </ibm-tab>

        <ibm-tab heading="Backends">
          <div class="tab-content">
            <div class="section-header">
              <h2>Backends</h2>
              <button ibmButton="primary" (click)="openBackendModal()">Add Backend</button>
            </div>
            <div class="backends-list">
              <div *ngFor="let backend of api()?.backends || []" class="backend-item">
                <div>
                  <strong>{{ backend.name }}</strong>
                  <div>{{ backend.baseUrl }}</div>
                </div>
                <button ibmButton="secondary" (click)="editBackend(backend)">Edit</button>
              </div>
            </div>
          </div>
        </ibm-tab>

        <ibm-tab heading="Routes">
          <div class="tab-content">
            <div class="section-header">
              <h2>Routes</h2>
              <button ibmButton="primary" (click)="openRouteModal()">Add Route</button>
            </div>
            <div class="table-container">
              <ibm-table [model]="routesTableModel" size="sm"></ibm-table>
            </div>
          </div>
        </ibm-tab>

        <ibm-tab heading="Policies">
          <div class="tab-content">
            <div class="policies-layout">
              <div class="templates-panel">
                <h3>Templates</h3>
                <div *ngFor="let template of policyTemplates()" class="template-item">
                  <div>
                    <strong>{{ template.name }}</strong>
                    <div>{{ template.description }}</div>
                  </div>
                  <button ibmButton="secondary" (click)="applyPolicy(template)">Apply</button>
                </div>
              </div>
              <div class="applied-panel">
                <h3>Applied Policies</h3>
                <div *ngFor="let policy of api()?.policies || []" class="policy-item">
                  <div>
                    <strong>{{ getTemplateName(policy.templateId) }}</strong>
                    <div>Scope: {{ policy.scope }}</div>
                  </div>
                  <ibm-checkbox [checked]="policy.enabled" (checkedChange)="togglePolicy(policy.id, $event)"></ibm-checkbox>
                  <button ibmButton="danger" (click)="removePolicy(policy.id)">Remove</button>
                </div>
              </div>
            </div>
          </div>
        </ibm-tab>

        <ibm-tab heading="Docs">
          <div class="tab-content">
            <h2>Documentation</h2>
            <ibm-tabs>
              <ibm-tab heading="OpenAPI JSON">
                <textarea class="doc-editor" [(ngModel)]="openApiJson" rows="20"></textarea>
                <button ibmButton="primary" (click)="saveOpenApi('openapi-json')">Save</button>
              </ibm-tab>
              <ibm-tab heading="OpenAPI YAML">
                <textarea class="doc-editor" [(ngModel)]="openApiYaml" rows="20"></textarea>
                <button ibmButton="primary" (click)="saveOpenApi('openapi-yaml')">Save</button>
              </ibm-tab>
              <ibm-tab heading="Markdown">
                <textarea class="doc-editor" [(ngModel)]="markdown" rows="20" [readonly]="true"></textarea>
                <button ibmButton="primary" (click)="generateMarkdown()">Generate from OpenAPI</button>
              </ibm-tab>
            </ibm-tabs>
          </div>
        </ibm-tab>

        <ibm-tab heading="Deploy">
          <div class="tab-content">
            <h2>Deploy API</h2>
            <form [formGroup]="deployForm">
              <ibm-label>
                Version
                <select formControlName="version">
                  <option *ngFor="let v of api()?.versions || []" [value]="v.name">{{ v.name }}</option>
                </select>
              </ibm-label>
              <ibm-label>
                Environment
                <select formControlName="env">
                  <option value="sandbox">Sandbox</option>
                  <option value="prod">Production</option>
                </select>
              </ibm-label>
              <div class="preflight-checklist">
                <h3>Preflight Checklist</h3>
                <div *ngFor="let check of preflightChecks()" [class.valid]="check.valid" [class.invalid]="!check.valid">
                  {{ check.label }}: {{ check.valid ? '✓' : '✗' }}
                </div>
              </div>
              <button ibmButton="primary" [disabled]="!canDeploy()" (click)="deploy()">Deploy</button>
            </form>
          </div>
        </ibm-tab>

        <ibm-tab heading="Activity">
          <div class="tab-content">
            <h2>Deployment History</h2>
            <div class="table-container">
              <ibm-table [model]="activityTableModel" size="sm"></ibm-table>
            </div>
          </div>
        </ibm-tab>
      </ibm-tabs>
    </div>

    <!-- Backend Modal -->
    <ibm-modal [open]="backendModalOpen()" [size]="'md'" (overlaySelected)="closeBackendModal()">
      <ibm-modal-header (closeSelect)="closeBackendModal()">
        <p class="bx--modal-header__heading">{{ editingBackend() ? 'Edit' : 'Add' }} Backend</p>
      </ibm-modal-header>
      <div ibmModalContent>
        <form [formGroup]="backendForm">
          <ibm-label>
            Name
            <input ibmText formControlName="name" required>
          </ibm-label>
          <ibm-label>
            Base URL
            <input ibmText formControlName="baseUrl" required>
          </ibm-label>
          <ibm-label>
            Timeout (ms)
            <input ibmText type="number" formControlName="timeoutMs">
          </ibm-label>
        </form>
      </div>
      <ibm-modal-footer>
        <button ibmButton="secondary" (click)="closeBackendModal()">Cancel</button>
        <button ibmButton="primary" [disabled]="backendForm.invalid" (click)="saveBackend()">Save</button>
      </ibm-modal-footer>
    </ibm-modal>

    <!-- Route Modal -->
    <ibm-modal [open]="routeModalOpen()" [size]="'md'" (overlaySelected)="closeRouteModal()">
      <ibm-modal-header (closeSelect)="closeRouteModal()">
        <p class="bx--modal-header__heading">{{ editingRoute() ? 'Edit' : 'Add' }} Route</p>
      </ibm-modal-header>
      <div ibmModalContent>
        <form [formGroup]="routeForm">
          <ibm-label>
            Path
            <input ibmText formControlName="path" placeholder="/orders/{id}" required>
          </ibm-label>
          <ibm-label>
            Methods
            <select formControlName="methods" multiple>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
            </select>
          </ibm-label>
          <ibm-label>
            Backend
            <select formControlName="backendId" required>
              <option *ngFor="let b of api()?.backends || []" [value]="b.id">{{ b.name }}</option>
            </select>
          </ibm-label>
        </form>
      </div>
      <ibm-modal-footer>
        <button ibmButton="secondary" (click)="closeRouteModal()">Cancel</button>
        <button ibmButton="primary" [disabled]="routeForm.invalid" (click)="saveRoute()">Save</button>
      </ibm-modal-footer>
    </ibm-modal>
  `,
  styles: [`
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 16px;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }

    h1 {
      font-size: 2rem;
      font-weight: 600;
      color: var(--linear-text-primary);
      margin: 0;
    }

    .tab-content {
      padding: 2rem 0;
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

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    h2 {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--linear-text-primary);
      margin: 0 0 1rem 0;
    }

    .details-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .quick-actions {
      display: flex;
      gap: 1rem;
    }

    .backends-list, .policies-layout {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .backend-item, .policy-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 6px;
    }

    .policies-layout {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
    }

    .template-item {
      padding: 1rem;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 6px;
      margin-bottom: 1rem;
    }

    .table-container {
      // No border - matching Recent Activity table aesthetic
    }

    .doc-editor {
      width: 100%;
      font-family: monospace;
      padding: 1rem;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 6px;
      margin-bottom: 1rem;
    }

    .preflight-checklist {
      margin: 1.5rem 0;
      padding: 1rem;
      background: var(--linear-surface);
      border-radius: 6px;
    }

    .preflight-checklist div {
      margin: 0.5rem 0;
    }

    .preflight-checklist .valid {
      color: green;
    }

    .preflight-checklist .invalid {
      color: red;
    }
  `]
})
export class ApiEditorPage implements OnInit {
  private devService = inject(InMemoryDevService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private logger = inject(LoggerService);

  api = signal<ApiEntity | null>(null);
  policyTemplates = signal<PolicyTemplate[]>([]);
  deployments = signal<Deployment[]>([]);
  selectedTab = 0;
  backendModalOpen = signal(false);
  routeModalOpen = signal(false);
  editingBackend = signal<Backend | null>(null);
  editingRoute = signal<RouteDef | null>(null);
  openApiJson = '';
  openApiYaml = '';
  markdown = '';

  routesTableModel = new TableModel();
  activityTableModel = new TableModel();

  overviewAnchors: Anchor[] = [{ id: 'overview', label: 'Overview' }];

  backendForm: FormGroup = this.fb.group({
    name: ['', Validators.required],
    baseUrl: ['', Validators.required],
    timeoutMs: [5000]
  });

  routeForm: FormGroup = this.fb.group({
    path: ['', Validators.required],
    methods: [[], Validators.required],
    backendId: ['', Validators.required]
  });

  deployForm: FormGroup = this.fb.group({
    version: ['', Validators.required],
    env: ['sandbox', Validators.required]
  });

  ngOnInit() {
    const apiId = this.route.snapshot.paramMap.get('apiId');
    if (apiId) {
      this.loadApi(apiId);
      this.loadPolicyTemplates();
      this.loadDeployments(apiId);
    }
  }

  loadApi(id: string) {
    this.devService.getApi(id).subscribe(api => {
      if (api) {
        this.api.set(api);
        this.updateRoutesTable();
        this.loadDocs(api);
        const version = api.currentVersion || api.versions[0]?.name || '';
        if (version) {
          this.deployForm.patchValue({ version });
        }
      }
    });
  }

  loadPolicyTemplates() {
    this.devService.listPolicyTemplates().subscribe(templates => {
      this.policyTemplates.set(templates);
    });
  }

  loadDeployments(apiId: string) {
    this.devService.getDeploymentsForApi(apiId).subscribe(deployments => {
      this.deployments.set(deployments);
      this.updateActivityTable();
    });
  }

  loadDocs(api: ApiEntity) {
    const jsonDoc = api.docs?.find(d => d.format === 'openapi-json');
    const yamlDoc = api.docs?.find(d => d.format === 'openapi-yaml');
    const mdDoc = api.docs?.find(d => d.format === 'markdown');
    this.openApiJson = jsonDoc?.content || '';
    this.openApiYaml = yamlDoc?.content || '';
    this.markdown = mdDoc?.content || '';
  }

  updateRoutesTable() {
    const routes = this.api()?.routes || [];
    this.routesTableModel.header = [
      new TableHeaderItem({ data: 'Path' }),
      new TableHeaderItem({ data: 'Methods' }),
      new TableHeaderItem({ data: 'Backend' })
    ];
    this.routesTableModel.data = routes.map(route => [
      new TableItem({ data: route.path }),
      new TableItem({ data: route.methods.join(', ') }),
      new TableItem({ data: this.getBackendName(route.backendId) })
    ]);
  }

  updateActivityTable() {
    const deployments = this.deployments();
    this.activityTableModel.header = [
      new TableHeaderItem({ data: 'Date' }),
      new TableHeaderItem({ data: 'Version' }),
      new TableHeaderItem({ data: 'Environment' }),
      new TableHeaderItem({ data: 'Status' }),
      new TableHeaderItem({ data: 'Summary' })
    ];
    this.activityTableModel.data = deployments.map(d => [
      new TableItem({ data: this.formatDate(d.createdAt) }),
      new TableItem({ data: d.version }),
      new TableItem({ data: d.env }),
      new TableItem({ data: d.status }),
      new TableItem({ data: d.summary })
    ]);
  }

  openBackendModal() {
    this.editingBackend.set(null);
    this.backendForm.reset({ timeoutMs: 5000 });
    this.backendModalOpen.set(true);
  }

  closeBackendModal() {
    this.backendModalOpen.set(false);
    this.editingBackend.set(null);
  }

  editBackend(backend: Backend) {
    this.editingBackend.set(backend);
    this.backendForm.patchValue(backend);
    this.backendModalOpen.set(true);
  }

  saveBackend() {
    const api = this.api();
    if (!api) return;

    const formValue = this.backendForm.value;
    const editing = this.editingBackend();

    if (editing) {
      this.devService.updateBackend(api.id, editing.id, formValue).subscribe({
        next: () => {
          this.closeBackendModal();
          this.loadApi(api.id);
          this.logger.info('Backend updated successfully');
        }
      });
    } else {
      this.devService.addBackend(api.id, formValue).subscribe({
        next: () => {
          this.closeBackendModal();
          this.loadApi(api.id);
          this.logger.info('Backend added successfully');
        }
      });
    }
  }

  openRouteModal() {
    this.editingRoute.set(null);
    this.routeForm.reset();
    this.routeModalOpen.set(true);
  }

  closeRouteModal() {
    this.routeModalOpen.set(false);
    this.editingRoute.set(null);
  }

  saveRoute() {
    const api = this.api();
    if (!api) return;

    const formValue = this.routeForm.value;
    const editing = this.editingRoute();

    if (editing) {
      this.devService.updateRoute(api.id, editing.id, formValue).subscribe({
        next: () => {
          this.closeRouteModal();
          this.loadApi(api.id);
          this.logger.info('Route updated successfully');
        }
      });
    } else {
      const route: RouteDef = {
        id: `route-${Date.now()}`,
        path: formValue.path,
        methods: Array.isArray(formValue.methods) ? formValue.methods : [formValue.methods],
        backendId: formValue.backendId
      };
      this.devService.addRoute(api.id, route).subscribe({
        next: () => {
          this.closeRouteModal();
          this.loadApi(api.id);
          this.logger.info('Route added successfully');
        }
      });
    }
  }

  applyPolicy(template: PolicyTemplate) {
    const api = this.api();
    if (!api) return;

    const applied: AppliedPolicy = {
      id: `policy-${Date.now()}`,
      templateId: template.id,
      scope: template.scope,
      enabled: true
    };

    this.devService.applyPolicy(api.id, applied).subscribe({
      next: () => {
        this.loadApi(api.id);
        this.logger.info('Policy applied successfully');
      }
    });
  }

  togglePolicy(policyId: string, enabled: boolean) {
    const api = this.api();
    if (!api) return;

    this.devService.togglePolicy(api.id, policyId, enabled).subscribe({
      next: () => {
        this.loadApi(api.id);
      }
    });
  }

  removePolicy(policyId: string) {
    const api = this.api();
    if (!api) return;

    this.devService.removePolicy(api.id, policyId).subscribe({
      next: () => {
        this.loadApi(api.id);
        this.logger.info('Policy removed successfully');
      }
    });
  }

  saveOpenApi(format: 'openapi-json' | 'openapi-yaml') {
    const api = this.api();
    if (!api) return;

    const content = format === 'openapi-json' ? this.openApiJson : this.openApiYaml;
    this.devService.saveOpenApi(api.id, content, format).subscribe({
      next: () => {
        this.logger.info('OpenAPI saved successfully');
        this.loadApi(api.id);
      }
    });
  }

  generateMarkdown() {
    const api = this.api();
    if (!api) return;

    this.devService.generateMarkdownFromOpenAPI(api.id).subscribe({
      next: (doc) => {
        this.markdown = doc.content;
        this.logger.info('Markdown generated successfully');
      }
    });
  }

  preflightChecks = computed(() => {
    const api = this.api();
    if (!api) return [];

    return [
      { label: 'Backend exists', valid: api.backends.length > 0 },
      { label: 'At least one route', valid: api.routes.length > 0 },
      { label: 'At least one policy', valid: api.policies.length > 0 }
    ];
  });

  canDeploy = computed(() => {
    return this.preflightChecks().every(c => c.valid) && this.deployForm.valid;
  });

  deploy() {
    const api = this.api();
    if (!api) return;

    const formValue = this.deployForm.value;
    this.devService.deployApi(api.id, {
      version: formValue.version,
      env: formValue.env as EnvKey
    }).subscribe({
      next: (deployment) => {
        this.logger.info('Deployment successful', { summary: deployment.summary });
        this.loadDeployments(api.id);
        // Note: Tab switching would need manual tab index management
      }
    });
  }

  getBackendName(backendId: string): string {
    return this.api()?.backends.find(b => b.id === backendId)?.name || '';
  }

  getTemplateName(templateId: string): string {
    return this.policyTemplates().find(t => t.id === templateId)?.name || templateId;
  }

  getStatusType(status?: string): 'blue' | 'green' | 'red' {
    if (status === 'released') return 'green';
    if (status === 'deprecated') return 'red';
    return 'blue';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }
}

