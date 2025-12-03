import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import {
  ButtonModule,
  TagModule,
  InputModule,
} from 'carbon-components-angular';
import { InMemoryAdminApiService } from '../../services/in-memory-admin-api.service';
import { Company } from '../../models';
import { StatusTagComponent } from '../../shared/components/status-tag/status-tag.component';
import { RightRailAnchorsComponent, Anchor } from '../../shared/components/right-rail-anchors/right-rail-anchors.component';

@Component({
  selector: 'app-company-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    TagModule,
    InputModule,
    StatusTagComponent,
    RightRailAnchorsComponent
  ],
  template: `
    <div class="container">
      <div class="page-header">
        <button ibmButton="ghost" (click)="goBack()">← Back</button>
        <h1>{{ company()?.name || 'Loading...' }}</h1>
      </div>

      <div class="page-content">
        <div class="main-content">
          <div class="tabs">
            <div class="tab-nav">
              <button [class.active]="selectedTab() === 0" (click)="selectedTab.set(0)">Overview</button>
              <button [class.active]="selectedTab() === 1" (click)="selectedTab.set(1)">Teams</button>
              <button [class.active]="selectedTab() === 2" (click)="selectedTab.set(2)">Settings</button>
            </div>
            <div class="tab-content" *ngIf="selectedTab() === 0">
              <section id="summary" class="section">
                <h2>Summary</h2>
                <div class="info-grid">
                  <div>
                    <label>Status</label>
                    <app-status-tag [status]="company()?.status || 'active'" type="company"></app-status-tag>
                  </div>
                  <div>
                    <label>Slug</label>
                    <p>{{ company()?.slug }}</p>
                  </div>
                  <div>
                    <label>Vendor</label>
                    <p>{{ company()?.vendor ? 'Yes' : 'No' }}</p>
                  </div>
                </div>
              </section>

              <section id="metadata" class="section">
                <h2>Metadata</h2>
                <div class="info-grid">
                  <div *ngIf="company()?.metadata?.website">
                    <label>Website</label>
                    <p><a [href]="company()?.metadata?.website" target="_blank">{{ company()?.metadata?.website }}</a></p>
                  </div>
                  <div *ngIf="company()?.metadata?.address">
                    <label>Address</label>
                    <p>{{ company()?.metadata?.address }}</p>
                  </div>
                  <div *ngIf="company()?.metadata?.notes">
                    <label>Notes</label>
                    <p>{{ company()?.metadata?.notes }}</p>
                  </div>
                </div>
              </section>

              <section id="quick-actions" class="section">
                <h2>Quick Actions</h2>
                <div class="actions-grid">
                  <button ibmButton="secondary" (click)="navigateToUsers()">Invite user</button>
                  <button ibmButton="secondary" (click)="suspendCompany()">Suspend</button>
                </div>
              </section>
            </div>
            <div class="tab-content" *ngIf="selectedTab() === 1">
              <section class="section">
                <h2>Teams</h2>
                <div *ngFor="let team of company()?.teams" class="team-item">
                  <h3>{{ team.name }}</h3>
                  <p>{{ team.members.length }} members</p>
                </div>
                <button ibmButton="secondary" (click)="addTeam()">Add team</button>
              </section>
            </div>
            <div class="tab-content" *ngIf="selectedTab() === 2">
              <section class="section">
                <h2>Settings</h2>
                <form [formGroup]="settingsForm" (ngSubmit)="saveSettings()">
                  <ibm-label>
                    Website
                    <input ibmText formControlName="website">
                  </ibm-label>
                  <ibm-label>
                    Address
                    <input ibmText formControlName="address">
                  </ibm-label>
                  <ibm-label>
                    Notes
                    <textarea ibmText formControlName="notes" rows="3"></textarea>
                  </ibm-label>
                  <ibm-checkbox formControlName="vendor">Vendor company</ibm-checkbox>
                  <div class="form-actions">
                    <button ibmButton="primary" type="submit">Save</button>
                    <button ibmButton="secondary" type="button" (click)="resetSettings()">Reset</button>
                  </div>
                </form>
              </section>
            </div>
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
      padding: 2rem;
    }

    .page-header {
      margin-bottom: 2rem;
    }

    .page-header h1 {
      font-size: 2rem;
      font-weight: 600;
      color: var(--linear-text-primary);
      margin: 1rem 0 0 0;
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
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
    }

    .info-grid label {
      font-size: 0.875rem;
      color: var(--linear-text-secondary);
      display: block;
      margin-bottom: 0.5rem;
    }

    .info-grid p {
      margin: 0;
      color: var(--linear-text-primary);
    }

    .actions-grid {
      display: flex;
      gap: 1rem;
    }

    .team-item {
      padding: 1rem;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 6px;
      margin-bottom: 1rem;
    }

    .form-actions {
      display: flex;
      gap: 1rem;
      margin-top: 1.5rem;
    }

    .tabs {
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    }

    .tab-nav {
      display: flex;
      gap: 0;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    }

    .tab-nav button {
      background: transparent;
      border: none;
      padding: 1rem 1.5rem;
      cursor: pointer;
      color: var(--linear-text-secondary);
      border-bottom: 2px solid transparent;
      transition: all 150ms ease;
    }

    .tab-nav button:hover {
      color: var(--linear-text-primary);
    }

    .tab-nav button.active {
      color: var(--linear-accent);
      border-bottom-color: var(--linear-accent);
    }

    .tab-content {
      padding: 2rem 0;
    }
  `]
})
export class CompanyDetailPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(InMemoryAdminApiService);
  private fb = inject(FormBuilder);

  company = signal<Company | null>(null);
  selectedTab = signal(0);

  anchors: Anchor[] = [
    { id: 'summary', label: 'Summary' },
    { id: 'metadata', label: 'Metadata' },
    { id: 'quick-actions', label: 'Quick actions' }
  ];

  settingsForm: FormGroup = this.fb.group({
    website: [''],
    address: [''],
    notes: [''],
    vendor: [false]
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadCompany(id);
    }
  }

  loadCompany(id: string) {
    this.api.getCompany(id).subscribe({
      next: (company) => {
        if (company) {
          this.company.set(company);
          this.settingsForm.patchValue({
            website: company.metadata?.website || '',
            address: company.metadata?.address || '',
            notes: company.metadata?.notes || '',
            vendor: company.vendor || false
          });
        }
      }
    });
  }

  goBack() {
    this.router.navigate(['/admin/companies']);
  }

  navigateToUsers() {
    const id = this.company()?.id;
    if (id) {
      this.router.navigate(['/admin/companies', id, 'users']);
    }
  }

  suspendCompany() {
    const id = this.company()?.id;
    if (id) {
      this.api.suspendCompany(id).subscribe({
        next: () => {
          this.loadCompany(id);
          console.log({
            type: 'success',
            title: 'Success',
            message: 'Company status updated'
          });
        }
      });
    }
  }

  addTeam() {
    // Implement add team
  }

  saveSettings() {
    const id = this.company()?.id;
    if (!id) return;

    const formValue = this.settingsForm.value;
    this.api.updateCompany(id, {
      metadata: {
        website: formValue.website || undefined,
        address: formValue.address || undefined,
        notes: formValue.notes || undefined
      },
      vendor: formValue.vendor
    }).subscribe({
      next: () => {
        this.loadCompany(id);
        console.log({
          type: 'success',
          title: 'Success',
          message: 'Settings saved'
        });
      }
    });
  }

  resetSettings() {
    const company = this.company();
    if (company) {
      this.settingsForm.patchValue({
        website: company.metadata?.website || '',
        address: company.metadata?.address || '',
        notes: company.metadata?.notes || '',
        vendor: company.vendor || false
      });
    }
  }
}

