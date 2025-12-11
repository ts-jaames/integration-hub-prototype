import { Component, Input, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule, TableModel, TableItem, TableHeaderItem, SelectModule } from 'carbon-components-angular';
import { VendorCompany, VendorActivityEvent } from '../../models/vendor-company.model';

@Component({
  selector: 'app-vendor-activity-log-section',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, SelectModule],
  template: `
    <div class="activity-log-section">
      <div class="section-header">
        <h3>Activity Log</h3>
        <div class="filter-controls">
          <label class="filter-label">Filter by event type:</label>
          <select ibmSelect [(ngModel)]="selectedEventType" (ngModelChange)="onFilterChange()">
            <option value="">All Events</option>
            <option *ngFor="let type of eventTypes" [value]="type">{{ type }}</option>
          </select>
        </div>
      </div>

      <div class="activity-table" *ngIf="filteredEvents.length > 0">
        <ibm-table [model]="tableModel" size="sm"></ibm-table>
      </div>

      <div class="empty-state" *ngIf="filteredEvents.length === 0">
        <p>No activity events found.</p>
      </div>
    </div>
  `,
  styles: [`
    .activity-log-section {
      margin-bottom: 2rem;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .section-header h3 {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--linear-text-primary);
      margin: 0;
    }

    .filter-controls {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .filter-label {
      font-size: 0.875rem;
      color: var(--linear-text-secondary);
    }

    .activity-table {
      margin-top: 1rem;
    }

    .empty-state {
      padding: 3rem;
      text-align: center;
      background: var(--linear-surface);
      border: 1px solid var(--linear-border);
      border-radius: 8px;
    }

    .empty-state p {
      margin: 0;
      color: var(--linear-text-secondary);
    }
  `]
})
export class VendorActivityLogSectionComponent implements OnInit, OnChanges {
  @Input() vendor!: VendorCompany;

  selectedEventType = '';
  eventTypes: string[] = [];
  filteredEvents: VendorActivityEvent[] = [];
  tableModel = new TableModel();

  ngOnInit() {
    this.buildTable();
  }

  ngOnChanges() {
    if (this.vendor) {
      this.extractEventTypes();
      this.filterEvents();
      this.buildTable();
    }
  }

  extractEventTypes() {
    if (!this.vendor.activityLog) return;
    const types = new Set(this.vendor.activityLog.map(e => e.action));
    this.eventTypes = Array.from(types).sort();
  }

  filterEvents() {
    if (!this.vendor.activityLog) {
      this.filteredEvents = [];
      return;
    }

    let events = [...this.vendor.activityLog];

    if (this.selectedEventType) {
      events = events.filter(e => e.action === this.selectedEventType);
    }

    // Sort by newest first
    events.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    this.filteredEvents = events;
  }

  onFilterChange() {
    this.filterEvents();
    this.buildTable();
  }

  buildTable() {
    if (this.filteredEvents.length === 0) {
      this.tableModel.data = [];
      return;
    }

    this.tableModel.header = [
      new TableHeaderItem({ data: 'Timestamp' }),
      new TableHeaderItem({ data: 'Actor' }),
      new TableHeaderItem({ data: 'Action' }),
      new TableHeaderItem({ data: 'Details' })
    ];

    this.tableModel.data = this.filteredEvents.map(event => [
      new TableItem({ data: this.formatTimestamp(event.timestamp) }),
      new TableItem({ data: event.actor.name }),
      new TableItem({ data: event.action }),
      new TableItem({ data: event.details || '—' })
    ]);
  }

  formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}