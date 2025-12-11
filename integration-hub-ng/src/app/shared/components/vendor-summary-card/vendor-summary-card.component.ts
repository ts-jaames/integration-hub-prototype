import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TagModule } from 'carbon-components-angular';
import { VendorCompany, VendorReadinessState } from '../../models/vendor-company.model';

@Component({
  selector: 'app-vendor-summary-card',
  standalone: true,
  imports: [CommonModule, TagModule],
  template: `
    <div class="summary-card">
      <div class="summary-header">
        <div class="summary-title-section">
          <h2 class="vendor-name">{{ vendor.name }}</h2>
          <div class="vendor-badges" *ngIf="vendor.dba || vendor.status">
            <ibm-tag *ngIf="vendor.dba" [type]="'blue'">{{ vendor.dba }}</ibm-tag>
            <ibm-tag [type]="getStatusColor(vendor.status)">{{ vendor.status }}</ibm-tag>
          </div>
        </div>
      </div>

      <div class="summary-content">
        <div class="summary-grid">
          <div class="summary-item" *ngIf="vendor.riskTier">
            <label>Risk Tier</label>
            <p>{{ vendor.riskTier }}</p>
          </div>

          <div class="summary-item" *ngIf="vendor.purpose">
            <label>Purpose</label>
            <p>{{ vendor.purpose }}</p>
          </div>

          <div class="summary-item">
            <label>Readiness</label>
            <div class="readiness-indicator">
              <ibm-tag [type]="getReadinessColor(vendor.readiness || 'Pending Requirements')">
                {{ vendor.readiness || 'Pending Requirements' }}
              </ibm-tag>
              <div class="readiness-blockers" *ngIf="vendor.readinessBlockers && vendor.readinessBlockers.length > 0">
                <ul>
                  <li *ngFor="let blocker of vendor.readinessBlockers">{{ blocker }}</li>
                </ul>
              </div>
            </div>
          </div>

          <div class="summary-item">
            <label>Last Updated</label>
            <p>{{ formatDate(vendor.updatedAt || vendor.createdAt) }}</p>
            <p class="updated-by" *ngIf="vendor.updatedBy">by {{ vendor.updatedBy }}</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .summary-card {
      background: var(--linear-surface);
      border: 1px solid var(--linear-border);
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 2rem;
    }

    .summary-header {
      margin-bottom: 1.5rem;
    }

    .summary-title-section {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .vendor-name {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--linear-text-primary);
      margin: 0;
    }

    .vendor-badges {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .summary-content {
      margin-top: 1rem;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
    }

    .summary-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .summary-item label {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--linear-text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .summary-item p {
      font-size: 0.875rem;
      color: var(--linear-text-primary);
      margin: 0;
    }

    .updated-by {
      font-size: 0.75rem;
      color: var(--linear-text-secondary);
    }

    .readiness-indicator {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .readiness-blockers {
      margin-top: 0.5rem;
    }

    .readiness-blockers ul {
      margin: 0;
      padding-left: 1.25rem;
      font-size: 0.75rem;
      color: var(--linear-text-secondary);
    }

    .readiness-blockers li {
      margin: 0.25rem 0;
    }
  `]
})
export class VendorSummaryCardComponent {
  @Input() vendor!: VendorCompany;

  getStatusColor(status: string): string {
    switch (status) {
      case 'Approved':
        return 'green';
      case 'Pending':
        return 'blue';
      case 'Rejected':
        return 'red';
      case 'Archived':
        return 'gray';
      default:
        return 'blue';
    }
  }

  getReadinessColor(readiness: VendorReadinessState): string {
    switch (readiness) {
      case 'Ready':
        return 'green';
      case 'Pending Requirements':
        return 'blue';
      case 'Blocked':
        return 'red';
      default:
        return 'blue';
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}