import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  TableModule,
  TableModel,
  TableItem,
  TableHeaderItem,
  ButtonModule,
  InputModule,
} from 'carbon-components-angular';
import { InMemoryAdminApiService } from '../../services/in-memory-admin-api.service';
import { AuditEvent } from '../../models';

@Component({
  selector: 'app-admin-audit-log',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputModule,
  ],
  template: `
    <div class="container">
      <div class="page-header">
        <h1>Audit Log</h1>
      </div>

      <div class="filters-row">
        <input ibmText placeholder="Search by action..." [(ngModel)]="actionFilter" (ngModelChange)="loadEvents()">
        <input ibmText placeholder="Target ID..." [(ngModel)]="targetIdFilter" (ngModelChange)="loadEvents()">
      </div>

      <div class="table-container">
        <ibm-table [model]="tableModel" [skeleton]="loading()" size="sm"></ibm-table>
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
      margin: 0;
    }

    .filters-row {
      display: flex;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .table-container {
      // No border - matching Recent Activity table aesthetic
    }
  `]
})
export class AdminAuditLogPage implements OnInit {
  private api = inject(InMemoryAdminApiService);

  loading = signal(false);
  events = signal<AuditEvent[]>([]);
  actionFilter = '';
  targetIdFilter = '';

  tableModel = new TableModel();

  ngOnInit() {
    this.loadEvents();
    this.setupTable();
  }

  loadEvents() {
    this.loading.set(true);
    this.api.listAuditEvents({
      action: this.actionFilter || undefined,
      targetId: this.targetIdFilter || undefined
    }).subscribe({
      next: (events) => {
        this.events.set(events);
        this.loading.set(false);
        this.updateTable();
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  setupTable() {
    this.tableModel.header = [
      new TableHeaderItem({ data: 'When' }),
      new TableHeaderItem({ data: 'Actor' }),
      new TableHeaderItem({ data: 'Action' }),
      new TableHeaderItem({ data: 'Target' }),
      new TableHeaderItem({ data: 'Details' })
    ];
  }

  updateTable() {
    const events = this.events();
    this.tableModel.data = events.map(event => [
      new TableItem({ data: this.formatDate(event.createdAt) }),
      new TableItem({ data: event.actorUserId }),
      new TableItem({ data: event.action }),
      new TableItem({ data: `${event.targetType}:${event.targetId}` }),
      new TableItem({ data: event.metadata ? JSON.stringify(event.metadata) : '' })
    ]);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }
}

