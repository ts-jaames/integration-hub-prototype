import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule, TagModule } from 'carbon-components-angular';
import { InMemoryDevService } from '../../services/in-memory-dev.service';
import { Deployment } from '../../models';
import { RightRailAnchorsComponent, Anchor } from '../../shared/components/right-rail-anchors/right-rail-anchors.component';
import { StatusTagPipe } from '../../shared/pipes/status-tag.pipe';

@Component({
  selector: 'app-dev-dashboard',
  standalone: true,
  imports: [CommonModule, ButtonModule, TagModule, RightRailAnchorsComponent, StatusTagPipe],
  template: `
    <div class="container">
      <div class="page-content">
        <div class="main-content">
          <section id="overview" class="section">
            <h1>Dashboard</h1>
            
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-label">APIs</div>
                <div class="stat-value">{{ apisCount() }}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Service Accounts</div>
                <div class="stat-value">{{ serviceAccountsCount() }}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Last Deployment</div>
                <div class="stat-value">
                  <ibm-tag [type]="lastDeploymentStatus() === 'success' ? 'green' : lastDeploymentStatus() === 'failed' ? 'red' : 'blue'">
                    {{ lastDeploymentStatus() | statusTag }}
                  </ibm-tag>
                </div>
              </div>
            </div>

            <div class="shortcuts">
              <h2>Quick Actions</h2>
              <div class="shortcut-buttons">
                <button ibmButton="primary" (click)="router.navigate(['/dev/apis/new'])">
                  New API
                </button>
                <button ibmButton="secondary" (click)="router.navigate(['/dev/service-accounts'])">
                  New Service Account
                </button>
              </div>
            </div>
          </section>

          <section id="recent-activity" class="section">
            <h2>Recent Activity</h2>
            <div class="activity-list">
              <div *ngFor="let deployment of recentDeployments()" class="activity-item">
                <div class="activity-content">
                  <div class="activity-title">{{ deployment.summary }}</div>
                  <div class="activity-meta">
                    {{ formatDate(deployment.createdAt) }} • {{ deployment.env }}
                  </div>
                </div>
                <ibm-tag [type]="deployment.status === 'success' ? 'green' : deployment.status === 'failed' ? 'red' : 'blue'">
                  {{ deployment.status | statusTag }}
                </ibm-tag>
              </div>
              <div *ngIf="recentDeployments().length === 0" class="empty-state">
                No recent deployments
              </div>
            </div>
          </section>
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

    .section {
      margin-bottom: 3rem;
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
      margin: 0 0 1rem 0;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .stat-card {
      padding: 1.5rem;
      background: var(--linear-surface);
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 6px;
    }

    .stat-label {
      font-size: 0.875rem;
      color: var(--linear-text-secondary);
      margin-bottom: 0.5rem;
    }

    .stat-value {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--linear-text-primary);
    }

    .shortcuts {
      margin-bottom: 2rem;
    }

    .shortcut-buttons {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .activity-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .activity-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      background: var(--linear-surface);
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 6px;
    }

    .activity-content {
      flex: 1;
    }

    .activity-title {
      font-weight: 500;
      color: var(--linear-text-primary);
      margin-bottom: 0.25rem;
    }

    .activity-meta {
      font-size: 0.875rem;
      color: var(--linear-text-secondary);
    }

    .empty-state {
      padding: 2rem;
      text-align: center;
      color: var(--linear-text-secondary);
    }
  `]
})
export class DevDashboardPage implements OnInit {
  private devService = inject(InMemoryDevService);
  router = inject(Router);

  apis = signal<any[]>([]);
  serviceAccounts = signal<any[]>([]);
  deployments = signal<Deployment[]>([]);

  apisCount = computed(() => this.apis().length);
  serviceAccountsCount = computed(() => this.serviceAccounts().length);
  lastDeploymentStatus = computed(() => {
    const sorted = [...this.deployments()].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return sorted[0]?.status || 'queued';
  });

  recentDeployments = computed(() => {
    return [...this.deployments()]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  });

  anchors: Anchor[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'recent-activity', label: 'Recent Activity' }
  ];

  ngOnInit() {
    this.devService.listApis().subscribe(apis => this.apis.set(apis));
    this.devService.listServiceAccounts().subscribe(accounts => this.serviceAccounts.set(accounts));
    this.devService.deployments$.subscribe(deployments => this.deployments.set(deployments));
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }
}

