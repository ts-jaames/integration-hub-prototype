import { Component, OnInit } from '@angular/core';
import { TableModel, TableItem, TableHeaderItem } from 'carbon-components-angular';
import { DataTableComponent } from '../shared/components/data-table/data-table.component';

@Component({
  selector: 'app-service-accounts',
  standalone: false,
  template: `
    <div class="page-header">
      <h1 class="page-title">Service Accounts</h1>
      <p class="page-subtitle">Manage service accounts and API credentials</p>
    </div>
    
    <div class="page-section">
      <div class="section-header">
        <h2 class="section-title">service accounts</h2>
        <button class="btn-primary">Create Service Account</button>
      </div>
      <div class="section-content">
        <app-data-table [model]="serviceAccountsTableModel" [loading]="loading"></app-data-table>
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
    
    .page-section {
      background: var(--linear-surface);
      border: 1px solid var(--linear-border);
      border-radius: 12px;
      overflow: hidden;
    }
    
    .section-header {
      padding: 1.5rem 1.75rem;
      border-bottom: 1px solid var(--linear-border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .section-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--linear-text-secondary);
      margin: 0;
      letter-spacing: 0.01em;
      text-transform: lowercase;
    }
    
    .btn-primary {
      background: var(--linear-accent);
      color: white;
      border: none;
      border-radius: 8px;
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 150ms ease;
      
      &:hover {
        background: var(--linear-accent-hover);
      }
    }
    
    .section-content {
      padding: 0;
    }
  `]
})
export class ServiceAccountsComponent implements OnInit {
  loading = false;
  serviceAccountsTableModel = new TableModel();

  ngOnInit() {
    this.serviceAccountsTableModel.header = [
      new TableHeaderItem({ data: 'name' }),
      new TableHeaderItem({ data: 'company' }),
      new TableHeaderItem({ data: 'scopes' }),
      new TableHeaderItem({ data: 'last used' }),
      new TableHeaderItem({ data: 'status' })
    ];
    
    this.serviceAccountsTableModel.data = [
      [new TableItem({ data: 'api-client-prod' }), new TableItem({ data: 'Acme Corp' }), new TableItem({ data: 'read, write' }), new TableItem({ data: '2 hours ago' }), new TableItem({ data: 'Active' })],
      [new TableItem({ data: 'webhook-service' }), new TableItem({ data: 'TechStart Inc' }), new TableItem({ data: 'read' }), new TableItem({ data: '1 day ago' }), new TableItem({ data: 'Active' })]
    ];
  }
}

