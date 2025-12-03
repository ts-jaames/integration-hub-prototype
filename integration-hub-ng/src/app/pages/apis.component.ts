import { Component, OnInit } from '@angular/core';
import { TableModel, TableItem, TableHeaderItem } from 'carbon-components-angular';
import { DataTableComponent } from '../shared/components/data-table/data-table.component';

@Component({
  selector: 'app-apis',
  standalone: false,
  template: `
    <div class="page-header">
      <h1 class="page-title">APIs</h1>
      <p class="page-subtitle">Manage API lifecycle, configuration, and policies</p>
    </div>
    
    <div class="page-section">
      <div class="section-header">
        <h2 class="section-title">registered apis</h2>
        <button class="btn-primary">Register API</button>
      </div>
      <div class="section-content">
        <app-data-table [model]="apisTableModel" [loading]="loading"></app-data-table>
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
export class ApisComponent implements OnInit {
  loading = false;
  apisTableModel = new TableModel();

  ngOnInit() {
    this.apisTableModel.header = [
      new TableHeaderItem({ data: 'name' }),
      new TableHeaderItem({ data: 'version' }),
      new TableHeaderItem({ data: 'status' }),
      new TableHeaderItem({ data: 'requests (24h)' }),
      new TableHeaderItem({ data: 'last updated' })
    ];
    
    this.apisTableModel.data = [
      [new TableItem({ data: 'Customer API' }), new TableItem({ data: 'v2.1' }), new TableItem({ data: 'Active' }), new TableItem({ data: '12.4k' }), new TableItem({ data: '2 hours ago' })],
      [new TableItem({ data: 'Order API' }), new TableItem({ data: 'v1.5' }), new TableItem({ data: 'Active' }), new TableItem({ data: '8.7k' }), new TableItem({ data: '5 hours ago' })],
      [new TableItem({ data: 'Payment API' }), new TableItem({ data: 'v3.0' }), new TableItem({ data: 'Deprecated' }), new TableItem({ data: '1.2k' }), new TableItem({ data: '1 day ago' })]
    ];
  }
}

