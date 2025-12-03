import { Component, OnInit } from '@angular/core';
import { TableModel, TableItem, TableHeaderItem } from 'carbon-components-angular';
import { DataTableComponent } from '../shared/components/data-table/data-table.component';

@Component({
  selector: 'app-companies',
  standalone: false,
  template: `
    <div class="page-header">
      <h1 class="page-title">Companies</h1>
      <p class="page-subtitle">Manage vendor companies and organizations</p>
    </div>
    
    <div class="page-section">
      <div class="section-header">
        <h2 class="section-title">organizations</h2>
        <button class="btn-primary">New Company</button>
      </div>
      <div class="section-content">
        <app-data-table [model]="companiesTableModel" [loading]="loading"></app-data-table>
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
export class CompaniesComponent implements OnInit {
  loading = false;
  companiesTableModel = new TableModel();

  ngOnInit() {
    this.companiesTableModel.header = [
      new TableHeaderItem({ data: 'name' }),
      new TableHeaderItem({ data: 'tier' }),
      new TableHeaderItem({ data: 'status' }),
      new TableHeaderItem({ data: 'users' }),
      new TableHeaderItem({ data: 'created' })
    ];
    
    this.companiesTableModel.data = [
      [new TableItem({ data: 'Acme Corp' }), new TableItem({ data: 'Enterprise' }), new TableItem({ data: 'Active' }), new TableItem({ data: '12' }), new TableItem({ data: '2024-01-15' })],
      [new TableItem({ data: 'TechStart Inc' }), new TableItem({ data: 'Standard' }), new TableItem({ data: 'Pending' }), new TableItem({ data: '3' }), new TableItem({ data: '2024-02-20' })]
    ];
  }
}

