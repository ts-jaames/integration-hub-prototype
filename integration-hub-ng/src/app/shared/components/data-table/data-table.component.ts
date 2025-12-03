import { Component, Input, Output, EventEmitter, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule, TableModel } from 'carbon-components-angular';

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule, TableModule],
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.styles.scss']
})
export class DataTableComponent {
  @Input() model!: TableModel;
  @Input() loading: boolean = false;
  @Input() size: 'sm' | 'md' | 'lg' | 'xl' = 'md';
  @Input() sortable: boolean = true;
  @Input() stickyHeader: boolean = false;
  
  @Output() rowClick = new EventEmitter<any>();
  @Output() onRowClick = new EventEmitter<any>();
  @Output() onSelectAll = new EventEmitter<any>();
  @Output() onSelectRow = new EventEmitter<any>();

  constructor(public elementRef: ElementRef) {}

  handleRowClick(event: any) {
    // Emit both events for compatibility
    this.rowClick.emit(event);
    this.onRowClick.emit(event);
  }
}

