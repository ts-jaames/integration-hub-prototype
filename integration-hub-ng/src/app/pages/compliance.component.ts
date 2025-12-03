import { Component, OnInit } from '@angular/core';
import { TableModel, TableItem, TableHeaderItem } from 'carbon-components-angular';
import { DataTableComponent } from '../shared/components/data-table/data-table.component';

@Component({
  selector: 'app-compliance',
  standalone: false,
  template: `
    <div class="page-header">
      <h1 class="page-title">Compliance</h1>
      <p class="page-subtitle">Audit logs, compliance scans, and governance</p>
    </div>
    
    <div class="compliance-grid">
      <div class="compliance-card">
        <div class="card-label">compliance score</div>
        <div class="card-value">94%</div>
        <div class="card-trend">3 issues pending review</div>
      </div>
      
      <div class="compliance-card">
        <div class="card-label">audit events (30d)</div>
        <div class="card-value">2,847</div>
        <div class="card-trend">12 flagged for review</div>
      </div>
    </div>
    
    <div class="page-section">
      <div class="section-header">
        <h2 class="section-title">recent audit events</h2>
      </div>
      <div class="section-content">
        <app-data-table [model]="auditTableModel" [loading]="loading"></app-data-table>
      </div>
    </div>
  `,
  styles: [`
    .page-header {
      margin-bottom: 4rem;
    }
    
    .page-title {
      font-size: 1.75rem;
      font-weight: 600;
      color: var(--linear-text-primary);
      margin: 0 0 0.5rem 0;
      letter-spacing: -0.02em;
      line-height: 1.2;
    }
    
    .page-subtitle {
      font-size: 0.875rem;
      color: var(--linear-text-secondary);
      margin: 0;
      font-weight: 400;
      line-height: 1.5;
    }
    
    .compliance-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1.25rem;
      margin-bottom: 4rem;
    }
    
    .compliance-card {
      background: var(--linear-surface);
      border: 1px solid var(--linear-border);
      border-radius: 12px;
      padding: 1.5rem;
    }
    
    .card-label {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--linear-text-secondary);
      margin-bottom: 0.875rem;
      text-transform: lowercase;
      letter-spacing: 0.01em;
    }
    
    .card-value {
      font-size: 2rem;
      font-weight: 600;
      color: var(--linear-text-primary);
      line-height: 1;
      letter-spacing: -0.03em;
      margin-bottom: 0.5rem;
    }
    
    .card-trend {
      font-size: 0.75rem;
      color: var(--linear-text-secondary);
      line-height: 1.5;
    }
    
    .page-section {
      background: var(--linear-surface);
      border: 1px solid var(--linear-border);
      border-radius: 12px;
      overflow: hidden;
    }
    
    .section-header {
      padding: 1.5rem 1.75rem;
      border-bottom: 1px solid var(--linear-border);
    }
    
    .section-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--linear-text-secondary);
      margin: 0;
      letter-spacing: 0.01em;
      text-transform: lowercase;
    }
    
    .section-content {
      padding: 0;
    }
  `]
})
export class ComplianceComponent implements OnInit {
  loading = false;
  auditTableModel = new TableModel();

  ngOnInit() {
    this.auditTableModel.header = [
      new TableHeaderItem({ data: 'timestamp' }),
      new TableHeaderItem({ data: 'user' }),
      new TableHeaderItem({ data: 'action' }),
      new TableHeaderItem({ data: 'resource' }),
      new TableHeaderItem({ data: 'status' })
    ];
    
    this.auditTableModel.data = [
      [new TableItem({ data: '2024-11-06 14:32' }), new TableItem({ data: 'john@acme.com' }), new TableItem({ data: 'Service Account Created' }), new TableItem({ data: 'api-client-prod' }), new TableItem({ data: 'Success' })],
      [new TableItem({ data: '2024-11-06 13:15' }), new TableItem({ data: 'jane@techstart.com' }), new TableItem({ data: 'API Access Modified' }), new TableItem({ data: 'Customer API' }), new TableItem({ data: 'Success' })],
      [new TableItem({ data: '2024-11-06 12:08' }), new TableItem({ data: 'admin@system' }), new TableItem({ data: 'Role Assignment' }), new TableItem({ data: 'User: jane@techstart.com' }), new TableItem({ data: 'Success' })]
    ];
  }
}

